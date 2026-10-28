// Monkeytype-style word test: you type into the current word, space commits it,
// backspace can return to a previous word only if that word has a mistake.

import {
  addCounts,
  calculateWpm,
  chartSeries,
  consistency,
  countChars,
  roundTo2,
  type CharCounts,
  type ChartPoint,
  type Keystroke,
} from "./stats";

export type Mode = "time" | "words" | "quote" | "zen" | "custom";

export interface TestResult {
  wpm: number;
  raw: number;
  acc: number;
  consistency: number;
  chars: CharCounts;
  durationMs: number;
  chart: ChartPoint[];
  keystrokes: number;
  correctKeys: number;
}

const MAX_EXTRA = 10;
type Listener = () => void;

export class WordsTest {
  readonly mode: Mode;
  /** Seconds for time mode, otherwise 0. */
  readonly timeLimit: number;
  words: string[];
  inputs: string[];
  active = 0;
  startedAt: number | null = null;
  endedAt: number | null = null;
  keys: Keystroke[] = [];
  version = 0;
  readonly more: (() => string[]) | null;
  private listeners = new Set<Listener>();

  constructor(opts: { mode: Mode; words: string[]; timeLimit?: number; more?: () => string[] }) {
    this.mode = opts.mode;
    this.words = opts.mode === "zen" ? [""] : opts.words;
    this.inputs = this.words.map(() => "");
    this.timeLimit = opts.timeLimit ?? 0;
    this.more = opts.more ?? null;
  }

  get started() {
    return this.startedAt !== null;
  }
  get done() {
    return this.endedAt !== null;
  }

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  private emit() {
    this.version++;
    for (const l of this.listeners) l();
  }

  elapsedMs(now = performance.now()): number {
    if (this.startedAt === null) return 0;
    return (this.endedAt ?? now) - this.startedAt;
  }

  private begin(now: number) {
    if (this.startedAt === null) this.startedAt = now;
  }

  private log(now: number, correct: boolean, ch: string) {
    this.keys.push({ ms: now - (this.startedAt ?? now), correct, cp: ch.codePointAt(0) });
  }

  /** Grow the word list in time mode so the user never runs out. */
  private topUp() {
    if (!this.more || this.words.length - this.active > 40) return;
    const extra = this.more();
    this.words.push(...extra);
    this.inputs.push(...extra.map(() => ""));
  }

  /** Returns whether the keystroke was correct, or null if ignored. */
  type(ch: string, now = performance.now()): boolean | null {
    if (this.done) return null;
    this.begin(now);
    const i = this.active;
    const word = this.words[i];
    const input = this.inputs[i];

    if (this.mode === "zen") {
      this.inputs[i] = input + ch;
      this.words[i] = this.inputs[i];
      this.log(now, true, ch);
      this.emit();
      return true;
    }

    if (input.length >= word.length + MAX_EXTRA) return null;
    const correct = word[input.length] === ch;
    this.inputs[i] = input + ch;
    // Attribute the keystroke to the letter it should have been (or itself, past the word end).
    this.log(now, correct, word[input.length] ?? ch);

    // Last word typed exactly right ends the test without needing a space.
    if (i === this.words.length - 1 && this.mode !== "time" && this.inputs[i] === word) {
      this.finish(now);
      return correct;
    }
    this.emit();
    return correct;
  }

  space(now = performance.now()): boolean | null {
    if (this.done) return null;
    const i = this.active;
    const input = this.inputs[i];
    if (input === "") return null;
    this.begin(now);
    const correct = this.mode === "zen" || input === this.words[i];
    this.log(now, correct, " ");

    if (this.mode === "zen") {
      this.words.push("");
      this.inputs.push("");
    }
    if (i === this.words.length - 1) {
      this.finish(now);
      return correct;
    }
    this.active++;
    this.topUp();
    this.emit();
    return correct;
  }

  backspace(wholeWord: boolean): void {
    if (this.done || !this.started) return;
    const i = this.active;
    if (this.inputs[i] === "") {
      // Only a mistyped previous word can be re-entered (Monkeytype default).
      if (i === 0 || this.inputs[i - 1] === this.words[i - 1]) return;
      this.active--;
      if (this.mode === "zen") {
        this.words.pop();
        this.inputs.pop();
      }
      if (wholeWord) this.inputs[this.active] = "";
    } else {
      this.inputs[i] = wholeWord ? "" : this.inputs[i].slice(0, -1);
      if (this.mode === "zen") this.words[i] = this.inputs[i];
    }
    this.emit();
  }

  /** Called on a timer; ends a time-mode test when the clock runs out. */
  tick(now = performance.now()): void {
    if (this.mode === "time" && this.started && !this.done && this.elapsedMs(now) >= this.timeLimit * 1000) {
      this.finish(this.startedAt! + this.timeLimit * 1000);
    }
  }

  finish(now = performance.now()): void {
    if (this.done || !this.started) return;
    this.endedAt = now;
    this.emit();
  }

  liveWpm(now = performance.now()): number {
    const s = this.elapsedMs(now) / 1000;
    if (s < 1) return 0;
    return Math.round(calculateWpm(this.counts(true).correctWord, s));
  }

  liveAcc(): number {
    if (!this.keys.length) return 100;
    let correct = 0;
    for (const k of this.keys) if (k.correct) correct++;
    return Math.floor((correct / this.keys.length) * 100);
  }

  counts(creditPartial: boolean): CharCounts {
    let c: CharCounts = { allCorrect: 0, correctWord: 0, incorrect: 0, extra: 0, missed: 0 };
    for (let i = 0; i < this.active; i++) c = addCounts(c, countChars(this.inputs[i] + " ", this.words[i] + " ", false));
    const last = this.inputs[this.active];
    if (last) c = addCounts(c, countChars(last, this.words[this.active], creditPartial));
    return c;
  }

  result(): TestResult {
    const durationMs = this.elapsedMs();
    const s = durationMs / 1000;
    const chars = this.counts(this.mode === "time" || this.mode === "zen");
    const correctKeys = this.keys.filter((k) => k.correct).length;
    const chart = chartSeries(this.keys, durationMs);
    return {
      wpm: roundTo2(calculateWpm(chars.correctWord, s)),
      raw: roundTo2(calculateWpm(chars.allCorrect + chars.incorrect + chars.extra, s)),
      acc: this.keys.length ? roundTo2((correctKeys / this.keys.length) * 100) : 0,
      consistency: consistency(chart.map((p) => p.raw)),
      chars,
      durationMs,
      chart,
      keystrokes: this.keys.length,
      correctKeys,
    };
  }
}
