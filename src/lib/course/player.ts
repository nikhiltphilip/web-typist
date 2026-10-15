// Runs a compiled gtypist script (see types.ts). Mirrors the control flow of
// gtypist's src/gtypist.c: non-interactive commands (labels, banners, gotos,
// E:/F:/K: settings) run straight through; the player stops at the commands
// that need the user — tutorials, drills, queries and menus — and exposes the
// current screen as `view`.

import { errorTooHigh, StreamDrill, type StreamResult } from "../engine/stream";
import type { CourseScript, DrillKind, MenuItem, Stmt } from "./types";

export interface PlayerOptions {
  /** Default maximum error percentage (gtypist -e, default 3.0). */
  maxError: number;
  /** Space also completes a line (gtypist -w). */
  wordProcessor: boolean;
  /** Forbid skipping exercises (gtypist -k). */
  noSkip: boolean;
  /** Don't ask "are you sure?" before leaving a lesson (gtypist -S). */
  alwaysSure: boolean;
}

export type View =
  | { kind: "tutorial"; lines: string[]; query?: string }
  | { kind: "query"; text: string; lines?: string[] }
  | { kind: "drill"; stmt: number; drillKind: DrillKind; drill: StreamDrill; attempt: number }
  | {
      kind: "drillResult";
      stmt: number;
      drillKind: DrillKind;
      /** null when the drill was skipped with Esc before typing. */
      result: StreamResult | null;
      allowNext: boolean;
      confirmingExit: boolean;
    }
  | { kind: "drillFailed"; stmt: number; drillKind: DrillKind; result: StreamResult; maxError: number; failLabel: string | null; step: "error" | "goBack" }
  | { kind: "menu"; title: string; items: MenuItem[] }
  | { kind: "exit"; error?: string };

export interface PassEvent {
  stmt: number;
  label: string | null;
  result: StreamResult;
}

type Listener = () => void;

export class CoursePlayer {
  readonly script: CourseScript;
  opts: PlayerOptions;
  view: View = { kind: "exit" };
  banner = "";
  instruction: string[] = [];
  /** Last label jumped to — gtypist's __last_label. */
  lastLabel: string | null = null;
  version = 0;
  onPass: ((e: PassEvent) => void) | null = null;

  private pc = 0;
  private errorMax: number;
  private errorMaxPersistent = false;
  private failLabel: string | null = null;
  private failLabelPersistent = false;
  private fkeys: (string | null)[] = Array(13).fill(null);
  private respFlag = false;
  private menuHistory: string[] = [];
  private listeners = new Set<Listener>();

  constructor(script: CourseScript, opts: PlayerOptions, startLabel?: string) {
    this.script = script;
    this.opts = opts;
    this.errorMax = opts.maxError;
    if (startLabel && startLabel in script.labels) this.seek(startLabel);
    this.run();
  }

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  private emit() {
    this.version++;
    for (const l of this.listeners) l();
  }

  get currentMaxError() {
    return this.errorMax;
  }

  // ── execution ──────────────────────────────────────────────────────────

  private seek(label: string | null): boolean {
    if (label === null) {
      this.view = { kind: "exit" };
      return false;
    }
    const at = this.script.labels[label];
    if (at === undefined) {
      this.view = { kind: "exit", error: `label '${label}' not found` };
      return false;
    }
    this.lastLabel = label;
    this.pc = at;
    return true;
  }

  private stmt(i = this.pc): Stmt | undefined {
    return this.script.stmts[i];
  }

  /** Execute until the script needs the user. */
  private run() {
    for (let guard = 0; guard < 100000; guard++) {
      const s = this.stmt();
      if (!s) {
        this.view = { kind: "exit" };
        return;
      }
      switch (s.op) {
        case "label":
          this.pc++;
          break;
        case "banner":
          this.banner = s.text;
          this.instruction = [];
          this.pc++;
          break;
        case "instruction":
          this.instruction = s.lines;
          this.pc++;
          break;
        case "goto":
          if (!this.seek(s.label)) return;
          break;
        case "ygoto":
        case "ngoto":
          if (this.respFlag === (s.op === "ygoto")) {
            if (!this.seek(s.label)) return;
          } else this.pc++;
          break;
        case "exit":
          this.view = { kind: "exit" };
          return;
        case "keybind":
          this.fkeys[s.key] = s.label;
          this.pc++;
          break;
        case "errorMax":
          this.errorMax = s.value === "default" ? this.opts.maxError : s.value;
          this.errorMaxPersistent = s.persistent;
          this.pc++;
          break;
        case "onFailure":
          this.failLabel = s.label;
          this.failLabelPersistent = s.persistent;
          this.pc++;
          break;
        case "tutorial": {
          this.instruction = [];
          const next = this.stmt(this.pc + 1);
          // gtypist skips the "press RETURN" wait when a question follows.
          if (next?.op === "query") {
            this.pc++;
            this.view = { kind: "query", text: next.text, lines: s.lines };
          } else this.view = { kind: "tutorial", lines: s.lines };
          return;
        }
        case "query":
          this.view = { kind: "query", text: s.text };
          return;
        case "drill":
          this.startDrill(this.pc, 1);
          return;
        case "menu":
          if (this.lastLabel && this.menuHistory[this.menuHistory.length - 1] !== this.lastLabel) this.menuHistory.push(this.lastLabel);
          this.fkeys[12] = this.lastLabel;
          this.view = { kind: "menu", title: s.title, items: s.items };
          return;
      }
    }
    this.view = { kind: "exit", error: "script loops without user input" };
  }

  private startDrill(stmtIndex: number, attempt: number) {
    const s = this.script.stmts[stmtIndex];
    if (s.op !== "drill") return;
    const drill = new StreamDrill(s.text, {
      speedTest: s.kind === "S" || s.kind === "s",
      wordProcessor: this.opts.wordProcessor,
    });
    this.view = { kind: "drill", stmt: stmtIndex, drillKind: s.kind, drill, attempt };
  }

  /** Leave the current drill: gtypist resets a non-persistent E: here. */
  private leaveDrill() {
    if (!this.errorMaxPersistent) this.errorMax = this.opts.maxError;
  }

  private exitLesson() {
    this.leaveDrill();
    if (this.fkeys[12]) this.seek(this.fkeys[12]);
    else {
      this.view = { kind: "exit" };
      return;
    }
    this.run();
  }

  // ── user actions ───────────────────────────────────────────────────────

  /** Enter / Space on a tutorial or a message screen. */
  continue() {
    const v = this.view;
    if (v.kind === "tutorial") {
      this.pc++;
      this.run();
    } else if (v.kind === "drillFailed") {
      if (v.step === "error" && v.failLabel) {
        this.view = { ...v, step: "goBack" };
      } else if (v.failLabel) {
        if (!this.failLabelPersistent) this.failLabel = null;
        this.leaveDrill();
        if (this.seek(v.failLabel)) this.run();
      } else {
        this.startDrill(v.stmt, 2);
      }
    }
    this.emit();
  }

  escape() {
    const v = this.view;
    if (v.kind === "tutorial") {
      if (this.fkeys[12]) {
        if (this.seek(this.fkeys[12])) this.run();
      } else this.view = { kind: "exit" };
    } else if (v.kind === "drill") {
      if (!v.drill.started) {
        // Esc before typing = skip: straight to the repeat/next/exit prompt.
        this.view = { kind: "drillResult", stmt: v.stmt, drillKind: v.drillKind, result: null, allowNext: !this.opts.noSkip, confirmingExit: false };
      } else {
        // Esc mid-exercise = give up and start it again.
        this.startDrill(v.stmt, v.attempt + 1);
      }
    } else if (v.kind === "menu") {
      const s = this.stmt();
      if (s?.op === "menu" && s.hasUp) {
        if (this.seek(s.up)) this.run();
      } else {
        this.menuHistory.pop();
        const back = this.menuHistory.pop();
        if (back && this.seek(back)) this.run();
        else this.view = { kind: "exit" };
      }
    } else if (v.kind === "drillResult" && v.confirmingExit) {
      this.view = { ...v, confirmingExit: false };
    }
    this.emit();
  }

  /** The drill component calls this once the StreamDrill reports done. */
  drillFinished() {
    const v = this.view;
    if (v.kind !== "drill" || !v.drill.done) return;
    const result = v.drill.result();
    const scored = v.drillKind === "D" || v.drillKind === "S";
    if (scored && errorTooHigh(result.errorPct, this.errorMax)) {
      this.view = { kind: "drillFailed", stmt: v.stmt, drillKind: v.drillKind, result, maxError: this.errorMax, failLabel: this.failLabel, step: "error" };
    } else {
      if (scored) this.onPass?.({ stmt: v.stmt, label: this.lastLabel, result });
      this.view = { kind: "drillResult", stmt: v.stmt, drillKind: v.drillKind, result, allowNext: true, confirmingExit: false };
    }
    this.emit();
  }

  /** R / N / E on the result prompt, Y / N while confirming exit. */
  resultKey(key: string) {
    const v = this.view;
    if (v.kind !== "drillResult") return;
    const k = key.toUpperCase();
    if (v.confirmingExit) {
      if (k === "Y") this.exitLesson();
      else if (k === "N") this.view = { ...v, confirmingExit: false };
    } else if (k === "R") {
      this.startDrill(v.stmt, 1);
    } else if (k === "N" && v.allowNext) {
      this.leaveDrill();
      this.pc = v.stmt + 1;
      this.run();
    } else if (k === "E") {
      if (this.opts.alwaysSure) this.exitLesson();
      else this.view = { ...v, confirmingExit: true };
    }
    this.emit();
  }

  /** Y / N, or a function-key binding (1–9, 0 = F10, A = F11, S = F12). */
  answer(key: string) {
    const v = this.view;
    if (v.kind !== "query") return;
    const k = key.toUpperCase();
    const fkey = /^[1-9]$/.test(k) ? Number(k) : k === "0" ? 10 : k === "A" ? 11 : k === "S" ? 12 : 0;
    if (fkey && this.fkeys[fkey]) {
      if (this.seek(this.fkeys[fkey])) this.run();
    } else if (k === "Y" || k === "N") {
      this.respFlag = k === "Y";
      this.pc++;
      this.run();
    } else return;
    this.emit();
  }

  choose(item: MenuItem) {
    if (this.view.kind !== "menu") return;
    if (this.seek(item.label)) this.run();
    this.emit();
  }

  /** Jump straight to a label (used by the course page's lesson list). */
  jump(label: string) {
    this.leaveDrill();
    if (this.seek(label)) this.run();
    this.emit();
  }
}
