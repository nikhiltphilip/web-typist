// Types the first words of the test (with deliberate mistakes) and screenshots mid-test and result.
import { chromium } from "playwright";
const base = process.env.BASE_URL ?? "http://localhost:3210";
const browser = await chromium.launch({ executablePath: "/etc/profiles/per-user/null/bin/brave", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(base + (process.argv[2] ?? "/"), { waitUntil: "networkidle" });
if (process.env.SETTINGS) {
  await page.evaluate((s) => localStorage.setItem("mt-settings", s), process.env.SETTINGS);
  await page.reload({ waitUntil: "networkidle" });
}
await page.waitForTimeout(800);
const words = await page.$$eval(".word", (ws) => ws.map((w) => w.textContent));
let n = 0;
for (const w of words.slice(0, Number(process.argv[3] ?? 30))) {
  const typed = n === 2 ? w.slice(0, -1) + "x" : n === 4 ? w + "zz" : w;
  await page.keyboard.type(typed, { delay: 35 });
  await page.keyboard.press("Space");
  n++;
  if (n === 6) await page.screenshot({ path: "e2e/out/typing.png" });
}
await page.waitForTimeout(Number(process.argv[4] ?? 500));
await page.mouse.move(10, 10);
await page.waitForTimeout(300);
await page.screenshot({ path: "e2e/out/after.png" });
if (errors.length) console.log("ERRORS:\n" + errors.join("\n"));
await browser.close();
