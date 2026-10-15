import { chromium } from "playwright";
const base = process.argv[2] ?? "http://localhost:3001";
const browser = await chromium.launch({ executablePath: "/etc/profiles/per-user/null/bin/brave", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 760 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(base + "/learn", { waitUntil: "networkidle" });
for (const [type, extra] of [["numbers", {}], ["words", {}], ["books", {}], ["guided", { stopOnError: false, forgiveErrors: false }]]) {
  await page.evaluate(([type, extra]) => {
    const s = JSON.parse(localStorage.getItem("mt-settings") || "{}");
    localStorage.setItem("mt-settings", JSON.stringify({ ...s, learn: { ...(s.learn || {}), type, ...extra } }));
  }, [type, extra]);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".words [data-i]");
  const text = await page.$$eval(".words [data-i]", (ls) => ls.map((l) => l.textContent).join(""));
  console.log(type, "→", text.slice(0, 90).replace(/ /g, " "));
  if (type === "guided") {
    await page.keyboard.type(text[0], { delay: 80 });
    await page.keyboard.type("zqx", { delay: 80 });
    await page.screenshot({ path: "e2e/out/learn-garbage.png", clip: { x: 0, y: 360, width: 1440, height: 160 } });
    const g = await page.$$eval("[data-g]", (els) => els.map((e) => e.textContent).join(""));
    console.log("garbage shown:", JSON.stringify(g));
    for (let i = 0; i < 3; i++) await page.keyboard.press("Backspace");
    const g2 = await page.$$eval("[data-g]", (els) => els.length);
    console.log("garbage after 3 backspaces:", g2);
  }
}
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("mt-settings") || "{}");
  localStorage.setItem("mt-settings", JSON.stringify({ ...s, learn: { ...(s.learn || {}), type: "guided", stopOnError: true, forgiveErrors: true } }));
});
if (errors.length) console.log("ERRORS:\n" + errors.join("\n"));
await browser.close();
