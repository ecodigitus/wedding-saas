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
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      consoleIssues.push(`[${msg.type()}] ${page.url()} :: ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => consoleIssues.push(`[pageerror] ${page.url()} :: ${err.message}`));

  const rand = Math.random().toString(36).slice(2, 8);
  const email = `verify2-${rand}@example.com`;

  await page.goto("http://localhost:3000/register");
  await page.fill("input[name=full_name]", "Verifier Dua");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", "password123");
  await page.click("button[type=submit]");
  await page.waitForURL("**/dashboard");

  await page.click('a[href="/dashboard/editor"]');
  await page.waitForURL("**/dashboard/editor");
  await page.fill('input[name="partner1_name"]', "Dewi");
  await page.fill('input[name="partner2_name"]', "Rangga");
  await page.fill('input[name="event_date"]', "2027-01-15");
  await page.fill('textarea[name="lokasi"]', "Taman Mini, Jakarta Timur");
  await page.click("button:has-text('Publish')");
  await page.waitForSelector("text=Undangan berhasil dipublish!");

  await page.goto("http://localhost:3000/dashboard");
  await page.waitForSelector("text=Dewi");
  await shot(page, "19-dashboard-after-publish-debug");
  const slugHref = await page.getAttribute('a[target="_blank"]', "href");
  const slug = slugHref.replace(/^\//, "");
  console.log("published slug:", slug);

  // --- Submit RSVP lewat halaman publik ---
  await page.goto(`http://localhost:3000/${slug}`);
  await page.waitForSelector("text=RSVP");
  await page.fill('input[name="guest_name"]', "Tamu Playwright");
  await page.fill('input[name="jumlah_pax"]', "3");
  await page.click("button:has-text('Hadir')");
  await page.click("button:has-text('Kirim RSVP')");
  await page.waitForSelector("text=Makasih ya udah konfirmasi");
  await shot(page, "20-public-rsvp-submitted");

  // --- Submit ucapan buku tamu lewat halaman publik ---
  await page.fill('input[name="nama"]', "Tamu Playwright");
  await page.fill('textarea[name="pesan"]', "Selamat menempuh hidup baru! <b>xss-test</b>");
  await page.click("button:has-text('Kirim Ucapan')");
  await page.waitForSelector("text=Selamat menempuh hidup baru");
  await shot(page, "21-public-guestbook-submitted");

  const guestbookHtml = await page.content();
  const hasRawTag = guestbookHtml.includes("<b>xss-test</b>");
  console.log("Guestbook masih punya tag <b> mentah (harus false):", hasRawTag);

  // --- Cek dashboard RSVP & guestbook menampilkan data baru ---
  await page.goto("http://localhost:3000/dashboard/rsvp");
  await page.waitForSelector("text=Tamu Playwright");
  await shot(page, "22-dashboard-rsvp-filled");

  await page.goto("http://localhost:3000/dashboard/guestbook");
  await page.waitForSelector("text=Selamat menempuh hidup baru");
  await shot(page, "23-dashboard-guestbook-filled");

  // --- Test export CSV benar-benar men-trigger download ---
  await page.goto("http://localhost:3000/dashboard/rsvp");
  await page.waitForSelector("text=Tamu Playwright");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click("button:has-text('Export CSV')"),
  ]);
  const csvPath = await download.path();
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  console.log("CSV export filename:", download.suggestedFilename());
  console.log("CSV export content:\n", csvContent);

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
