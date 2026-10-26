// Audit aksesibilitas otomatis (axe-core, aturan WCAG 2.1 A/AA) di semua
// halaman publik + dashboard — termasuk halaman baru sejak Fase 1 (Billing,
// Kelola Tamu, QR Check-in) yang belum pernah diaudit sama sekali.
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = "./verify-screenshots";
fs.mkdirSync(OUT_DIR, { recursive: true });

const allViolations = [];

async function scan(page, label) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  if (results.violations.length === 0) {
    console.log(`[OK] ${label} — 0 violations`);
  } else {
    console.log(`[FAIL] ${label} — ${results.violations.length} violations`);
    for (const v of results.violations) {
      console.log(`  - [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node)`);
      for (const n of v.nodes.slice(0, 3)) {
        console.log(`      ${n.target.join(", ")}`);
      }
    }
  }
  allViolations.push({ label, violations: results.violations });
}

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });

  // --- Halaman publik (tanpa login) ---
  const pubContext = await browser.newContext();
  const pub = await pubContext.newPage();

  await pub.goto(`${BASE}/`);
  await scan(pub, "Landing (/)");

  await pub.goto(`${BASE}/login`);
  await scan(pub, "Login");

  await pub.goto(`${BASE}/register`);
  await scan(pub, "Register");

  await pub.goto(`${BASE}/ayu-bagas`);
  await scan(pub, "Halaman publik undangan (klasik)");

  // --- Login sebagai demo user (harus sudah premium untuk halaman gated) ---
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', "demo@wedding-saas.dev");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  await scan(page, "Dashboard (kosong/nav)");

  await page.goto(`${BASE}/dashboard/editor`);
  await page.waitForSelector("text=Editor Undangan");
  await scan(page, "Dashboard: Editor Undangan");

  await page.goto(`${BASE}/dashboard/rsvp`);
  await page.waitForTimeout(500);
  await scan(page, "Dashboard: RSVP");

  await page.goto(`${BASE}/dashboard/guestbook`);
  await page.waitForTimeout(500);
  await scan(page, "Dashboard: Buku Tamu");

  await page.goto(`${BASE}/dashboard/billing`);
  await page.waitForTimeout(500);
  await scan(page, "Dashboard: Billing");

  await page.goto(`${BASE}/dashboard/guests`);
  await page.waitForTimeout(500);
  await scan(page, "Dashboard: Kelola Tamu");

  // Buka modal preview QR (kalau ada minimal 1 tamu di roster) — belum pernah
  // diaudit karena axe cuma nangkap DOM state saat scan dipanggil, bukan
  // semua kemungkinan state halaman.
  const qrButton = page.locator('button[aria-label^="Lihat QR"]').first();
  if (await qrButton.count() > 0) {
    await qrButton.click();
    await page.waitForTimeout(300);
    await scan(page, "Dashboard: Kelola Tamu (modal QR terbuka)");

    // Cek manual: modal harus bisa ditutup dengan Escape (axe tidak cek ini).
    // Selector spesifik ke modal (bukan cocok teks apa pun yang mengandung
    // "QR", supaya tidak ke-false-positive ketimpa link nav "QR Check-in").
    const closeButton = page.locator('button[aria-label="Tutup"]');
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    const stillOpen = await closeButton.isVisible().catch(() => false);
    console.log(stillOpen ? "[MANUAL-CHECK FAIL] Modal QR tidak tertutup dengan tombol Escape" : "[MANUAL-CHECK OK] Modal QR tertutup dengan Escape");
  }

  await page.goto(`${BASE}/dashboard/checkin`);
  await page.waitForTimeout(2000);
  await scan(page, "Dashboard: QR Check-in");

  await browser.close();

  const totalViolations = allViolations.reduce((sum, r) => sum + r.violations.length, 0);
  console.log(`\n=== RINGKASAN: ${allViolations.length} halaman diaudit, ${totalViolations} total violation ===`);
  if (totalViolations > 0) process.exit(1);
}

main().catch((err) => {
  console.error("AUDIT FAILED:", err);
  process.exit(1);
});
