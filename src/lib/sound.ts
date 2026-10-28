"use client";

import type { Howl } from "howler";
import { getSettings, type SoundPack } from "./settings";

// Sound packs from Monkeytype's static/sounds (GPL-3.0).
const PACKS: Record<Exclude<SoundPack, "off">, number> = { click1: 3, click4: 6, click6: 3 };
const ERROR_PACK = "error1";

type Howler = typeof import("howler");

// Howler loads only once sound is turned on, so it stays out of every page's
// boot path when sound is off (the default).
let howler: Howler | null = null;
let loading: Promise<Howler> | null = null;
const loadHowler = () => (loading ??= import("howler").then((m) => (howler = m)));

/** Run `fn` with howler; while it loads, only the first call is kept so key sounds don't pile up. */
let waiting = false;
function withHowler(fn: (h: Howler) => void): void {
  if (howler) return fn(howler);
  if (waiting) return;
  waiting = true;
  void loadHowler().then((h) => {
    waiting = false;
    fn(h);
  });
}

const cache = new Map<string, Howl[]>();

function pack(h: Howler, name: string, count: number): Howl[] {
  let howls = cache.get(name);
  if (!howls) {
    howls = Array.from({ length: count }, (_, i) => new h.Howl({ src: [`/sounds/${name}/${i + 1}.wav`] }));
    cache.set(name, howls);
  }
  return howls;
}

/** Fetch and decode the selected packs before they're needed, and free the ones no longer selected. */
export function preloadSounds(): void {
  const { sound, errorSound } = getSettings();
  const wanted = new Set<string>();
  if (sound !== "off") wanted.add(sound);
  if (errorSound) wanted.add(ERROR_PACK);

  for (const [name, howls] of cache) {
    if (wanted.has(name)) continue;
    for (const h of howls) h.unload();
    cache.delete(name);
  }
  if (!wanted.size) return;
  withHowler((h) => {
    for (const name of wanted) pack(h, name, name === ERROR_PACK ? 1 : PACKS[name as keyof typeof PACKS]);
  });
}

function play(name: string, count: number): void {
  withHowler((h) => {
    const howls = pack(h, name, count);
    const howl = howls[Math.floor(Math.random() * howls.length)];
    howl.volume(getSettings().volume);
    howl.play();
  });
}

export function playClick(): void {
  const { sound } = getSettings();
  if (sound !== "off") play(sound, PACKS[sound]);
}

export function playError(): void {
  if (getSettings().errorSound) play(ERROR_PACK, 1);
}

export function playKey(correct: boolean | null): void {
  if (correct === false && getSettings().errorSound) playError();
  else playClick();
}
