// Records a Chrome trace while typing and sums main-thread time by event type.
// node e2e/trace.mjs [baseUrl] [words|course]
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3211";
const which = process.argv[3] ?? "words";
const browser = await chromium.launch({ executablePath: "/etc/profiles/per-user/null/bin/brave", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const cdp = await page.context().newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

let keys;
if (which === "words") {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.setItem("mt-settings", JSON.stringify({ mode: "words", words: 100 })));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const words = await page.$$eval(".word", (ws) => ws.map((w) => w.textContent));
  keys = words.slice(0, 30).flatMap((w) => [...w, " "]);
} else {
  await page.goto(base + "/courses/v", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.keyboard.press("Enter");
  for (let i = 0; i < 12 && !(await page.$(".words [data-i]")); i++) {
    await page.keyboard.press("Enter");
    await page.waitForTimeout(150);
  }
  const chars = await page.$$eval(".words [data-i]", (ls) => ls.map((l) => l.textContent));
  keys = chars.slice(0, 150).map((c) => (c === "⏎" ? "\n" : c === " " ? " " : c));
}

const events = [];
cdp.on("Tracing.dataCollected", (e) => events.push(...e.value));
const done = new Promise((r) => cdp.once("Tracing.tracingComplete", r));
await cdp.send("Tracing.start", { categories: "devtools.timeline,disabled-by-default-devtools.timeline", transferMode: "ReportEvents" });
for (const k of keys) {
  if (k === "\n") await page.keyboard.press("Enter", { delay: 40 });
  else if (k === " ") await page.keyboard.press("Space", { delay: 40 });
  else await page.keyboard.type(k, { delay: 40 });
}
await page.waitForTimeout(300);
await cdp.send("Tracing.end");
await done;

const totals = new Map();
for (const e of events) {
  if (e.ph !== "X" || !e.dur) continue;
  if (!["Layout", "UpdateLayoutTree", "Paint", "PrePaint", "Layerize", "Commit", "EventDispatch", "FunctionCall", "TimerFire", "FireAnimationFrame", "RunMicrotasks", "RecalculateStyles", "ParseHTML", "HitTest", "ScheduleStyleRecalculation", "UpdateLayer", "CompositeLayers", "RasterTask", "GPUTask"].includes(e.name)) continue;
  const t = totals.get(e.name) ?? { ms: 0, n: 0, max: 0 };
  t.ms += e.dur / 1000;
  t.n++;
  t.max = Math.max(t.max, e.dur / 1000);
  totals.set(e.name, t);
}
console.log(`${which}: ${keys.length} keys`);
for (const [name, t] of [...totals].sort((a, b) => b[1].ms - a[1].ms))
  console.log(`  ${name.padEnd(20)} total=${t.ms.toFixed(0).padStart(5)}ms  n=${String(t.n).padStart(4)}  per-key=${(t.ms / keys.length).toFixed(2)}ms  max=${t.max.toFixed(1)}ms`);
await browser.close();
