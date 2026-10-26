import { chromium } from "playwright";
import fs from "node:fs";

const OUT_DIR = "./verify-screenshots";
fs.mkdirSync(OUT_DIR, { recursive: true });

const consoleIssues = [];

async function shot(page, name) {
  const path = `${OUT_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`screenshot: ${path}`);
}

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await mobile.newPage();
  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      consoleIssues.push(`[${msg.type()}] ${page.url()} :: ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => consoleIssues.push(`[pageerror] ${page.url()} :: ${err.message}`));

  const rand = Math.random().toString(36).slice(2, 8);
  const email = `verify-${rand}@example.com`;

  await page.goto("http://localhost:3000/");
  await page.waitForSelector("text=Wedding SaaS");
  await shot(page, "01-landing-mobile");

  await page.goto("http://localhost:3000/login");
  await page.waitForSelector("h1:has-text('Masuk')");
  await shot(page, "02-login-mobile");

  await page.goto("http://localhost:3000/register");
  await page.waitForSelector("h1:has-text('Yuk buat undangan')");
  await page.fill("input[name=full_name]", "Verifier Test");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", "password123");
  await shot(page, "03-register-filled-mobile");
  await page.click("button[type=submit]");
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await page.waitForSelector("text=Belum ada undangan");
  await shot(page, "04-dashboard-empty-mobile");

  await page.click('a[href="/dashboard/editor"]');
  await page.waitForURL("**/dashboard/editor");
  await page.waitForSelector("text=Editor Undangan");
  await shot(page, "05-editor-empty-mobile-formtab");

  await page.fill('input[name="partner1_name"]', "Budi");
  await page.fill('input[name="partner2_name"]', "Ani");
  await page.fill('input[name="event_date"]', "2026-12-31");
  await page.fill('textarea[name="lokasi"]', "Gedung Serbaguna Melati, Jakarta");
  await shot(page, "06-editor-filled-mobile-formtab");

  await page.click("button:has-text('Preview')");
  await shot(page, "07-editor-preview-mobile-tab");

  await page.click("button:has-text('Form')");
  await page.click("button:has-text('Simpan')");
  await page.waitForTimeout(2000);
  const feedback1 = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".text-danger, .text-success")).map((e) => e.textContent)
  );
  console.log("feedback setelah Simpan:", feedback1);
  await shot(page, "08-editor-saved-mobile");

  await page.click("button:has-text('Publish')");
  await page.waitForTimeout(2000);
  const feedback2 = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".text-danger, .text-success")).map((e) => e.textContent)
  );
  console.log("feedback setelah Publish:", feedback2);
  await shot(page, "09-editor-published-mobile");

  await page.goto("http://localhost:3000/dashboard/rsvp");
  await page.waitForSelector("text=Belum ada RSVP masuk");
  await shot(page, "10-rsvp-empty-mobile");

  await page.goto("http://localhost:3000/dashboard/guestbook");
  await page.waitForSelector("text=Belum ada ucapan masuk");
  await shot(page, "11-guestbook-empty-mobile");

  // Desktop viewport — cek split-view editor & dashboard nav.
  const desktop = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const dpage = await desktop.newPage();
  dpage.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      consoleIssues.push(`[${msg.type()}] ${dpage.url()} :: ${msg.text()}`);
    }
  });
  // Share the same logged-in localStorage token by copying it from the mobile context.
  const storageState = await mobile.storageState();
  await desktop.addCookies(storageState.cookies);
  await dpage.goto("http://localhost:3000/");
  await dpage.evaluate((origins) => {
    const local = origins.find((o) => o.origin === window.location.origin);
    if (local) {
      for (const { name, value } of local.localStorage) {
        window.localStorage.setItem(name, value);
      }
    }
  }, storageState.origins);

  await dpage.goto("http://localhost:3000/dashboard/editor");
  await dpage.waitForSelector("text=Editor Undangan");
  await shot(dpage, "12-editor-splitview-desktop");

  await dpage.goto("http://localhost:3000/rian-sari");
  await dpage.waitForSelector("text=RSVP");
  await shot(dpage, "13-public-invitation-desktop");

  const mobilePublic = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const ppage = await mobilePublic.newPage();
  ppage.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      consoleIssues.push(`[${msg.type()}] ${ppage.url()} :: ${msg.text()}`);
    }
  });
  await ppage.goto("http://localhost:3000/rian-sari");
  await ppage.waitForSelector("text=RSVP");
  await shot(ppage, "14-public-invitation-mobile");

  await browser.close();

  console.log("\n=== CONSOLE ISSUES ===");
  if (consoleIssues.length === 0) {
    console.log("(tidak ada error/warning console)");
  } else {
    for (const issue of consoleIssues) console.log(issue);
  }
}

main().catch((err) => {
  console.error("VERIFY FAILED:", err);
  process.exit(1);
});
