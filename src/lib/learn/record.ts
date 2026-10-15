// Turns the typing test's and course drills' keystroke logs into keybr-style
// results, so the analytics page covers everything typed in the app.

import { saveResult } from "../db";
import type { Keystroke } from "../engine/stats";
import { isValidResult, makeResult, type Source, type Step } from "./stats";

export function stepsFromKeystrokes(keys: readonly Keystroke[]): Step[] {
  const steps: Step[] = [];
  let prev: number | null = null;
  for (const k of keys) {
    if (k.cp == null) continue;
    steps.push({ codePoint: k.cp, timeToType: prev === null ? 0 : k.ms - prev, typo: !k.correct });
    prev = k.ms;
  }
  return steps;
}

/** Save a finished test or drill for analytics; ignores ones too short to mean anything. */
export function recordKeystrokes(source: Source, kind: string, keys: readonly Keystroke[], durationMs: number): void {
  const r = makeResult(source, kind, Date.now(), stepsFromKeystrokes(keys), durationMs);
  if (isValidResult(r)) void saveResult(r);
}
