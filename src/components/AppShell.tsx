"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { isPaletteOpen, openPalette, setFocused, usePalette } from "@/lib/focus";
import { useSettings } from "@/lib/settings";
import { preloadSounds } from "@/lib/sound";
import { applyTheme } from "@/lib/themes";
import { CommandLine } from "./CommandLine";
import { Footer } from "./Footer";
import { Header } from "./Header";

// The result chart (Chart.js) isn't needed until a test ends: it's split out
// of the page bundle and warmed up once the page is idle. The command line
// stays in the bundle — it must take keys the instant esc is pressed.
const preload = () => void import("./typing/ResultChart");

function CommandLineGate() {
  const { open } = usePalette();
  return open ? <CommandLine /> : null;
}

const idle = (fn: () => void) => {
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(fn, { timeout: 3000 });
  else setTimeout(fn, 1500);
};

const CARET_SPEED = { off: "0ms", slow: "150ms", medium: "100ms", fast: "85ms" } as const;

export function AppShell({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const pathname = usePathname();

  useEffect(() => applyTheme(settings.theme), [settings.theme]);
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--font", `"${settings.font}", "Roboto Mono", monospace`);
    root.setProperty("--caret-speed", CARET_SPEED[settings.smoothCaret]);
  }, [settings.font, settings.smoothCaret]);

  useEffect(() => {
    idle(preload);
  }, []);

  // Sound packs are decoded ahead of the first keystroke.
  useEffect(() => {
    if (settings.sound !== "off" || settings.errorSound) idle(preloadSounds);
  }, [settings.sound, settings.errorSound]);

  // Moving the mouse leaves focus mode, like Monkeytype.
  useEffect(() => {
    const leave = () => setFocused(false);
    window.addEventListener("mousemove", leave, { passive: true });
    return () => window.removeEventListener("mousemove", leave);
  }, []);

  useEffect(() => setFocused(false), [pathname]);

  // Command line: ctrl+shift+p anywhere; esc too, except in courses where
  // esc belongs to the lesson (skip / restart exercise / back to menu).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isPaletteOpen()) return;
      const combo = e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "p";
      const esc = e.key === "Escape" && !pathname.startsWith("/courses/");
      if (combo || esc) {
        e.preventDefault();
        setFocused(false);
        openPalette();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname]);

  return (
    <div
      className="content-grid grid min-h-screen grid-rows-[auto_1fr_auto] gap-y-8 py-8"
    >
      <Header />
      <main className="grid">{children}</main>
      <Footer />
      <CommandLineGate />
    </div>
  );
}
