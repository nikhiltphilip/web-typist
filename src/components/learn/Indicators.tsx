import type { LearningRate, LessonKey } from "@/lib/learn/lesson";
import { cpmToWpm, type DailyStats, type Streak, type SummaryStats, timeToSpeed } from "@/lib/learn/stats";
import { cn } from "../ui";

/**
 * keybr colours keys from slow (red) to fast (green) by confidence. Here the
 * scale runs from the theme's error colour to its main colour, so it fits
 * every theme.
 */
export function confidenceColor(c: number): string {
  const pct = Math.round(Math.max(0, Math.min(1, c)) * 100);
  return `color-mix(in oklab, var(--main-color) ${pct}%, var(--error-color))`;
}

const wpm = (cpm: number) => Math.round(cpmToWpm(cpm));
const signed = (v: number, digits = 0) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(digits)}`;

export function keyTitle(k: LessonKey, targetCpm: number): string {
  const { stats } = k;
  if (stats.timeToType == null) return `${k.letter.label}: not calibrated yet${k.included ? "" : " (locked)"}`;
  return [
    `${k.letter.label}${k.included ? "" : " (locked)"}`,
    `speed ${wpm(timeToSpeed(stats.timeToType))} wpm, best ${wpm(timeToSpeed(stats.bestTimeToType!))} wpm`,
    `confidence ${Math.round((k.confidence ?? 0) * 100)}% of ${wpm(targetCpm)} wpm target`,
    `${stats.hits} hits, ${stats.misses} misses`,
  ].join("\n");
}

function Gauge({ label, value, delta, title }: { label: string; value: string; delta?: string; title?: string }) {
  return (
    <div title={title}>
      <div className="text-xs text-sub">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl text-main">{value}</span>
        {delta && <span className={cn("text-xs", delta.startsWith("−") ? "text-error" : "text-sub")}>{delta}</span>}
      </div>
    </div>
  );
}

export function Gauges({ stats, today, dailyGoal }: { stats: SummaryStats; today: DailyStats | undefined; dailyGoal: number }) {
  const has = stats.count > 1;
  const minutes = (today?.time ?? 0) / 60000;
  return (
    <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
      <Gauge label="speed" value={stats.count ? `${wpm(stats.speed.last)} wpm` : "–"} delta={has ? signed(cpmToWpm(stats.speed.delta), 1) : undefined} title="last lesson, and change against your average" />
      <Gauge label="accuracy" value={stats.count ? `${(stats.accuracy.last * 100).toFixed(1)}%` : "–"} delta={has ? signed(stats.accuracy.delta * 100, 1) : undefined} />
      <Gauge label="score" value={stats.count ? String(Math.round(stats.score.last)) : "–"} delta={has ? signed(stats.score.delta) : undefined} title="speed × distinct keys ÷ (errors + 1) × length ÷ 50" />
      <Gauge label="lessons" value={String(stats.count)} />
      {dailyGoal > 0 && (
        <div className="min-w-48 flex-1" title={`${minutes.toFixed(1)} of ${dailyGoal} minutes practised today`}>
          <div className="text-xs text-sub">daily goal · {Math.floor(minutes)}/{dailyGoal} min</div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sub-alt">
            <div className="h-full rounded-full bg-main transition-[width] duration-500" style={{ width: `${Math.min(100, (minutes / dailyGoal) * 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

export function KeyStrip({ keys, targetCpm }: { keys: readonly LessonKey[]; targetCpm: number }) {
  return (
    <div className="flex flex-wrap gap-1">
      {keys.map((k) => {
        const calibrated = k.confidence != null;
        return (
          <span
            key={k.letter.codePoint}
            title={keyTitle(k, targetCpm)}
            className={cn(
              "relative grid h-7 w-7 cursor-default place-items-center rounded text-sm transition-[background-color,color] duration-300",
              !k.included && "text-sub opacity-50",
              k.included && !calibrated && "bg-sub-alt text-text",
              k.included && calibrated && "text-bg",
              k.focused && "ring-2 ring-text ring-offset-2 ring-offset-bg",
            )}
            style={k.included && calibrated ? { background: confidenceColor(k.confidence!) } : undefined}
          >
            {k.letter.label}
            {!k.included && <span className="absolute h-px w-5 rotate-[-45deg] bg-sub" />}
          </span>
        );
      })}
    </div>
  );
}

export function CurrentKey({ keyInfo, rate, targetCpm }: { keyInfo: LessonKey | undefined; rate: LearningRate | null; targetCpm: number }) {
  if (!keyInfo) return <div className="text-sm text-sub">all keys are above the target speed of {wpm(targetCpm)} wpm. nice.</div>;
  const { stats } = keyInfo;
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-sub">
      <span>
        focus <span className="rounded bg-sub-alt px-2 py-0.5 text-text">{keyInfo.letter.label}</span>
      </span>
      {stats.timeToType == null ? (
        <span>not calibrated yet: type a few lessons</span>
      ) : (
        <>
          <span>
            speed <span className="text-text">{wpm(timeToSpeed(stats.timeToType))}</span> / {wpm(targetCpm)} wpm
          </span>
          <span>
            best <span className="text-text">{wpm(timeToSpeed(stats.bestTimeToType!))}</span> wpm
          </span>
          <span>
            confidence <span className="text-text">{Math.round((keyInfo.confidence ?? 0) * 100)}%</span>
          </span>
          {rate && (
            <span title={`fit certainty r² ${rate.certainty.toFixed(2)}`}>
              learning <span className="text-text">{signed(cpmToWpm(rate.rate), 2)}</span> wpm/lesson
              {rate.remaining != null && (
                <>
                  {" "}
                  · ~<span className="text-text">{rate.remaining}</span> more lesson{rate.remaining === 1 ? "" : "s"}
                </>
              )}
            </span>
          )}
        </>
      )}
    </div>
  );
}

export function Streaks({ streaks }: { streaks: Streak[] }) {
  return (
    <div className="flex gap-6 text-sm text-sub" title="consecutive lessons at or above each accuracy (current / longest)">
      {streaks.map((s) => (
        <span key={s.level}>
          {Math.round(s.level * 100)}% streak <span className="text-text">{s.current}</span>
          <span className="text-xs"> / {s.longest}</span>
        </span>
      ))}
    </div>
  );
}
