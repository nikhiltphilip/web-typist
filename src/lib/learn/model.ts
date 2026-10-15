// Letter-level Markov model ("phonetic model") that generates pronounceable
// pseudo-words from a restricted set of letters. A port of keybr.com's
// @keybr/phonetic-model (AGPL-3.0, https://github.com/aradzie/keybr.com):
// TransitionTableBuilder, the 255-scaled segment frequencies, PrefixList and
// nextWord(). The model data is our own, built from Monkeytype's english_10k
// word list by scripts/build-model.ts.

import BLACKLIST from "./blacklist-en.json";

export const SPACE = 0x20;
const MIN_LENGTH = 3;
const MAX_LENGTH = 10;

export interface Entry {
  readonly codePoint: number;
  readonly frequency: number;
}

/** Serialized model: segment index → flat [alphabetIndex, frequency, …]. */
export interface ModelData {
  order: number;
  alphabet: number[];
  segments: Record<string, number[]>;
}

export class Chain {
  readonly size: number;
  readonly segments: number;
  readonly width: number;
  readonly offsets: number[];
  private readonly lookup = new Map<number, number>();

  constructor(
    readonly order: number,
    readonly alphabet: readonly number[],
  ) {
    this.size = alphabet.length;
    this.segments = this.size ** (order - 1);
    this.width = this.size ** order;
    this.offsets = Array.from({ length: order }, (_, i) => this.size ** (order - i - 1));
    alphabet.forEach((cp, i) => this.lookup.set(cp, i));
  }

  index(codePoint: number): number {
    return this.lookup.get(codePoint) ?? -1;
  }

  /** Index of the segment that follows the last order-1 letters of `chain`. */
  segmentIndex(chain: readonly number[]): number {
    const { order, offsets } = this;
    let index = 0;
    for (let i = 0; i < order - 1; i++) {
      const cp = chain[chain.length - order + i + 1] ?? SPACE;
      index += this.index(cp) * offsets[i + 1];
    }
    return index;
  }

  entryIndex(chain: readonly number[]): number {
    const { order, offsets } = this;
    let index = 0;
    for (let i = 0; i < order; i++) {
      const cp = chain[chain.length - order + i] ?? SPACE;
      index += this.index(cp) * offsets[i];
    }
    return index;
  }
}

export class TransitionTableBuilder {
  readonly chain: Chain;
  readonly frequencies: Float64Array;

  constructor(order: number, alphabet: readonly number[]) {
    this.chain = new Chain(order, alphabet);
    this.frequencies = new Float64Array(this.chain.width);
  }

  /** Adds a word `weight` times (keybr appends a word once per occurrence). */
  append(word: string, weight = 1): void {
    const { order, alphabet } = this.chain;
    const chain: number[] = new Array(order).fill(SPACE);
    const push = (cp: number): boolean => {
      if (cp === SPACE && chain[order - 1] === SPACE) return false;
      chain.shift();
      chain.push(cp);
      return true;
    };
    for (const ch of word) {
      const cp = ch.codePointAt(0)!;
      if (push(cp !== SPACE && alphabet.includes(cp) ? cp : SPACE)) this.frequencies[this.chain.entryIndex(chain)] += weight;
    }
    if (push(SPACE)) this.frequencies[this.chain.entryIndex(chain)] += weight;
  }

  build(): ModelData {
    const { chain, frequencies } = this;
    const segments: Record<string, number[]> = {};
    for (let s = 0; s < chain.segments; s++) {
      const segment: { i: number; f: number }[] = [];
      for (let e = 0; e < chain.size; e++) {
        const f = frequencies[s * chain.size + e];
        if (f > 0) segment.push({ i: e, f });
      }
      if (segment.length) {
        scale(segment);
        segments[s] = segment.flatMap(({ i, f }) => [i, f]);
      }
    }
    return { order: chain.order, alphabet: [...chain.alphabet], segments };
  }
}

/** keybr's scaleRough + scaleFine: integer frequencies summing to 255. */
function scale(segment: { f: number }[]) {
  const sorted = [...segment].sort((a, b) => b.f - a.f);
  let sum = sorted.reduce((a, e) => a + e.f, 0);
  for (const e of sorted) e.f = Math.max(1, Math.round((255 / sum) * e.f));
  sum = sorted.reduce((a, e) => a + e.f, 0);
  while (sum > 255) {
    for (let i = 0; sum > 255 && i < sorted.length; i++) {
      if (sorted[i].f > 1) {
        sorted[i].f--;
        sum--;
      }
    }
  }
  while (sum < 255) {
    for (let i = 0; sum < 255 && i < sorted.length; i++) {
      sorted[i].f++;
      sum++;
    }
  }
}

export class Letter {
  constructor(
    readonly codePoint: number,
    /** Relative frequency, normalised to sum 1 over the alphabet. */
    readonly f: number,
    readonly label: string = String.fromCodePoint(codePoint),
  ) {}
  toString() {
    return this.label;
  }
}

/** Which letters may appear, and which one every word must contain. */
export class Filter {
  readonly codePoints: Set<number> | null;
  readonly focused: number | null;
  constructor(letters: readonly Letter[] | null, focused: Letter | null) {
    this.codePoints = letters && new Set(letters.map((l) => l.codePoint));
    this.focused = focused?.codePoint ?? null;
  }
  includes(cp: number): boolean {
    return this.codePoints == null || this.codePoints.has(cp);
  }
}

export type RNG = () => number;

export function weightedSample<T>(items: readonly T[], weight: (t: T) => number, random: RNG): T {
  let total = 0;
  for (const it of items) total += weight(it);
  let r = random() * total;
  for (const it of items) {
    r -= weight(it);
    if (r < 0) return it;
  }
  return items[items.length - 1];
}

export const randomSample = <T>(items: readonly T[], random: RNG): T => items[Math.floor(random() * items.length)];

// keybr stores its blacklist lightly scrambled so the file isn't a list of slurs.
function unscramble(word: string): string {
  const a = Array.from(word);
  return a.map((_, i) => a[(23 * i + 13) % a.length]).join("");
}
const blacklist = new Set((BLACKLIST as string[]).map(unscramble));

export class PhoneticModel {
  readonly chain: Chain;
  readonly letters: Letter[];
  private readonly segments: Entry[][];
  /** Prefixes up to MIN_LENGTH letters, indexed by each letter they contain. */
  private readonly prefixes = new Map<number, number[][]>();

  constructor(data: ModelData) {
    this.chain = new Chain(data.order, data.alphabet);
    this.segments = Array.from({ length: this.chain.segments }, (_, s) => {
      const flat = data.segments[s] ?? [];
      const out: Entry[] = [];
      for (let k = 0; k < flat.length; k += 2) out.push({ codePoint: data.alphabet[flat[k]], frequency: flat[k + 1] });
      return out;
    });

    const totals = new Map<number, number>(data.alphabet.map((cp) => [cp, 0]));
    for (const seg of this.segments) for (const e of seg) totals.set(e.codePoint, (totals.get(e.codePoint) ?? 0) + e.frequency);
    totals.delete(SPACE);
    const sum = [...totals.values()].reduce((a, b) => a + b, 0);
    this.letters = [...totals].map(([cp, f]) => new Letter(cp, f / sum));

    for (const cp of data.alphabet) this.prefixes.set(cp, []);
    const walk = (word: number[]) => {
      for (const { codePoint } of this.segment(word)) {
        if (codePoint === SPACE) continue;
        word.push(codePoint);
        const prefix = [...word];
        for (const cp of new Set(word)) this.prefixes.get(cp)!.push(prefix);
        if (word.length < MIN_LENGTH) walk(word);
        word.pop();
      }
    };
    walk([]);
  }

  segment(word: readonly number[]): Entry[] {
    return this.segments[this.chain.segmentIndex(word)];
  }

  /** Letters by descending frequency: the order keys are unlocked in. */
  frequencyOrder(): Letter[] {
    return [...this.letters].sort((a, b) => b.f - a.f || a.codePoint - b.codePoint);
  }

  private findPrefixes(filter: Filter): number[][] {
    if (filter.focused == null) return [];
    const found = (this.prefixes.get(filter.focused) ?? []).filter((p) => p.every((cp) => filter.includes(cp)));
    return found.length ? found : [[filter.focused]];
  }

  /** One pseudo-word using only the filter's letters, containing its focused letter. */
  nextWord(filter: Filter, random: RNG = Math.random): string {
    for (let tries = 0; tries < 20; tries++) {
      const w = this.generate(filter, random);
      if (w && !blacklist.has(w)) return w;
    }
    return this.generate(filter, random);
  }

  private generate(filter: Filter, random: RNG): string {
    const prefixes = this.findPrefixes(filter);
    const word: number[] = [];
    let attempt = 0;
    const retry = (): boolean => {
      if (attempt >= 5) return false;
      attempt++;
      word.length = 0;
      if (prefixes.length) word.push(...randomSample(prefixes, random));
      return true;
    };
    retry();
    for (;;) {
      const entries = this.segment(word)
        .filter(({ codePoint }) => (codePoint === SPACE ? word.length >= MIN_LENGTH : filter.includes(codePoint)))
        // Boost the space to keep words short.
        .map(({ codePoint, frequency }) => ({ codePoint, frequency: codePoint === SPACE ? frequency * 1.3 ** word.length : frequency }));
      if (entries.length === 0) {
        if (retry()) continue;
        return String.fromCodePoint(...word);
      }
      const entry = weightedSample(entries, (e) => e.frequency, random);
      if (entry.codePoint === SPACE) return String.fromCodePoint(...word);
      if (word.length > MAX_LENGTH) {
        if (retry()) continue;
        return String.fromCodePoint(...word);
      }
      word.push(entry.codePoint);
    }
  }
}

let cached: Promise<PhoneticModel> | null = null;
export function loadModel(): Promise<PhoneticModel> {
  cached ??= fetch("/learn/model-en.json")
    .then((r) => r.json() as Promise<ModelData>)
    .then((d) => new PhoneticModel(d));
  return cached;
}
