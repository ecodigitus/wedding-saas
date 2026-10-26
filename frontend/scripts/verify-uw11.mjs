import { chromium } from "playwright";

const BASE = process.env.DOMAIN_URL ?? "http://localhost:3000";
const email = process.argv[2] ?? `uw11test-${Date.now()}@example.com`;
const password = "password123";
const errors = [];

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("pageerror", (err) => errors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 10000 });
  console.log("PASS: register + redirect ke dashboard");

  await page.goto(`${BASE}/dashboard/editor`, { waitUntil: "networkidle" });
  await page.fill('input[name="partner1_name"]', "Budi");
  await page.fill('input[name="partner2_name"]', "Ani");
  await page.fill('input[name="event_date"]', "2027-01-01");
  await page.fill('textarea[name="lokasi"]', "Balai Kota");
  await page.click('button:has-text("Simpan")');
  await page.waitForSelector("text=Perubahan tersimpan.", { timeout: 10000 });
  console.log("PASS: event dasar tersimpan");

  const upsell = await page.locator("text=Musik Latar, Galeri & Countdown").count();
  if (upsell < 1) errors.push("Judul kartu Musik & Galeri tidak muncul");
  const musicInputVisible = await page.locator('input[name="music_url"]').count();
  if (musicInputVisible !== 0) errors.push("Input music_url harusnya tersembunyi tanpa add-on musik_galeri_countdown");
  console.log("PASS: event tanpa add-on menampilkan upsell, bukan form input");

  await browser.close();
  console.log(`EMAIL_FOR_UPGRADE=${email}`);
}

main()
  .then(() => {
    if (errors.length) {
      console.error("ERRORS:", errors);
      process.exit(1);
    }
    console.log("ALL CHECKS (stage 1) PASSED");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
