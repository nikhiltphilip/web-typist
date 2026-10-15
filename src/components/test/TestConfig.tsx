import {
  faAt,
  faClock,
  faFont,
  faHashtag,
  faMountain,
  faQuoteLeft,
  faScrewdriverWrench,
  faWrench,
} from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";
import { setSetting, useSettings, type QuoteLength, type Settings } from "@/lib/settings";
import { Button, cn } from "../ui";

const card = "card rounded-(--roundness) bg-sub-alt px-(--horizontal-padding) flex";
const btn = "px-(--horizontal-padding) py-(--vertical-padding)";
// Monkeytype's responsive sizing variables for the config bar.
const vars =
  "[--card-gap:0.25em] [--font-size:0.5em] [--horizontal-padding:0.4em] [--vertical-padding:0.5rem] md:[--card-gap:1em] md:[--font-size:0.6em] md:[--horizontal-padding:0.45em] md:[--vertical-padding:0.75rem] lg:[--font-size:0.75em] lg:[--horizontal-padding:0.5em] xl:[--card-gap:2em] xl:[--horizontal-padding:1em]";

function TC({ active, onClick, icon, text, disabled }: { active?: boolean; onClick: () => void; icon?: typeof faAt; text?: string; disabled?: boolean }) {
  return <Button variant="text" active={active} onClick={onClick} icon={icon} text={text} disabled={disabled} className={btn} />;
}

export function TestConfig({ hidden, onChange }: { hidden: boolean; onChange: () => void }) {
  const s = useSettings();
  const [customOpen, setCustomOpen] = useState(false);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    setSetting(k, v);
    onChange();
  };

  const mode2 =
    s.mode === "time"
      ? [15, 30, 60, 120].map((t) => <TC key={t} text={String(t)} active={s.time === t} onClick={() => set("time", t)} />)
      : s.mode === "words"
        ? [10, 25, 50, 100].map((w) => <TC key={w} text={String(w)} active={s.words === w} onClick={() => set("words", w)} />)
        : s.mode === "quote"
          ? (["all", "short", "medium", "long"] as QuoteLength[]).map((q) => (
              <TC key={q} text={q} active={s.quoteLength === q} onClick={() => set("quoteLength", q)} />
            ))
          : s.mode === "custom"
            ? [<TC key="c" icon={faScrewdriverWrench} text="change" onClick={() => setCustomOpen(true)} />]
            : null;

  return (
    <>
      <div
        className={cn(
          vars,
          "hide-on-focus relative mx-auto mb-8 hidden w-max grid-cols-[1fr_auto_1fr] place-self-center [font-size:var(--font-size)] md:grid",
          hidden && "pointer-events-none opacity-0",
        )}
      >
        <div className={cn("mr-(--card-gap) w-max place-self-end", (s.mode === "zen" || s.mode === "quote" || s.mode === "custom") && "invisible")}>
          <div className={card}>
            <TC icon={faAt} text="punctuation" active={s.punctuation} onClick={() => set("punctuation", !s.punctuation)} />
            <TC icon={faHashtag} text="numbers" active={s.numbers} onClick={() => set("numbers", !s.numbers)} />
          </div>
        </div>
        <div className={card}>
          <TC icon={faClock} text="time" active={s.mode === "time"} onClick={() => set("mode", "time")} />
          <TC icon={faFont} text="words" active={s.mode === "words"} onClick={() => set("mode", "words")} />
          <TC icon={faQuoteLeft} text="quote" active={s.mode === "quote"} onClick={() => set("mode", "quote")} />
          <TC icon={faMountain} text="zen" active={s.mode === "zen"} onClick={() => set("mode", "zen")} />
          <TC icon={faWrench} text="custom" active={s.mode === "custom"} onClick={() => set("mode", "custom")} />
        </div>
        <div className={cn("ml-(--card-gap) w-max place-self-start", !mode2 && "invisible")}>
          <div className={card}>{mode2}</div>
        </div>
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
