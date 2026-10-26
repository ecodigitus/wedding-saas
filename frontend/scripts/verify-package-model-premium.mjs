// Stage 2 — setelah event akun ini di-set package + semua add-on via psql
// (di luar skrip ini oleh caller, sama seperti pola verify-*-premium.mjs
// lain): verifikasi Kelola Tamu/Check-in kebuka, Billing menampilkan status
// aktif yang benar, kartu Editor add-on kebuka, dan axe-scan Billing di
// state "sudah ada paket+add-on" (state berbeda dari axe-scan stage 1).
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.DOMAIN_URL ?? "http://localhost:3000";
const email = process.argv[2];
const password = "password123";

if (!email) {
  console.error("Usage: node verify-package-model-premium.mjs <email-sudah-punya-paket+addon>");
  process.exit(1);
}

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
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 10000 });

  await page.goto(`${BASE}/dashboard/guests`, { waitUntil: "networkidle" });
  await page.waitForSelector('button:has-text("Tambah Tamu")', { timeout: 10000 });
  console.log("PASS: Kelola Tamu terbuka (bukan paywall) setelah event punya paket");

  await page.goto(`${BASE}/dashboard/checkin`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=QR Check-in", { timeout: 10000 });
  const checkinPaywall = await page.locator("text=perlu paket aktif").count();
  if (checkinPaywall > 0) errors.push("QR Check-in masih menampilkan paywall walau event sudah punya paket");
  console.log("PASS: QR Check-in terbuka setelah event punya paket");

  await page.goto(`${BASE}/dashboard/billing`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Paket aktif", { timeout: 10000 });
  const soldOutAddons = await page.locator("text=Sudah aktif").count();
  if (soldOutAddons !== 3) errors.push(`Harusnya 3 add-on berstatus "Sudah aktif", ditemukan ${soldOutAddons}`);
  console.log(`PASS: Billing menampilkan paket aktif + ${soldOutAddons} add-on aktif`);

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  if (results.violations.length > 0) {
    errors.push(`${results.violations.length} axe violations di halaman Billing (state paket+addon aktif): ` +
      results.violations.map((v) => v.id).join(", "));
  } else {
    console.log("PASS: 0 axe violations di halaman Billing (paket+add-on aktif)");
  }

  await page.goto(`${BASE}/dashboard/editor`, { waitUntil: "networkidle" });
  const giftFormVisible = await page.locator('input[name="bank_name"]').count();
  if (giftFormVisible !== 1) errors.push("Form Amplop Digital tidak terbuka walau add-on amplop_digital aktif");
  const musicFormVisible = await page.locator('input[name="music_url"]').count();
  if (musicFormVisible !== 1) errors.push("Form Musik & Galeri tidak terbuka walau add-on musik_galeri_countdown aktif");
  console.log("PASS: kartu Editor Amplop Digital + Musik & Galeri terbuka (bukan upsell)");

  await browser.close();
}

main()
  .then(() => {
    if (errors.length) {
      console.error("ERRORS:", errors);
      process.exit(1);
    }
    console.log("ALL CHECKS (stage 2) PASSED");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
