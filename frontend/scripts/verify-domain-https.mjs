// Verifikasi menyeluruh pasca setup domain+HTTPS (demo.ecodigitus.com lewat
// NPM di server utama -> Lightsail). Fokus: login benar-benar jalan (CORS +
// mixed content sudah dibenahi), DAN secure-context APIs (clipboard, kamera)
// akhirnya terbuka karena browser sekarang lihat origin HTTPS.
import { chromium } from "playwright";

const DOMAIN = process.env.DOMAIN_URL ?? "https://demo.ecodigitus.com";

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`ok: ${msg}`);
}

async function main() {
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
  });
  const context = await browser.newContext({ permissions: ["camera", "clipboard-read", "clipboard-write"] });
  const page = await context.newPage();

  // --- Secure context check ---
  await page.goto(DOMAIN);
  const secureInfo = await page.evaluate(() => ({
    isSecureContext: window.isSecureContext,
    hasClipboard: typeof navigator.clipboard?.writeText === "function",
    hasMediaDevices: typeof navigator.mediaDevices?.getUserMedia === "function",
    protocol: window.location.protocol,
  }));
  console.log("secure context info:", JSON.stringify(secureInfo));
  assert(secureInfo.isSecureContext, "window.isSecureContext = true di domain baru");
  assert(secureInfo.hasClipboard, "navigator.clipboard TERSEDIA (sebelumnya tidak ada di HTTP)");
  assert(secureInfo.hasMediaDevices, "navigator.mediaDevices TERSEDIA (sebelumnya tidak ada di HTTP)");

  // --- Login/register benar-benar jalan (bukan mixed content/CORS error) ---
  const rand = Math.random().toString(36).slice(2, 8);
  const email = `domain-check-${rand}@example.com`;
  await page.goto(`${DOMAIN}/register`);
  await page.fill('input[name="full_name"]', "Domain Check");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  assert(true, "register via domain HTTPS berhasil (redirect ke /dashboard)");

  await page.goto(`${DOMAIN}/dashboard/billing`);
  await page.waitForSelector("text=Upgrade ke Premium", { timeout: 15000 });
  assert(true, "billing status fetch dari backend via domain berhasil");

  await browser.close();
  console.log("\nSEMUA VERIFIKASI DOMAIN+HTTPS LOLOS.");
}

main().catch((err) => {
  console.error("VERIFICATION FAILED:", err.message);
  process.exit(1);
});
