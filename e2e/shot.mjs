// Quick visual check: node e2e/shot.mjs <path> <out.png> [keys to type...]
// Uses the system Brave (Playwright's bundled browser download fails on NixOS).
import { chromium } from "playwright";

const [, , path = "/", out = "e2e/out/shot.png", ...keys] = process.argv;
const base = process.env.BASE_URL ?? "http://localhost:3210";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/etc/profiles/per-user/null/bin/brave",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(base + path, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
for (const k of keys) {
  if (k.startsWith("wait:")) await page.waitForTimeout(Number(k.slice(5)));
  else if (k.startsWith("text:")) await page.keyboard.type(k.slice(5), { delay: 60 });
  else await page.keyboard.press(k);
}
await page.waitForTimeout(400);
await page.screenshot({ path: out });
if (errors.length) console.log("ERRORS:\n" + errors.join("\n"));
await browser.close();
