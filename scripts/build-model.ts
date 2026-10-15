// Builds the phonetic model for the adaptive learning path:
// public/languages/english_10k.json → public/learn/model-en.json
//
//   npx tsx scripts/build-model.ts
//
// Same recipe as keybr.com's generate-languages.ts: an order-4 chain over
// " a-z", trained on the top 10,000 words (3+ letters) weighted by frequency.
// Monkeytype's list is ordered by frequency without counts, so the weight is
// Zipf's law (count ∝ 1 / rank).

import fs from "node:fs";
import path from "node:path";
import { TransitionTableBuilder } from "../src/lib/learn/model";

const ROOT = path.resolve(__dirname, "..");
const { words } = JSON.parse(fs.readFileSync(path.join(ROOT, "public/languages/english_10k.json"), "utf8")) as { words: string[] };

const alphabet = [0x20, ..."abcdefghijklmnopqrstuvwxyz"].map((c) => (typeof c === "number" ? c : c.codePointAt(0)!));
const builder = new TransitionTableBuilder(4, alphabet);
let used = 0;
words.forEach((w, rank) => {
  const word = w.toLowerCase();
  if (word.length < 3 || !/^[a-z]+$/.test(word)) return;
  builder.append(word, 10000 / (rank + 1));
  used++;
});
const data = builder.build();
const out = path.join(ROOT, "public/learn/model-en.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(data));
console.log(`model: ${used} words, ${Object.keys(data.segments).length} segments, ${fs.statSync(out).size} bytes → public/learn/model-en.json`);
