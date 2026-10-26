// Verifikasi Selfie Check-in (BT-03). Loop decode kamera asli (jsQR dari
// video sungguhan) di luar scope headless test — sama seperti keputusan
// yang sudah diambil untuk BT-02 (lihat verify-staging-checkin.mjs & catatan
// task.v2.md Bagian 10). Di sini "Ambil Foto" disimulasikan lewat panggilan
// langsung ke endpoint upload (persis payload yang akan dikirim tombol itu),
// supaya jalur browser->backend->S3(MinIO) tetap benar-benar diuji end-to-end
// — yang TIDAK diuji cuma interaksi klik tombolnya sendiri.
import { chromium } from "playwright";

const BASE = process.env.DOMAIN_URL ?? "http://localhost:3000";
const email = process.argv[2] ?? `bt03test-${Date.now()}@example.com`;
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

  console.log(`EMAIL_FOR_UPGRADE=${email}`);
  await browser.close();
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
