// Checks the on-screen keyboard highlights the key under the cursor while typing.
import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: "/etc/profiles/per-user/null/bin/brave", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto((process.argv[2] ?? "http://localhost:3001") + "/learn", { waitUntil: "networkidle" });
await page.waitForSelector(".words [data-i]");
const text = await page.$$eval(".words [data-i]", (ls) => ls.map((l) => l.textContent.replace(/ /, " ")).join(""));
let bad = 0;
for (let i = 0; i < 25; i++) {
  await page.keyboard.type(text[i], { delay: 50 });
  await page.waitForTimeout(30);
  const active = await page.$eval(".bg-main.text-bg", (el) => el.textContent || " ").catch(() => null);
  const expected = text[i + 1];
  if (active !== expected) bad++;
}
console.log(bad === 0 ? "keyboard follows the cursor: OK" : `keyboard mismatches: ${bad}/25`);
await browser.close();
