// CPU-profiles the first keystroke of a test (4× throttle) and prints the
// functions with the most self time. node e2e/first-key.mjs [baseUrl]
import { chromium } from "playwright";
const base = process.argv[2] ?? "http://localhost:3211";
const browser = await chromium.launch({ executablePath: "/etc/profiles/per-user/null/bin/brave", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const cdp = await page.context().newCDPSession(page);
await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(3000); // let idle preloads finish
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 100 });
await cdp.send("Profiler.start");
await page.keyboard.type("x");
await page.waitForTimeout(200);
const { profile } = await cdp.send("Profiler.stop");
const self = new Map();
const dt = profile.timeDeltas;
profile.samples.forEach((id, i) => self.set(id, (self.get(id) ?? 0) + (dt[i] ?? 0)));
const rows = profile.nodes
  .map((n) => ({ name: n.callFrame.functionName || "(anon)", url: n.callFrame.url.split("/").pop(), line: n.callFrame.lineNumber, ms: (self.get(n.id) ?? 0) / 1000 }))
  .filter((r) => r.ms > 0 && !["(idle)", "(program)"].includes(r.name));
const agg = new Map();
for (const r of rows) {
  const k = `${r.name} ${r.url}:${r.line}`;
  agg.set(k, (agg.get(k) ?? 0) + r.ms);
}
const total = [...agg.values()].reduce((a, b) => a + b, 0);
console.log(`busy ${total.toFixed(1)}ms`);
for (const [k, ms] of [...agg].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${ms.toFixed(1).padStart(6)}ms  ${k}`);
await browser.close();
