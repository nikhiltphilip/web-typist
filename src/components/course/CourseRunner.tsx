"use client";

import { faArrowLeft, faCheck, faChevronRight, faRotateRight, faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CoursePlayer, type View } from "@/lib/course/player";
import type { CourseScript, MenuItem } from "@/lib/course/types";
import { passedDrills, recordDrillPass, type DrillBest } from "@/lib/db";
import type { StreamDrill } from "@/lib/engine/stream";
import { setFocused } from "@/lib/focus";
import { getSettings, useSettings } from "@/lib/settings";
import { playKey } from "@/lib/sound";
import { useKeys, useWindowFocus } from "@/lib/useKeys";
import { recordKeystrokes } from "@/lib/learn/record";
import { afterPaint, useLiveText } from "@/lib/useLiveText";
import { Result } from "../typing/Result";
import { StreamView } from "../typing/StreamView";
import { Button, cn, Icon, Kbd } from "../ui";

const MODE_LABEL: Record<View["kind"], string> = {
  tutorial: "tutorial",
  query: "query",
  drill: "drill",
  drillResult: "drill",
  drillFailed: "drill",
  menu: "menu",
  exit: "",
};

function Hint({ children }: { children: React.ReactNode }) {
  return <div className="text-center text-xs leading-[2] text-sub">{children}</div>;
}

// ── views ──────────────────────────────────────────────────────────────────

function Tutorial({ lines }: { lines: string[] }) {
  return (
    <pre className="overflow-x-auto font-mono text-[1.05rem] leading-[1.6] whitespace-pre-wrap text-text [tab-size:8]">{lines.join("\n")}</pre>
  );
}

function Menu({ player, items, title, passed }: { player: CoursePlayer; items: MenuItem[]; title: string; passed: Map<number, DrillBest> }) {
  const [sel, setSel] = useState(0);
  useKeys(({ key }) => {
    if (key === "ArrowDown" || key === "j") setSel((s) => (s + 1) % items.length);
    else if (key === "ArrowUp" || key === "k") setSel((s) => (s - 1 + items.length) % items.length);
    else if (key === "\n" || key === " ") player.choose(items[sel]);
    else if (key === "Escape" || key === "q") player.escape();
    else return false;
  });
  return (
    <div className="grid gap-4">
      <div className="text-sub">{title}</div>
      <div className="grid gap-1">
        {items.map((it, i) => {
          const done = it.drills.filter((d) => passed.has(d)).length;
          const total = it.drills.length;
          const complete = total > 0 && done === total;
          return (
            <button
              key={it.label + i}
              type="button"
              onMouseEnter={() => setSel(i)}
              onClick={() => player.choose(it)}
              className={cn(
                "grid cursor-pointer grid-cols-[2.5rem_1fr_auto] items-center gap-4 rounded-(--roundness) px-4 py-3 text-left transition-colors duration-125",
                i === sel ? "bg-sub-alt text-text" : "text-sub",
              )}
            >
              <span className={cn("text-xs", i === sel ? "text-main" : "text-sub")}>{String(i + 1).padStart(2, "0")}</span>
              <span className="whitespace-pre">{it.text}</span>
              <span className={cn("flex items-center gap-2 text-xs", complete ? "text-main" : "text-sub")}>
                {total > 0 && (
                  <>
                    {complete && <Icon icon={faCheck} />}
                    {done}/{total}
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <Hint>
        <Kbd>↑</Kbd> <Kbd>↓</Kbd> select · <Kbd>enter</Kbd> start lesson · <Kbd>esc</Kbd> back
      </Hint>
    </div>
  );
}

function DrillLive({ drill }: { drill: StreamDrill }) {
  const { fontSize, liveSpeed } = useSettings();
  const text = useLiveText(drill.subscribe, () =>
    drill.started ? [`${Math.floor(drill.elapsedMs() / 1000)}s`, liveSpeed ? String(drill.liveWpm()) : "", drill.errors ? `${drill.errors}✗` : ""].join("|") : "",
  );
  const style = { fontSize: `${Math.min(fontSize, 1.5)}rem` };
  if (!text) return <div className="h-[1em]" style={style} />;
  const [time, wpm, errors] = text.split("|");
  return (
    <div className="flex h-[1em] gap-[0.75em] leading-[1em] text-main" style={style}>
      <span>{time}</span>
      {wpm && <span>{wpm}</span>}
      {errors && <span className="text-error">{errors}</span>}
    </div>
  );
}

/** "skip" until the first key, then "restart" — re-renders only on that change. */
function EscHint({ drill }: { drill: StreamDrill }) {
  const started = useSyncExternalStore(drill.subscribe, () => drill.started, () => false);
  return <>{started ? "restart" : "skip"}</>;
}

function Drill({ view, instruction, maxError, blurred }: { view: Extract<View, { kind: "drill" }>; instruction: string[]; maxError: number; blurred: boolean }) {
  const speed = view.drillKind === "S" || view.drillKind === "s";
  const practice = view.drillKind === "d" || view.drillKind === "s";
  return (
    <div className="grid gap-6">
      {instruction.length > 0 && <div className="text-[1.05rem] leading-[1.6] whitespace-pre-wrap text-sub">{instruction.join("\n")}</div>}
      <div className="grid gap-1">
        <DrillLive drill={view.drill} />
        <StreamView drill={view.drill} blurred={blurred} />
      </div>
      <Hint>
        {speed ? "speed test" : "drill"}
        {practice ? " · practice only" : ` · max ${maxError.toFixed(1)}% errors`}
        {view.attempt > 1 ? ` · attempt ${view.attempt}` : ""} · <Kbd>enter</Kbd> at each ⏎ ·{" "}
        {speed ? "backspace allowed" : "no backspace"} · <Kbd>esc</Kbd> <EscHint drill={view.drill} />
      </Hint>
    </div>
  );
}

function stats(r: NonNullable<Extract<View, { kind: "drillResult" }>["result"]>) {
  return [
    { label: "raw", value: Math.round(r.rawWpm), title: `${r.rawWpm} wpm (all keystrokes)` },
    { label: "errors", value: r.errors },
    { label: "error rate", value: `${r.errorPct.toFixed(1)}%` },
    { label: "keystrokes", value: r.charsTyped },
    { label: "time", value: `${Math.round(r.durationMs / 1000)}s`, title: `${(r.durationMs / 1000).toFixed(2)}s` },
  ];
}

function DrillFailed({ view, player }: { view: Extract<View, { kind: "drillFailed" }>; player: CoursePlayer }) {
  useKeys(({ key }) => {
    if (key !== "\n" && key !== " ") return false;
    player.continue();
  });
  const r = view.result;
  return (
    <Result
      wpm={Math.round(r.wpm)}
      acc={`${Math.floor(r.acc)}%`}
      chart={r.chart}
      stats={stats(r)}
      notice={
        <span className="text-error">
          {view.step === "error"
            ? `Your error-rate is too high. You have to achieve ${view.maxError.toFixed(1)}%.`
            : `You failed this test, so you need to go back to ${view.failLabel}.`}
        </span>
      }
      actions={<Button variant="text" icon={faRotateRight} text="press enter to continue" className="px-8 py-4" onClick={() => player.continue()} />}
    />
  );
}

function DrillDone({ view, player, prevBest }: { view: Extract<View, { kind: "drillResult" }>; player: CoursePlayer; prevBest: number | null | undefined }) {
  useKeys(({ key }) => {
    if (key === "Escape") player.escape();
    else if (/^[rne]$/i.test(key) && !view.confirmingExit) player.resultKey(key);
    else if (/^[yn]$/i.test(key) && view.confirmingExit) player.resultKey(key);
    else return false;
  });
  const prompt = view.confirmingExit ? (
    <span className="text-text">
      Are you sure you want to exit this lesson? <Kbd>y</Kbd> / <Kbd>n</Kbd>
    </span>
  ) : null;
  const actions = view.confirmingExit ? (
    <>
      <Button variant="text" text="yes, exit" onClick={() => player.resultKey("y")} className="px-6 py-3" />
      <Button variant="text" text="no" onClick={() => player.resultKey("n")} className="px-6 py-3" />
    </>
  ) : (
    <>
      <Button variant="text" icon={faRotateRight} onClick={() => player.resultKey("r")} className="px-6 py-3">
        repeat <Kbd>r</Kbd>
      </Button>
      {view.allowNext && (
        <Button variant="text" icon={faChevronRight} onClick={() => player.resultKey("n")} className="px-6 py-3">
          next <Kbd>n</Kbd>
        </Button>
      )}
      <Button variant="text" icon={faRightFromBracket} onClick={() => player.resultKey("e")} className="px-6 py-3">
        exit <Kbd>e</Kbd>
      </Button>
    </>
  );

  if (!view.result)
    return (
      <div className="grid gap-6 py-16 text-center">
        <div className="text-2xl text-sub">exercise skipped</div>
        {prompt}
        <div className="flex justify-center gap-2">{actions}</div>
      </div>
    );

  const r = view.result;
  const scored = view.drillKind === "D" || view.drillKind === "S";
  const notice =
    prompt ??
    (scored && prevBest !== undefined ? (
      prevBest === null || r.wpm > prevBest ? (
        <span className="text-main">
          {prevBest === null ? "drill passed" : `new personal best (previous ${Math.round(prevBest)} wpm)`}
        </span>
      ) : (
        <span>passed · personal best {Math.round(prevBest)} wpm</span>
      )
    ) : (
      <span>practice drill</span>
    ));
  return <Result wpm={Math.round(r.wpm)} acc={`${Math.floor(r.acc)}%`} chart={r.chart} stats={stats(r)} notice={notice} actions={actions} />;
}

function Query({ text, lines, player }: { text: string; lines?: string[]; player: CoursePlayer }) {
  useKeys(({ key }) => {
    if (!/^[yn0-9as]$/i.test(key)) return false;
    player.answer(key);
  });
  return (
    <div className="grid gap-8">
      {lines && <Tutorial lines={lines} />}
      <div className="grid justify-items-center gap-4">
        <div className="text-center text-lg text-text">{text}</div>
        <div className="flex gap-2">
          <Button text="yes (y)" onClick={() => player.answer("y")} />
          <Button text="no (n)" onClick={() => player.answer("n")} />
        </div>
      </div>
    </div>
  );
}

// ── runner ─────────────────────────────────────────────────────────────────

export function CourseRunner({ script }: { script: CourseScript }) {
  const settings = useSettings();
  const router = useRouter();
  // Created once per mount (the page keys this component by course id). A
  // server refresh hands us a new `script` object, which must not reset the
  // lesson the user is in.
  const [player] = useState(() => {
    const s = getSettings();
    return new CoursePlayer(script, { maxError: s.maxError, wordProcessor: s.wordProcessor, noSkip: s.noSkip, alwaysSure: s.alwaysSure });
  });
  useSyncExternalStore(player.subscribe, () => player.version, () => 0);
  const [passed, setPassed] = useState<Map<number, DrillBest>>(new Map());
  const [prevBest, setPrevBest] = useState<number | null | undefined>(undefined);
  const [windowFocused, setWindowFocused] = useState(true);
  const topRef = useRef<HTMLDivElement>(null);
  useWindowFocus(setWindowFocused);

  // Settings changed on the settings page / command line apply to new drills.
  useEffect(() => {
    player.opts = { maxError: settings.maxError, wordProcessor: settings.wordProcessor, noSkip: settings.noSkip, alwaysSure: settings.alwaysSure };
  }, [player, settings.maxError, settings.wordProcessor, settings.noSkip, settings.alwaysSure]);

  useEffect(() => {
    passedDrills(script.id).then(setPassed);
    player.onPass = async ({ stmt, result }) => {
      setPrevBest(undefined);
      const prev = await recordDrillPass(script.id, stmt, result.wpm, result.acc);
      setPrevBest(prev);
      setPassed(await passedDrills(script.id));
    };
    return () => {
      player.onPass = null;
    };
  }, [player, script.id]);

  const view = player.view;

  // Keys for the drill and tutorial screens (menus/results register their own).
  useKeys(({ key }) => {
    if (view.kind === "tutorial") {
      if (key === "\n" || key === " ") player.continue();
      else if (key === "Escape") player.escape();
      else return false;
    } else if (view.kind === "drill") {
      if (key === "Escape") {
        player.escape();
        setFocused(false);
        return;
      }
      if (key === "ArrowUp" || key === "ArrowDown") return false;
      const ok = view.drill.input(key);
      setFocused(true);
      if (key !== "Backspace") playKey(ok);
      if (view.drill.done) {
        setFocused(false);
        recordKeystrokes("course", script.id, view.drill.keys, view.drill.elapsedMs());
        // Show the result after the last keystroke has painted, so finishing
        // a drill never freezes the final letter.
        afterPaint(() => player.drillFinished());
      }
    } else if (view.kind === "exit" && key === "\n") {
      router.push("/courses");
    } else return false;
  });

  // Each new screen starts at the top.
  useEffect(() => {
    topRef.current?.scrollIntoView({ block: "nearest" });
  }, [view.kind]);

  return (
    <div ref={topRef} className="grid content-start gap-8 fade-in">
      <div className="hide-on-focus flex flex-wrap items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-3 text-sub">
          <Link href="/courses" className="text-sm text-sub transition-colors hover:text-text">
            <Icon icon={faArrowLeft} /> courses
          </Link>
          <span className="text-sm">/</span>
          <span className="text-sm">{script.title}</span>
        </div>
        {MODE_LABEL[view.kind] && (
          <span className="rounded-(--roundness) bg-sub-alt px-3 py-1 text-xs text-sub">{view.kind === "drill" && (view.drillKind === "S" || view.drillKind === "s") ? "speed test" : MODE_LABEL[view.kind]}</span>
        )}
      </div>
      {player.banner && view.kind !== "menu" && view.kind !== "exit" && <h2 className="hide-on-focus text-2xl text-text">{player.banner}</h2>}

      {view.kind === "tutorial" && (
        <div className="grid gap-8">
          <Tutorial lines={view.lines} />
          <Hint>
            <Kbd>enter</Kbd> or <Kbd>space</Kbd> to continue · <Kbd>esc</Kbd> to return to the menu
          </Hint>
        </div>
      )}
      {view.kind === "query" && <Query key={player.version} text={view.text} lines={view.lines} player={player} />}
      {view.kind === "menu" && <Menu key={view.title} player={player} items={view.items} title={view.title} passed={passed} />}
      {view.kind === "drill" && (
        <Drill key={`${view.stmt}-${view.attempt}-${player.version}`} view={view} instruction={player.instruction} maxError={player.currentMaxError} blurred={!windowFocused} />
      )}
      {view.kind === "drillFailed" && <DrillFailed view={view} player={player} />}
      {view.kind === "drillResult" && <DrillDone view={view} player={player} prevBest={prevBest} />}
      {view.kind === "exit" && (
        <div className="grid justify-items-center gap-6 py-16 text-center">
          <div className="text-2xl text-sub">{view.error ? "this lesson file has a problem" : "you've left the course"}</div>
          {view.error && <div className="text-error">{view.error}</div>}
          <div className="flex gap-2">
            <Button text="back to courses" onClick={() => router.push("/courses")} />
            <Button text="start again" onClick={() => location.reload()} />
          </div>
        </div>
      )}
    </div>
  );
}
