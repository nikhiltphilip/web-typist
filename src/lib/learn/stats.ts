// Typing results and the statistics built from them. Ported from keybr.com's
// @keybr/result, @keybr/textinput (Histogram) and @keybr/math (AGPL-3.0):
// per-key histograms, exponentially smoothed key speed (α = 0.1), summary
// metrics, accuracy streaks and daily totals. Speeds are characters per
// minute internally (keybr's unit); the UI shows wpm = cpm / 5.

export type Source = "learn" | "test" | "course";

/** [codePoint, hitCount, missCount, timeToType ms] */
export type KeySampleTuple = [number, number, number, number];

/** What is stored in IndexedDB for every finished lesson / test / drill. */
export interface TypingResult {
  id?: number;
  at: number;
  source: Source;
  kind: string;
  /** Characters typed (steps). */
  length: number;
  /** Duration in ms. */
  time: number;
  errors: number;
  histogram: KeySampleTuple[];
}

export interface Step {
  codePoint: number;
  /** ms since the previous key event (keybr TimeToType); 0 when unknown. */
  timeToType: number;
  typo: boolean;
}

// ── histogram ───────────────────────────────────────────────────────────────

/** keybr: a sample faster than 300 wpm or slower than 1 wpm is noise. */
export const validSample = (ttt: number) => ttt === 0 || (ttt >= 40 && ttt <= 12000);

export function histogramFrom(steps: readonly Step[]): KeySampleTuple[] {
  const acc = new Map<number, { hit: number; miss: number; time: number; n: number }>();
  for (const { codePoint, timeToType, typo } of steps) {
    let s = acc.get(codePoint);
    if (!s) acc.set(codePoint, (s = { hit: 0, miss: 0, time: 0, n: 0 }));
    s.hit++;
    if (typo) s.miss++;
    else if (timeToType > 0) {
      s.time += timeToType;
      s.n++;
    }
  }
  return [...acc]
    .sort((a, b) => a[0] - b[0])
    .map(([cp, s]): KeySampleTuple => [cp, s.hit, s.miss, s.n ? Math.round(s.time / s.n) : 0])
    .filter((t) => validSample(t[3]));
}

export function makeResult(source: Source, kind: string, at: number, steps: readonly Step[], time: number): TypingResult {
  return {
    at,
    source,
    kind,
    length: steps.length,
    time: Math.round(time),
    errors: steps.filter((s) => s.typo).length,
    // keybr ignores the first ("trigger") step: it has no time-to-type.
    histogram: histogramFrom(steps.slice(1)),
  };
}

export const speedOf = (r: Pick<TypingResult, "length" | "time">) => (r.time > 0 ? (r.length / (r.time / 1000)) * 60 : 0);
export const accuracyOf = (r: Pick<TypingResult, "length" | "errors">) => (r.length > 0 ? (r.length - r.errors) / r.length : 0);
/** keybr's score: speed × distinct keys ÷ (errors + 1) × length ÷ 50. */
export const scoreOf = (r: TypingResult) => ((speedOf(r) * r.histogram.length) / (r.errors + 1)) * (r.length / 50);

export const cpmToWpm = (cpm: number) => cpm / 5;
export const timeToSpeed = (ms: number) => 60000 / ms;
export const speedToTime = (cpm: number) => 60000 / cpm;

/** keybr Result.validate: long enough, slow enough and varied enough to count. */
export function isValidResult(r: TypingResult): boolean {
  const speed = speedOf(r);
  return r.length >= 10 && r.time >= 1000 && r.histogram.length >= 3 && speed >= 1 && r.histogram.every((h) => validSample(h[3]));
}

// ── per-key stats ───────────────────────────────────────────────────────────

export interface KeySample {
  index: number;
  at: number;
  hit: number;
  miss: number;
  timeToType: number;
  filteredTimeToType: number;
}

export interface KeyStats {
  codePoint: number;
  samples: KeySample[];
  /** Smoothed time-to-type of the latest sample, ms. */
  timeToType: number | null;
  /** Best smoothed time-to-type ever reached, ms. */
  bestTimeToType: number | null;
  hits: number;
  misses: number;
}

export type KeyStatsMap = Map<number, KeyStats>;

/** Builds per-key stats one result at a time (the map is updated in place). */
export class KeyStatsBuilder {
  readonly map: KeyStatsMap = new Map();
  private readonly filters = new Map<number, number>();

  constructor(codePoints: readonly number[]) {
    for (const cp of codePoints) this.map.set(cp, { codePoint: cp, samples: [], timeToType: null, bestTimeToType: null, hits: 0, misses: 0 });
  }

  add(r: TypingResult): void {
    for (const [cp, hit, miss, ttt] of r.histogram) {
      const ks = this.map.get(cp);
      if (!ks) continue;
      ks.hits += hit;
      ks.misses += miss;
      if (ttt <= 0) continue;
      const prev = this.filters.get(cp);
      // keybr makeFilter(0.1): exponential moving average.
      const filtered = prev === undefined ? ttt : 0.1 * ttt + 0.9 * prev;
      this.filters.set(cp, filtered);
      ks.samples.push({ index: ks.samples.length, at: r.at, hit, miss, timeToType: ttt, filteredTimeToType: filtered });
      ks.timeToType = filtered;
      ks.bestTimeToType = Math.min(ks.bestTimeToType ?? Infinity, filtered);
    }
  }
}

export function makeKeyStatsMap(codePoints: readonly number[], results: readonly TypingResult[]): KeyStatsMap {
  const b = new KeyStatsBuilder(codePoints);
  for (const r of results) b.add(r);
  return b.map;
}

// ── summary metrics ─────────────────────────────────────────────────────────

export interface Metric {
  last: number;
  /** Last value minus the average before it (keybr's delta). */
  delta: number;
  min: number;
  max: number;
  avg: number;
}

export interface SummaryStats {
  count: number;
  time: number;
  speed: Metric;
  accuracy: Metric;
  score: Metric;
}

function metric(values: number[]): Metric {
  if (!values.length) return { last: 0, delta: 0, min: 0, max: 0, avg: 0 };
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  let delta = values[0];
  values.forEach((v, i) => {
    if (i > 0) delta = v - sum / i;
    sum += v;
    min = Math.min(min, v);
    max = Math.max(max, v);
  });
  return { last: values[values.length - 1], delta, min, max, avg: sum / values.length };
}

export function summaryStats(results: readonly TypingResult[]): SummaryStats {
  return {
    count: results.length,
    time: results.reduce((a, r) => a + r.time, 0),
    speed: metric(results.map(speedOf)),
    accuracy: metric(results.map(accuracyOf)),
    score: metric(results.map(scoreOf)),
  };
}

// ── accuracy streaks ────────────────────────────────────────────────────────

export const STREAK_LEVELS = [1, 0.97, 0.95] as const;

export interface Streak {
  level: number;
  /** Longest run of consecutive results at or above the level. */
  longest: number;
  /** The run that is still going (ends at the latest result). */
  current: number;
}

export function streaks(results: readonly TypingResult[]): Streak[] {
  return STREAK_LEVELS.map((level) => {
    let run = 0;
    let longest = 0;
    for (const r of results) {
      run = accuracyOf(r) >= level ? run + 1 : 0;
      longest = Math.max(longest, run);
    }
    return { level, longest, current: run };
  });
}

// ── daily totals ────────────────────────────────────────────────────────────

export const dayKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export interface DailyStats {
  day: string;
  count: number;
  time: number;
  speed: number;
  accuracy: number;
}

export function dailyStats(results: readonly TypingResult[]): Map<string, DailyStats> {
  const map = new Map<string, TypingResult[]>();
  for (const r of results) {
    const k = dayKey(r.at);
    const list = map.get(k);
    if (list) list.push(r);
    else map.set(k, [r]);
  }
  const out = new Map<string, DailyStats>();
  for (const [day, rs] of map) {
    const s = summaryStats(rs);
    out.set(day, { day, count: s.count, time: s.time, speed: s.speed.avg, accuracy: s.accuracy.avg });
  }
  return out;
}

// ── math: polynomial regression (keybr @keybr/math) ─────────────────────────

/** Least-squares polynomial fit. x is centred and scaled for stability. */
export class Polynomial {
  private constructor(
    private readonly coef: number[],
    private readonly x0: number,
    private readonly s: number,
  ) {}

  static fit(xs: readonly number[], ys: readonly number[], degree: number): Polynomial {
    const n = xs.length;
    const x0 = xs.reduce((a, b) => a + b, 0) / n;
    const s = Math.max(1, Math.max(...xs.map((x) => Math.abs(x - x0))));
    const d = Math.min(degree, n - 1);
    const m = d + 1;
    // Normal equations: (AᵀA) c = Aᵀy
    const ata = Array.from({ length: m }, () => new Array(m).fill(0));
    const aty = new Array(m).fill(0);
    for (let k = 0; k < n; k++) {
      const t = (xs[k] - x0) / s;
      const pow = Array.from({ length: m }, (_, i) => t ** i);
      for (let i = 0; i < m; i++) {
        aty[i] += pow[i] * ys[k];
        for (let j = 0; j < m; j++) ata[i][j] += pow[i] * pow[j];
      }
    }
    return new Polynomial(solve(ata, aty), x0, s);
  }

  eval(x: number): number {
    const t = (x - this.x0) / this.s;
    return this.coef.reduce((acc, c, i) => acc + c * t ** i, 0);
  }

  /** dy/dx at x. */
  derivative(x: number): number {
    const t = (x - this.x0) / this.s;
    let d = 0;
    for (let i = 1; i < this.coef.length; i++) d += i * this.coef[i] * t ** (i - 1);
    return d / this.s;
  }
}

function solve(a: number[][], b: number[]): number[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    [m[c], m[p]] = [m[p], m[c]];
    if (Math.abs(m[c][c]) < 1e-12) continue;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  return m.map((row, i) => (Math.abs(row[i]) < 1e-12 ? 0 : row[n] / row[i]));
}

/** Coefficient of determination of a fit. */
export function r2(xs: readonly number[], ys: readonly number[], p: Polynomial): number {
  const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
  let ssRes = 0;
  let ssTot = 0;
  xs.forEach((x, i) => {
    ssRes += (ys[i] - p.eval(x)) ** 2;
    ssTot += (ys[i] - mean) ** 2;
  });
  return ssTot === 0 ? 0 : 1 - ssRes / ssTot;
}

/** Exponential smoothing for charts (keybr's SmoothnessRange). */
export function smooth(values: readonly number[], alpha: number): number[] {
  let v = NaN;
  return values.map((x, i) => (v = i === 0 ? x : alpha * x + (1 - alpha) * v));
}
