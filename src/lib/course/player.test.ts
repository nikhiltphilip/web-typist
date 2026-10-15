import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CoursePlayer, type PlayerOptions, type View } from "./player";
import type { CourseScript } from "./types";

const load = (id: string): CourseScript =>
  JSON.parse(fs.readFileSync(path.join(__dirname, "../../../public/courses", `${id}.json`), "utf8"));

// Widen the view type so assertions after actions are not narrowed away.
const view = (p: CoursePlayer): View => p.view;

const opts: PlayerOptions = { maxError: 3, wordProcessor: false, noSkip: false, alwaysSure: true };

function typeDrill(p: CoursePlayer, mistakes = 0) {
  const v = p.view;
  if (v.kind !== "drill") throw new Error(`expected drill, got ${v.kind}`);
  let t = 0;
  v.drill.chars.forEach((c, i) => {
    if (i < v.drill.pos) return;
    v.drill.input(i < mistakes + v.drill.pos && c !== "\n" ? "\u0000" : c, (t += 50));
  });
  p.drillFinished();
}

describe("CoursePlayer on the Q series", () => {
  it("starts on the series menu", () => {
    const p = new CoursePlayer(load("q"), opts);
    expect(p.view.kind).toBe("menu");
    if (p.view.kind === "menu") expect(p.view.items).toHaveLength(5);
  });

  it("walks tutorial → drill → result", () => {
    const p = new CoursePlayer(load("q"), opts);
    if (p.view.kind !== "menu") throw new Error();
    p.choose(p.view.items[0]);
    expect(p.banner).toBe("Lesson Q1");
    expect(view(p).kind).toBe("tutorial");
    while (view(p).kind === "tutorial") p.continue();
    expect(view(p).kind).toBe("drill");
    expect(p.instruction.length).toBeGreaterThan(0);
    typeDrill(p);
    expect(view(p).kind).toBe("drillResult");
  });

  it("fails a drill above the error limit and repeats it", () => {
    const p = new CoursePlayer(load("q"), opts, "_Q_S_Q1");
    while (view(p).kind === "tutorial") p.continue();
    const stmt = p.view.kind === "drill" ? p.view.stmt : -1;
    typeDrill(p, 5);
    expect(view(p).kind).toBe("drillFailed");
    p.continue();
    const v = view(p);
    expect(v.kind === "drill" && v.stmt).toBe(stmt);
  });

  it("N moves on to the next exercise", () => {
    const p = new CoursePlayer(load("q"), opts, "_Q_S_Q1");
    while (view(p).kind === "tutorial") p.continue();
    const first = p.view.kind === "drill" ? p.view.stmt : -1;
    typeDrill(p);
    p.resultKey("N");
    const v = view(p);
    expect(v.kind === "drill" && v.stmt).toBeGreaterThan(first);
  });

  it("Esc before typing skips to the prompt; E returns to the menu", () => {
    const p = new CoursePlayer(load("q"), opts);
    if (p.view.kind !== "menu") throw new Error();
    p.choose(p.view.items[0]);
    while (view(p).kind === "tutorial") p.continue();
    p.escape();
    const v = view(p);
    expect(v.kind === "drillResult" && v.result).toBeNull();
    p.resultKey("E");
    expect(view(p).kind).toBe("menu");
  });

  it("compiles every lesson file into a runnable script", () => {
    for (const f of fs.readdirSync(path.join(__dirname, "../../../public/courses"))) {
      const p = new CoursePlayer(load(f.replace(".json", "")), opts);
      const v = view(p);
      expect(v.kind === "exit" && v.error).toBeFalsy();
    }
  });
});
