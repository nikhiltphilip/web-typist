"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { closePalette, usePalette } from "@/lib/focus";
import { FONT_SIZES, FONTS, getSettings, setSetting, useSettings, type Settings } from "@/lib/settings";
import { applyTheme, THEME_NAMES, THEMES } from "@/lib/themes";
import { restartEvent } from "./Header";
import { cn } from "./ui";

type Item = { id: string; label: string; active?: boolean; run: () => void; preview?: () => void; swatch?: string[] };
type Page = { title: string; items: Item[] };

// Monkeytype's command line: a list of commands, some of which open a sub-list.
export function CommandLine() {
  const { open, page: initialPage } = usePalette();
  const settings = useSettings();
  const router = useRouter();
  const [page, setPage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPage(initialPage);
      setSearch("");
    }
  }, [open, initialPage]);

  const set = <K extends keyof Settings>(k: K, v: Settings[K], restart = false) => () => {
    setSetting(k, v);
    if (k === "theme") applyTheme(v as string);
    if (restart) window.dispatchEvent(new Event(restartEvent));
    closePalette();
  };

  const pages = useMemo<Record<string, Page>>(() => {
    const choice = <K extends keyof Settings>(key: K, values: Settings[K][], restart = false, label = (v: Settings[K]) => String(v)): Item[] =>
      values.map((v) => ({ id: `${key}-${v}`, label: label(v), active: settings[key] === v, run: set(key, v, restart) }));
    return {
      themes: {
        title: "theme",
        items: THEME_NAMES.map((t) => ({
          id: `theme-${t}`,
          label: t.replace(/_/g, " "),
          active: settings.theme === t,
          run: set("theme", t),
          preview: () => applyTheme(t),
          swatch: [THEMES[t].bg, THEMES[t].main, THEMES[t].sub, THEMES[t].text],
        })),
      },
      mode: { title: "mode", items: choice("mode", ["time", "words", "quote", "zen", "custom"], true) },
      time: { title: "time", items: choice("time", [15, 30, 60, 120], true) },
      words: { title: "words", items: choice("words", [10, 25, 50, 100], true) },
      punctuation: { title: "punctuation", items: choice("punctuation", [true, false], true, (v) => (v ? "on" : "off")) },
      numbers: { title: "numbers", items: choice("numbers", [true, false], true, (v) => (v ? "on" : "off")) },
      language: { title: "language", items: choice("language", ["english", "english_1k", "english_5k", "english_10k"], true, (v) => v.replace("_", " ")) },
      font: { title: "font family", items: choice("font", FONTS) },
      fontSize: { title: "font size", items: choice("fontSize", FONT_SIZES, false, (v) => `${v}px`) },
      caretStyle: { title: "caret style", items: choice("caretStyle", ["off", "default", "block", "outline", "underline"]) },
      smoothCaret: { title: "smooth caret", items: choice("smoothCaret", ["off", "slow", "medium", "fast"]) },
      sound: { title: "sound on click", items: choice("sound", ["off", "click1", "click4", "click6"]) },
      liveTimer: { title: "live timer", items: choice("liveTimer", [true, false], false, (v) => (v ? "show" : "hide")) },
      liveSpeed: { title: "live speed", items: choice("liveSpeed", [true, false], false, (v) => (v ? "show" : "hide")) },
      liveAcc: { title: "live accuracy", items: choice("liveAcc", [true, false], false, (v) => (v ? "show" : "hide")) },
      wordProcessor: { title: "word processor mode (courses)", items: choice("wordProcessor", [true, false], false, (v) => (v ? "on" : "off")) },
      noSkip: { title: "forbid skipping exercises (courses)", items: choice("noSkip", [true, false], false, (v) => (v ? "on" : "off")) },
      maxError: { title: "max error % (courses)", items: choice("maxError", [1, 2, 3, 4, 5, 10], false, (v) => `${v}%`) },
    };
  }, [settings]);

  const root: Item[] = [
    ...Object.entries(pages).map(([id, p]) => ({ id, label: `${p.title}...`, run: () => (setPage(id), setSearch("")) })),
    { id: "go-test", label: "go to test", run: () => (router.push("/"), closePalette()) },
    { id: "go-courses", label: "go to courses", run: () => (router.push("/courses"), closePalette()) },
    { id: "go-settings", label: "go to settings", run: () => (router.push("/settings"), closePalette()) },
  ];

  const current = page ? pages[page] : null;
  const items = current ? current.items : root;

  const close = () => {
    applyTheme(getSettings().theme); // undo any hover preview
    closePalette();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid justify-center bg-black/75 pt-[5vh] fade-in" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <Command
        label="command line"
        className="h-fit w-[min(700px,calc(100vw-2rem))] overflow-hidden rounded-(--roundness) bg-bg text-text shadow-[0_0_0_0.1rem_var(--sub-alt-color)]"
        loop
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            if (page && !initialPage) setPage(null);
            else close();
          } else if (e.key === "Backspace" && search === "" && page) {
            setPage(null);
          }
        }}
      >
        <Command.Input
          ref={inputRef}
          autoFocus
          value={search}
          onValueChange={setSearch}
          placeholder={current ? current.title : "Search..."}
          className="w-full border-0 bg-transparent px-4 py-4 text-base text-text caret-caret outline-none placeholder:text-sub"
        />
        <Command.List className="max-h-[min(50vh,550px)] overflow-y-auto pb-2 [scrollbar-width:thin]">
          <Command.Empty className="px-4 py-2 text-sub">nothing found</Command.Empty>
          {items.map((it) => (
            <Command.Item
              key={it.id}
              value={`${it.label} ${it.id}`}
              onSelect={it.run}
              onMouseEnter={it.preview}
              onFocus={it.preview}
              className={cn(
                "flex cursor-pointer items-center gap-3 px-4 py-2 text-sm text-sub data-[selected=true]:bg-sub-alt data-[selected=true]:text-text",
              )}
            >
              <span className={cn("w-3", it.active ? "text-main" : "text-transparent")}>✓</span>
              <span className="flex-1">{it.label}</span>
              {it.swatch && (
                <span className="flex gap-1 rounded-full p-1" style={{ background: it.swatch[0] }}>
                  {it.swatch.slice(1).map((c, i) => (
                    <span key={i} className="h-3 w-3 rounded-full" style={{ background: c }} />
                  ))}
                </span>
              )}
            </Command.Item>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}
