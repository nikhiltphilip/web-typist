"use client";

// Word sources for the free typing test. Word lists and quotes come from
// Monkeytype's static/languages and static/quotes (GPL-3.0).

import type { Language, QuoteLength } from "./settings";

const wordCache = new Map<string, string[]>();
let quoteCache: Quote[] | null = null;

export interface Quote {
  text: string;
  source: string;
  length: number;
  id: number;
}

export async function loadWords(language: Language): Promise<string[]> {
  const hit = wordCache.get(language);
  if (hit) return hit;
  const res = await fetch(`/languages/${language}.json`);
  const json = (await res.json()) as { words: string[] };
  wordCache.set(language, json.words);
  return json.words;
}

export async function loadQuotes(): Promise<Quote[]> {
  if (quoteCache) return quoteCache;
  const res = await fetch("/quotes/english.json");
  quoteCache = ((await res.json()) as { quotes: Quote[] }).quotes;
  return quoteCache;
}

// Monkeytype's quote length groups: short ≤100, medium ≤300, long ≤600.
const GROUPS: Record<Exclude<QuoteLength, "all">, [number, number]> = {
  short: [0, 100],
  medium: [101, 300],
  long: [301, 600],
};

export function pickQuote(quotes: Quote[], length: QuoteLength): Quote {
  const pool = length === "all" ? quotes : quotes.filter((q) => q.length >= GROUPS[length][0] && q.length <= GROUPS[length][1]);
  return pool[Math.floor(Math.random() * pool.length)] ?? quotes[0];
}

const rand = <T>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

function randomNumber(): string {
  const len = 1 + Math.floor(Math.random() * 4);
  let s = String(1 + Math.floor(Math.random() * 9));
  for (let i = 1; i < len; i++) s += Math.floor(Math.random() * 10);
  return s;
}

/**
 * A simplified port of Monkeytype's english-punctuation: capitalise sentence
 * starts, end sentences with . ? !, and sprinkle commas, quotes and brackets.
 */
function punctuate(word: string, prev: string | undefined, isLast: boolean): string {
  const sentenceStart = prev === undefined || /[.?!]$/.test(prev);
  let w = sentenceStart ? word[0].toUpperCase() + word.slice(1) : word;
  const r = Math.random();
  if (isLast || r < 0.08) w += rand([".", ".", ".", "?", "!"]);
  else if (r < 0.18) w += ",";
  else if (r < 0.2) w = `"${w}"`;
  else if (r < 0.22) w = `(${w})`;
  else if (r < 0.24) w += rand([";", ":"]);
  return w;
}

export function generateWords(
  list: string[],
  count: number,
  opts: { punctuation: boolean; numbers: boolean },
  prevWord?: string,
): string[] {
  const out: string[] = [];
  let prev = prevWord;
  for (let i = 0; i < count; i++) {
    let w: string;
    do w = rand(list);
    while (list.length > 1 && w === prev);
    if (opts.numbers && Math.random() < 0.1) w = randomNumber();
    else if (opts.punctuation) w = punctuate(w, prev, i === count - 1 && count < 100);
    out.push(w);
    prev = w;
  }
  return out;
}

export function splitText(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}
