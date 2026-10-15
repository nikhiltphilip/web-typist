// The adaptive learning path. Ported from keybr.com's @keybr/lesson
// (AGPL-3.0): GuidedLesson.update() decides which keys are unlocked and which
// one to focus on; LearningRate predicts how many lessons the focused key
// still needs; the generators build each lesson's text.

import { Filter, type Letter, type PhoneticModel, type RNG, randomSample, weightedSample } from "./model";
import { type KeyStats, type KeyStatsMap, type KeySample, Polynomial, r2, speedToTime, timeToSpeed } from "./stats";

export type { LearnSettings, LessonType } from "./settings";
export { DEFAULT_LEARN } from "./settings";
import type { LearnSettings } from "./settings";

// ── target / confidence ─────────────────────────────────────────────────────

/** confidence = target time ÷ actual time: 1 means exactly at target speed. */
export const confidence = (targetCpm: number, timeToType: number | null) =>
  timeToType == null || timeToType <= 0 ? null : speedToTime(targetCpm) / timeToType;

export interface LessonKey {
  letter: Letter;
  stats: KeyStats;
  confidence: number | null;
  bestConfidence: number | null;
  included: boolean;
  focused: boolean;
  /** Included only to meet the alphabet-size setting. */
  forced: boolean;
}

const emptyStats = (cp: number): KeyStats => ({ codePoint: cp, samples: [], timeToType: null, bestTimeToType: null, hits: 0, misses: 0 });

function lessonKey(letter: Letter, map: KeyStatsMap, target: number): LessonKey {
  const stats = map.get(letter.codePoint) ?? emptyStats(letter.codePoint);
  return {
    letter,
    stats,
    confidence: confidence(target, stats.timeToType),
    bestConfidence: confidence(target, stats.bestTimeToType),
    included: false,
    focused: false,
    forced: false,
  };
}

/** QWERTY rows weight: home row first, then top, then bottom (keybr keyboardOrder). */
const KEYBOARD_WEIGHT: Record<string, number> = Object.fromEntries(
  [
    ["fjdkslagh", 1],
    ["rueiwoqpty", 2],
    ["vmcxzbn", 3],
  ].flatMap(([row, w]) => [...(row as string)].map((c, i) => [c, (w as number) * 100 + i])),
);

export function unlockOrder(model: PhoneticModel, keyboardOrder: boolean): Letter[] {
  const letters = model.frequencyOrder();
  if (!keyboardOrder) return letters;
  return [...letters].sort((a, b) => (KEYBOARD_WEIGHT[a.label] ?? 999) - (KEYBOARD_WEIGHT[b.label] ?? 999) || b.f - a.f);
}

/** keybr GuidedLesson.update: which keys are in this lesson, and the focus. */
export function guidedKeys(letters: readonly Letter[], map: KeyStatsMap, s: LearnSettings): LessonKey[] {
  const minSize = 6;
  const maxSize = minSize + Math.round((letters.length - minSize) * s.alphabetSize);
  const keys = letters.map((l) => lessonKey(l, map, s.targetSpeed));
  const included = () => keys.filter((k) => k.included);
  const conf = (k: LessonKey) => (s.recoverKeys ? (k.confidence ?? 0) : (k.bestConfidence ?? 0));

  for (const k of keys) {
    const inc = included();
    if (inc.length < minSize) k.included = true;
    else if (inc.length < maxSize) k.included = k.forced = true;
    else if ((k.bestConfidence ?? 0) >= 1) k.included = true;
    else if (inc.every((x) => conf(x) >= 1)) k.included = true;
  }
  const weakest = included()
    .filter((k) => conf(k) < 1)
    .sort((a, b) => conf(a) - conf(b))[0];
  if (weakest) weakest.focused = true;
  return keys;
}

/** Every key is part of the lesson (word list, numbers, custom, books). */
export function allKeys(letters: readonly Letter[], map: KeyStatsMap, s: LearnSettings): LessonKey[] {
  return letters.map((l) => ({ ...lessonKey(l, map, s.targetSpeed), included: true }));
}

// ── learning rate ───────────────────────────────────────────────────────────

/** keybr findSession: the latest run of lessons without a break or setback. */
function findSession(samples: readonly KeySample[]): KeySample[] {
  for (let i = samples.length - 1; i > 0; i--) {
    const a = samples[i - 1];
    const b = samples[i];
    if (b.at - a.at > 3600000) return samples.slice(i);
    if (b.filteredTimeToType > a.filteredTimeToType && samples.length - i + 1 >= 5) return samples.slice(i);
  }
  return samples.slice();
}

export interface LearningRate {
  /** Speed gained per lesson right now (cpm / lesson). */
  rate: number;
  /** Lessons until the key reaches target speed, if it is predictable. */
  remaining: number | null;
  certainty: number;
  xs: number[];
  ys: number[];
  model: Polynomial;
}

export function learningRate(samples: readonly KeySample[], targetCpm: number): LearningRate | null {
  let recent = samples.slice(-30);
  if (recent.length < 5) return null;
  const session = findSession(recent);
  if (session.length >= 5) recent = session;
  const xs = recent.map((s) => s.index + 1);
  const ys = recent.map((s) => timeToSpeed(s.filteredTimeToType));
  const degree = xs.length > 20 ? 3 : xs.length > 10 ? 2 : 1;
  const model = Polynomial.fit(xs, ys, degree);
  const certainty = r2(xs, ys, model);
  if (!(certainty >= 0.5)) return null;
  const last = xs[xs.length - 1];
  let remaining: number | null = null;
  for (let i = 1; i <= 50; i++) {
    if (model.eval(last + i) >= targetCpm) {
      remaining = i;
      break;
    }
  }
  return { rate: model.derivative(last), remaining, certainty, xs, ys, model };
}

// ── text generation ─────────────────────────────────────────────────────────

const PUNCTUATORS: [string, number][] = [
  [",", 9],
  [".", 8],
  ["!", 2],
  ["?", 2],
  [";", 1],
  [":", 1],
  ["'", 1],
  ['"', 1],
  ["-", 1],
];

type WordGen = () => string | null;

function uniqueWords(next: WordGen): WordGen {
  let last = "";
  return () => {
    let word: string | null = null;
    for (let n = 0; n < 3; n++) {
      word = next();
      if (!word) return null;
      if (word !== last) return (last = word);
    }
    return word;
  };
}

function mangled(next: WordGen, s: LearnSettings, random: RNG): WordGen {
  return () => {
    let w = next();
    if (!w) return null;
    if (s.capitals > 0 && s.capitals >= random()) w = w[0].toUpperCase() + w.slice(1);
    if (s.punctuators > 0 && s.punctuators >= random()) {
      const [p] = weightedSample(PUNCTUATORS, ([, f]) => f, random);
      w = p === '"' ? `"${w}"` : p === "'" ? `'${w}'` : p === "-" ? `${w}-${next() ?? "x"}` : w + p;
    }
    return w;
  };
}

/** keybr generateFragment: words until 100–200 characters. */
function fragment(next: WordGen, s: LearnSettings, repeat = s.repeatWords): string {
  const target = 100 + Math.round(s.length * 100);
  const words: string[] = [];
  let len = 0;
  for (;;) {
    const w = next() || "?";
    for (let i = 0; i < repeat; i++) {
      words.push(w);
      len += w.length;
      if (len >= target) return words.join(" ");
    }
  }
}

export interface TextSources {
  model: PhoneticModel;
  /** Common words, most frequent first. */
  dictionary: readonly string[];
  /** Book-like passages (we use the quotes list). */
  passages: readonly string[];
}

export function generateText(keys: readonly LessonKey[], s: LearnSettings, src: TextSources, random: RNG = Math.random): string {
  switch (s.type) {
    case "guided": {
      const included = keys.filter((k) => k.included).map((k) => k.letter);
      const focused = keys.find((k) => k.focused)?.letter ?? null;
      const filter = new Filter(included, focused);
      let gen: WordGen = () => src.model.nextWord(filter, random) || null;
      if (s.naturalWords) {
        const allowed = new Set(included.map((l) => l.label));
        const words = src.dictionary
          .filter((w) => w.length > 2 && [...w].every((c) => allowed.has(c)) && (!focused || w.includes(focused.label)))
          .slice(0, 1000);
        while (words.length < 15) {
          const w = gen();
          if (!w) break;
          words.push(w);
        }
        if (words.length) gen = () => randomSample(words, random);
      }
      return fragment(mangled(uniqueWords(gen), s, random), s);
    }
    case "words": {
      const list = src.dictionary.filter((w) => !s.longWordsOnly || w.length > 3).slice(0, s.wordListSize);
      return fragment(mangled(uniqueWords(() => randomSample(list, random)), s, random), s);
    }
    case "numbers": {
      // Benford's law: leading digit d has probability log10(1 + 1/d).
      const lead = Array.from({ length: 9 }, (_, i) => [String(i + 1), Math.log10(1 + 1 / (i + 1))] as const);
      const words: string[] = [];
      let len = 0;
      while (len < 50) {
        const n = 3 + Math.floor(random() * 4);
        let w = s.benford ? weightedSample(lead, ([, f]) => f, random)[0] : String(1 + Math.floor(random() * 9));
        while (w.length < n) {
          const d = String(Math.floor(random() * 10));
          if (d !== w[w.length - 1]) w += d;
        }
        words.push(w);
        len += w.length;
      }
      return words.join(" ");
    }
    case "custom": {
      const words = s.customText.trim().split(/\s+/).filter(Boolean);
      if (!words.length) return "?";
      if (s.customRandomize) return fragment(uniqueWords(() => randomSample(words, random)), s, 1);
      let i = customCursor % words.length;
      return fragment(() => {
        const w = words[i % words.length];
        i++;
        customCursor = i;
        return w;
      }, s, 1);
    }
    case "books": {
      const p = src.passages[bookCursor % src.passages.length] ?? "?";
      bookCursor++;
      return p;
    }
  }
}

// Position in a custom text / book, so consecutive lessons continue it.
let customCursor = 0;
let bookCursor = 0;
export function resetCursors(book = 0) {
  customCursor = 0;
  bookCursor = book;
}
