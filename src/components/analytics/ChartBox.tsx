import type { Chart, ChartConfiguration } from "chart.js";
import { useEffect, useRef } from "react";
import { useSettings } from "@/lib/settings";

export interface Palette {
  main: string;
  sub: string;
  subAlt: string;
  text: string;
  error: string;
  bg: string;
  font: string;
}

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function alpha(hex: string, a: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Linear mix between two hex colours (t = 0 → a, 1 → b), for canvas fills. */
export function mix(a: string, b: string, t: number): string {
  const p = (h: string) => {
    let x = h.replace("#", "");
    if (x.length === 3) x = [...x].map((c) => c + c).join("");
    const n = parseInt(x.slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [ra, ga, ba] = p(a);
  const [rb, gb, bb] = p(b);
  const k = Math.max(0, Math.min(1, t));
  return `rgb(${Math.round(ra + (rb - ra) * k)}, ${Math.round(ga + (gb - ga) * k)}, ${Math.round(ba + (bb - ba) * k)})`;
}

/**
 * A Chart.js canvas in the result-chart style. Chart.js is imported on first
 * use so it stays out of the page bundle, and charts are rebuilt when the
 * theme or font changes.
 */
export function ChartBox({ build, deps, height = 240 }: { build: (p: Palette) => ChartConfiguration; deps: unknown[]; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { theme, font } = useSettings();

  useEffect(() => {
    let chart: Chart | null = null;
    let live = true;
    import("@/lib/chart").then(({ Chart: ChartJs }) => {
      if (!live || !ref.current) return;
      const p: Palette = {
        main: css("--main-color"),
        sub: css("--sub-color"),
        subAlt: css("--sub-alt-color"),
        text: css("--text-color"),
        error: css("--error-color"),
        bg: css("--bg-color"),
        font,
      };
      ChartJs.defaults.font.family = font;
      ChartJs.defaults.color = p.sub;
      ChartJs.defaults.borderColor = p.subAlt;
      chart = new ChartJs(ref.current, build(p));
    });
    return () => {
      live = false;
      chart?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, font, ...deps]);

  return (
    <div className="relative w-full" style={{ height }}>
      <canvas ref={ref} />
    </div>
  );
}

/** Shared options: no legend box, themed tooltip, no animation. */
export function baseOptions(p: Palette) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: p.subAlt, titleColor: p.sub, bodyColor: p.text, displayColors: true, borderColor: p.subAlt },
    },
  };
}
