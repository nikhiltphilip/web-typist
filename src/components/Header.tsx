"use client";

import { faCog, faGraduationCap, faInfo, faKeyboard } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { LinkButton } from "./ui";

export const restartEvent = "mt:restart";

function Logo() {
  const pathname = usePathname();
  return (
    <Link
      href="/"
      className="-m-2 flex h-6 w-max gap-2 rounded-[0.8rem] p-2"
      style={{ boxSizing: "content-box", fontFamily: "Lexend Deca, sans-serif" }}
      aria-label={`${APP_NAME} home`}
      onClick={() => {
        if (pathname === "/") window.dispatchEvent(new Event(restartEvent));
      }}
    >
      {/* keyboard mark: a rounded frame with a home row and a space bar */}
      <svg viewBox="0 0 30 18" className="focus-sub h-full text-main transition-colors" fill="currentColor">
        <path d="M5 0h20a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H5a5 5 0 0 1-5-5V5a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h20a3 3 0 0 0 3-3V5a3 3 0 0 0-3-3H5Z" />
        <rect x="5" y="5" width="3" height="3" rx="1" />
        <rect x="10" y="5" width="3" height="3" rx="1" />
        <rect x="15" y="5" width="3" height="3" rx="1" />
        <rect x="20" y="5" width="5" height="3" rx="1" />
        <rect x="9" y="10.5" width="12" height="2.5" rx="1.25" />
      </svg>
      <div className="hidden h-6 place-content-center text-[2rem] leading-0 sm:grid">
        <div
          className="focus-transparent -mt-[2.1em] hidden pl-[0.5em] text-[0.315em] leading-0 text-sub transition-colors duration-125 lg:block"
        >
          {APP_TAGLINE}
        </div>
        <h1 className="focus-sub -mt-[0.11em] text-text transition-colors duration-250">{APP_NAME}</h1>
      </div>
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const items = [
    { href: "/", icon: faKeyboard, nav: "test", label: "start typing" },
    { href: "/courses", icon: faGraduationCap, nav: "courses", label: "courses" },
    { href: "/about", icon: faInfo, nav: "about", label: "about" },
    { href: "/settings", icon: faCog, nav: "settings", label: "settings" },
  ];
  return (
    <header className="flex place-items-center gap-2">
      <Logo />
      <nav className="z-5 flex w-full items-center gap-1 md:gap-2">
        {items.map((it) => (
          <LinkButton
            key={it.href}
            href={it.href}
            icon={it.icon}
            title={it.label}
            data-nav-item={it.nav}
            className="hide-on-focus aspect-square text-[1.25rem]"
            aria-current={pathname === it.href ? "page" : undefined}
          />
        ))}
      </nav>
    </header>
  );
}
