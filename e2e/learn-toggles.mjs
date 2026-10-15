// Checks the keyboard / hands toggles: on by default, independent, and they
// don't replace the lesson in progress. node e2e/learn-toggles.mjs [baseUrl]
import { chromium } from "playwright";
const base = process.argv[2] ?? "http://localhost:3001";
const browser = await chromium.launch({ executablePath: "/etc/profiles/per-user/null/bin/brave", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(base + "/learn", { waitUntil: "networkidle" });
await page.waitForSelector(".words [data-i]");
const state = async () => ({
  keyboard: (await page.$(".soft-dim-on-focus")) !== null,
  hands: (await page.$('[title="left pinky"]')) !== null,
  text: (await page.$$eval(".words [data-i]", (ls) => ls.map((l) => l.textContent).join(""))).slice(0, 30),
});
const s0 = await state();
console.log("default:", s0.keyboard ? "keyboard on" : "keyboard OFF", s0.hands ? "hands on" : "hands OFF");
await page.keyboard.type(s0.text[0], { delay: 50 }); // lesson in progress
await page.mouse.move(400, 300); // leaving focus mode shows the top bar again
await page.waitForTimeout(200);
await page.getByRole("button", { name: "keyboard" }).click();
const s1 = await state();
console.log("keyboard toggled:", s1.keyboard ? "keyboard on" : "keyboard off", s1.hands ? "hands on" : "hands off", s1.text === s0.text ? "same lesson" : "LESSON CHANGED");
await page.getByRole("button", { name: "hands" }).click();
const s2 = await state();
console.log("hands toggled:", s2.keyboard ? "keyboard on" : "keyboard off", s2.hands ? "hands on" : "hands off", s2.text === s0.text ? "same lesson" : "LESSON CHANGED");
await page.screenshot({ path: "e2e/out/learn-toggles-off.png" });
await page.getByRole("button", { name: "keyboard" }).click();
await page.getByRole("button", { name: "hands" }).click();
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector(".words [data-i]");
const s3 = await state();
console.log("after re-enabling + reload:", s3.keyboard ? "keyboard on" : "keyboard off", s3.hands ? "hands on" : "hands off");
await page.goto(base + "/settings#learn", { waitUntil: "networkidle" });
const rows = await page.$$eval("#learn .text-sub", (els) => els.map((e) => e.textContent.trim()).filter((t) => ["keyboard", "hands", "finger colours"].includes(t)));
console.log("settings rows:", rows.join(", "));
await browser.close();
