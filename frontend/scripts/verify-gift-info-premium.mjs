import { chromium } from "playwright";

const BASE = process.env.DOMAIN_URL ?? "http://localhost:3000";
const email = process.argv[2];
const password = "password123";

if (!email) {
  console.error("Usage: node verify-gift-info-premium.mjs <email-sudah-premium>");
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

  await page.goto(`${BASE}/dashboard/editor`, { waitUntil: "networkidle" });

  const bankInputVisible = await page.locator('input[name="bank_name"]').count();
  if (bankInputVisible !== 1) errors.push("Input bank_name tidak muncul untuk event dengan add-on amplop_digital");
  console.log("PASS: event dengan add-on amplop_digital menampilkan form Amplop Digital");

  await page.fill('input[name="bank_name"]', "BCA");
  await page.fill('input[name="bank_account_number"]', "1234567890");
  await page.fill('input[name="bank_account_holder"]', "Budi Santoso");
  await page.fill('input[name="ewallet_name"]', "GoPay");
  await page.fill('input[name="ewallet_number"]', "081234567890");
  await page.fill('input[name="ewallet_account_holder"]', "Budi Santoso");
  await page.click('button:has-text("Simpan Amplop Digital")');
  await page.waitForSelector("text=Info Amplop Digital tersimpan.", { timeout: 10000 });
  console.log("PASS: Amplop Digital tersimpan");

  // Publish dulu (kalau belum) supaya halaman publik bisa diakses
  const publishBtn = page.locator('button:has-text("Publish")');
  if ((await publishBtn.count()) > 0) {
    await publishBtn.click();
    await page.waitForSelector("text=Undangan berhasil dipublish!", { timeout: 10000 });
  }

  // Cek section Kirim Hadiah muncul di preview editor
  const previewHasKirimHadiah = await page.locator("text=Kirim Hadiah").count();
  if (previewHasKirimHadiah < 1) errors.push("Section Kirim Hadiah tidak muncul di preview editor");
  console.log("PASS: preview editor menampilkan section Kirim Hadiah");

  await browser.close();
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
