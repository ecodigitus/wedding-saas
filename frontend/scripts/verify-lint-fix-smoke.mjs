import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const email = `smoketest-${Date.now()}@example.com`;
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

  // Paywall paket cuma muncul kalau SUDAH ada event (guard urutan: !event
  // dicek duluan, baru !hasPackage) — buat event dasar dulu, tanpa itu yang
  // muncul cuma EmptyState "Belum ada undangan".
  await page.goto(`${BASE}/dashboard/editor`, { waitUntil: "networkidle" });
  await page.fill('input[name="partner1_name"]', "Budi");
  await page.fill('input[name="partner2_name"]', "Ani");
  await page.fill('input[name="event_date"]', "2027-01-01");
  await page.fill('textarea[name="lokasi"]', "Balai Kota");
  await page.click('button:has-text("Simpan")');
  await page.waitForSelector("text=Perubahan tersimpan.", { timeout: 10000 });

  // Kelola Tamu (event belum punya paket) — harus tampilkan upsell, tidak stuck loading
  await page.goto(`${BASE}/dashboard/guests`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const upsell = await page.locator("text=Kelola Tamu perlu paket aktif").count();
  if (upsell < 1) errors.push("Upsell Kelola Tamu tidak muncul (event belum punya paket)");
  const stuckLoading = await page.locator("text=Memuat tamu...").count();
  if (stuckLoading > 0) errors.push("Halaman Kelola Tamu stuck di 'Memuat tamu...' padahal harusnya upsell");
  console.log("PASS: Kelola Tamu (tanpa paket) menampilkan upsell, tidak stuck loading");

  // QR Check-in (event belum punya paket) — harus tampilkan upsell
  await page.goto(`${BASE}/dashboard/checkin`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const checkinUpsell = await page.locator("text=QR Check-in perlu paket aktif").count();
  if (checkinUpsell < 1) errors.push("Upsell QR Check-in tidak muncul (event belum punya paket)");
  console.log("PASS: QR Check-in (tanpa paket) menampilkan upsell");

  await browser.close();
}

main()
  .then(() => {
    if (errors.length) {
      console.error("ERRORS:", errors);
      process.exit(1);
    }
    console.log("ALL SMOKE CHECKS PASSED");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
