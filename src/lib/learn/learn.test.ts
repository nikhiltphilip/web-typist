import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AdaptiveInput } from "./input";
import { DEFAULT_LEARN, generateText, guidedKeys, learningRate, unlockOrder } from "./lesson";
import { Filter, type ModelData, PhoneticModel } from "./model";
import { stepsFromKeystrokes } from "./record";
import { type KeySample, makeKeyStatsMap, makeResult, speedToTime, streaks, summaryStats, type TypingResult } from "./stats";

const model = new PhoneticModel(JSON.parse(fs.readFileSync(path.join(__dirname, "../../../public/learn/model-en.json"), "utf8")) as ModelData);
const order = unlockOrder(model, false);

/** Seeded RNG so generated text is reproducible. */
function lcg(seed = 1) {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
}

/** A fake lesson result where every given key took `ttt` ms. */
function result(at: number, cps: number[], ttt: number, errors = 0): TypingResult {
  return { at, source: "learn", kind: "guided", length: 100, time: 30000, errors, histogram: cps.map((cp) => [cp, 10, 0, ttt]) };
}

describe("phonetic model", () => {
  it("only uses the allowed letters and always includes the focused one", () => {
    const six = order.slice(0, 6);
    const filter = new Filter(six, six[5]);
    const allowed = new Set(six.map((l) => l.label));
    const rng = lcg(7);
    for (let i = 0; i < 200; i++) {
      const w = model.nextWord(filter, rng);
      expect([...w].every((c) => allowed.has(c))).toBe(true);
      expect(w).toContain(six[5].label);
    }
  });

  it("makes words of reasonable length", () => {
    const rng = lcg(3);
    const lengths = Array.from({ length: 200 }, () => model.nextWord(new Filter(null, null), rng).length);
    expect(Math.min(...lengths)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...lengths)).toBeLessThanOrEqual(12);
  });
});

describe("guided lesson (keybr GuidedLesson.update)", () => {
  const cps = order.map((l) => l.codePoint);

  it("starts with six keys and focuses one of them", () => {
    const keys = guidedKeys(order, makeKeyStatsMap(cps, []), DEFAULT_LEARN);
    expect(keys.filter((k) => k.included)).toHaveLength(6);
    expect(keys.filter((k) => k.focused)).toHaveLength(1);
  });

  it("unlocks the next key once every included key reaches target speed", () => {
    const fast = speedToTime(DEFAULT_LEARN.targetSpeed) * 0.8; // faster than target
    const six = cps.slice(0, 6);
    const map = makeKeyStatsMap(cps, [result(1, six, fast), result(2, six, fast)]);
    const keys = guidedKeys(order, map, DEFAULT_LEARN);
    expect(keys.filter((k) => k.included)).toHaveLength(7);
    // The new key has no data yet, so it is the weakest and gets the focus.
    expect(keys.find((k) => k.focused)?.letter.codePoint).toBe(cps[6]);
  });

  it("keeps the alphabet while any key is below target", () => {
    const slow = speedToTime(DEFAULT_LEARN.targetSpeed) * 2;
    const map = makeKeyStatsMap(cps, [result(1, cps.slice(0, 6), slow)]);
    expect(guidedKeys(order, map, DEFAULT_LEARN).filter((k) => k.included)).toHaveLength(6);
  });

  it("alphabet size forces extra keys in", () => {
    const keys = guidedKeys(order, makeKeyStatsMap(cps, []), { ...DEFAULT_LEARN, alphabetSize: 1 });
    expect(keys.filter((k) => k.included)).toHaveLength(order.length);
  });

  it("generates a 100+ character lesson from the included keys", () => {
    const keys = guidedKeys(order, makeKeyStatsMap(cps, []), DEFAULT_LEARN);
    const text = generateText(keys, DEFAULT_LEARN, { model, dictionary: ["tea", "eat", "rain"], passages: [] }, lcg(5));
    const allowed = new Set([" ", ...keys.filter((k) => k.included).map((k) => k.letter.label)]);
    expect(text.replace(/ /g, "").length).toBeGreaterThanOrEqual(100);
    expect([...text].every((c) => allowed.has(c))).toBe(true);
  });
});

describe("learning rate", () => {
  it("predicts lessons remaining for a key that is steadily improving", () => {
    const samples: KeySample[] = Array.from({ length: 14 }, (_, i) => ({
      index: i,
      at: i * 60000,
      hit: 30,
      miss: 0,
      timeToType: 500 - i * 10,
      filteredTimeToType: 500 - i * 10,
    }));
    const lr = learningRate(samples, 175);
    expect(lr).not.toBeNull();
    expect(lr!.rate).toBeGreaterThan(0);
    expect(lr!.remaining).toBeGreaterThan(0);
  });
});

describe("AdaptiveInput (keybr TextInput)", () => {
  const opts = { stopOnError: true, forgiveErrors: false, spaceSkipsWords: false };

  it("stops on error and marks the letter as missed", () => {
    const t = new AdaptiveInput("ab cd", opts);
    t.input("a", 0);
    t.input("x", 100);
    expect(t.pos).toBe(1);
    t.input("b", 200);
    expect(t.pos).toBe(2);
    expect(t.marks[1]).toBe("incorrect");
    expect(t.steps[1].typo).toBe(true);
  });

  it("forgives a replaced character", () => {
    const t = new AdaptiveInput("abcdef", { ...opts, forgiveErrors: true });
    for (const [i, c] of [..."xbcd"].entries()) t.input(c, i * 100);
    expect(t.pos).toBe(4);
    expect(t.steps.map((s) => s.typo)).toEqual([true, false, false, false]);
  });

  it("space can skip the rest of a word", () => {
    const t = new AdaptiveInput("abc def", { ...opts, spaceSkipsWords: true });
    t.input("a", 0);
    t.input(" ", 100);
    expect(t.pos).toBe(4);
  });

  it("finishes after the last character and builds a result", () => {
    const t = new AdaptiveInput("abc def", opts);
    [..."abc def"].forEach((c, i) => t.input(c, i * 200));
    expect(t.done).toBe(true);
    const r = makeResult("learn", "guided", 0, t.steps, t.elapsedMs());
    expect(r.length).toBe(7);
    expect(r.errors).toBe(0);
    expect(r.histogram.every(([, , , ttt]) => ttt === 200)).toBe(true);
  });
});

describe("results", () => {
  it("summary delta is last value minus the earlier average", () => {
    const rs = [result(1, [97, 98, 99], 300), result(2, [97, 98, 99], 300), { ...result(3, [97, 98, 99], 300), time: 15000 }];
    const s = summaryStats(rs);
    expect(s.count).toBe(3);
    expect(s.speed.delta).toBeCloseTo(s.speed.last - 200, 5);
  });

  it("streaks count consecutive lessons at each accuracy level", () => {
    const rs = [0, 0, 5, 0, 0, 0].map((e, i) => result(i, [97, 98, 99], 300, e));
    const [perfect, , ninetyFive] = streaks(rs);
    expect(perfect.longest).toBe(3);
    expect(perfect.current).toBe(3);
    expect(ninetyFive.longest).toBe(6);
  });

  it("converts test keystrokes into steps with time between keys", () => {
    const steps = stepsFromKeystrokes([
      { ms: 0, correct: true, cp: 97 },
      { ms: 150, correct: false, cp: 98 },
      { ms: 400, correct: true, cp: 98 },
    ]);
    expect(steps.map((s) => s.timeToType)).toEqual([0, 150, 250]);
    expect(steps[1].typo).toBe(true);
  });
});
