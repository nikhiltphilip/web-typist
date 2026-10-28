import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn, Icon } from "./ui";

export interface Option<T> {
  value: T;
  label: ReactNode;
}

/** A text button that opens a list of options. Closes on pick, outside click or esc. */
export function Select<T>({
  value,
  options,
  onChange,
  label,
  isSelected = (v) => v === value,
  keepOpen,
  className,
}: {
  value?: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  /** Shown on the button; defaults to the selected option's label. */
  label?: ReactNode;
  isSelected?: (v: T) => boolean;
  /** Leave the list open after a pick (for multi-select toggles). */
  keepOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const shown = label ?? options.find((o) => o.value === value)?.label ?? String(value);

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex cursor-pointer items-center gap-[0.4em] p-[0.5em] leading-[1.25] transition-colors duration-125",
          open ? "text-text" : "text-sub hover:text-text",
        )}
      >
        {shown}
        <Icon icon={ChevronDownIcon} className={cn("h-[0.75em] w-[0.75em] transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul role="listbox" className="absolute right-0 top-full z-50 mt-1 grid min-w-full w-max max-h-80 overflow-y-auto bg-sub-alt p-1 shadow-lg">
          {options.map((o) => {
            const selected = isSelected(o.value);
            return (
              <li key={String(o.value)}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(o.value);
                    if (!keepOpen) setOpen(false);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between gap-4 px-3 py-1.5 text-left text-sm transition-colors duration-100",
                    selected ? "text-main" : "text-sub hover:bg-bg hover:text-text",
                  )}
                >
                  {o.label}
                  <Icon icon={CheckIcon} className={cn("h-[0.9em] w-[0.9em]", !selected && "invisible")} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
