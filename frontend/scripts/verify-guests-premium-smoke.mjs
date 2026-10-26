import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const email = process.argv[2];
const errors = [];

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("pageerror", (err) => errors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 10000 });

  await page.goto(`${BASE}/dashboard/guests`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Kelola Tamu", { timeout: 10000 });
  const stillLoadingForever = await page.locator("text=Memuat tamu...").count();
  await page.waitForTimeout(1000);
  const stillLoadingAfter = await page.locator("text=Memuat tamu...").count();
  if (stillLoadingAfter > 0) errors.push("Halaman Kelola Tamu (premium) stuck di 'Memuat tamu...'");
  console.log(`PASS: Kelola Tamu (premium) selesai loading (was loading initially: ${stillLoadingForever > 0})`);

  await page.goto(`${BASE}/dashboard/checkin`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=QR Check-in", { timeout: 10000 });
  console.log("PASS: QR Check-in (premium) halaman termuat tanpa error");

  await browser.close();
}

main()
  .then(() => {
    if (errors.length) {
      console.error("ERRORS:", errors);
      process.exit(1);
    }
    console.log("ALL PREMIUM SMOKE CHECKS PASSED");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
