import type { CSSProperties } from "react";
import { cn } from "../ui";

// QWERTY in Monkeytype's keymap style (Keymap.tsx): 2rem rounded keys on
// sub-alt, homing bars on f and j, rows staggered like a real keyboard.
const ROWS: { keys: string; indent: number }[] = [
  { keys: "qwertyuiop[]", indent: 0.75 },
  { keys: "asdfghjkl;'", indent: 1 },
  { keys: "zxcvbnm,./", indent: 1.5 },
];

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
  className,
}: {
  /** Style for a key, by lowercase label (" " is the space bar). */
  look?: (key: string) => KeyLook | undefined;
  /** The key to press next. */
  active?: string | null;
  className?: string;
}) {
  const key = (k: string, style: CSSProperties = {}) => {
    const l = look?.(k);
    const isActive = active != null && active.toLowerCase() === k;
    return (
      <div
        key={k}
        title={l?.title}
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded border-2 border-bg text-sm transition-[background-color,color] duration-150",
          isActive ? "bg-main text-bg" : !l?.background && "bg-sub-alt text-sub",
          l?.dim && !isActive && "opacity-40",
        )}
        style={{ ...(isActive ? {} : { background: l?.background, color: l?.color }), ...style }}
      >
        {k === " " ? "" : k}
        {(k === "f" || k === "j") && <div className="absolute bottom-[3px] h-0.5 w-2 rounded bg-current opacity-60" />}
      </div>
    );
  };
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div>
        {ROWS.map((row) => (
          <div key={row.keys} className="flex" style={{ marginLeft: `${row.indent * 2}rem` }}>
            {[...row.keys].map((k) => key(k))}
          </div>
        ))}
        <div className="flex" style={{ marginLeft: "6rem" }}>
          {key(" ", { width: "12rem" })}
        </div>
      </div>
    </div>
  );
}
