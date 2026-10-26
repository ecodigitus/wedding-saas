import { chromium } from "playwright";

const BASE = process.env.DOMAIN_URL ?? "http://localhost:3000";
const email = `gifttest-${Date.now()}@example.com`;
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

  // Register
  await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 10000 });
  console.log("PASS: register + redirect ke dashboard");

  // Buat event dasar via editor
  await page.goto(`${BASE}/dashboard/editor`, { waitUntil: "networkidle" });
  await page.fill('input[name="partner1_name"]', "Budi");
  await page.fill('input[name="partner2_name"]', "Ani");
  await page.fill('input[name="event_date"]', "2027-01-01");
  await page.fill('textarea[name="lokasi"]', "Balai Kota");
  await page.click('button:has-text("Simpan")');
  await page.waitForSelector("text=Perubahan tersimpan.", { timeout: 10000 });
  console.log("PASS: event dasar tersimpan");

  // Cek: event tanpa add-on -> section Amplop Digital tampil upsell, bukan form input
  const upsell = await page.locator("text=Beli Add-on").count();
  if (upsell < 1) errors.push("Upsell Amplop Digital tidak muncul untuk event tanpa add-on");
  const bankInputVisible = await page.locator('input[name="bank_name"]').count();
  if (bankInputVisible !== 0) errors.push("Input bank_name harusnya tersembunyi tanpa add-on amplop_digital");
  console.log("PASS: event tanpa add-on menampilkan upsell, bukan form input");

  await browser.close();

  // Add-on amplop_digital di-set via psql lewat docker exec (di luar skrip
  // ini oleh caller): UPDATE events SET addons = '["amplop_digital"]' ...
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
