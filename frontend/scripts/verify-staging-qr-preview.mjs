// Usage: node verify-staging-qr-preview.mjs <email>
import { chromium } from "playwright";
import fs from "node:fs";

const STAGING_URL = process.env.STAGING_URL ?? "http://15.232.71.64:3000";
const [, , email] = process.argv;
const OUT_DIR = "./verify-screenshots";
fs.mkdirSync(OUT_DIR, { recursive: true });

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`ok: ${msg}`);
}

async function main() {
  if (!email) throw new Error("usage: node verify-staging-qr-preview.mjs <email>");
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();

  await page.goto(`${STAGING_URL}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  await page.goto(`${STAGING_URL}/dashboard/guests`);
  await page.waitForSelector('button:has-text("Tambah Tamu")', { timeout: 15000 });
  const guestName = `Staging QR Preview ${Math.random().toString(36).slice(2, 6)}`;
  await page.fill('input[name="name"]', guestName);
  await page.click('button:has-text("Tambah Tamu")');
  await page.waitForSelector(`text=${guestName}`, { timeout: 15000 });

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
  assert(canvasHasContent, "QR preview owner tampil di staging tanpa perlu tamu RSVP dulu");
  assert(await page.locator("a[download]").isVisible(), "tombol Download PNG tersedia di staging");
  await page.screenshot({ path: `${OUT_DIR}/staging-qr-preview-modal.png` });

  page.once("dialog", (d) => d.accept());
  await page.mouse.click(50, 50);
  await page.waitForSelector(`text=QR ${guestName}`, { state: "detached", timeout: 5000 });
  await row.locator('button[aria-label^="Hapus"]').click();

  await browser.close();
  console.log("\nSTAGING QR PREVIEW SMOKE TEST LOLOS.");
}

main().catch((err) => {
  console.error("VERIFICATION FAILED:", err.message);
  process.exit(1);
});
