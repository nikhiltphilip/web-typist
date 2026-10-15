"use client";

// Monkeytype's "focus" state: true while typing, false once the mouse moves.
// It flips on the first keystroke, so it is a plain attribute on <html>
// rather than React state: CSS ([data-focused] selectors in globals.css)
// fades the chrome without re-rendering the header, footer and config bar.

import { useSyncExternalStore } from "react";

let focused = false;

let pending = 0;

export function setFocused(v: boolean) {
  if (v === focused) return;
  focused = v;
  cancelAnimationFrame(pending);
  if (!v) {
    document.documentElement.removeAttribute("data-focused");
    return;
  }
  // Entering focus restyles the page chrome. Do it on the frame after the
  // keystroke so the first letter and caret paint without waiting for it.
  pending = requestAnimationFrame(() => {
    pending = requestAnimationFrame(() => {
      if (focused) document.documentElement.setAttribute("data-focused", "");
    });
  });
}

export function isFocused() {
  return focused;
}

// ── command line open state (shared by header, footer and hotkeys) ────────

let paletteOpen = false;
let palettePage: string | null = null;
const paletteListeners = new Set<() => void>();

export function openPalette(page: string | null = null) {
  paletteOpen = true;
  palettePage = page;
  for (const l of paletteListeners) l();
}
export function closePalette() {
  paletteOpen = false;
  for (const l of paletteListeners) l();
}
export function isPaletteOpen() {
  return paletteOpen;
}
function subscribePalette(l: () => void) {
  paletteListeners.add(l);
  return () => paletteListeners.delete(l);
}
export function usePalette(): { open: boolean; page: string | null } {
  const open = useSyncExternalStore(subscribePalette, () => paletteOpen, () => false);
  return { open, page: palettePage };
}
