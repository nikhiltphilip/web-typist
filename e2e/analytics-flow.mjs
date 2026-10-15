// Types several learning-path lessons (getting faster) and a typing test in
// one browser profile, then screenshots /analytics full-page.
// node e2e/analytics-flow.mjs [baseUrl] [lessons]
import { chromium } from "playwright";
const base = process.argv[2] ?? "http://localhost:3001";
const lessons = Number(process.argv[3] ?? 6);
const browser = await chromium.launch({ executablePath: "/etc/profiles/per-user/null/bin/brave", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && !/404/.test(m.text()) && errors.push(m.text()));

await page.goto(base + "/learn", { waitUntil: "networkidle" });
await page.waitForSelector(".words [data-i]");
for (let n = 0; n < lessons; n++) {
  const text = await page.$$eval(".words [data-i]", (ls) => ls.map((l) => l.textContent).join(""));
  const delay = Math.max(45, 160 - n * 22);
  let i = 0;
  for (const ch of text) {
    if (i % 37 === 11) await page.keyboard.type("#");
    await page.keyboard.type(ch === " " ? " " : ch, { delay });
    i++;
  }
  await page.waitForTimeout(400);
}
await page.screenshot({ path: "e2e/out/learn-progress.png" });

await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("mt-settings") || "{}");
  localStorage.setItem("mt-settings", JSON.stringify({ ...s, mode: "words", words: 15 }));
});
await page.goto(base + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(600);
const words = await page.$$eval(".word", (ws) => ws.map((w) => w.textContent));
for (const w of words) {
  await page.keyboard.type(w, { delay: 60 });
  await page.keyboard.press("Space");
}
await page.waitForTimeout(800);

await page.goto(base + "/analytics", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
await page.screenshot({ path: "e2e/out/analytics.png", fullPage: true });
const count = await page.evaluate(() => new Promise((res) => {
  const r = indexedDB.open("monkey-typist");
  r.onsuccess = () => {
    const tx = r.result.transaction("results").objectStore("results").getAll();
    tx.onsuccess = () => res(tx.result.map((x) => x.source).join(","));
  };
}));
console.log("stored results:", count);
if (errors.length) console.log("ERRORS:\n" + errors.join("\n"));
await browser.close();
