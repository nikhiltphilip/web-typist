import {
  Chart,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  ScatterController,
  Filler,
  Tooltip,
} from "chart.js";
import { useEffect, useRef } from "react";
import type { ChartPoint } from "@/lib/engine/stats";
import { useSettings } from "@/lib/settings";

Chart.register(LinearScale, LineController, LineElement, PointElement, ScatterController, Filler, Tooltip);

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function withAlpha(hex: string, alpha: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Monkeytype's result chart: wpm (main), raw (sub) and errors (red crosses). */
export function ResultChart({ data }: { data: ChartPoint[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { theme, font } = useSettings();

  useEffect(() => {
    if (!ref.current) return;
    const main = css("--main-color");
    const sub = css("--sub-color");
    const subAlt = css("--sub-alt-color");
    const error = css("--error-color");
    const maxWpm = Math.max(10, ...data.map((p) => Math.max(p.wpm, p.raw)));
    const maxErr = Math.max(1, ...data.map((p) => p.errors));
    const chart = new Chart(ref.current, {
      type: "line",
      data: {
        labels: data.map((p) => p.second),
        datasets: [
          {
            label: "wpm",
            data: data.map((p) => ({ x: p.second, y: p.wpm })),
            borderColor: main,
            backgroundColor: withAlpha(main, 0.15),
            fill: true,
            borderWidth: 3,
            pointRadius: 2,
            pointBackgroundColor: main,
            tension: 0.3,
            yAxisID: "wpm",
            order: 2,
          },
          {
            label: "raw",
            data: data.map((p) => ({ x: p.second, y: p.raw })),
            borderColor: sub,
            backgroundColor: "transparent",
            borderWidth: 3,
            pointRadius: 2,
            pointBackgroundColor: sub,
            tension: 0.3,
            yAxisID: "wpm",
            order: 3,
          },
          {
            type: "scatter",
            label: "errors",
            data: data.filter((p) => p.errors > 0).map((p) => ({ x: p.second, y: p.errors })),
            borderColor: error,
            backgroundColor: error,
            pointStyle: "crossRot",
            pointRadius: 4,
            pointBorderWidth: 2,
            yAxisID: "errors",
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: {
            type: "linear",
            min: 1,
            max: Math.max(2, data.length),
            ticks: { color: sub, stepSize: 1, autoSkip: true, font: { family: font } },
            grid: { color: subAlt },
            border: { display: false },
          },
          wpm: {
            position: "left",
            beginAtZero: true,
            max: Math.ceil(maxWpm / 10) * 10,
            title: { display: true, text: "Words per Minute", color: sub, font: { family: font } },
            ticks: { color: sub, font: { family: font }, maxTicksLimit: 6 },
            grid: { color: subAlt },
            border: { display: false },
          },
          errors: {
            position: "right",
            beginAtZero: true,
            max: maxErr,
            title: { display: true, text: "Errors", color: sub, font: { family: font } },
            ticks: { color: sub, stepSize: 1, font: { family: font } },
            grid: { display: false },
            border: { display: false },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: subAlt,
            titleColor: sub,
            bodyColor: css("--text-color"),
            titleFont: { family: font },
            bodyFont: { family: font },
            displayColors: false,
          },
        },
      },
    });
    return () => chart.destroy();
  }, [data, theme, font]);

  return (
    <div className="relative h-[200px] w-full">
      <canvas ref={ref} />
    </div>
  );
}
