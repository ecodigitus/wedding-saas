// Regresi Fase 1 (editor, halaman publik, RSVP anonim, buku tamu, export
// CSV) langsung ke URL STAGING sungguhan — ditulis setelah ketahuan bug
// NEXT_PUBLIC_API_URL kosong sejak deploy pertama, yang berarti fitur Fase 1
// juga berpotensi tidak pernah benar-benar teruji lewat browser asli ke
// staging (verify-browser.mjs versi lama cuma nembak localhost).
import { chromium } from "playwright";
import fs from "node:fs";

const STAGING_URL = process.env.STAGING_URL ?? "http://15.232.71.64:3000";
const OUT_DIR = "./verify-screenshots";
fs.mkdirSync(OUT_DIR, { recursive: true });

const consoleIssues = [];

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`ok: ${msg}`);
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: true });
}

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      consoleIssues.push(`[${msg.type()}] ${page.url()} :: ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => consoleIssues.push(`[pageerror] ${page.url()} :: ${err.message}`));

  const rand = Math.random().toString(36).slice(2, 8);
  const email = `staging-fase1-${rand}@example.com`;

  // --- Landing + register ---
  await page.goto(`${STAGING_URL}/`);
  await page.waitForSelector("text=Wedding SaaS", { timeout: 15000 });
  assert(true, "landing page staging render");

  await page.goto(`${STAGING_URL}/register`);
  await page.fill('input[name="full_name"]', "Staging Fase1 Check");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  assert(true, "register via staging berhasil");

  // --- Editor: create + publish ---
  await page.click('a[href="/dashboard/editor"]');
  await page.waitForURL("**/dashboard/editor");
  await page.fill('input[name="partner1_name"]', "Fase1A");
  await page.fill('input[name="partner2_name"]', "Fase1B");
  await page.fill('input[name="event_date"]', "2027-04-10");
  await page.fill('textarea[name="lokasi"]', "Gedung Test Staging Fase1");
  await page.click("button:has-text('Publish')");
  await page.waitForSelector("text=Undangan berhasil dipublish!", { timeout: 15000 });
  assert(true, "buat & publish event via staging berhasil");

  await page.goto(`${STAGING_URL}/dashboard`);
  await page.waitForSelector('a[target="_blank"]');
  const slugHref = await page.getAttribute('a[target="_blank"]', "href");
  const slug = slugHref.replace(/^\//, "");
  console.log(`slug: ${slug}`);

  // --- Halaman publik: render + RSVP anonim (tanpa guest_token) ---
  const publicPage = await context.newPage();
  publicPage.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      consoleIssues.push(`[${msg.type()}] ${publicPage.url()} :: ${msg.text()}`);
    }
  });
  await publicPage.goto(`${STAGING_URL}/${slug}`);
  await publicPage.waitForSelector("text=RSVP", { timeout: 15000 });
  await shot(publicPage, "s-fase1-01-public-invitation");
  assert(true, "halaman publik staging render (RSVP + buku tamu section ada)");

  await publicPage.fill('input[name="guest_name"]', "Tamu Anonim Staging");
  await publicPage.fill('input[name="jumlah_pax"]', "2");
  await publicPage.click("button:has-text('Hadir')");
  await publicPage.click("button:has-text('Kirim RSVP')");
  await publicPage.waitForSelector("text=Makasih ya", { timeout: 15000 });
  assert(true, "submit RSVP anonim (tanpa link personal) via staging berhasil");

  // --- Buku tamu: submit + tampil ---
  await publicPage.goto(`${STAGING_URL}/${slug}`);
  await publicPage.fill('input[name="nama"]', "Penulis Ucapan Staging");
  await publicPage.fill('textarea[name="pesan"]', "Selamat menempuh hidup baru ya!");
  await publicPage.click("button:has-text('Kirim Ucapan')");
  await publicPage.waitForSelector("text=Penulis Ucapan Staging", { timeout: 15000 });
  assert(true, "submit + tampil ucapan buku tamu via staging berhasil");

  // --- Dashboard: RSVP & buku tamu owner harus lihat data yang baru masuk ---
  await page.goto(`${STAGING_URL}/dashboard/rsvp`);
  await page.waitForSelector("text=Tamu Anonim Staging", { timeout: 15000 });
  assert(true, "dashboard RSVP owner menampilkan submission staging");

  await page.goto(`${STAGING_URL}/dashboard/guestbook`);
  await page.waitForSelector("text=Penulis Ucapan Staging", { timeout: 15000 });
  assert(true, "dashboard buku tamu owner menampilkan ucapan staging");

  // --- Export CSV: pastikan download benar-benar terjadi & tidak kosong ---
  await page.goto(`${STAGING_URL}/dashboard/rsvp`);
  await page.waitForSelector("text=Tamu Anonim Staging");
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 15000 }),
    page.click("button:has-text('Export CSV')"),
  ]);
  const csvPath = await download.path();
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  assert(csvContent.includes("Tamu Anonim Staging"), "export CSV RSVP via staging berisi data yang benar");

  await browser.close();

  console.log("\n=== console issues ===");
  console.log(consoleIssues.length ? consoleIssues.join("\n") : "(tidak ada)");
  console.log(`\nSTAGING FASE 1 REGRESSION LOLOS. email test: ${email}, slug: ${slug}`);
}

main().catch((err) => {
  console.error("VERIFICATION FAILED:", err.message);
  process.exit(1);
});
