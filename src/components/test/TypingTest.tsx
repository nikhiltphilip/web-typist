"use client";

import { faChevronRight, faRotateRight } from "@fortawesome/free-solid-svg-icons";
import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { bestFor, saveTest } from "@/lib/db";
import { WordsTest, type TestResult } from "@/lib/engine/words";
import { setFocused } from "@/lib/focus";
import { getSettings, useSettings, type Settings } from "@/lib/settings";
import { playKey } from "@/lib/sound";
import { useKeys, useWindowFocus } from "@/lib/useKeys";
import { useLiveText } from "@/lib/useLiveText";
import { generateWords, loadQuotes, loadWords, pickQuote, splitText, type Quote } from "@/lib/wordgen";
import { restartEvent } from "../Header";
import { Result } from "../typing/Result";
import { WordsView } from "../typing/WordsView";
import { Button } from "../ui";
import { TestConfig } from "./TestConfig";

async function buildTest(s: Settings): Promise<{ test: WordsTest; quote: Quote | null }> {
  if (s.mode === "quote") {
    const quote = pickQuote(await loadQuotes(), s.quoteLength);
    return { test: new WordsTest({ mode: "quote", words: splitText(quote.text) }), quote };
  }
  if (s.mode === "custom") return { test: new WordsTest({ mode: "custom", words: splitText(s.customText) }), quote: null };
  if (s.mode === "zen") return { test: new WordsTest({ mode: "zen", words: [] }), quote: null };

  const list = await loadWords(s.language);
  const opts = { punctuation: s.punctuation, numbers: s.numbers };
  if (s.mode === "words") return { test: new WordsTest({ mode: "words", words: generateWords(list, s.words, opts) }), quote: null };
  const test: WordsTest = new WordsTest({
    mode: "time",
    timeLimit: s.time,
    words: generateWords(list, 100, opts),
    more: () => generateWords(list, 50, opts, test.words[test.words.length - 1]),
  });
  return { test, quote: null };
}

function mode2(s: Settings, quote: Quote | null): string {
  if (s.mode === "time") return String(s.time);
  if (s.mode === "words") return String(s.words);
  if (s.mode === "quote") return String(quote?.id ?? "");
  return s.mode;
}

function LiveStats({ test }: { test: WordsTest }) {
  const { liveSpeed, liveAcc } = useSettings();
  const text = useLiveText(test.subscribe, () => {
    if (!test.started || test.done) return "";
    const timer =
      test.mode === "time"
        ? String(Math.max(0, Math.ceil(test.timeLimit - test.elapsedMs() / 1000)))
        : test.mode === "zen"
          ? String(test.active)
          : `${test.active}/${test.words.length}`;
    return [timer, liveSpeed ? String(test.liveWpm()) : "", liveAcc ? `${test.liveAcc()}%` : ""].join("|");
  });
  if (!text) return <div className="h-[1em]" />;
  const [timer, wpm, acc] = text.split("|");
  return (
    <div className="flex h-[1em] gap-[0.5em] leading-[1em] text-main">
      <div>{timer}</div>
      {wpm && <div>{wpm}</div>}
      {acc && <div>{acc}</div>}
    </div>
  );
}

export function TypingTest() {
  const settings = useSettings();
  const [test, setTest] = useState<WordsTest | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [pb, setPb] = useState<{ isPb: boolean; prev: number | null } | null>(null);
  const [windowFocused, setWindowFocused] = useState(true);
  const tabArmed = useRef(false);
  const gen = useRef(0);
  const restartBtn = useRef<HTMLButtonElement>(null);

  const restart = useCallback(async (repeat?: WordsTest) => {
    const my = ++gen.current;
    setResult(null);
    setPb(null);
    setFocused(false);
    tabArmed.current = false;
    if (repeat) {
      // Same words again; time mode keeps generating after them.
      const words = repeat.mode === "zen" ? [] : repeat.words.slice();
      setTest(new WordsTest({ mode: repeat.mode, words, timeLimit: repeat.timeLimit, more: repeat.more ?? undefined }));
      return;
    }
    const built = await buildTest(getSettings());
    if (my !== gen.current) return;
    setTest(built.test);
    setQuote(built.quote);
  }, []);

  useEffect(() => {
    restart();
    const onRestart = () => restart();
    window.addEventListener(restartEvent, onRestart);
    return () => window.removeEventListener(restartEvent, onRestart);
  }, [restart]);

  useWindowFocus(setWindowFocused);

  const finish = useCallback(
    async (t: WordsTest) => {
      const r = t.result();
      // The result screen (and its chart) is not urgent: let the final
      // keystroke paint first (rerender-transitions).
      startTransition(() => setResult(r));
      setFocused(false);
      const s = getSettings();
      const m2 = mode2(s, quote);
      // Monkeytype's minimum for a valid result: some typing, a few seconds.
      if (r.durationMs < 2000 || r.keystrokes < 5) return;
      const prev = await bestFor(s.mode, m2);
      setPb({ isPb: prev === null || r.wpm > prev, prev });
      saveTest({ at: Date.now(), mode: s.mode, mode2: m2, wpm: r.wpm, raw: r.raw, acc: r.acc, consistency: r.consistency, durationMs: r.durationMs });
    },
    [quote],
  );

  // Watch for the end of the test (last word typed, or the clock in time mode).
  useEffect(() => {
    if (!test) return;
    const unsub = test.subscribe(() => test.done && !result && finish(test));
    const id = setInterval(() => test.tick(), 50);
    return () => {
      unsub();
      clearInterval(id);
    };
  }, [test, result, finish]);

  useKeys(({ key, ctrl, shift }) => {
    if (!test) return;
    if (key === "\t") {
      tabArmed.current = true;
      restartBtn.current?.focus();
      return;
    }
    if (key === "\n") {
      if (tabArmed.current) restart();
      else if (shift && test.mode === "zen") test.finish();
      return;
    }
    tabArmed.current = false;
    if (result || key === "Escape") return;

    let ok: boolean | null = null;
    if (key === "Backspace") test.backspace(ctrl);
    else if (key === " ") ok = test.space();
    else ok = test.type(key);
    if (key !== "Backspace" && ok === null) return;
    setFocused(true);
    playKey(ok);
  });

  const m2 = mode2(settings, quote);
  const typeLabel = `${settings.mode} ${settings.mode === "quote" ? (quote ? `#${quote.id}` : "") : settings.mode === "zen" || settings.mode === "custom" ? "" : m2}`.trim();

  return (
    <div className="grid content-center">
      <TestConfig hidden={!!result} onChange={() => restart()} />
      {!result && test && (
        <div className="relative">
          <div style={{ fontSize: `${settings.fontSize}rem` }} className="mb-1">
            <LiveStats test={test} />
          </div>
          <WordsView test={test} blurred={!windowFocused} />
          {!windowFocused && (
            <div className="absolute inset-0 grid place-items-center text-base text-text">
              <div>
                <span className="mr-2">⇡</span>Click here or press any key to focus
              </div>
            </div>
          )}
        </div>
      )}
      {!result && (
        <Button
          ref={restartBtn}
          variant="text"
          icon={faRotateRight}
          title="restart test"
          className="hide-on-focus mx-auto mt-4 w-max px-8 py-4 text-base"
          onClick={() => restart()}
        />
      )}
      {result && test && (
        <Result
          wpm={Math.round(result.wpm)}
          acc={`${Math.floor(result.acc)}%`}
          chart={result.chart}
          notice={
            pb?.isPb ? (
              <span className="text-main">new personal best{pb.prev !== null ? ` (previous ${Math.round(pb.prev)} wpm)` : ""}</span>
            ) : quote && settings.mode === "quote" ? (
              <span>{quote.source}</span>
            ) : undefined
          }
          stats={[
            { label: "test type", value: <span className="text-base">{typeLabel}<br />{settings.mode === "time" || settings.mode === "words" ? settings.language.replace("_", " ") : ""}</span> },
            { label: "raw", value: Math.round(result.raw), title: `${result.raw} wpm` },
            {
              label: "characters",
              value: `${result.chars.correctWord}/${result.chars.incorrect}/${result.chars.extra}/${result.chars.missed}`,
              title: "correct / incorrect / extra / missed",
            },
            { label: "consistency", value: `${Math.round(result.consistency)}%`, title: `${result.consistency}%` },
            { label: "time", value: `${Math.round(result.durationMs / 1000)}s`, title: `${(result.durationMs / 1000).toFixed(2)}s` },
          ]}
          actions={
            <>
              <Button ref={restartBtn} variant="text" icon={faChevronRight} title="next test" className="px-8 py-4 text-base" onClick={() => restart()} />
              <Button variant="text" icon={faRotateRight} title="repeat test" className="px-8 py-4 text-base" onClick={() => restart(test)} />
            </>
          }
        />
      )}
    </div>
  );
}
