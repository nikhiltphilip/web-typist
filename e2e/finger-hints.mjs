// Screenshots the learning path keyboard with finger hints, for a capital
// letter (needs shift) and then a plain letter.
import { chromium } from "playwright";
const base = process.argv[2] ?? "http://localhost:3001";
const browser = await chromium.launch({ executablePath: "/etc/profiles/per-user/null/bin/brave", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
await page.addInitScript(() => localStorage.setItem("mt-settings", JSON.stringify({ learn: { capitals: 1 } })));
await page.goto(base + "/learn", { waitUntil: "networkidle" });
await page.waitForSelector(".words [data-i]");
await page.waitForTimeout(500);
const text = await page.$$eval(".words [data-i]", (ls) => ls.map((l) => l.textContent).join(""));
console.log("first chars:", JSON.stringify(text.slice(0, 12)));
const kb = await page.locator(".soft-dim-on-focus").boundingBox();
kb.height += 90; // include the hands below the keyboard
await page.screenshot({ path: "e2e/out/finger-capital.png", clip: { x: 300, y: kb.y - 10, width: 840, height: kb.height + 20 } });
await page.keyboard.type(text[0], { delay: 50 });
await page.mouse.move(5, 5);
await page.waitForTimeout(400);
await page.screenshot({ path: "e2e/out/finger-plain.png", clip: { x: 300, y: kb.y - 10, width: 840, height: kb.height + 20 } });
const hint = await page.$eval(".soft-dim-on-focus + div .text-xs", (e) => e.textContent);
console.log("hint after first key:", hint);
await browser.close();
