import { chromium } from "playwright";
import fs from "node:fs";

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
  // Fake camera device — mengisi getUserMedia dengan feed sintetis (bar warna
  // bergerak, BUKAN QR sungguhan) supaya halaman /dashboard/checkin bisa
  // dites tanpa error izin kamera di environment headless. Loop decode jsQR
  // tetap TIDAK tervalidasi lewat kamera asli di sini — itu gap yang sudah
  // dicatat di task.v2.md Bagian 10, butuh device asli.
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
  });
  const context = await browser.newContext({ permissions: ["camera"] });
  const page = await context.newPage();

  await page.goto("http://localhost:3000/login");
  await page.fill('input[name="email"]', "demo@wedding-saas.dev");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");

  // --- Paywall untuk non-premium (pakai akun baru + context TERPISAH —
  // context sama akan share localStorage/token dgn akun demo di atas) ---
  const rand = Math.random().toString(36).slice(2, 8);
  const liteEmail = `verify-checkin-lite-${rand}@example.com`;
  const liteContext = await browser.newContext();
  const litePage = await liteContext.newPage();
  await litePage.goto("http://localhost:3000/register");
  await litePage.fill('input[name="full_name"]', "Lite Checkin");
  await litePage.fill('input[name="email"]', liteEmail);
  await litePage.fill('input[name="password"]', "password123");
  await litePage.click('button[type="submit"]');
  await litePage.waitForURL("**/dashboard");
  await litePage.goto("http://localhost:3000/dashboard/checkin");
  await litePage.waitForSelector("text=khusus Premium");
  assert(true, "paywall QR Check-in untuk user lite tampil");
  await liteContext.close();

  // --- Tambah tamu, buka link personal, submit hadir, cek QR tampil ---
  await page.goto("http://localhost:3000/dashboard/guests");
  await page.waitForSelector('button:has-text("Tambah Tamu")');
  const guestName = `Tamu QR ${Math.random().toString(36).slice(2, 6)}`;
  await page.fill('input[name="name"]', guestName);
  await page.click('button:has-text("Tambah Tamu")');
  await page.waitForSelector(`text=${guestName}`);

  const inviteToken = await page.evaluate(async (name) => {
    const token = localStorage.getItem("wedding_access_token");
    const headers = { Authorization: `Bearer ${token}` };
    const events = await fetch("http://localhost:8000/events", { headers }).then((r) => r.json());
    const guests = await fetch(`http://localhost:8000/events/${events[0].id}/guests`, { headers }).then(
      (r) => r.json()
    );
    return guests.find((g) => g.name === name)?.invite_token;
  }, guestName);
  assert(!!inviteToken, "invite_token tamu berhasil diambil");

  const guestPage = await context.newPage();
  await guestPage.goto(`http://localhost:3000/ayu-bagas?g=${inviteToken}`);
  await guestPage.waitForSelector(`text=Halo, ${guestName}`);
  await guestPage.click("button:has-text('Hadir')");
  await guestPage.click("button:has-text('Kirim RSVP')");
  await guestPage.waitForSelector("text=Makasih ya");
  await guestPage.waitForSelector("canvas", { timeout: 10000 });
  const canvasHasContent = await guestPage.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return false;
    const ctx = canvas.getContext("2d");
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    return data.some((v, i) => i % 4 !== 3 && v !== 255); // ada pixel bukan putih polos
  });
  assert(canvasHasContent, "QR code ter-render di halaman publik (kanvas berisi gambar, bukan kosong)");
  await shot(guestPage, "checkin-01-qr-on-public-page");
  await guestPage.close();

  // --- Halaman scan: premium, kamera fake harus jalan tanpa error izin ---
  await page.goto("http://localhost:3000/dashboard/checkin");
  await page.waitForSelector("text=QR Check-in", { timeout: 10000 });
  await page.waitForTimeout(2000); // beri waktu getUserMedia + render video
  await shot(page, "checkin-02-scan-page-premium");
  const cameraErrorVisible = await page.locator("text=Tidak bisa akses kamera").isVisible();
  assert(!cameraErrorVisible, "halaman scan tidak menampilkan error kamera (fake device diterima)");

  // --- Simulasikan hasil scan lewat API langsung (loop decode jsQR dari
  // kamera asli tidak bisa disimulasikan headless — lihat catatan di atas),
  // lalu pastikan Kelola Tamu menampilkan status check-in setelah reload ---
  await page.evaluate(async (token) => {
    const accessToken = localStorage.getItem("wedding_access_token");
    await fetch("http://localhost:8000/guests/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ token }),
    });
  }, inviteToken);

  await page.goto("http://localhost:3000/dashboard/guests");
  await page.waitForSelector(`text=${guestName}`);
  const row = page.locator("tr", { hasText: guestName });
  await page.waitForTimeout(500);
  const rowText = await row.textContent();
  assert(/✓ \d/.test(rowText ?? ""), "Kelola Tamu menampilkan waktu check-in setelah tamu di-scan");
  await shot(page, "checkin-03-guests-page-checked-in");

  // --- Cleanup ---
  page.once("dialog", (d) => d.accept());
  await row.locator('button[aria-label^="Hapus"]').click();

  await browser.close();
  console.log("\nSEMUA VERIFIKASI QR CHECK-IN LOLOS.");
}

main().catch((err) => {
  console.error("VERIFICATION FAILED:", err.message);
  process.exit(1);
});
