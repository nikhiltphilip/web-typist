"use client";

import { SettingsIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/lib/brand";
import { LinkButton } from "./ui";

export const restartEvent = "mt:restart";

const NAV = [
  { href: "/courses", nav: "courses", label: "courses" },
  { href: "/learn", nav: "learn", label: "learn" },
  { href: "/analytics", nav: "analytics", label: "analytics" },
  { href: "/about", nav: "about", label: "about" },
];

export function Header() {
  const pathname = usePathname();
  const current = (href: string) => (pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined);
  return (
    <header className="flex items-center gap-6">
      <Link
        href="/"
        aria-label={`${APP_NAME} home`}
        onClick={() => {
          if (pathname === "/") window.dispatchEvent(new Event(restartEvent));
        }}
        className="focus-sub text-2xl text-text transition-colors duration-250"
        style={{ fontFamily: "Lexend Deca, sans-serif" }}
      >
        {APP_NAME}
      </Link>
      <nav className="hide-on-focus flex flex-1 items-center gap-1">
        {NAV.map((it) => (
          <LinkButton
            key={it.href}
            href={it.href}
            text={it.label}
            data-nav-item={it.nav}
            aria-current={current(it.href)}
            className="aria-[current=page]:text-text"
          />
        ))}
        <LinkButton
          href="/settings"
          icon={SettingsIcon}
          title="settings"
          data-nav-item="settings"
          aria-current={current("/settings")}
          className="ml-auto aria-[current=page]:text-text"
        />
      </nav>
    </header>
  );
}
