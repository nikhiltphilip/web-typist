import { memo, type ReactNode, useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import type { Mark } from "@/lib/engine/stream";
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

/** What StreamView renders: a gtypist StreamDrill or a keybr AdaptiveInput. */
export interface StreamSource {
  readonly chars: string[];
  readonly marks: Mark[];
  readonly pos: number;
  readonly version: number;
  /** Wrong characters typed ahead of the cursor, shown as extra letters. */
  readonly garbage?: string[];
  subscribe(l: () => void): () => void;
}

const Run = memo(function Run({ text, marks, from, garbage, garbageAt }: { text: string; marks: string; from: number; garbage?: string; garbageAt?: number }) {
  const out: ReactNode[] = [];
  Array.from(text).forEach((c, k) => {
    if (garbage && garbageAt === from + k)
      Array.from(garbage).forEach((g, j) => out.push(<span key={`g${j}`} data-g={j} className="letter incorrect extra">{g === " " ? "_" : g}</span>));
    out.push(<Letter key={k} c={c} mark={marks[k] === "c" ? "correct" : marks[k] === "x" ? "incorrect" : "untyped"} i={from + k} />);
  });
  return <div className={cn("word", text === " " && "space-word")}>{out}</div>;
});

/**
 * Course drill text in Monkeytype's style: same letters, colours and caret,
 * but laid out on gtypist's fixed lines with a visible ⏎ at each line end.
 */
export function StreamView({
  drill,
  visibleLines = 6,
  keepLine = 2,
  maxSize = 1.5,
  blurred,
}: {
  drill: StreamSource;
  visibleLines?: number;
  keepLine?: number;
  /** Cap on the font size in rem (course lines must fit 80 columns). */
  maxSize?: number;
  blurred?: boolean;
}) {
  const version = useSyncExternalStore(drill.subscribe, () => drill.version, () => 0);
  const { fontSize, caretStyle } = useSettings();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLDivElement>(null);
  const lines = useMemo(() => tokenize(drill.chars), [drill]);

  const target = useCallback(() => {
    const inner = innerRef.current;
    if (!inner) return null;
    // With garbage showing, the caret sits after the last wrong letter.
    const g = drill.garbage?.length ? inner.querySelector<HTMLElement>(`[data-g="${drill.garbage.length - 1}"]`) : null;
    if (g) return { el: g, after: true };
    const pos = Math.min(drill.pos, drill.chars.length - 1);
    const el = inner.querySelector<HTMLElement>(`[data-i="${pos}"]`);
    return el ? { el, after: drill.pos >= drill.chars.length } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drill, version]);

  const size = Math.min(fontSize, maxSize);
  useCaret({ wrapperRef, innerRef, caretRef, target, visibleLines, keepLine, caretStyle, fontSize: size });
  const garbage = drill.garbage?.join("") || undefined;

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
                {...(garbage && drill.pos >= tok.from && drill.pos < tok.to ? { garbage, garbageAt: drill.pos } : {})}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
