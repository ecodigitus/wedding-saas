// Usage: node verify-domain-checkin.mjs <email> <slug>
// Buktikan kamera QR Check-in BENAR-BENAR jalan di domain HTTPS baru (bukan
// cuma "API tersedia" seperti verify-domain-https.mjs, tapi halaman scan
// betulan tidak menampilkan error kamera).
import { chromium } from "playwright";
import fs from "node:fs";

const DOMAIN = process.env.DOMAIN_URL ?? "https://demo.ecodigitus.com";
const API_BASE = process.env.API_BASE ?? "https://demo.ecodigitus.com";
const [, , email, slug] = process.argv;
const OUT_DIR = "./verify-screenshots";
fs.mkdirSync(OUT_DIR, { recursive: true });

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`ok: ${msg}`);
}

async function main() {
  if (!email || !slug) throw new Error("usage: node verify-domain-checkin.mjs <email> <slug>");

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
  });
  const context = await browser.newContext({ permissions: ["camera"] });
  const page = await context.newPage();

  await page.goto(`${DOMAIN}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  await page.goto(`${DOMAIN}/dashboard/checkin`);
  await page.waitForSelector("text=QR Check-in", { timeout: 15000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT_DIR}/domain-checkin-scan-page.png` });
  const cameraErrorVisible = await page.locator("text=Tidak bisa akses kamera").isVisible();
  assert(!cameraErrorVisible, "halaman scan TIDAK error kamera di domain HTTPS (akhirnya jalan!)");

  const videoHasFrame = await page.evaluate(() => {
    const video = document.querySelector("video");
    return !!video && video.readyState >= 2 && video.videoWidth > 0;
  });
  assert(videoHasFrame, "elemen video punya frame kamera sungguhan (bukan cuma placeholder kosong)");

  await browser.close();
  console.log("\nQR CHECK-IN KAMERA VERIFIED WORKING DI DOMAIN HTTPS.");
}

main().catch((err) => {
  console.error("VERIFICATION FAILED:", err.message);
  process.exit(1);
});
