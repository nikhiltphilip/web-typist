// Samples the caret's on-screen position every frame across a line jump, to
// check it sweeps left on one row instead of wobbling vertically.
// node e2e/caret-motion.mjs [baseUrl]
import { chromium } from "playwright";
const base = process.argv[2] ?? "http://localhost:3001";
const browser = await chromium.launch({ executablePath: "/etc/profiles/per-user/null/bin/brave", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(base, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.setItem("mt-settings", JSON.stringify({ mode: "words", words: 50 })));
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(800);
const rowOf = () =>
  page.evaluate(() => {
    const a = document.querySelector(".word.active");
    const first = document.querySelector(".words .word");
    return Math.round((a.getBoundingClientRect().top - first.getBoundingClientRect().top) / a.offsetHeight);
  });
// Type words until the next space would move the active word onto row 3.
const words = await page.$$eval(".word", (ws) => ws.map((w) => w.textContent));
let i = 0;
for (; i < words.length; i++) {
  await page.keyboard.type(words[i], { delay: 30 });
  const before = await page.evaluate(() => document.querySelector(".word.active").nextElementSibling?.getBoundingClientRect().top);
  const cur = await page.evaluate(() => document.querySelector(".word.active").getBoundingClientRect().top);
  if (before > cur + 5 && (await rowOf()) >= 1) break;
  await page.keyboard.press("Space");
}
const samples = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const caret = document.querySelector(".caret");
      const out = [];
      const t0 = performance.now();
      const tick = () => {
        const r = caret.getBoundingClientRect();
        out.push([Math.round(performance.now() - t0), Math.round(r.left), Math.round(r.top)]);
        if (performance.now() - t0 < 220) requestAnimationFrame(tick);
        else resolve(out);
      };
      window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
      requestAnimationFrame(tick);
    }),
);
console.log("line jump after word", i, "- caret [ms, x, y] per frame:");
console.log(samples.map((s) => s.join(",")).join("  "));
const ys = samples.map((s) => s[2]);
console.log(`y range during jump: ${Math.min(...ys)}..${Math.max(...ys)} (${Math.max(...ys) - Math.min(...ys)}px of vertical movement)`);
await browser.close();
