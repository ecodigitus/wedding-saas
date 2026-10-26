import { chromium } from "playwright";

const BASE = process.env.DOMAIN_URL ?? "http://localhost:3000";
const email = process.argv[2];
const password = "password123";

if (!email) {
  console.error("Usage: node verify-bt05-premium.mjs <email-sudah-premium>");
  process.exit(1);
}

const errors = [];

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const page = await context.newPage();
  page.on("pageerror", (err) => errors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 10000 });

  await page.goto(`${BASE}/dashboard/guests`, { waitUntil: "networkidle" });

  async function addGuest(name, category) {
    await page.fill('input[name="name"]', name);
    if (category) await page.fill('input[name="category"]', category);
    await page.fill('input[name="max_pax"]', "1");
    await page.click('button:has-text("Tambah Tamu")');
    await page.waitForTimeout(400);
  }

  await addGuest("Budi VIP", "VIP");
  await addGuest("Ani VIP", "VIP");
  await addGuest("Citra Keluarga", "Keluarga");
  await addGuest("Dedi Tanpa Kategori", "");
  console.log("PASS: 4 tamu ditambahkan (2 VIP, 1 Keluarga, 1 tanpa kategori)");

  await page.waitForSelector("text=Ringkasan per Kategori", { timeout: 10000 });
  const vipRow = await page.locator("tr", { hasText: "VIP" }).first().innerText();
  if (!vipRow.includes("2")) errors.push(`Ringkasan VIP harusnya 2 tamu, dapat: "${vipRow}"`);
  console.log("PASS: ringkasan kategori menampilkan VIP: 2 tamu");

  const noCategoryRow = await page.locator("tr", { hasText: "Tanpa kategori" }).first().innerText();
  if (!noCategoryRow.includes("1")) errors.push(`Ringkasan Tanpa kategori harusnya 1 tamu, dapat: "${noCategoryRow}"`);
  console.log("PASS: ringkasan kategori menampilkan Tanpa kategori: 1 tamu");

  const totalRow = await page.locator("tr", { hasText: "Total" }).first().innerText();
  if (!totalRow.includes("4")) errors.push(`Total harusnya 4 tamu, dapat: "${totalRow}"`);
  console.log("PASS: total ringkasan 4 tamu");

  // Test filter kategori
  await page.selectOption("#category_filter", "VIP");
  await page.waitForTimeout(300);
  const rowsAfterFilter = await page.locator("table").nth(1).locator("tbody tr").count();
  if (rowsAfterFilter !== 2) errors.push(`Filter VIP harusnya menampilkan 2 baris, dapat ${rowsAfterFilter}`);
  console.log(`PASS: filter kategori VIP menampilkan ${rowsAfterFilter} baris`);

  await page.selectOption("#category_filter", "");
  await page.waitForTimeout(300);
  const rowsAfterReset = await page.locator("table").nth(1).locator("tbody tr").count();
  if (rowsAfterReset !== 4) errors.push(`Reset filter harusnya menampilkan 4 baris, dapat ${rowsAfterReset}`);
  console.log(`PASS: reset filter menampilkan ${rowsAfterReset} baris`);

  // Ambil invite_token salah satu tamu (Budi VIP) buat simulasi check-in
  const copyBtn = page
    .locator("tr", { hasText: "Budi VIP" })
    .locator('button:has-text("Copy link")')
    .first();
  await copyBtn.click();
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  const token = new URL(clipboardText).searchParams.get("g");
  if (!token) errors.push("Tidak bisa ambil invite_token dari link Budi VIP");

  await browser.close();
  console.log(`TOKEN_FOR_CHECKIN=${token}`);
}

main()
  .then(() => {
    if (errors.length) {
      console.error("ERRORS:", errors);
      process.exit(1);
    }
    console.log("ALL CHECKS (stage 2) PASSED");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
