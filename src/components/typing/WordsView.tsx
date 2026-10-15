import { memo, useCallback, useRef, useSyncExternalStore } from "react";
import type { WordsTest } from "@/lib/engine/words";
import { useSettings } from "@/lib/settings";
import { cn } from "../ui";
import { useCaret } from "./useCaret";

const Word = memo(function Word({ word, input, active, typed }: { word: string; input: string; active: boolean; typed: boolean }) {
  const letters = [];
  const n = Math.max(word.length, input.length);
  for (let i = 0; i < n; i++) {
    let cls = "letter";
    let ch = word[i];
    if (i < input.length) {
      if (i >= word.length) {
        cls += " incorrect extra";
        ch = input[i];
      } else cls += input[i] === word[i] ? " correct" : " incorrect";
    }
    letters.push(
      <span key={i} className={cls}>
        {ch}
      </span>,
    );
  }
  return <div className={cn("word", active && "active", typed && input !== word && "error")}>{letters}</div>;
});

/** Monkeytype's #words: three visible lines, the active word kept on line two. */
export function WordsView({ test, blurred }: { test: WordsTest; blurred?: boolean }) {
  const version = useSyncExternalStore(test.subscribe, () => test.version, () => 0);
  const { fontSize, caretStyle } = useSettings();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLDivElement>(null);

  const target = useCallback(() => {
    const inner = innerRef.current;
    if (!inner || test.done) return null;
    const word = inner.querySelector<HTMLElement>(".word.active");
    if (!word) return null;
    const len = test.inputs[test.active].length;
    const letters = word.children;
    if (letters.length === 0) return { el: word, after: false };
    if (len < letters.length) return { el: letters[len] as HTMLElement, after: false };
    return { el: letters[letters.length - 1] as HTMLElement, after: true };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, version]);

  useCaret({ wrapperRef, innerRef, caretRef, target, visibleLines: 3, keepLine: 1, caretStyle, fontSize });

  const items = test.words.map((w, i) => (
    <Word key={i} word={w} input={test.inputs[i]} active={i === test.active} typed={i < test.active} />
  ));

  return (
    <div ref={wrapperRef} className={cn("relative overflow-x-visible overflow-y-clip transition-[filter,opacity] duration-250", blurred && "blurred")} style={{ fontSize: `${fontSize}rem`, height: "4.65em" }}>
      <div ref={caretRef} className={cn("caret", caretStyle !== "default" && caretStyle)} />
      <div ref={innerRef} className="words relative" style={{ marginLeft: "-0.3em", width: "calc(100% + 0.6em)" }}>
        {items}
      </div>
    </div>
  );
}
