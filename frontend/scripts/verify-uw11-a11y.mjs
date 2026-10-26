import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.DOMAIN_URL ?? "http://localhost:3000";
const email = process.argv[2];
const slug = process.argv[3];

if (!email || !slug) {
  console.error("Usage: node verify-uw11-a11y.mjs <email-premium> <slug>");
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
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 10000 });

  await page.goto(`${BASE}/dashboard/editor`, { waitUntil: "networkidle" });
  const editorViolations = await scan(page, "Editor (dengan Musik & Galeri)");

  await page.goto(`${BASE}/${slug}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200); // biar countdown timer & elemen lain settle
  const publicViolations = await scan(page, "Halaman publik (dengan Countdown, Musik, Galeri)");

  await browser.close();

  if (editorViolations > 0 || publicViolations > 0) {
    console.error("ADA PELANGGARAN AKSESIBILITAS");
    process.exit(1);
  }
  console.log("ALL CHECKS (a11y) PASSED — 0 pelanggaran");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
