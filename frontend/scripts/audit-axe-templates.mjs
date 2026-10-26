import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { execSync } from "node:child_process";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SLUG = "ayu-bagas";
const TEMPLATES = ["klasik", "modern-minimal", "botanical", "monokrom"];

function setTemplate(tpl) {
  execSync(
    `docker exec weeding-saas-postgres-1 psql -U wedding -d wedding_saas -c "UPDATE events SET template_id = '${tpl}' WHERE slug = '${SLUG}';"`,
    { stdio: "pipe" }
  );
}

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  let totalViolations = 0;

  for (const tpl of TEMPLATES) {
    setTemplate(tpl);
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/${SLUG}`, { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    await context.close();
    if (results.violations.length === 0) {
      console.log(`[OK] Template ${tpl} — 0 violations`);
    } else {
      console.log(`[FAIL] Template ${tpl} — ${results.violations.length} violations`);
      for (const v of results.violations) {
        console.log(`  - [${v.impact}] ${v.id}: ${v.help}`);
        for (const n of v.nodes.slice(0, 3)) console.log(`      ${n.target.join(", ")}`);
      }
      totalViolations += results.violations.length;
    }
  }

  setTemplate("klasik"); // kembalikan ke default
  await browser.close();
  console.log(`\n=== ${TEMPLATES.length} template diaudit, ${totalViolations} total violation ===`);
  if (totalViolations > 0) process.exit(1);
}

main().catch((err) => {
  console.error("AUDIT FAILED:", err);
  process.exit(1);
});
