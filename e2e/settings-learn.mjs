import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: "/etc/profiles/per-user/null/bin/brave", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto((process.argv[2] ?? "http://localhost:3001") + "/settings#learn", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.locator("#learn").scrollIntoViewIfNeeded();
await page.screenshot({ path: "e2e/out/settings-learn.png" });
await browser.close();
