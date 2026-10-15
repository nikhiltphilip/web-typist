"use client";

import { Howl } from "howler";
import { getSettings, type SoundPack } from "./settings";

// Sound packs from Monkeytype's static/sounds (GPL-3.0).
const PACKS: Record<Exclude<SoundPack, "off">, number> = { click1: 3, click4: 6, click6: 3 };

const cache = new Map<string, Howl[]>();

function pack(name: string, count: number): Howl[] {
  let howls = cache.get(name);
  if (!howls) {
    howls = Array.from({ length: count }, (_, i) => new Howl({ src: [`/sounds/${name}/${i + 1}.wav`] }));
    cache.set(name, howls);
  }
  return howls;
}

/** Create (and so fetch and decode) the selected packs before they're needed. */
export function preloadSounds(): void {
  const { sound, errorSound } = getSettings();
  if (sound !== "off") pack(sound, PACKS[sound]);
  if (errorSound) pack("error1", 1);
}

export function playClick(): void {
  const { sound, volume } = getSettings();
  if (sound === "off") return;
  const howls = pack(sound, PACKS[sound]);
  const h = howls[Math.floor(Math.random() * howls.length)];
  h.volume(volume);
  h.play();
}

export function playError(): void {
  const { errorSound, volume } = getSettings();
  if (!errorSound) return;
  const h = pack("error1", 1)[0];
  h.volume(volume);
  h.play();
}

export function playKey(correct: boolean | null): void {
  if (correct === false && getSettings().errorSound) playError();
  else playClick();
}
