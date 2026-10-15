// Types several adaptive lessons and screenshots the learning path.
// node e2e/learn-flow.mjs [baseUrl] [lessons]
import { chromium } from "playwright";
const base = process.argv[2] ?? "http://localhost:3001";
const lessons = Number(process.argv[3] ?? 3);
const browser = await chromium.launch({ executablePath: "/etc/profiles/per-user/null/bin/brave", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(base + "/learn", { waitUntil: "networkidle" });
await page.waitForSelector(".words [data-i]");
await page.waitForTimeout(500);
await page.screenshot({ path: "e2e/out/learn-start.png" });
for (let n = 0; n < lessons; n++) {
  const text = await page.$$eval(".words [data-i]", (ls) => ls.map((l) => l.textContent).join(""));
  let i = 0;
  for (const ch of text) {
    if (n === 0 && i === 5) await page.keyboard.type("#"); // one mistake in the first lesson
    await page.keyboard.type(ch === " " ? " " : ch, { delay: 70 });
    if (n === 0 && i === 40) await page.screenshot({ path: "e2e/out/learn-typing.png" });
    i++;
  }
  await page.waitForTimeout(400);
}
await page.mouse.move(5, 5);
await page.waitForTimeout(300);
await page.screenshot({ path: "e2e/out/learn-after.png" });
const strip = await page.$$eval("[title]", (els) => els.map((e) => e.getAttribute("title")).filter((t) => /^[a-z]( \(locked\))?:? /.test(t ?? "") || /^[a-z]( \(locked\))?\n/.test(t ?? "")).length);
console.log("key tiles with titles:", strip);
if (errors.length) console.log("ERRORS:\n" + errors.join("\n"));
await browser.close();
