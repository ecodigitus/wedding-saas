// Verifikasi QR Check-in (BT-02) langsung ke URL STAGING sungguhan.
// Usage: node verify-staging-checkin.mjs <email> <slug>   (setelah event
// akun ini di-set package='intimate' manual via psql — UPDATE events SET
// package='intimate' WHERE owner_id=(SELECT id FROM users WHERE email=...)
// — sama seperti verify-staging-fase2, bukan lagi UPDATE users SET tier).
import { chromium } from "playwright";
import fs from "node:fs";

const STAGING_URL = process.env.STAGING_URL ?? "http://15.232.71.64:3000";
const API_BASE = process.env.API_BASE ?? "http://15.232.71.64:8000";
const [, , email, slug] = process.argv;
const OUT_DIR = "./verify-screenshots";
fs.mkdirSync(OUT_DIR, { recursive: true });

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`ok: ${msg}`);
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: true });
}

async function main() {
  if (!email || !slug) throw new Error("usage: node verify-staging-checkin.mjs <email> <slug>");

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
  });
  const context = await browser.newContext({ permissions: ["camera"] });
  const page = await context.newPage();

  await page.goto(`${STAGING_URL}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  // --- Paywall check-in untuk event tanpa paket (context terpisah) ---
  const liteContext = await browser.newContext();
  const litePage = await liteContext.newPage();
  const rand = Math.random().toString(36).slice(2, 8);
  await litePage.goto(`${STAGING_URL}/register`);
  await litePage.fill('input[name="full_name"]', "Lite Checkin Staging");
  await litePage.fill('input[name="email"]', `staging-checkin-lite-${rand}@example.com`);
  await litePage.fill('input[name="password"]', "password123");
  await litePage.click('button[type="submit"]');
  await litePage.waitForURL("**/dashboard", { timeout: 15000 });
  await litePage.goto(`${STAGING_URL}/dashboard/checkin`);
  await litePage.waitForSelector("text=perlu paket aktif", { timeout: 15000 });
  assert(true, "paywall QR Check-in untuk event tanpa paket tampil di staging");
  await liteContext.close();

  // --- Tambah tamu, isi RSVP hadir via link personal, cek QR ---
  await page.goto(`${STAGING_URL}/dashboard/guests`);
  await page.waitForSelector('button:has-text("Tambah Tamu")', { timeout: 15000 });
  const guestName = `Staging QR ${Math.random().toString(36).slice(2, 6)}`;
  await page.fill('input[name="name"]', guestName);
  await page.click('button:has-text("Tambah Tamu")');
  await page.waitForSelector(`text=${guestName}`, { timeout: 15000 });

  const inviteToken = await page.evaluate(
    async ({ apiBase, name }) => {
      const token = localStorage.getItem("wedding_access_token");
      const headers = { Authorization: `Bearer ${token}` };
      const events = await fetch(`${apiBase}/events`, { headers }).then((r) => r.json());
      const guests = await fetch(`${apiBase}/events/${events[0].id}/guests`, { headers }).then((r) =>
        r.json()
      );
      return guests.find((g) => g.name === name)?.invite_token;
    },
    { apiBase: API_BASE, name: guestName }
  );
  assert(!!inviteToken, "invite_token tamu berhasil diambil via API staging");

  const guestPage = await context.newPage();
  await guestPage.goto(`${STAGING_URL}/${slug}?g=${inviteToken}`);
  await guestPage.waitForSelector(`text=Halo, ${guestName}`, { timeout: 15000 });
  await guestPage.click("button:has-text('Hadir')");
  await guestPage.click("button:has-text('Kirim RSVP')");
  await guestPage.waitForSelector("text=Makasih ya", { timeout: 15000 });
  await guestPage.waitForSelector("canvas", { timeout: 10000 });
  const canvasHasContent = await guestPage.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const ctx = canvas?.getContext("2d");
    if (!ctx) return false;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    return data.some((v, i) => i % 4 !== 3 && v !== 255);
  });
  assert(canvasHasContent, "QR code ter-render di halaman publik staging");
  await shot(guestPage, "staging-checkin-01-qr");
  await guestPage.close();

  // --- Halaman scan premium ---
  // navigator.mediaDevices TIDAK ADA di origin HTTP biasa (bukan secure
  // context) — sama seperti Clipboard API, tapi kamera TIDAK punya fallback
  // legacy sama sekali. Kalau STAGING_URL masih HTTP, error kamera itu
  // ekspektasi yang benar (bukan kegagalan). Kalau sudah HTTPS (domain),
  // kamera harus benar-benar jalan tanpa error.
  const isSecure = STAGING_URL.startsWith("https://");
  await page.goto(`${STAGING_URL}/dashboard/checkin`);
  await page.waitForSelector("text=QR Check-in", { timeout: 15000 });
  await page.waitForTimeout(2000);
  await shot(page, "staging-checkin-02-scan-page");
  const cameraErrorVisible = await page.locator("text=Tidak bisa akses kamera").isVisible();
  if (isSecure) {
    assert(!cameraErrorVisible, "halaman scan TIDAK error kamera (origin HTTPS, secure context)");
  } else {
    assert(cameraErrorVisible, "halaman scan tampilkan pesan error kamera yang jelas (expected — origin masih HTTP)");
  }

  // --- Simulasi hasil scan via API (loop decode kamera asli di luar scope
  // headless test, lihat task.v2.md Bagian 10), cek Kelola Tamu update ---
  await page.evaluate(
    async ({ apiBase, token }) => {
      const accessToken = localStorage.getItem("wedding_access_token");
      await fetch(`${apiBase}/guests/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ token }),
      });
    },
    { apiBase: API_BASE, token: inviteToken }
  );

  await page.goto(`${STAGING_URL}/dashboard/guests`);
  await page.waitForSelector(`text=${guestName}`, { timeout: 15000 });
  const row = page.locator("tr", { hasText: guestName });
  await page.waitForTimeout(500);
  const rowText = await row.textContent();
  assert(/✓ \d/.test(rowText ?? ""), "Kelola Tamu staging menampilkan waktu check-in");
  await shot(page, "staging-checkin-03-guests-checked-in");

  // --- Cleanup tamu test ---
  page.once("dialog", (d) => d.accept());
  await row.locator('button[aria-label^="Hapus"]').click();

  await browser.close();
  console.log("\nSTAGING QR CHECK-IN SMOKE TEST LOLOS.");
}

main().catch((err) => {
  console.error("VERIFICATION FAILED:", err.message);
  process.exit(1);
});
