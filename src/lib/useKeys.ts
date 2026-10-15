"use client";

import { useEffect, useRef } from "react";
import { isPaletteOpen } from "./focus";

export type TypingKey = { key: string; ctrl: boolean; shift: boolean; event: KeyboardEvent };

const consumed = new WeakSet<KeyboardEvent>();

/**
 * Global keyboard capture for the typing area. Normalises Enter to "\n" and
 * Tab to "\t", ignores keys aimed at form fields or the command line, and
 * stops the browser from scrolling or tab-focusing while you type. Return
 * false from the handler when the key wasn't used.
 */
export function useKeys(handler: (k: TypingKey) => void | boolean, enabled = true) {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (isPaletteOpen() || e.isComposing || consumed.has(e)) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.metaKey || e.altKey) return;

      let key = e.key;
      if (key === "Enter") key = "\n";
      else if (key === "Tab") key = "\t";
      else if (key !== "Backspace" && key !== "Escape" && key !== "ArrowUp" && key !== "ArrowDown" && key.length !== 1) return;
      // Leave browser shortcuts alone, except ctrl+backspace (delete word).
      if (e.ctrlKey && key !== "Backspace" && !(e.shiftKey && (key === "P" || key === "p"))) return;

      if (key === " " || key === "\t" || key === "Backspace" || key === "'" || key === "/" || key === "\n" || key.startsWith("Arrow")) e.preventDefault();
      // Several screens can listen at once. A handler returning false passes
      // the key on; otherwise it is consumed, so a screen change triggered by
      // this key can't be acted on again by a listener further down the list.
      if (ref.current({ key, ctrl: e.ctrlKey, shift: e.shiftKey, event: e }) !== false) consumed.add(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}

/** True while the browser window has focus; typing is blurred otherwise. */
export function useWindowFocus(onChange: (focused: boolean) => void) {
  const ref = useRef(onChange);
  ref.current = onChange;
  useEffect(() => {
    const on = () => ref.current(true);
    const off = () => ref.current(false);
    window.addEventListener("focus", on);
    window.addEventListener("blur", off);
    return () => {
      window.removeEventListener("focus", on);
      window.removeEventListener("blur", off);
    };
  }, []);
}
