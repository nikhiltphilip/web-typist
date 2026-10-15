import type { CSSProperties } from "react";
import { type Finger, FINGER_COLOR, fingerFor, type Hand, keyFor, shiftFor } from "@/lib/learn/fingers";
import { cn } from "../ui";

// QWERTY in Monkeytype's keymap style (Keymap.tsx): 2rem rounded keys on
// sub-alt, homing bars on f and j, rows staggered like a real keyboard.
// Offsets and widths are in key units (1u = 2rem).

type KeyDef = { key: string; label?: string; width?: number };
const row = (keys: string): KeyDef[] => [...keys].map((key) => ({ key }));

const ROWS: { indent: number; keys: KeyDef[] }[] = [
  { indent: 1, keys: row("1234567890-=") },
  { indent: 1.5, keys: row("qwertyuiop[]") },
  { indent: 1.75, keys: row("asdfghjkl;'") },
  { indent: 0, keys: [{ key: "lshift", label: "shift", width: 2.25 }, ...row("zxcvbnm,./"), { key: "rshift", label: "shift", width: 2.75 }] },
  { indent: 3.75, keys: [{ key: " ", width: 6.25 }] },
];

// ── keyboard ───────────────────────────────────────────────────────────────

export interface KeyLook {
  background?: string;
  color?: string;
  /** Key is not part of the lesson. */
  dim?: boolean;
  title?: string;
}

export function Keyboard({
  look,
  active,
  fingers = false,
  className,
}: {
  /** Style for a key, by lowercase label (" " is the space bar). */
  look?: (key: string) => KeyLook | undefined;
  /** The character to type next (shift is highlighted when it needs one). */
  active?: string | null;
  /** Show each key's finger as a coloured strip. */
  fingers?: boolean;
  className?: string;
}) {
  const target = active ? keyFor(active) : null;
  const shiftKey = target?.shift ? shiftFor(target.key) : null;

  const render = ({ key: k, label, width = 1 }: KeyDef, style: CSSProperties = {}) => {
    const l = look?.(k);
    const isActive = target?.key === k || shiftKey === k;
    const f = fingers ? fingerFor(k) : null;
    return (
      <div
        key={k}
        title={l?.title ?? (f ? `${f.hand === "either" ? "either" : f.hand} ${f.finger}` : undefined)}
        className={cn(
          "relative flex h-8 items-center justify-center overflow-hidden rounded border-2 border-bg text-sm transition-[background-color,color] duration-150",
          isActive ? "bg-main text-bg" : !l?.background && "bg-sub-alt text-sub",
          l?.dim && !isActive && "opacity-40",
          label && "text-[0.65rem]",
        )}
        style={{ width: `${width * 2}rem`, ...(isActive ? {} : { background: l?.background, color: l?.color }), ...style }}
      >
        {label ?? (k === " " ? "" : k)}
        {(k === "f" || k === "j") && <div className="absolute bottom-[5px] h-0.5 w-2 rounded bg-current opacity-60" />}
        {f && <div className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: FINGER_COLOR[f.finger] }} />}
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div>
        {ROWS.map((r, i) => (
          <div key={i} className="flex" style={{ marginLeft: `${r.indent * 2}rem` }}>
            {r.keys.map((k) => render(k))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── hands ──────────────────────────────────────────────────────────────────

const HAND_ORDER: Finger[] = ["pinky", "ring", "middle", "index", "thumb"];
// Finger lengths, so the row of pills reads as two hands.
const HEIGHT: Record<Finger, number> = { pinky: 1.6, ring: 2.15, middle: 2.4, index: 2.1, thumb: 1.25 };

/**
 * Ten fingers, left pinky → right pinky, with the one(s) for the next
 * character lit up and named underneath.
 */
export function FingerHint({ active }: { active: string | null }) {
  const target = active ? keyFor(active) : null;
  const main = target ? fingerFor(target.key) : null;
  const shift = target?.shift ? fingerFor(shiftFor(target.key)) : null;
  const lit = (hand: Hand, finger: Finger) =>
    (main && main.finger === finger && (main.hand === hand || main.hand === "either")) || (shift && shift.finger === finger && shift.hand === hand);

  const label = (() => {
    if (!target || !main) return active ? " " : "";
    const name = target.key === " " ? "space" : target.key;
    const who = main.hand === "either" ? "either thumb" : `${main.hand} ${main.finger} finger`;
    return `${target.shift ? `shift + ${name}` : name} · ${who}${shift ? ` + ${shift.hand} pinky on shift` : ""}`;
  })();

  const hand = (h: Hand) => {
    const fingers = h === "left" ? HAND_ORDER : [...HAND_ORDER].reverse();
    return (
      <div className="flex items-end gap-1">
        {fingers.map((f) => {
          const on = lit(h, f);
          return (
            <div
              key={f}
              title={`${h} ${f}`}
              className={cn("w-3.5 rounded-full transition-[background-color,box-shadow] duration-150", !on && "opacity-70")}
              style={{
                height: `${HEIGHT[f]}rem`,
                background: on ? FINGER_COLOR[f] : `color-mix(in oklab, ${FINGER_COLOR[f]} 25%, var(--sub-alt-color))`,
                boxShadow: on ? `0 0 0 2px var(--bg-color), 0 0 0 4px ${FINGER_COLOR[f]}` : undefined,
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-end gap-10">
        {hand("left")}
        {hand("right")}
      </div>
      <div className="h-4 text-xs text-sub">{label}</div>
    </div>
  );
}
