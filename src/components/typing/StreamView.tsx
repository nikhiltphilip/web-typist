import { memo, useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import type { Mark, StreamDrill } from "@/lib/engine/stream";
import { useSettings } from "@/lib/settings";
import { cn } from "../ui";
import { useCaret } from "./useCaret";

type Token = { kind: "word" | "space"; from: number; to: number };

/** Split each gtypist line into words and single spaces so lines wrap at spaces. */
function tokenize(chars: string[]): Token[][] {
  const lines: Token[][] = [];
  let line: Token[] = [];
  let i = 0;
  while (i < chars.length) {
    const c = chars[i];
    if (c === " ") {
      line.push({ kind: "space", from: i, to: i + 1 });
      i++;
    } else {
      const from = i;
      while (i < chars.length && chars[i] !== " " && chars[i] !== "\n") i++;
      if (chars[i] === "\n") i++; // the ⏎ belongs to the last word of the line
      line.push({ kind: "word", from, to: i });
      if (chars[i - 1] === "\n") {
        lines.push(line);
        line = [];
      }
    }
  }
  if (line.length) lines.push(line);
  return lines;
}

const glyph = (c: string) => (c === "\n" ? "⏎" : c === "\t" ? "⇥" : c);

function Letter({ c, mark, i }: { c: string; mark: Mark; i: number }) {
  return (
    <span data-i={i} className={cn("letter", mark !== "untyped" && mark, c === "\n" && "nl", c === "\t" && "tab", c === " " && "space")}>
      {c === " " ? " " : glyph(c)}
    </span>
  );
}

const Run = memo(function Run({ text, marks, from }: { text: string; marks: string; from: number }) {
  return (
    <div className={cn("word", text === " " && "space-word")}>
      {Array.from(text).map((c, k) => (
        <Letter key={k} c={c} mark={marks[k] === "c" ? "correct" : marks[k] === "x" ? "incorrect" : "untyped"} i={from + k} />
      ))}
    </div>
  );
});

/**
 * Course drill text in Monkeytype's style: same letters, colours and caret,
 * but laid out on gtypist's fixed lines with a visible ⏎ at each line end.
 */
export function StreamView({ drill, visibleLines = 6, blurred }: { drill: StreamDrill; visibleLines?: number; blurred?: boolean }) {
  const version = useSyncExternalStore(drill.subscribe, () => drill.version, () => 0);
  const { fontSize, caretStyle } = useSettings();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLDivElement>(null);
  const lines = useMemo(() => tokenize(drill.chars), [drill]);

  const target = useCallback(() => {
    const inner = innerRef.current;
    if (!inner) return null;
    const pos = Math.min(drill.pos, drill.chars.length - 1);
    const el = inner.querySelector<HTMLElement>(`[data-i="${pos}"]`);
    return el ? { el, after: drill.pos >= drill.chars.length } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drill, version]);

  // Course text is smaller than the test's 2rem so 80-column lines fit.
  const size = Math.min(fontSize, 1.5);
  useCaret({ wrapperRef, innerRef, caretRef, target, visibleLines, keepLine: 2, caretStyle, fontSize: size });

  const code = (m: Mark) => (m === "correct" ? "c" : m === "incorrect" ? "x" : "u");

  return (
    <div ref={wrapperRef} className={cn("relative overflow-x-visible overflow-y-clip transition-[filter,opacity] duration-250", blurred && "blurred")} style={{ fontSize: `${size}rem` }}>
      <div ref={caretRef} className={cn("caret", caretStyle !== "default" && caretStyle)} />
      <div ref={innerRef} className="words relative" style={{ whiteSpace: "pre" }}>
        {lines.map((line, li) => (
          <div key={li} className="stream-line">
            {line.map((tok) => (
              <Run
                key={tok.from}
                from={tok.from}
                text={drill.chars.slice(tok.from, tok.to).join("")}
                marks={drill.marks.slice(tok.from, tok.to).map(code).join("")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
