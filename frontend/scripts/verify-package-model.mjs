// Verifikasi model paket per-acara + add-on (ganti Lite/Premium per-akun).
// Xendit tidak dikonfigurasi di lokal (kredensial cuma di staging), jadi
// pembelian paket/add-on disimulasikan lewat UPDATE langsung ke DB (event.package/
// event.addons) — sama seperti pola `give_package`/`give_addon` di pytest,
// bukan lewat klik tombol beli sungguhan (itu akan 503 di lokal).
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.DOMAIN_URL ?? "http://localhost:3000";
const email = process.argv[2] ?? `pkgtest-${Date.now()}@example.com`;
const password = "password123";
const errors = [];

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("pageerror", (err) => errors.push(String(err)));
  page.on("console", (msg) => {
    // "Failed to load resource: ... 503" adalah log devtools browser standar
    // untuk RESPONSE non-2xx apa pun — benign di sini karena skrip ini SENGAJA
    // memicu 503 (Xendit belum dikonfigurasi di lokal) untuk menguji error
    // handling-nya, bukan bug aplikasi.
    if (msg.type() === "error" && !msg.text().includes("Failed to load resource")) {
      errors.push(msg.text());
    }
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
  console.log("PASS: event dasar tersimpan (nol paket, sesuai model baru)");

  // --- Sebelum ada paket ---
  await page.goto(`${BASE}/dashboard/guests`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Kelola Tamu perlu paket aktif", { timeout: 10000 });
  console.log("PASS: Kelola Tamu menampilkan upsell paket (bukan 'Premium' lagi)");

  await page.goto(`${BASE}/dashboard/checkin`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=QR Check-in perlu paket aktif", { timeout: 10000 });
  console.log("PASS: QR Check-in menampilkan upsell paket");

  await page.goto(`${BASE}/dashboard/billing`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Pilih Paket", { timeout: 10000 });
  const packageCount = await page.locator("button[aria-pressed]").count();
  if (packageCount !== 3) errors.push(`Harusnya 3 kartu paket, ditemukan ${packageCount}`);
  const intimatePrice = await page.locator("text=/Rp.?399\\.000/").count();
  if (intimatePrice < 1) errors.push("Harga paket Intimate (Rp 399.000) tidak muncul");
  console.log("PASS: halaman Billing menampilkan 3 paket dengan harga dari backend");

  const addonButtons = await page.locator('button:has-text("Tambah add-on")').count();
  const disabledAddonButtons = await page
    .locator('button:has-text("Tambah add-on"):disabled')
    .count();
  if (disabledAddonButtons !== addonButtons) {
    errors.push("Tombol add-on harusnya nonaktif semua sebelum ada paket");
  }
  console.log("PASS: tombol add-on nonaktif sebelum ada paket");

  // Halaman Billing baru di-redesign penuh sesi ini (3 kartu paket + 3 kartu
  // add-on) — belum pernah di-axe-scan sebelumnya.
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  if (results.violations.length > 0) {
    errors.push(`${results.violations.length} axe violations di halaman Billing: ` +
      results.violations.map((v) => v.id).join(", "));
  } else {
    console.log("PASS: 0 axe violations di halaman Billing (belum ada paket)");
  }

  // Xendit tidak dikonfigurasi di lokal — klik "Pilih paket" harus menampilkan
  // pesan error yang jelas (503 dari backend), bukan diam/crash.
  await page.locator('button:has-text("Pilih paket")').first().click();
  await page.waitForSelector("text=/Pembayaran belum bisa diproses|Gagal membuat invoice/", {
    timeout: 10000,
  });
  console.log("PASS: klik 'Pilih paket' tanpa Xendit lokal menampilkan pesan error, bukan crash");

  await browser.close();
  console.log(`EMAIL_FOR_DB=${email}`);
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
