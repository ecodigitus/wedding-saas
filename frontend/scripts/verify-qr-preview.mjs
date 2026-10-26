import { chromium } from "playwright";
import fs from "node:fs";

const OUT_DIR = "./verify-screenshots";
fs.mkdirSync(OUT_DIR, { recursive: true });

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`ok: ${msg}`);
}

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();

  await page.goto("http://localhost:3000/login");
  await page.fill('input[name="email"]', "demo@wedding-saas.dev");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");

  await page.goto("http://localhost:3000/dashboard/guests");
  await page.waitForSelector('button:has-text("Tambah Tamu")');
  const guestName = `Tamu Preview ${Math.random().toString(36).slice(2, 6)}`;
  await page.fill('input[name="name"]', guestName);
  await page.click('button:has-text("Tambah Tamu")');
  await page.waitForSelector(`text=${guestName}`);

  // Klik "Lihat QR" TANPA tamu ini pernah RSVP sama sekali — harus tetap
  // bisa preview QR-nya (beda dari sisi tamu yang butuh konfirmasi Hadir dulu).
  const row = page.locator("tr", { hasText: guestName });
  await row.locator('button[aria-label^="Lihat QR"]').click();
  await page.waitForSelector(`text=QR ${guestName}`, { timeout: 10000 });
  await page.waitForSelector("canvas", { timeout: 10000 });
  const canvasHasContent = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const ctx = canvas?.getContext("2d");
    if (!ctx) return false;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    return data.some((v, i) => i % 4 !== 3 && v !== 255);
  });
  assert(canvasHasContent, "QR preview owner tampil walau tamu belum pernah RSVP/konfirmasi hadir");

  const downloadVisible = await page.locator("a[download]").isVisible();
  assert(downloadVisible, "tombol Download PNG tersedia di modal preview");

  await page.screenshot({ path: `${OUT_DIR}/qr-preview-modal.png` });

  // Tutup via backdrop click
  await page.mouse.click(50, 50);
  await page.waitForSelector(`text=QR ${guestName}`, { state: "detached", timeout: 5000 });
  assert(true, "modal tertutup saat klik backdrop");

  // Cleanup
  page.once("dialog", (d) => d.accept());
  await row.locator('button[aria-label^="Hapus"]').click();

  await browser.close();
  console.log("\nSEMUA VERIFIKASI QR PREVIEW OWNER LOLOS.");
}

main().catch((err) => {
  console.error("VERIFICATION FAILED:", err.message);
  process.exit(1);
});
