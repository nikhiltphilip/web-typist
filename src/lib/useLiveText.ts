"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Text that changes with a store and with time (timers, live wpm). The
 * snapshot is a string, so React re-renders only when the visible text
 * actually changes, not on every keystroke or tick (rerender-derived-state).
 */
export function useLiveText(subscribe: (cb: () => void) => () => void, read: () => string, everyMs = 250): string {
  const sub = useCallback(
    (cb: () => void) => {
      const unsub = subscribe(cb);
      const id = setInterval(cb, everyMs);
      return () => {
        unsub();
        clearInterval(id);
      };
    },
    [subscribe, everyMs],
  );
  return useSyncExternalStore(sub, read, () => "");
}

/** Run `fn` after the browser has painted the current frame. */
export function afterPaint(fn: () => void): void {
  requestAnimationFrame(() => setTimeout(fn, 0));
}
