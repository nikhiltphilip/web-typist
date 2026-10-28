"use client";

import { useSyncExternalStore } from "react";
import { STORAGE_KEY } from "./brand";
import { DEFAULT_THEME } from "./themes";
import type { Mode } from "./engine/words";
import { DEFAULT_LEARN, type LearnSettings } from "./learn/settings";

export type CaretStyle = "default" | "block" | "outline" | "underline" | "off";
export type SmoothCaret = "off" | "slow" | "medium" | "fast";
export type SoundPack = "off" | "click1" | "click4" | "click6";
export type QuoteLength = "short" | "medium" | "long" | "all";
export type Language = "english" | "english_1k" | "english_5k" | "english_10k";

export interface Settings {
  theme: string;
  font: string;
  /** Typing text size in px. */
  fontSize: number;
  caretStyle: CaretStyle;
  smoothCaret: SmoothCaret;
  sound: SoundPack;
  errorSound: boolean;
  volume: number;
  liveTimer: boolean;
  liveSpeed: boolean;
  liveAcc: boolean;
  // test config bar
  mode: Mode;
  time: number;
  words: number;
  punctuation: boolean;
  numbers: boolean;
  quoteLength: QuoteLength;
  language: Language;
  customText: string;
  // course (gtypist) options
  maxError: number;
  wordProcessor: boolean;
  noSkip: boolean;
  alwaysSure: boolean;
  // adaptive learning path (keybr)
  learn: LearnSettings;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: DEFAULT_THEME,
  font: "Roboto Mono",
  fontSize: 32,
  caretStyle: "default",
  smoothCaret: "medium",
  sound: "off",
  errorSound: false,
  volume: 0.5,
  liveTimer: true,
  liveSpeed: false,
  liveAcc: false,
  mode: "time",
  time: 30,
  words: 25,
  punctuation: false,
  numbers: false,
  quoteLength: "all",
  language: "english",
  customText: "The quick brown fox jumps over the lazy dog",
  maxError: 3,
  wordProcessor: false,
  noSkip: false,
  alwaysSure: false,
  learn: DEFAULT_LEARN,
};

export const FONT_SIZES = [16, 20, 24, 28, 32, 40, 48];

export const FONTS = [
  "Roboto Mono",
  "JetBrains Mono",
  "Iosevka",
  "Fira Code",
  "IBM Plex Mono",
  "Inconsolata",
  "Hack",
  "Commit Mono",
  "Geist Mono",
  "Lexend Deca",
  "Montserrat",
];


let current: Settings = DEFAULT_SETTINGS;
let loaded = false;
const listeners = new Set<() => void>();

function load(): Settings {
  if (loaded) return current;
  loaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      current = { ...DEFAULT_SETTINGS, ...saved, learn: { ...DEFAULT_LEARN, ...saved.learn } };
      // Font size used to be stored in rem.
      if (current.fontSize < 8) current.fontSize *= 16;
    }
  } catch {
    // storage blocked or corrupt: keep defaults
  }
  return current;
}

export function getSettings(): Settings {
  return typeof window === "undefined" ? DEFAULT_SETTINGS : load();
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  current = { ...getSettings(), [key]: value };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, () => DEFAULT_SETTINGS);
}
