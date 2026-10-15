// keybr-style text input, ported from @keybr/textinput's TextInput
// (AGPL-3.0). By default the cursor waits for the right key (stop on error),
// a letter you missed is marked even after you fix it, and small slips — a
// replaced or skipped character — are forgiven by looking three characters
// ahead. Exposes the same surface as StreamDrill so StreamView can render it.

import { calculateWpm } from "../engine/stats";
import type { Mark } from "../engine/stream";
import type { Step } from "./stats";

const GARBAGE_MAX = 10;
const RECOVER = 3;

interface Pending extends Step {
  at: number;
}

type Listener = () => void;

export class AdaptiveInput {
  readonly chars: string[];
  readonly marks: Mark[];
  /** Wrong characters typed past the cursor (shown when stopOnError is off). */
  garbage: string[] = [];
  pos = 0;
  steps: Step[] = [];
  startedAt: number | null = null;
  endedAt: number | null = null;
  version = 0;
  private typo = false;
  private pending: Pending[] = [];
  private lastAt: number | null = null;
  private listeners = new Set<Listener>();

  constructor(
    text: string,
    readonly opts: { stopOnError: boolean; forgiveErrors: boolean; spaceSkipsWords: boolean },
  ) {
    this.chars = Array.from(text);
    this.marks = this.chars.map(() => "untyped");
  }

  get started() {
    return this.startedAt !== null;
  }
  get done() {
    return this.endedAt !== null;
  }
  get errors() {
    return this.steps.filter((s) => s.typo).length + (this.typo ? 1 : 0);
  }
  /** True while the letter under the cursor has been mistyped. */
  get pendingTypo() {
    return this.typo;
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

  liveWpm(now = performance.now()): number {
    const s = this.elapsedMs(now) / 1000;
    return s < 1 ? 0 : Math.round(calculateWpm(this.steps.length, s));
  }

  /** keybr TimeToType: time since the previous key event ÷ keys pressed (shift counts). */
  private measure(now: number, shift: boolean): number {
    const d = this.lastAt === null ? 0 : (now - this.lastAt) / (shift ? 2 : 1);
    this.lastAt = now;
    return d;
  }

  input(key: string, now = performance.now(), shift = false): boolean | null {
    if (this.done) return null;
    if (this.startedAt === null) this.startedAt = now;
    const ttt = this.measure(now, shift);

    if (key === "Backspace") {
      // keybr clearChar: deleting counts the current letter as a miss.
      this.garbage.pop();
      this.pending.pop();
      this.typo = true;
      this.mark();
      this.emit();
      return null;
    }

    const cp = key === "\n" ? " " : key;
    const expected = this.chars[this.pos];

    if (expected !== " " && cp === " ") {
      if (this.opts.spaceSkipsWords && ((this.pos > 0 && this.chars[this.pos - 1] !== " ") || this.typo)) {
        this.skipWord();
        return this.finish(now, false);
      }
      if (this.garbage.length === 0 && !this.typo) return null;
    }

    if (cp === expected && (this.opts.forgiveErrors || this.garbage.length === 0)) {
      const typo = this.typo;
      this.addStep({ codePoint: cp.codePointAt(0)!, timeToType: ttt, typo });
      this.garbage = [];
      this.pending = [];
      this.typo = false;
      return this.finish(now, !typo);
    }

    this.typo = true;
    if ((!this.opts.stopOnError || this.opts.forgiveErrors) && this.garbage.length < GARBAGE_MAX) {
      this.pending.push({ codePoint: cp.codePointAt(0)!, timeToType: ttt, typo: false, at: now });
      if (!this.opts.stopOnError) this.garbage.push(cp);
    }
    if (this.opts.forgiveErrors && (this.recoverReplaced() || this.recoverSkipped())) return this.finish(now, false);
    this.mark();
    this.emit();
    return false;
  }

  private addStep(step: Step) {
    this.steps.push(step);
    this.marks[this.pos] = step.typo ? "incorrect" : "correct";
    this.pos++;
  }

  private mark() {
    if (this.pos < this.chars.length) this.marks[this.pos] = this.typo ? "incorrect" : "untyped";
  }

  private finish(now: number, ok: boolean): boolean {
    if (this.pos >= this.chars.length) this.endedAt = now;
    this.mark();
    this.emit();
    return ok;
  }

  private skipWord() {
    while (this.pos < this.chars.length && this.chars[this.pos] !== " ") {
      this.addStep({ codePoint: this.chars[this.pos].codePointAt(0)!, timeToType: 0, typo: true });
    }
    if (this.pos < this.chars.length) this.addStep({ codePoint: 0x20, timeToType: 0, typo: false });
    this.garbage = [];
    this.pending = [];
    this.typo = false;
  }

  /** text "abcd", typed "xbcd": the x was a slip for a. */
  private recoverReplaced(): boolean {
    const g = this.pending;
    if (this.pos + RECOVER + 1 > this.chars.length || g.length < RECOVER + 1) return false;
    for (let i = 0; i < RECOVER; i++) if (this.chars[this.pos + i + 1].codePointAt(0) !== g[i + 1].codePoint) return false;
    this.addStep({ codePoint: this.chars[this.pos].codePointAt(0)!, timeToType: 0, typo: true });
    for (let i = 1; i < g.length; i++) this.addStep({ codePoint: g[i].codePoint, timeToType: g[i].timeToType, typo: false });
    this.garbage = [];
    this.pending = [];
    this.typo = false;
    return true;
  }

  /** text "abcd", typed "bcd": a was skipped. */
  private recoverSkipped(): boolean {
    const g = this.pending;
    if (this.pos + RECOVER + 1 > this.chars.length || g.length < RECOVER) return false;
    for (let i = 0; i < RECOVER; i++) if (this.chars[this.pos + i + 1].codePointAt(0) !== g[i].codePoint) return false;
    this.addStep({ codePoint: this.chars[this.pos].codePointAt(0)!, timeToType: 0, typo: true });
    for (let i = 0; i < g.length; i++) this.addStep({ codePoint: g[i].codePoint, timeToType: g[i].timeToType, typo: false });
    this.garbage = [];
    this.pending = [];
    this.typo = false;
    return true;
  }
}
