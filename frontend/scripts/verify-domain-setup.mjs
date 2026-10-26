import { chromium } from "playwright";

const DOMAIN = process.env.DOMAIN_URL ?? "https://demo.ecodigitus.com";

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();

  const rand = Math.random().toString(36).slice(2, 8);
  const email = `domain-checkin-${rand}@example.com`;

  await page.goto(`${DOMAIN}/register`);
  await page.fill('input[name="full_name"]', "Domain Checkin Setup");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  await page.click('a[href="/dashboard/editor"]');
  await page.waitForURL("**/dashboard/editor");
  await page.fill('input[name="partner1_name"]', "DomainA");
  await page.fill('input[name="partner2_name"]', "DomainB");
  await page.fill('input[name="event_date"]', "2027-05-01");
  await page.fill('textarea[name="lokasi"]', "Lokasi Test Domain");
  await page.click("button:has-text('Publish')");
  await page.waitForSelector("text=Undangan berhasil dipublish!", { timeout: 15000 });

  await page.goto(`${DOMAIN}/dashboard`);
  await page.waitForSelector('a[target="_blank"]');
  const slugHref = await page.getAttribute('a[target="_blank"]', "href");
  const slug = slugHref.replace(/^\//, "");

  await browser.close();
  console.log(JSON.stringify({ email, slug }));
}

main();
