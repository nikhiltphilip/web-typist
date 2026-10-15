// Which finger presses which key on QWERTY (standard touch-typing zones),
// used by the learning path's keyboard and finger hints.

export type Finger = "pinky" | "ring" | "middle" | "index" | "thumb";
export type Hand = "left" | "right";

/** Standard touch-typing zones for QWERTY. */
const ZONES: [Hand, Finger, string][] = [
  ["left", "pinky", "1qaz"],
  ["left", "ring", "2wsx"],
  ["left", "middle", "3edc"],
  ["left", "index", "45rtfgvb"],
  ["right", "index", "67yuhjnm"],
  ["right", "middle", "8ik,"],
  ["right", "ring", "9ol."],
  ["right", "pinky", "0-=p[];'/"],
];

export function fingerFor(key: string): { hand: Hand | "either"; finger: Finger } | null {
  if (key === " ") return { hand: "either", finger: "thumb" };
  if (key === "lshift") return { hand: "left", finger: "pinky" };
  if (key === "rshift") return { hand: "right", finger: "pinky" };
  for (const [hand, finger, keys] of ZONES) if (keys.includes(key)) return { hand, finger };
  return null;
}

/** One colour per finger, mirrored on both hands; fixed hues that read on any theme. */
export const FINGER_COLOR: Record<Finger, string> = {
  pinky: "hsl(340 75% 66%)",
  ring: "hsl(28 85% 62%)",
  middle: "hsl(140 50% 55%)",
  index: "hsl(210 80% 66%)",
  thumb: "hsl(270 40% 70%)",
};

const SHIFTED: Record<string, string> = {
  "!": "1", "@": "2", "#": "3", $: "4", "%": "5", "^": "6", "&": "7", "*": "8", "(": "9", ")": "0", _: "-", "+": "=",
  "{": "[", "}": "]", ":": ";", '"': "'", "<": ",", ">": ".", "?": "/",
};

/** Which key a character is on, and whether it needs shift. */
export function keyFor(ch: string): { key: string; shift: boolean } | null {
  if (ch === "\n") return { key: " ", shift: false };
  if (SHIFTED[ch]) return { key: SHIFTED[ch], shift: true };
  const lower = ch.toLowerCase();
  if (fingerFor(lower)) return { key: lower, shift: ch !== lower };
  return null;
}

/** Shift is pressed with the pinky of the hand that is not typing the key. */
export function shiftFor(key: string): "lshift" | "rshift" {
  return fingerFor(key)?.hand === "left" ? "rshift" : "lshift";
}

