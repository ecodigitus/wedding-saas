import { chromium } from "playwright";

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`ok: ${msg}`);
}

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();

  const rand = Math.random().toString(36).slice(2, 8);
  await page.goto("http://localhost:3000/register");
  await page.fill('input[name="full_name"]', "XSS Maps Check");
  await page.fill('input[name="email"]', `xss-maps-check-${rand}@example.com`);
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  await page.goto("http://localhost:3000/dashboard/editor");
  await page.waitForSelector("text=Editor Undangan");
  await page.fill('input[name="partner1_name"]', "A");
  await page.fill('input[name="partner2_name"]', "B");
  await page.fill('input[name="event_date"]', "2027-08-01");
  await page.fill('textarea[name="lokasi"]', "Test Lokasi");
  await page.fill('input[name="maps_url"]', "javascript:alert(document.domain)");
  await page.click("button:has-text('Simpan')");
  await page.waitForTimeout(1500);

  const errText = await page.locator(".text-danger").allTextContents();
  assert(errText.length > 0, `backend menolak javascript: maps_url (pesan: ${JSON.stringify(errText)})`);

  await browser.close();
  console.log("\nVERIFIKASI XSS MAPS_URL LOLOS.");
}

main().catch((err) => {
  console.error("VERIFICATION FAILED:", err.message);
  process.exit(1);
});
