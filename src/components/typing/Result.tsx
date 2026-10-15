import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import type { ChartPoint } from "@/lib/engine/stats";

// Chart.js is the biggest dependency and is only needed on the result
// screen, so it loads on demand (and is preloaded at idle by AppShell).
const ResultChart = dynamic(() => import("./ResultChart").then((m) => m.ResultChart), {
  ssr: false,
  loading: () => <div className="h-[200px] w-full" />,
});

export interface StatItem {
  label: string;
  value: ReactNode;
  title?: string;
}

function Stat({ label, value, title, big }: StatItem & { big?: boolean }) {
  return (
    <div className={big ? "text-[2rem]" : ""} title={title}>
      <div className={big ? "leading-[0.5em] text-sub" : "text-base text-sub"}>{label}</div>
      <div className={big ? "text-[2em] leading-[1.2] text-main" : "text-[2rem] leading-[1.2] text-main"}>{value}</div>
    </div>
  );
}

/**
 * Monkeytype's result screen: big wpm / acc on the left, the speed chart on
 * the right, a row of smaller stats underneath and a row of actions below.
 */
export function Result({
  wpm,
  acc,
  chart,
  stats,
  notice,
  actions,
}: {
  wpm: ReactNode;
  acc: ReactNode;
  chart: ChartPoint[];
  stats: StatItem[];
  notice?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="grid w-full gap-4 fade-in">
      <div className="grid items-center gap-4 md:grid-cols-[auto_1fr]">
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
          <Stat big label="wpm" value={wpm} />
          <Stat big label="acc" value={acc} />
        </div>
        <ResultChart data={chart} />
      </div>
      <div className="flex flex-wrap justify-between gap-x-8 gap-y-4">
        {stats.map((s) => (
          <Stat key={s.label} {...s} />
        ))}
      </div>
      {notice && <div className="text-center text-sub">{notice}</div>}
      <div className="flex flex-wrap justify-center gap-2">{actions}</div>
    </div>
  );
}
