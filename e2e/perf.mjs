// Keystroke latency probe: node e2e/perf.mjs [baseUrl]
// Types a 100-word test and a course drill with the CPU throttled 4×, and
// reports per-keydown latency from the Event Timing API (input delay +
// handler time + time to next paint). Prints only; writes no files, so it
// doesn't trigger dev-server reloads.
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3001";
const browser = await chromium.launch({ executablePath: "/etc/profiles/per-user/null/bin/brave", args: ["--no-sandbox"] });

async function probe(label, setup) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.addInitScript(() => {
    window.__lat = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (e.name === "keydown") window.__lat.push({ d: e.duration, p: e.processingEnd - e.processingStart, t: e.startTime });
    }).observe({ type: "event", durationThreshold: 16, buffered: true });
    window.__keys = 0;
    window.__keyLog = [];
    addEventListener("keydown", (e) => { window.__keys++; window.__keyLog.push({ t: e.timeStamp, k: e.key }); }, true);
  });
  await setup(page);
  await page.waitForTimeout(1000);
  const { lat, keys, keyLog } = await page.evaluate(() => ({ lat: window.__lat, keys: window.__keys, keyLog: window.__keyLog }));
  if (process.env.SPIKES) {
    const worst = [...lat].sort((a, b) => b.p - a.p).slice(0, 5);
    for (const w of worst) {
      const i = keyLog.findIndex((k) => Math.abs(k.t - w.t) < 1);
      console.log(`   spike handler=${Math.round(w.p)}ms key#${i} ${JSON.stringify(keyLog[i]?.k)}`);
    }
  }
  const d = lat.map((x) => x.d).sort((a, b) => a - b);
  const p = lat.map((x) => x.p).sort((a, b) => a - b);
  const q = (xs, f) => (xs.length ? Math.round(xs[Math.min(xs.length - 1, Math.floor(xs.length * f))]) : 0);
  console.log(
    `${label.padEnd(14)} keys=${keys}  slow(>=16ms)=${lat.length}  latency p50=${q(d, 0.5)} p95=${q(d, 0.95)} max=${q(d, 1)}ms  handler p50=${q(p, 0.5)} p95=${q(p, 0.95)} max=${q(p, 1)}ms`,
  );
  await page.close();
}

await probe("words-100", async (page) => {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.setItem("mt-settings", JSON.stringify({ mode: "words", words: 100 })));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const words = await page.$$eval(".word", (ws) => ws.map((w) => w.textContent));
  for (const w of words.slice(0, 60)) {
    await page.keyboard.type(w, { delay: 40 });
    await page.keyboard.press("Space", { delay: 40 });
  }
});

await probe("course-drill", async (page) => {
  await page.goto(base + "/courses/v", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  // Walk to the first drill: choose lesson 1, then Enter through tutorials.
  await page.keyboard.press("Enter");
  for (let i = 0; i < 12 && !(await page.$(".words [data-i]")); i++) {
    await page.keyboard.press("Enter");
    await page.waitForTimeout(150);
  }
  const chars = await page.$$eval(".words [data-i]", (ls) => ls.map((l) => l.textContent));
  for (const ch of chars.slice(0, 250)) {
    const key = ch === "⏎" ? "Enter" : ch === " " ? "Space" : ch;
    if (key.length === 1) await page.keyboard.type(key, { delay: 40 });
    else await page.keyboard.press(key, { delay: 40 });
  }
});

await probe("learn", async (page) => {
  await page.goto(base + "/learn", { waitUntil: "networkidle" });
  await page.waitForSelector(".words [data-i]");
  await page.waitForTimeout(500);
  for (let n = 0; n < 2; n++) {
    const text = await page.$$eval(".words [data-i]", (ls) => ls.map((l) => l.textContent).join(""));
    for (const ch of text) await page.keyboard.type(ch === "\u00a0" ? " " : ch, { delay: 40 });
    await page.waitForTimeout(300);
  }
});

await browser.close();
