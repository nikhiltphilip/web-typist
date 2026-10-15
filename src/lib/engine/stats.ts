// Stat formulas, ported from Monkeytype (packages/util/src/numbers.ts,
// frontend/src/ts/utils/strings.ts countChars, test-logic.ts).

export function calculateWpm(chars: number, seconds: number): number {
  if (seconds <= 0) return 0;
  return chars / 5 / (seconds / 60);
}

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function stdDev(xs: number[]): number {
  if (!xs.length) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

/** Maps a coefficient of variation to a 0–100 "consistency" score. */
export function kogasa(cov: number): number {
  return 100 * (1 - Math.tanh(cov + Math.pow(cov, 3) / 3 + Math.pow(cov, 5) / 5));
}

export function consistency(rawPerSecond: number[]): number {
  const v = roundTo2(kogasa(stdDev(rawPerSecond) / mean(rawPerSecond)));
  return Number.isFinite(v) ? Math.max(0, v) : 0;
}

export const roundTo2 = (n: number) => Math.round(n * 100) / 100;

export interface CharCounts {
  allCorrect: number;
  correctWord: number;
  incorrect: number;
  extra: number;
  missed: number;
}

export function countChars(input: string, target: string, creditPartial: boolean): CharCounts {
  const c: CharCounts = { allCorrect: 0, correctWord: 0, incorrect: 0, extra: 0, missed: 0 };
  const wordCorrect = input === target;
  const partial = target.startsWith(input);
  for (let i = 0; i < Math.max(input.length, target.length); i++) {
    const a = input[i];
    const b = target[i];
    if (a === b) {
      if (b === " " && !wordCorrect) c.extra++;
      else c.allCorrect++;
      if (wordCorrect || (creditPartial && partial)) c.correctWord++;
    } else if (a === undefined) {
      if (!creditPartial) c.missed++;
    } else if (b === undefined || (b === " " && a !== " " && !input.includes(" "))) {
      c.extra++;
    } else {
      c.incorrect++;
    }
  }
  return c;
}

export function addCounts(a: CharCounts, b: CharCounts): CharCounts {
  return {
    allCorrect: a.allCorrect + b.allCorrect,
    correctWord: a.correctWord + b.correctWord,
    incorrect: a.incorrect + b.incorrect,
    extra: a.extra + b.extra,
    missed: a.missed + b.missed,
  };
}

/** One keystroke, timestamped from test start. */
export interface Keystroke {
  ms: number;
  correct: boolean;
}

export interface ChartPoint {
  second: number;
  wpm: number;
  raw: number;
  errors: number;
}

/**
 * Per-second series for the result chart: running wpm from correct
 * keystrokes, raw ("burst") speed inside each second, and errors per second.
 */
export function chartSeries(keys: Keystroke[], durationMs: number): ChartPoint[] {
  // A trailing sliver under half a second is folded into the last full
  // second; measured on its own it shows a huge, meaningless burst.
  const whole = Math.floor(durationMs / 1000);
  const seconds = Math.max(1, durationMs - whole * 1000 >= 500 ? whole + 1 : whole);
  const out: ChartPoint[] = [];
  let correctSoFar = 0;
  let k = 0;
  for (let s = 1; s <= seconds; s++) {
    const last = s === seconds;
    const end = last ? durationMs : s * 1000;
    let inSecond = 0;
    let errors = 0;
    while (k < keys.length && (last || keys[k].ms <= end)) {
      inSecond++;
      if (keys[k].correct) correctSoFar++;
      else errors++;
      k++;
    }
    const span = (end - (s - 1) * 1000) / 1000;
    out.push({
      second: s,
      wpm: roundTo2(calculateWpm(correctSoFar, end / 1000)),
      raw: roundTo2(span > 0 ? calculateWpm(inSecond, span) : 0),
      errors,
    });
  }
  return out;
}
