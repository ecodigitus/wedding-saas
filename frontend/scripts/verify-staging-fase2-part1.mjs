// Bagian 1: register + buat & publish event via URL STAGING sungguhan.
// Print JSON {email, slug} ke stdout baris terakhir supaya bisa dibaca shell
// pemanggil (lalu event akun ini di-set package='intimate' manual via psql
// — UPDATE events SET package='intimate' WHERE owner_id=(SELECT id FROM
// users WHERE email=...) — sebelum part2 dijalankan).
import { chromium } from "playwright";

const STAGING_URL = process.env.STAGING_URL ?? "http://15.232.71.64:3000";

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();

  const rand = Math.random().toString(36).slice(2, 8);
  const email = `staging-fase2-${rand}@example.com`;

  await page.goto(`${STAGING_URL}/register`);
  await page.fill('input[name="full_name"]', "Staging Fase2 Check");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  await page.click('a[href="/dashboard/editor"]');
  await page.waitForURL("**/dashboard/editor");
  await page.fill('input[name="partner1_name"]', "StagingA");
  await page.fill('input[name="partner2_name"]', "StagingB");
  await page.fill('input[name="event_date"]', "2027-03-01");
  await page.fill('textarea[name="lokasi"]', "Lokasi Test Staging");
  await page.click("button:has-text('Publish')");
  await page.waitForSelector("text=Undangan berhasil dipublish!", { timeout: 15000 });

  await page.goto(`${STAGING_URL}/dashboard`);
  await page.waitForSelector('a[target="_blank"]');
  const slugHref = await page.getAttribute('a[target="_blank"]', "href");
  const slug = slugHref.replace(/^\//, "");

  await browser.close();
  console.log(JSON.stringify({ email, slug }));
}

main().catch((err) => {
  console.error("VERIFICATION FAILED:", err.message);
  process.exit(1);
});
