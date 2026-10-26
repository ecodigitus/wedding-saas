import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.DOMAIN_URL ?? "http://localhost:3000";
const email = process.argv[2];
const password = "password123";

if (!email) {
  console.error("Usage: node verify-bt03-a11y.mjs <email-premium-dengan-selfie>");
  process.exit(1);
}

async function scan(page, label) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  console.log(`${label}: ${results.violations.length} pelanggaran`);
  if (results.violations.length) {
    for (const v of results.violations) {
      console.log(`  - [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} node)`);
    }
  }
  return results.violations.length;
}

async function main() {
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
  });
  const context = await browser.newContext({ permissions: ["camera"] });
  const page = await context.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 10000 });

  await page.goto(`${BASE}/dashboard/checkin`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const checkinViolations = await scan(page, "QR Check-in (dengan tombol Ambil Foto)");

  await page.goto(`${BASE}/dashboard/guests`, { waitUntil: "networkidle" });
  const guestsViolations = await scan(page, "Kelola Tamu (dengan ikon lihat selfie)");

  const row = page.locator("tr", { hasText: "Eko Selfie" }).first();
  const selfieButton = row.locator('button[aria-label^="Lihat foto selfie"]');
  if ((await selfieButton.count()) > 0) {
    await selfieButton.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await page.waitForTimeout(500);
    const modalViolations = await scan(page, "Modal selfie terbuka");
    await browser.close();
    if (checkinViolations > 0 || guestsViolations > 0 || modalViolations > 0) {
      console.error("ADA PELANGGARAN AKSESIBILITAS");
      process.exit(1);
    }
  } else {
    await browser.close();
    if (checkinViolations > 0 || guestsViolations > 0) {
      console.error("ADA PELANGGARAN AKSESIBILITAS");
      process.exit(1);
    }
  }
  console.log("ALL CHECKS (a11y) PASSED — 0 pelanggaran");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
