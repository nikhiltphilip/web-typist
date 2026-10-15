// Screenshots the main pages with the Iosevka font to check icons and font.
import { chromium } from "playwright";
const base = process.argv[2] ?? "http://localhost:3001";
const browser = await chromium.launch({ executablePath: "/etc/profiles/per-user/null/bin/brave", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.addInitScript(() => localStorage.setItem("mt-settings", JSON.stringify({ font: "Iosevka" })));
for (const [path, name] of [["/", "home"], ["/learn", "learn"], ["/courses", "courses"]]) {
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `e2e/out/icons-${name}.png` });
}
const font = await page.evaluate(() => [getComputedStyle(document.body).fontFamily, document.fonts.check('16px "Iosevka"')]);
const svgs = await page.$$eval("svg.lucide", (s) => s.length);
console.log("body font:", font[0], "| Iosevka loaded:", font[1], "| lucide icons on /courses:", svgs);
if (errors.length) console.log("ERRORS:\n" + errors.join("\n"));
await browser.close();
