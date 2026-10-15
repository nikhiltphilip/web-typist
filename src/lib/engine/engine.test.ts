import { describe, expect, it } from "vitest";
import { chartSeries, countChars, kogasa } from "./stats";
import { StreamDrill, errorTooHigh } from "./stream";
import { WordsTest } from "./words";

const typeAll = (d: StreamDrill, keys: string[]) => keys.forEach((k, i) => d.input(k, 1000 + i * 100));

describe("StreamDrill (gtypist)", () => {
  it("requires Enter at the end of every line", () => {
    const d = new StreamDrill("ab\ncd\n", { speedTest: false, wordProcessor: false });
    typeAll(d, ["a", "b", "c"]);
    expect(d.errors).toBe(1); // 'c' typed where the newline was expected
    expect(d.marks[2]).toBe("incorrect");
  });

  it("finishes after the final Enter", () => {
    const d = new StreamDrill("ab\n", { speedTest: false, wordProcessor: false });
    typeAll(d, ["a", "b", "\n"]);
    expect(d.done).toBe(true);
    expect(d.result().errors).toBe(0);
  });

  it("ignores Backspace in drills", () => {
    const d = new StreamDrill("ab\n", { speedTest: false, wordProcessor: false });
    typeAll(d, ["x", "Backspace"]);
    expect(d.pos).toBe(1);
    expect(d.charsTyped).toBe(1);
  });

  it("allows Backspace in speed tests but not across a newline", () => {
    const d = new StreamDrill("ab\ncd\n", { speedTest: true, wordProcessor: false });
    typeAll(d, ["a", "x", "Backspace"]);
    expect(d.pos).toBe(1);
    expect(d.errors).toBe(1); // the error still counts
    typeAll(d, ["b", "\n", "Backspace"]);
    expect(d.pos).toBe(3);
  });

  it("re-syncs when the typist skips a character", () => {
    const d = new StreamDrill("abc\n", { speedTest: false, wordProcessor: false });
    typeAll(d, ["a", "c"]);
    expect(d.marks.slice(0, 3)).toEqual(["correct", "incorrect", "correct"]);
    expect(d.pos).toBe(3);
    expect(d.errors).toBe(1);
  });

  it("ignores a late key right after an error", () => {
    const d = new StreamDrill("abc\n", { speedTest: false, wordProcessor: false });
    typeAll(d, ["x", "a"]);
    expect(d.pos).toBe(1);
    expect(d.errors).toBe(1);
  });

  it("auto-types leading spaces", () => {
    const d = new StreamDrill("  ab\n", { speedTest: false, wordProcessor: false });
    expect(d.pos).toBe(2);
  });

  it("word-processor mode accepts Space for a line break", () => {
    const d = new StreamDrill("ab\ncd\n", { speedTest: false, wordProcessor: true });
    typeAll(d, ["a", "b", " "]);
    expect(d.errors).toBe(0);
    expect(d.pos).toBe(3);
  });

  it("compares error rate at one decimal like gtypist", () => {
    expect(errorTooHigh(3.04, 3)).toBe(false);
    expect(errorTooHigh(3.1, 3)).toBe(true);
  });
});

describe("WordsTest (monkeytype)", () => {
  it("counts a clean words test", () => {
    const t = new WordsTest({ mode: "words", words: ["hi", "yo"] });
    let now = 0;
    for (const c of "hi") t.type(c, (now += 100));
    t.space((now += 100));
    for (const c of "yo") t.type(c, (now += 100));
    expect(t.done).toBe(true);
    const r = t.result();
    expect(r.acc).toBe(100);
    expect(r.chars.correctWord).toBe(5); // "hi " + "yo"
  });

  it("only lets backspace return to a mistyped word", () => {
    const t = new WordsTest({ mode: "words", words: ["ab", "cd", "ef"] });
    t.type("a", 1);
    t.type("b", 2);
    t.space(3);
    t.backspace(false);
    expect(t.active).toBe(1);
    t.type("x", 4);
    t.space(5);
    t.backspace(false);
    expect(t.active).toBe(1);
  });

  it("ignores space on an empty word", () => {
    const t = new WordsTest({ mode: "words", words: ["ab", "cd"] });
    expect(t.space(1)).toBeNull();
  });

  it("ends a time test when the clock runs out", () => {
    const t = new WordsTest({ mode: "time", words: ["a", "b", "c"], timeLimit: 15 });
    t.type("a", 0);
    t.tick(15_001);
    expect(t.done).toBe(true);
    expect(t.elapsedMs()).toBe(15_000);
  });
});

describe("stats", () => {
  it("matches monkeytype countChars", () => {
    expect(countChars("helo ", "hello ", false)).toMatchObject({ incorrect: 2, missed: 1 });
    expect(countChars("hello", "hello", false).correctWord).toBe(5);
  });

  it("kogasa is 100 for perfectly even typing", () => {
    expect(kogasa(0)).toBe(100);
  });
});

describe("chartSeries", () => {
  it("folds a short trailing fraction into the last second", () => {
    const keys = Array.from({ length: 30 }, (_, i) => ({ ms: i * 70, correct: true }));
    const pts = chartSeries(keys, 2100);
    expect(pts).toHaveLength(2);
    expect(pts.reduce((a, p) => a + p.raw, 0)).toBeLessThan(400);
  });
});
