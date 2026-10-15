// Drives Lesson Q1: menu → tutorials → drill (typed via the DOM text) → result.
// MISTAKES=n makes the first n characters wrong to trigger the error-rate failure.
import { chromium } from "playwright";
const base = process.env.BASE_URL ?? "http://localhost:3210";
const mistakes = Number(process.env.MISTAKES ?? 0);
const browser = await chromium.launch({ executablePath: "/etc/profiles/per-user/null/bin/brave", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(base + "/courses/q", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.keyboard.press("Enter"); // Lesson Q1
await page.waitForTimeout(200);
await page.screenshot({ path: "e2e/out/c-tutorial.png" });
for (let i = 0; i < 3; i++) {
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
}
await page.waitForTimeout(300);
await page.screenshot({ path: "e2e/out/c-drill.png" });
const chars = await page.$$eval(".words [data-i]", (ls) => ls.map((l) => [Number(l.dataset.i), l.textContent, l.className]));
const todo = chars.filter(([, , cls]) => !cls.includes("correct"));
let n = 0;
for (const [, ch] of todo) {
  const key = ch === "⏎" ? "Enter" : ch === " " ? "Space" : ch;
  if (n < mistakes && key !== "Enter") await page.keyboard.type("#");
  else if (key.length === 1) await page.keyboard.type(key);
  else await page.keyboard.press(key);
  n++;
  if (n === 30) await page.screenshot({ path: "e2e/out/c-drill-mid.png" });
  await page.waitForTimeout(25);
}
await page.waitForTimeout(500);
await page.mouse.move(5, 5);
await page.waitForTimeout(200);
await page.screenshot({ path: "e2e/out/c-result.png" });
if (errors.length) console.log("ERRORS:\n" + errors.join("\n"));
await browser.close();
