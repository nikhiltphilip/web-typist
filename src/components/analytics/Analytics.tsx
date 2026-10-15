"use client";

import { ChartLineIcon } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { loadResults } from "@/lib/db";
import { guidedKeys, learningRate, unlockOrder } from "@/lib/learn/lesson";
import { loadModel, type PhoneticModel } from "@/lib/learn/model";
import {
  accuracyOf,
  cpmToWpm,
  dailyStats,
  dayKey,
  KeyStatsBuilder,
  type KeyStatsMap,
  makeKeyStatsMap,
  smooth,
  speedOf,
  streaks,
  summaryStats,
  timeToSpeed,
  type Source,
  type SummaryStats,
  type TypingResult,
} from "@/lib/learn/stats";
import { useSettings } from "@/lib/settings";
import { confidenceColor } from "../learn/Indicators";
import { Keyboard } from "../learn/Keyboard";
import { Button, cn, Icon } from "../ui";
import { alpha, baseOptions, ChartBox, mix } from "./ChartBox";

const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("").map((c) => c.codePointAt(0)!);
const wpm = (cpm: number) => cpmToWpm(cpm);
const fmtTime = (ms: number) => {
  const m = Math.floor(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m ${Math.floor((ms % 60000) / 1000)}s`;
};

const SOURCES: { id: Source | "all"; label: string }[] = [
  { id: "all", label: "everything" },
  { id: "learn", label: "learning path" },
  { id: "test", label: "typing test" },
  { id: "course", label: "courses" },
];

function Section({ title, children, note }: { title: string; children: ReactNode; note?: ReactNode }) {
  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl text-sub">{title}</h2>
        {note && <div className="text-xs text-sub">{note}</div>}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, title }: { label: string; value: ReactNode; title?: string }) {
  return (
    <div title={title}>
      <div className="text-xs text-sub">{label}</div>
      <div className="text-2xl text-main">{value}</div>
    </div>
  );
}

function Summary({ s }: { s: SummaryStats }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
      <Stat label="lessons" value={s.count} />
      <Stat label="time typed" value={fmtTime(s.time)} />
      <Stat label="top speed" value={`${Math.round(wpm(s.speed.max))} wpm`} />
      <Stat label="average speed" value={`${Math.round(wpm(s.speed.avg))} wpm`} />
      <Stat label="top accuracy" value={`${(s.accuracy.max * 100).toFixed(1)}%`} />
      <Stat label="average accuracy" value={`${(s.accuracy.avg * 100).toFixed(1)}%`} />
      <Stat label="top score" value={Math.round(s.score.max)} title="keybr score: speed × distinct keys ÷ (errors + 1) × length ÷ 50" />
    </div>
  );
}

function Histogram({ values, bins, label, unit }: { values: number[]; bins: number[]; label: string; unit: string }) {
  const counts = bins.slice(0, -1).map((lo, i) => values.filter((v) => v >= lo && (i === bins.length - 2 ? v <= bins[i + 1] : v < bins[i + 1])).length);
  return (
    <div>
      <div className="mb-2 text-xs text-sub">{label}</div>
      <ChartBox
        height={180}
        deps={[values.join(","), bins.join(",")]}
        build={(p) => ({
          type: "bar",
          data: {
            labels: bins.slice(0, -1).map((b) => `${b}${unit}`),
            datasets: [{ data: counts, backgroundColor: p.main, borderRadius: 3, label: "lessons" }],
          },
          options: { ...baseOptions(p), scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 } } } },
        })}
      />
    </div>
  );
}

/** keybr ProgressOverview: speed per lesson, with a marker where each key unlocked. */
function ProgressOverview({ results, model, target, keyboardOrder }: { results: TypingResult[]; model: PhoneticModel; target: number; keyboardOrder: boolean }) {
  const { learn } = useSettings();
  const { unlocks, finalKeys } = useMemo(() => {
    const letters = unlockOrder(model, keyboardOrder);
    const b = new KeyStatsBuilder(letters.map((l) => l.codePoint));
    let prev = new Set(guidedKeys(letters, b.map, learn).filter((k) => k.included).map((k) => k.letter.label));
    const unlocks: { index: number; keys: string[] }[] = [];
    results.forEach((r, i) => {
      b.add(r);
      const now = new Set(guidedKeys(letters, b.map, learn).filter((k) => k.included).map((k) => k.letter.label));
      const added = [...now].filter((k) => !prev.has(k));
      if (added.length) unlocks.push({ index: i + 1, keys: added });
      prev = now;
    });
    return { unlocks, finalKeys: guidedKeys(letters, b.map, learn) };
  }, [results, model, keyboardOrder, learn]);
  const speeds = results.map((r) => wpm(speedOf(r)));
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-1">
        {finalKeys.map((k) => (
          <span
            key={k.letter.codePoint}
            className={cn("grid h-7 w-7 place-items-center rounded text-sm", !k.included && "text-sub opacity-50", k.included && k.confidence == null && "bg-sub-alt text-text", k.included && k.confidence != null && "text-bg", k.focused && "ring-2 ring-text ring-offset-2 ring-offset-bg")}
            style={k.included && k.confidence != null ? { background: confidenceColor(k.confidence) } : undefined}
            title={`${k.letter.label}: ${k.confidence == null ? "not calibrated" : `${Math.round(k.confidence * 100)}% of target`}`}
          >
            {k.letter.label}
          </span>
        ))}
      </div>
      <ChartBox
        deps={[speeds.join(","), unlocks.map((u) => u.index).join(",")]}
        build={(p) => ({
          type: "line",
          data: {
            labels: speeds.map((_, i) => i + 1),
            datasets: [
              { label: "speed", data: smooth(speeds, 0.3), borderColor: p.main, backgroundColor: alpha(p.main, 0.12), fill: true, pointRadius: 0, tension: 0.3 },
              { label: "target", data: speeds.map(() => wpm(target)), borderColor: p.sub, borderDash: [6, 6], pointRadius: 0, borderWidth: 1 },
              {
                type: "scatter",
                label: "new key",
                data: unlocks.map((u) => ({ x: u.index - 1, y: smooth(speeds, 0.3)[u.index - 1] ?? 0, keys: u.keys.join(" ") })),
                pointStyle: "rectRounded",
                pointRadius: 6,
                backgroundColor: p.text,
                borderColor: p.bg,
              },
            ],
          },
          options: {
            ...baseOptions(p),
            scales: { x: { type: "category", title: { display: true, text: "lesson" } }, y: { beginAtZero: true, title: { display: true, text: "wpm" } } },
            plugins: {
              ...baseOptions(p).plugins,
              tooltip: {
                ...baseOptions(p).plugins.tooltip,
                callbacks: {
                  label: (c) => (c.dataset.label === "new key" ? `new key: ${(c.raw as { keys: string }).keys}` : `${c.dataset.label}: ${Number(c.parsed.y).toFixed(1)} wpm`),
                },
              },
            },
          },
        })}
      />
    </div>
  );
}

function SpeedChart({ results }: { results: TypingResult[] }) {
  const [smoothness, setSmoothness] = useState(0.5);
  const speeds = results.map((r) => wpm(speedOf(r)));
  const accs = results.map((r) => accuracyOf(r) * 100);
  const a = 1 - smoothness * 0.95;
  return (
    <div className="grid gap-3">
      <label className="flex items-center gap-3 text-xs text-sub">
        smoothness
        <input type="range" min={0} max={1} step={0.05} value={smoothness} onChange={(e) => setSmoothness(Number(e.target.value))} className="w-48 accent-[var(--main-color)]" />
      </label>
      <ChartBox
        deps={[speeds.join(","), smoothness]}
        build={(p) => ({
          type: "line",
          data: {
            labels: speeds.map((_, i) => i + 1),
            datasets: [
              { label: "speed (wpm)", data: smooth(speeds, a), borderColor: p.main, pointRadius: 0, tension: 0.3, yAxisID: "y" },
              { label: "accuracy (%)", data: smooth(accs, a), borderColor: p.sub, pointRadius: 0, tension: 0.3, yAxisID: "acc" },
            ],
          },
          options: {
            ...baseOptions(p),
            interaction: { mode: "index", intersect: false },
            scales: {
              x: { title: { display: true, text: "lesson" } },
              y: { beginAtZero: true, title: { display: true, text: "wpm" } },
              acc: { position: "right", min: Math.max(0, Math.floor(Math.min(...accs, 100) / 5) * 5), max: 100, grid: { display: false }, title: { display: true, text: "accuracy %" } },
            },
          },
        })}
      />
    </div>
  );
}

function KeySpeedChart({ map, target }: { map: KeyStatsMap; target: number }) {
  const withData = LETTERS.filter((cp) => (map.get(cp)?.samples.length ?? 0) > 0);
  const [selected, setSelected] = useState<number | null>(null);
  const cp = selected != null && withData.includes(selected) ? selected : withData[0];
  const ks = cp != null ? map.get(cp) : undefined;
  const samples = ks?.samples ?? [];
  const rate = ks ? learningRate(ks.samples, target) : null;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-1">
        {LETTERS.map((c) => (
          <Button key={c} variant="text" text={String.fromCodePoint(c)} active={c === cp} disabled={!withData.includes(c)} onClick={() => setSelected(c)} className="h-7 w-7 p-0" />
        ))}
      </div>
      {ks && samples.length > 0 ? (
        <>
          <div className="text-xs text-sub">
            {String.fromCodePoint(cp!)}: {samples.length} lessons · now {Math.round(wpm(timeToSpeed(ks.timeToType!)))} wpm · best {Math.round(wpm(timeToSpeed(ks.bestTimeToType!)))} wpm
            {rate && ` · learning ${(wpm(rate.rate) >= 0 ? "+" : "") + wpm(rate.rate).toFixed(2)} wpm/lesson${rate.remaining != null ? ` · ~${rate.remaining} lessons to target` : ""}`}
          </div>
          <ChartBox
            deps={[cp, samples.length, target]}
            build={(p) => ({
              type: "line",
              data: {
                labels: samples.map((s) => s.index + 1),
                datasets: [
                  { type: "scatter", label: "lesson", data: samples.map((s, i) => ({ x: i, y: wpm(timeToSpeed(s.timeToType)) })), backgroundColor: alpha(p.sub, 0.6), pointRadius: 3 },
                  { label: "smoothed", data: samples.map((s) => wpm(timeToSpeed(s.filteredTimeToType))), borderColor: p.main, pointRadius: 0, tension: 0.3 },
                  { label: "target", data: samples.map(() => wpm(target)), borderColor: p.sub, borderDash: [6, 6], pointRadius: 0, borderWidth: 1 },
                  ...(rate
                    ? [
                        {
                          label: "trend",
                          data: samples.map((s) => (rate.xs.includes(s.index + 1) ? wpm(rate.model.eval(s.index + 1)) : null)),
                          borderColor: p.error,
                          borderWidth: 2,
                          pointRadius: 0,
                          spanGaps: false,
                        },
                      ]
                    : []),
                ],
              },
              options: { ...baseOptions(p), scales: { x: { type: "category", title: { display: true, text: "lesson with this key" } }, y: { beginAtZero: true, title: { display: true, text: "wpm" } } } },
            })}
          />
        </>
      ) : (
        <div className="text-sm text-sub">no per-key data yet</div>
      )}
    </div>
  );
}

function KeySpeedHistogram({ map, target }: { map: KeyStatsMap; target: number }) {
  const rows = LETTERS.map((cp) => map.get(cp)!);
  const speeds = rows.map((ks) => (ks.timeToType ? wpm(timeToSpeed(ks.timeToType)) : 0));
  return (
    <ChartBox
      height={200}
      deps={[speeds.join(","), target]}
      build={(p) => ({
        type: "bar",
        data: {
          labels: rows.map((ks) => String.fromCodePoint(ks.codePoint)),
          datasets: [
            { label: "speed (wpm)", data: speeds, backgroundColor: speeds.map((s) => mix(p.error, p.main, s / wpm(target))), borderRadius: 3, order: 2 },
            { type: "line", label: "target", data: rows.map(() => wpm(target)), borderColor: p.text, borderDash: [6, 6], pointRadius: 0, borderWidth: 1, order: 1 },
          ],
        },
        options: { ...baseOptions(p), scales: { x: { grid: { display: false } }, y: { beginAtZero: true, title: { display: true, text: "wpm" } } } },
      })}
    />
  );
}

function KeyFrequency({ map }: { map: KeyStatsMap }) {
  const rows = LETTERS.map((cp) => map.get(cp)!);
  return (
    <ChartBox
      height={200}
      deps={[rows.map((r) => `${r.hits}/${r.misses}`).join(",")]}
      build={(p) => ({
        type: "bar",
        data: {
          labels: rows.map((ks) => String.fromCodePoint(ks.codePoint)),
          datasets: [
            { label: "hits", data: rows.map((r) => r.hits - r.misses), backgroundColor: p.main, borderRadius: 2, stack: "s" },
            { label: "misses", data: rows.map((r) => r.misses), backgroundColor: p.error, borderRadius: 2, stack: "s" },
          ],
        },
        options: { ...baseOptions(p), interaction: { mode: "index", intersect: false }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true } } },
      })}
    />
  );
}

function Heatmap({ map }: { map: KeyStatsMap }) {
  const [metric, setMetric] = useState<"misses" | "frequency">("misses");
  const values = new Map<string, { v: number; title: string }>();
  let max = 0;
  for (const ks of map.values()) {
    const label = String.fromCodePoint(ks.codePoint);
    const v = metric === "misses" ? (ks.hits ? ks.misses / ks.hits : 0) : ks.hits;
    max = Math.max(max, v);
    values.set(label, { v, title: `${label}: ${ks.hits} hits, ${ks.misses} misses (${ks.hits ? ((ks.misses / ks.hits) * 100).toFixed(1) : 0}% miss rate)` });
  }
  return (
    <div className="grid gap-4">
      <div className="flex gap-2">
        <Button variant="text" text="miss rate" active={metric === "misses"} onClick={() => setMetric("misses")} />
        <Button variant="text" text="frequency" active={metric === "frequency"} onClick={() => setMetric("frequency")} />
      </div>
      <Keyboard
        look={(k) => {
          const e = values.get(k);
          if (!e || max === 0) return undefined;
          const t = e.v / max;
          const color = metric === "misses" ? "var(--error-color)" : "var(--main-color)";
          return { background: `color-mix(in oklab, ${color} ${Math.round(t * 100)}%, var(--sub-alt-color))`, color: t > 0.5 ? "var(--bg-color)" : "var(--text-color)", title: e.title };
        }}
      />
    </div>
  );
}

/** keybr Calendar: one square per day for the last year, shaded by minutes typed. */
function Calendar({ results }: { results: TypingResult[] }) {
  const days = dailyStats(results);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - 364 - start.getDay());
  const cells: { key: string; date: Date }[] = [];
  for (const d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) cells.push({ key: dayKey(d.getTime()), date: new Date(d) });
  const maxTime = Math.max(1, ...[...days.values()].map((d) => d.time));
  const weeks: (typeof cells)[] = [];
  cells.forEach((c, i) => (weeks[Math.floor(i / 7)] ??= []).push(c));
  const activeDays = [...days.keys()].length;
  return (
    <div className="grid gap-2">
      <div className="flex gap-[3px] overflow-x-auto pb-2">
        {weeks.map((w, i) => (
          <div key={i} className="grid gap-[3px]">
            {w.map((c) => {
              const d = days.get(c.key);
              const t = d ? 0.25 + 0.75 * (d.time / maxTime) : 0;
              return (
                <div
                  key={c.key}
                  title={d ? `${c.key}: ${d.count} lessons, ${fmtTime(d.time)}, ${Math.round(wpm(d.speed))} wpm, ${(d.accuracy * 100).toFixed(1)}%` : `${c.key}: no practice`}
                  className="h-3 w-3 rounded-[2px]"
                  style={{ background: d ? `color-mix(in oklab, var(--main-color) ${Math.round(t * 100)}%, var(--sub-alt-color))` : "var(--sub-alt-color)" }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="text-xs text-sub">{activeDays} days practised in the last year</div>
    </div>
  );
}

export function Analytics() {
  const { learn } = useSettings();
  const [all, setAll] = useState<TypingResult[] | null>(null);
  const [model, setModel] = useState<PhoneticModel | null>(null);
  const [source, setSource] = useState<Source | "all">("all");

  useEffect(() => {
    loadResults().then(setAll);
    loadModel().then(setModel);
  }, []);

  const results = useMemo(() => (all ?? []).filter((r) => source === "all" || r.source === source), [all, source]);
  const learnResults = useMemo(() => (all ?? []).filter((r) => r.source === "learn"), [all]);
  const summary = useMemo(() => summaryStats(results), [results]);
  const todaySummary = useMemo(() => summaryStats(results.filter((r) => dayKey(r.at) === dayKey(Date.now()))), [results]);
  const map = useMemo(() => makeKeyStatsMap(LETTERS, results), [results]);
  const streakList = useMemo(() => streaks(results), [results]);

  if (!all) return <div className="grid place-items-center text-sub">loading…</div>;

  return (
    <div className="grid content-start gap-14 fade-in">
      <div className="grid gap-3">
        <h1 className="flex items-center gap-2 text-2xl text-sub">
          <Icon icon={ChartLineIcon} /> analytics
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-(--roundness) bg-sub-alt px-1 text-sm">
            {SOURCES.map((s) => (
              <Button key={s.id} variant="text" text={s.label} active={source === s.id} onClick={() => setSource(s.id)} className="px-3 py-2" />
            ))}
          </div>
          <span className="text-xs text-sub">stored only in this browser · nothing is sent anywhere</span>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="grid justify-items-start gap-3 text-sub">
          <p>No results yet for this selection.</p>
          <p>
            Practise on the{" "}
            <Link className="text-main underline-offset-4 hover:underline" href="/learn">
              learning path
            </Link>
            , take a{" "}
            <Link className="text-main underline-offset-4 hover:underline" href="/">
              typing test
            </Link>{" "}
            or do a{" "}
            <Link className="text-main underline-offset-4 hover:underline" href="/courses">
              course
            </Link>
            ; every finished one shows up here.
          </p>
        </div>
      ) : (
        <>
          <Section title="all time">
            <Summary s={summary} />
          </Section>
          <Section title="today">{todaySummary.count ? <Summary s={todaySummary} /> : <div className="text-sm text-sub">nothing yet today</div>}</Section>

          <Section title="accuracy streaks" note="consecutive lessons at or above each accuracy">
            <div className="grid grid-cols-3 gap-4">
              {streakList.map((s) => (
                <Stat key={s.level} label={`${Math.round(s.level * 100)}% · longest / current`} value={`${s.longest} / ${s.current}`} />
              ))}
            </div>
          </Section>

          <Section title="distribution">
            <div className="grid gap-8 md:grid-cols-2">
              <Histogram label="speed" unit="" values={results.map((r) => wpm(speedOf(r)))} bins={Array.from({ length: Math.max(2, Math.ceil(Math.max(...results.map((r) => wpm(speedOf(r)))) / 10) + 1) }, (_, i) => i * 10)} />
              <Histogram label="accuracy" unit="%" values={results.map((r) => accuracyOf(r) * 100)} bins={[80, 85, 88, 90, 92, 94, 95, 96, 97, 98, 99, 100]} />
            </div>
          </Section>

          {learnResults.length > 0 && model && (source === "all" || source === "learn") && (
            <Section title="learning progress" note={`learning path · target ${Math.round(learn.targetSpeed / 5)} wpm`}>
              <ProgressOverview results={learnResults} model={model} target={learn.targetSpeed} keyboardOrder={learn.keyboardOrder} />
            </Section>
          )}

          <Section title="speed and accuracy">
            <SpeedChart results={results} />
          </Section>

          <Section title="key speed" note="pick a key: its speed per lesson, smoothed, with the learning trend">
            <KeySpeedChart map={map} target={learn.targetSpeed} />
          </Section>

          <Section title="speed by key">
            <KeySpeedHistogram map={map} target={learn.targetSpeed} />
          </Section>

          <Section title="key frequency" note="hits and misses per key">
            <KeyFrequency map={map} />
          </Section>

          <Section title="keyboard heatmap">
            <Heatmap map={map} />
          </Section>

          <Section title="calendar">
            <Calendar results={results} />
          </Section>
        </>
      )}
    </div>
  );
}


