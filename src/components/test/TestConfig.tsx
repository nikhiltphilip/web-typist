import { useState } from "react";
import type { Mode } from "@/lib/engine/words";
import { setSetting, useSettings, type QuoteLength, type Settings } from "@/lib/settings";
import { Select, type Option } from "../Select";
import { Button, cn } from "../ui";

const opts = <T,>(values: T[]): Option<T>[] => values.map((v) => ({ value: v, label: String(v) }));

const MODES = opts<Mode>(["time", "words", "quote", "zen", "custom"]);
const TIMES = opts([15, 30, 60, 120]);
const WORDS = opts([10, 25, 50, 100]);
const QUOTES = opts<QuoteLength>(["all", "short", "medium", "long"]);
const EXTRAS = opts<"punctuation" | "numbers">(["punctuation", "numbers"]);

export function TestConfig({ hidden, onChange }: { hidden: boolean; onChange: () => void }) {
  const s = useSettings();
  const [customOpen, setCustomOpen] = useState(false);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    setSetting(k, v);
    onChange();
  };
  const extras = EXTRAS.filter((o) => s[o.value]).map((o) => o.value);

  return (
    <>
      <div className={cn("hide-on-focus mb-8 flex flex-wrap items-center justify-center gap-2 text-sm", hidden && "pointer-events-none invisible")}>
        <Select value={s.mode} options={MODES} onChange={(v) => set("mode", v)} />
        {s.mode === "time" && <Select value={s.time} options={TIMES} onChange={(v) => set("time", v)} />}
        {s.mode === "words" && <Select value={s.words} options={WORDS} onChange={(v) => set("words", v)} />}
        {s.mode === "quote" && <Select value={s.quoteLength} options={QUOTES} onChange={(v) => set("quoteLength", v)} />}
        {s.mode === "custom" && <Button variant="text" text="edit text" onClick={() => setCustomOpen(true)} />}
        {(s.mode === "time" || s.mode === "words") && (
          <Select
            label={extras.length ? extras.join(" + ") : "plain"}
            options={EXTRAS}
            isSelected={(v) => s[v]}
            onChange={(v) => set(v, !s[v])}
            keepOpen
          />
        )}
      </div>
      {customOpen && (
        <CustomTextModal
          initial={s.customText}
          onClose={() => setCustomOpen(false)}
          onSave={(t) => {
            set("customText", t);
            setCustomOpen(false);
          }}
        />
      )}
    </>
  );
}

function CustomTextModal({ initial, onClose, onSave }: { initial: string; onClose: () => void; onSave: (t: string) => void }) {
  const [text, setText] = useState(initial);
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/75 p-4 fade-in" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="grid w-[min(800px,100%)] gap-4 rounded-(--roundness) bg-bg p-8">
        <div className="text-2xl text-sub">custom text</div>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), onClose())}
          className="h-48 w-full resize-y rounded-(--roundness) border-0 bg-sub-alt p-3 text-text caret-caret outline-none"
        />
        <Button text="ok" onClick={() => onSave(text.trim() || initial)} />
      </div>
    </div>
  );
}
