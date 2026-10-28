"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode, Ref } from "react";

export const cn = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");

/** A Lucide icon sized to the surrounding text, like an icon font. */
export function Icon({ icon: Glyph, className }: { icon: LucideIcon; className?: string }) {
  return <Glyph aria-hidden className={cn("inline-block h-[1em] w-[1em] shrink-0", className)} strokeWidth={2.25} />;
}

// Monkeytype's Button (components/common/Button.tsx): "text" variant is sub
// coloured and turns text-coloured on hover; "button" has a sub-alt fill.
const base =
  "inline-flex h-min cursor-pointer select-none appearance-none items-center justify-center gap-[0.5em] rounded-(--roundness) border-0 p-[0.5em] text-center leading-[1.25] transition-[color,background,opacity] duration-125 ease-in-out";

export function buttonClass(variant: "text" | "button", active = false, disabled = false) {
  return cn(
    base,
    variant === "text" && (active ? "bg-transparent text-main hover:text-text" : "bg-transparent text-sub hover:text-text active:text-sub"),
    variant === "button" && (active ? "bg-main text-bg hover:bg-text hover:text-bg" : "bg-sub-alt text-text hover:bg-text hover:text-bg active:bg-sub"),
    disabled && "pointer-events-none opacity-[0.33]",
  );
}

type Common = {
  variant?: "text" | "button";
  icon?: LucideIcon;
  text?: ReactNode;
  active?: boolean;
  className?: string;
  title?: string;
  children?: ReactNode;
};

export function Button({
  variant = "button",
  icon,
  text,
  active,
  disabled,
  className,
  children,
  ...rest
}: Common & { onClick?: () => void; disabled?: boolean; tabIndex?: number; id?: string; "data-nav-item"?: string; ref?: Ref<HTMLButtonElement> }) {
  return (
    <button type="button" className={cn(buttonClass(variant, active, disabled), className)} disabled={disabled} {...rest}>
      {icon && <Icon icon={icon} />}
      {text}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "text",
  icon,
  text,
  active,
  className,
  children,
  external,
  ...rest
}: Common & { href: string; external?: boolean; "data-nav-item"?: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const cls = cn(buttonClass(variant, active), className);
  const content = (
    <>
      {icon && <Icon icon={icon} />}
      {text}
      {children}
    </>
  );
  return external ? (
    <a href={href} className={cls} target="_blank" rel="noreferrer" {...rest}>
      {content}
    </a>
  ) : (
    <Link href={href} className={cls} {...rest}>
      {content}
    </Link>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd>{children}</kbd>;
}

/** An on/off switch. */
export function Switch({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn("relative h-5 w-9 shrink-0 cursor-pointer transition-colors duration-150", on ? "bg-main" : "bg-sub-alt")}
    >
      <span className={cn("absolute top-1 left-1 h-3 w-3 transition-transform duration-150", on ? "translate-x-4 bg-bg" : "bg-sub")} />
    </button>
  );
}
