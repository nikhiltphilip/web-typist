"use client";

import { BookIcon, HandIcon, HashIcon, KeyboardIcon, RotateCwIcon, SettingsIcon, SproutIcon, TypeIcon, WrenchIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { loadResults, saveResult } from "@/lib/db";
import { setFocused } from "@/lib/focus";
import { AdaptiveInput } from "@/lib/learn/input";
import { allKeys, generateText, guidedKeys, learningRate, type LessonKey, type LessonType, type TextSources, unlockOrder } from "@/lib/learn/lesson";
import { Letter, loadModel } from "@/lib/learn/model";
import { cpmToWpm, dailyStats, dayKey, isValidResult, KeyStatsBuilder, makeResult, speedOf, streaks, summaryStats, type TypingResult } from "@/lib/learn/stats";
import { getSettings, setSetting, useSettings } from "@/lib/settings";
import { playKey } from "@/lib/sound";
import { useKeys, useWindowFocus } from "@/lib/useKeys";
import { afterPaint } from "@/lib/useLiveText";
import { loadQuotes, loadWords } from "@/lib/wordgen";
import { StreamView } from "../typing/StreamView";
import { Button, cn, Icon, LinkButton } from "../ui";
import { confidenceColor, CurrentKey, Gauges, KeyStrip, keyTitle, Streaks } from "./Indicators";
import { FingerHint, Keyboard, type KeyLook } from "./Keyboard";

/** The keyboard follows the cursor; it re-renders only when the next key changes. */
function LiveKeyboard({
  input,
  look,
  keyboard,
  hands,
  fingers,
}: {
  input: AdaptiveInput;
  look: (k: string) => KeyLook | undefined;
  keyboard: boolean;
  hands: boolean;
  fingers: boolean;
}) {
  const next = useSyncExternalStore(input.subscribe, () => (input.done ? "" : (input.chars[input.pos] ?? "")), () => "");
  if (!keyboard && !hands) return null;
  return (
    <div className="grid gap-5">
      {/* The hint is what you look at while typing, so only the keyboard fades. */}
      {keyboard && <Keyboard look={look} active={next || null} fingers={fingers} className="soft-dim-on-focus" />}
      {hands && <FingerHint active={next || null} />}
    </div>
  );
}

const DIGITS = "0123456789".split("").map((d, i) => new Letter(d.codePointAt(0)!, i === 0 ? 0 : Math.log10(1 + 1 / i)));

const TYPES: { id: LessonType; label: string; icon: LucideIcon }[] = [
  { id: "guided", label: "guided", icon: SproutIcon },
  { id: "words", label: "common words", icon: TypeIcon },
  { id: "books", label: "books", icon: BookIcon },
  { id: "custom", label: "custom text", icon: WrenchIcon },
  { id: "numbers", label: "numbers", icon: HashIcon },
];

// The same card look as the typing test's config bar.
const card = "card flex rounded-(--roundness) bg-sub-alt px-[0.5em]";

export function LearnRunner() {
  const settings = useSettings();
  const s = settings.learn;
  const [sources, setSources] = useState<TextSources | null>(null);
  const [results, setResults] = useState<TypingResult[] | null>(null);
  const [input, setInput] = useState<AdaptiveInput | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [windowFocused, setWindowFocused] = useState(true);
  const tabArmed = useRef(false);
  useWindowFocus(setWindowFocused);

  useEffect(() => {
    let live = true;
    Promise.all([loadModel(), loadWords("english_10k"), loadQuotes(), loadResults("learn")]).then(([model, words, quotes, rs]) => {
      if (!live) return;
      const dictionary = words.map((w) => w.toLowerCase()).filter((w) => /^[a-z]+$/.test(w));
      const passages = quotes.filter((q) => q.length >= 80 && q.length <= 300).map((q) => q.text);
      setSources({ model, dictionary, passages });
      setResults(rs);
    });
    return () => {
      live = false;
    };
  }, []);

  const letters = useMemo(() => {
    if (!sources) return [];
    return s.type === "numbers" ? DIGITS : unlockOrder(sources.model, s.keyboardOrder);
  }, [sources, s.type, s.keyboardOrder]);

  // Results are only ever appended, so key stats are built up incrementally
  // rather than from the whole history after every lesson.
  const stats = useRef<{ letters: readonly Letter[]; seen: readonly TypingResult[]; builder: KeyStatsBuilder } | null>(null);
  const keysFor = useCallback(
    (rs: readonly TypingResult[]): LessonKey[] => {
      let c = stats.current;
      const appended = c && c.letters === letters && c.seen.length <= rs.length && rs[c.seen.length - 1] === c.seen[c.seen.length - 1];
      if (!c || !appended) c = stats.current = { letters, seen: [], builder: new KeyStatsBuilder(letters.map((l) => l.codePoint)) };
      for (let i = c.seen.length; i < rs.length; i++) c.builder.add(rs[i]);
      c.seen = rs;
      const map = c.builder.map;
      return s.type === "guided" ? guidedKeys(letters, map, s) : allKeys(letters, map, s);
    },
    [letters, s],
  );

  const keys = useMemo(() => (results ? keysFor(results) : []), [results, keysFor]);
  const focusKey = keys.find((k) => k.focused);
  const rate = useMemo(() => (focusKey ? learningRate(focusKey.stats.samples, s.targetSpeed) : null), [focusKey, s.targetSpeed]);
  const summary = useMemo(() => summaryStats(results ?? []), [results]);
  const today = useMemo(() => dailyStats(results ?? []).get(dayKey(Date.now())), [results]);
  const streakList = useMemo(() => streaks(results ?? []), [results]);

  const newLesson = useCallback(
    (forKeys: LessonKey[]) => {
      if (!sources) return;
      const cur = getSettings().learn;
      setInput(new AdaptiveInput(generateText(forKeys, cur, sources), cur));
      setFocused(false);
    },
    [sources],
  );

  // A fresh lesson whenever a setting that shapes the lesson changes (and on
  // first load). Display options (keyboard, hands, colours, goal) don't.
  const DISPLAY_ONLY = ["showKeyboard", "showHands", "fingerHints", "dailyGoal"];
  const settingsKey = JSON.stringify(s, (k, v) => (DISPLAY_ONLY.includes(k) ? undefined : v));
  useEffect(() => {
    if (sources && results) newLesson(keysFor(results));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources, results === null, settingsKey]);

  const finish = useCallback(
    (done: AdaptiveInput) => {
      if (!results) return;
      const r = makeResult("learn", s.type, Date.now(), done.steps, done.elapsedMs());
      setFocused(false);
      if (!isValidResult(r)) {
        setToast("lesson too short to count");
        newLesson(keys);
        return;
      }
      void saveResult(r);
      const next = [...results, r];
      const nextKeys = keysFor(next);
      // keybr's lesson events: a new key, or a new top speed.
      const unlocked = nextKeys.filter((k) => k.included && !keys.find((o) => o.letter.codePoint === k.letter.codePoint)?.included);
      if (unlocked.length) setToast(`new key unlocked: ${unlocked.map((k) => k.letter.label).join(" ")}`);
      else if (results.length && speedOf(r) > Math.max(...results.map(speedOf))) setToast(`new top speed: ${Math.round(cpmToWpm(speedOf(r)))} wpm`);
      else setToast(null);
      setResults(next);
      newLesson(nextKeys);
    },
    [results, keys, keysFor, newLesson, s.type],
  );

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  useKeys(({ key, shift }) => {
    if (!input) return false;
    if (key === "\t") {
      tabArmed.current = true;
      return;
    }
    if (key === "\n" && tabArmed.current) {
      tabArmed.current = false;
      newLesson(keys);
      return;
    }
    tabArmed.current = false;
    if (key === "Escape" || key.startsWith("Arrow")) return false;
    const ok = input.input(key, performance.now(), shift);
    setFocused(true);
    if (key !== "Backspace" && ok !== null) playKey(ok);
    if (input.done) afterPaint(() => finish(input));
  });

  const keyLook = useCallback(
    (label: string) => {
      const k = keys.find((x) => x.letter.label === label);
      if (!k) return label === " " ? undefined : { dim: s.type === "guided" };
      if (!k.included) return { dim: true, title: keyTitle(k, s.targetSpeed) };
      if (k.confidence == null) return { title: keyTitle(k, s.targetSpeed) };
      return { background: confidenceColor(k.confidence), color: "var(--bg-color)", title: keyTitle(k, s.targetSpeed) };
    },
    [keys, s.type, s.targetSpeed],
  );

  const setLearn = (patch: Partial<typeof s>) => setSetting("learn", { ...getSettings().learn, ...patch });
  const setType = (type: LessonType) => setLearn({ type });

  if (!sources || !results) return <div className="grid place-items-center text-sub">loading…</div>;

  return (
    <div className="grid content-start gap-8 fade-in">
      <div className="hide-on-focus mx-auto flex w-max flex-wrap items-center justify-center gap-4 text-[0.75em]">
        <div className={card}>
          {TYPES.map((t) => (
            <Button key={t.id} variant="text" icon={t.icon} text={t.label} active={s.type === t.id} onClick={() => setType(t.id)} className="px-[0.5em] py-3" />
          ))}
        </div>
        <div className={card}>
          <Button variant="text" icon={KeyboardIcon} text="keyboard" active={s.showKeyboard} onClick={() => setLearn({ showKeyboard: !s.showKeyboard })} className="px-[0.5em] py-3" />
          <Button variant="text" icon={HandIcon} text="hands" active={s.showHands} onClick={() => setLearn({ showHands: !s.showHands })} className="px-[0.5em] py-3" />
          <LinkButton href="/settings#learn" icon={SettingsIcon} text="settings" className="px-[0.5em] py-3" />
        </div>
      </div>

      <div className="dim-on-focus grid gap-5">
        <Gauges stats={summary} today={today} dailyGoal={s.dailyGoal} />
        <KeyStrip keys={keys} targetCpm={s.targetSpeed} />
        {s.type === "guided" && <CurrentKey keyInfo={focusKey} rate={rate} targetCpm={s.targetSpeed} />}
        <Streaks streaks={streakList} />
      </div>

      <div className="relative">
        <div className={cn("pointer-events-none absolute -top-8 left-0 text-sm text-main transition-opacity duration-300", toast ? "opacity-100" : "opacity-0")}>{toast}</div>
        {input && <StreamView key={input.chars.join("")} drill={input} visibleLines={3} keepLine={1} maxSize={32} blurred={!windowFocused} />}
        {!windowFocused && <div className="absolute inset-0 grid place-items-center text-base text-text">Click here or press any key to focus</div>}
      </div>

      <Button variant="text" icon={RotateCwIcon} title="new lesson (tab + enter)" className="hide-on-focus mx-auto w-max px-8 py-2 text-base" onClick={() => newLesson(keys)} />

      {input && <LiveKeyboard input={input} look={keyLook} keyboard={s.showKeyboard} hands={s.showHands} fingers={s.fingerHints} />}

      <p className="hide-on-focus text-center text-xs text-sub">
        adaptive learning path based on <a className="underline-offset-4 hover:underline" href="https://github.com/aradzie/keybr.com">keybr.com</a> · see your progress in{" "}
        <Link className="text-main underline-offset-4 hover:underline" href="/analytics">
          <Icon icon={SproutIcon} /> analytics
        </Link>
      </p>
    </div>
  );
}
