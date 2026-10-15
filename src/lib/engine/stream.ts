// gtypist-style character stream for course drills (D:/d:) and speed tests
// (S:/s:). Ported from do_drill/do_speedtest in gtypist's src/gtypist.c:
//
// - every line ends in "\n", so Enter is required at the end of each line
// - a wrong key is marked and the cursor still advances
// - "error sync": repeating the previous key right after an error is ignored,
//   and a key that matches the *next* character is replayed there
// - drills ignore Backspace; speed tests allow it, but not back across a
//   newline or tab (and the earlier error still counts)
// - word-processor mode: Space also completes a line, and runs of spaces /
//   blank lines / hyphenated line breaks are skipped automatically

import { calculateWpm, chartSeries, roundTo2, type ChartPoint, type Keystroke } from "./stats";

export type Mark = "untyped" | "correct" | "incorrect";

export interface StreamResult {
  charsTyped: number;
  errors: number;
  /** Error percentage, rounded to one decimal like gtypist prints it. */
  errorPct: number;
  durationMs: number;
  /** gtypist's raw speed (all keystrokes). */
  rawWpm: number;
  /** gtypist's adjusted speed: each error costs five characters. */
  wpm: number;
  acc: number;
  chart: ChartPoint[];
}

type Listener = () => void;

export class StreamDrill {
  readonly chars: string[];
  readonly marks: Mark[];
  readonly allowBackspace: boolean;
  readonly wordProcessor: boolean;
  pos = 0;
  charsTyped = 0;
  errors = 0;
  startedAt: number | null = null;
  endedAt: number | null = null;
  keys: Keystroke[] = [];
  version = 0;
  private errorSync = 0;
  private listeners = new Set<Listener>();

  constructor(text: string, opts: { speedTest: boolean; wordProcessor: boolean }) {
    this.chars = Array.from(text);
    this.marks = this.chars.map(() => "untyped");
    this.allowBackspace = opts.speedTest;
    this.wordProcessor = opts.wordProcessor;
    // Leading spaces are typed for you.
    while (this.chars[this.pos] === " ") this.marks[this.pos++] = "correct";
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

  /** Feed one key: a character, "\n" for Enter, "\t" for Tab, or "Backspace". */
  input(key: string, now = performance.now()): boolean | null {
    if (this.done) return null;

    if (key === "Backspace") {
      if (!this.allowBackspace) return null;
      this.count(now);
      const prev = this.chars[this.pos - 1];
      if (this.pos > 0 && prev !== "\n" && prev !== "\t") {
        this.pos--;
        this.marks[this.pos] = "untyped";
      }
      this.emit();
      return null;
    }

    const ok = this.feed(key, now);
    this.emit();
    return ok;
  }

  private count(now: number) {
    if (this.charsTyped === 0) this.startedAt = now;
    this.charsTyped++;
    this.errorSync--;
  }

  private feed(key: string, now: number): boolean | null {
    this.count(now);
    const at = this.pos;
    const expected = this.chars[at];
    let ok: boolean | null;

    if (key === expected || (this.wordProcessor && key === " " && expected === "\n")) {
      this.marks[at] = "correct";
      this.pos++;
      ok = true;
    } else {
      // Typist doubled the previous key: ignore it.
      if (this.errorSync >= 0 && at > 0 && key === this.chars[at - 1]) {
        this.keys.push({ ms: now - this.startedAt!, correct: true });
        return null;
      }
      this.marks[at] = "incorrect";
      this.pos++;
      this.errors++;
      this.errorSync = 1;
      ok = false;
    }
    this.keys.push({ ms: now - this.startedAt!, correct: ok });

    if (this.wordProcessor) this.autoAdvance(key, at);

    if (this.pos >= this.chars.length) {
      this.endedAt = now;
      return ok;
    }

    // Typist skipped a character: replay this key at the next position.
    if (ok === false && key === this.chars[this.pos]) {
      this.errorSync++;
      this.feed(key, now);
    }
    return ok;
  }

  private autoAdvance(key: string, at: number) {
    const skip = () => (this.marks[this.pos++] = "correct");
    if (key === " ") {
      while (this.chars[this.pos] === " ") skip();
    } else if (key === "\n") {
      while (this.chars[this.pos] === " " || this.chars[this.pos] === "\n") skip();
    } else if (/\p{L}/u.test(this.chars[at]) && this.chars[at + 1] === "-" && this.chars[at + 2] === "\n") {
      skip();
      skip();
    }
  }

  result(): StreamResult {
    const durationMs = this.elapsedMs();
    const minutes = durationMs / 60000;
    const cpm = minutes > 0 ? this.charsTyped / minutes : 9999.99;
    const adjusted = minutes > 0 ? Math.max(0, (this.charsTyped - this.errors * 5) / minutes) : 9999.99;
    const errorPct = this.charsTyped ? Math.round((1000 * this.errors) / this.charsTyped) / 10 : 0;
    return {
      charsTyped: this.charsTyped,
      errors: this.errors,
      errorPct,
      durationMs,
      rawWpm: roundTo2(Math.min(cpm, 9999.99) / 5),
      wpm: roundTo2(Math.min(adjusted, 9999.99) / 5),
      acc: roundTo2(100 - errorPct),
      chart: chartSeries(this.keys, durationMs),
    };
  }

  liveWpm(now = performance.now()): number {
    const s = this.elapsedMs(now) / 1000;
    return s < 1 ? 0 : Math.round(calculateWpm(Math.max(0, this.charsTyped - this.errors * 5), s));
  }
}

/** gtypist's is_error_too_high: compare at one-decimal precision. */
export function errorTooHigh(errorPct: number, maxPct: number): boolean {
  return Math.round(errorPct * 10) / 10 > Math.round(maxPct * 10) / 10;
}
