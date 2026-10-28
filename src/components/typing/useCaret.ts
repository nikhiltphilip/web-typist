import { useLayoutEffect, useRef, type RefObject } from "react";
import type { CaretStyle } from "@/lib/settings";

export interface CaretTarget {
  el: HTMLElement;
  /** Place the caret after the element instead of before it. */
  after: boolean;
}

function offsetWithin(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  let cur: HTMLElement | null = el;
  while (cur && cur !== root) {
    x += cur.offsetLeft;
    y += cur.offsetTop;
    cur = cur.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

/**
 * Positions the caret over the target letter and scrolls the text so the
 * active line never goes past `keepLine` (0-based) inside a window of
 * `visibleLines`, the way Monkeytype keeps the current word on line 2 of 3.
 *
 * Like Monkeytype (smoothLineScroll off by default), the text jumps a line
 * instantly and the caret — which lives outside the scrolling layer — glides
 * from where it was on screen to where the next letter now is. That is a
 * sweep back to the left on the same row, with no vertical wobble.
 */
interface Metrics {
  lineH: number;
  firstTop: number;
  caretH: number;
  caretW: number;
}

export function useCaret(opts: {
  wrapperRef: RefObject<HTMLDivElement | null>;
  innerRef: RefObject<HTMLDivElement | null>;
  caretRef: RefObject<HTMLDivElement | null>;
  target: () => CaretTarget | null;
  visibleLines: number;
  keepLine: number;
  caretStyle: CaretStyle;
  fontSize: number;
}) {
  const { wrapperRef, innerRef, caretRef, target, visibleLines, keepLine, caretStyle, fontSize } = opts;
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);
  // Line height etc. only change with font, size or window width, so they're
  // measured once instead of calling getComputedStyle on every keystroke.
  const metrics = useRef<Metrics | null>(null);
  // Last values written, so unchanged styles aren't re-set (each write
  // invalidates style and can cost a recalc).
  const written = useRef({ shift: "", height: "", caret: "", width: "", hidden: false, under: null as HTMLElement | null });
  const place = useRef<() => void>(() => {});

  place.current = () => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    const caret = caretRef.current;
    if (!wrapper || !inner || !caret) return;
    const w = written.current;
    const t = target();
    // A block caret sits behind the text, so the letter under it is drawn in
    // the background colour to stay readable.
    const under = t && caretStyle === "block" && !t.after ? t.el : null;
    if (under !== w.under) w.under?.classList.remove("under-caret");
    // Re-added every time: React drops it when it re-renders the letter's class.
    if (under && !under.classList.contains("under-caret")) under.classList.add("under-caret");
    w.under = under;
    if (!t) {
      if (!w.hidden) caret.style.opacity = "0";
      w.hidden = true;
      return;
    }

    // ── read phase: every layout query happens before any style write, so
    // the browser lays out once (js-batch-dom-css).
    const row = (t.el.closest(".word") as HTMLElement | null) ?? t.el;
    if (!metrics.current) {
      const cs = getComputedStyle(row);
      const firstRow = inner.querySelector<HTMLElement>(".word");
      metrics.current = {
        lineH: row.offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom),
        firstTop: firstRow ? offsetWithin(firstRow, inner).y : 0,
        caretH: caret.offsetHeight,
        caretW: caret.offsetWidth,
      };
    }
    const { lineH, firstTop, caretH, caretW } = metrics.current;
    const rowTop = offsetWithin(row, inner).y;
    const pos = offsetWithin(t.el, inner);
    const letterH = t.el.offsetHeight;
    const letterW = t.el.offsetWidth;
    const totalLines = Math.round((inner.scrollHeight - firstTop) / lineH);
    const originX = inner.offsetLeft;
    const originY = inner.offsetTop;

    // ── compute
    const line = Math.max(0, Math.round((rowTop - firstTop) / lineH));
    const shiftPx = Math.max(0, Math.min(line - keepLine, totalLines - visibleLines)) * lineH;
    const shift = `translateY(${-shiftPx}px)`;
    const height = `${Math.min(visibleLines, Math.max(totalLines, 1)) * lineH}px`;
    // Screen position inside the wrapper: letter position, minus the scroll.
    const fullWidth = caretStyle === "block" || caretStyle === "outline" || caretStyle === "underline";
    const x = originX + pos.x + (t.after ? letterW : 0) - (fullWidth ? 0 : caretW / 2); // centred on the gap, like Monkeytype
    const top = originY + pos.y - shiftPx;
    const y = caretStyle === "underline" ? top + letterH : top + (letterH - caretH) / 2;
    const transform = `translate(${x}px, ${y}px)`;
    const width = fullWidth ? `${letterW || letterH * 0.6}px` : "";

    // ── write phase
    if (w.hidden) caret.style.opacity = "";
    w.hidden = false;
    if (shift !== w.shift) inner.style.transform = w.shift = shift;
    if (height !== w.height) wrapper.style.height = w.height = height;
    if (width !== w.width) caret.style.width = w.width = width;
    if (first.current) {
      // Don't glide in from the corner on first paint.
      caret.style.transition = "none";
      caret.style.transform = w.caret = transform;
      requestAnimationFrame(() => (caret.style.transition = ""));
      first.current = false;
    } else if (transform !== w.caret) caret.style.transform = w.caret = transform;

    // The caret stops blinking while you type.
    if (!caret.classList.contains("typing")) caret.classList.add("typing");
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => caret.classList.remove("typing"), 1000);
  };

  // After every render (i.e. every keystroke), before paint.
  useLayoutEffect(() => place.current());

  // Font, size or caret changes, window resizes and late font loads change
  // the geometry: re-measure and re-place without a React render.
  useLayoutEffect(() => {
    const remeasure = () => {
      metrics.current = null;
      // Measure the caret at its natural width, not a previous style's.
      if (caretRef.current) caretRef.current.style.width = "";
      written.current.width = "";
      first.current = true;
      place.current();
    };
    remeasure();
    window.addEventListener("resize", remeasure);
    document.fonts?.ready.then(remeasure);
    return () => window.removeEventListener("resize", remeasure);
  }, [fontSize, caretStyle, caretRef]);
}
