import { chromium } from "playwright";

const BASE = process.env.DOMAIN_URL ?? "http://localhost:3000";
const slug = process.argv[2];

if (!slug) {
  console.error("Usage: node verify-gift-info-public.mjs <slug>");
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

  await page.goto(`${BASE}/${slug}`, { waitUntil: "networkidle" });

  const heading = await page.locator("text=Kirim Hadiah").count();
  if (heading < 1) errors.push("Section Kirim Hadiah tidak muncul di halaman publik");
  console.log("PASS: halaman publik menampilkan section Kirim Hadiah");

  const bankNumberVisible = await page.locator("text=1234567890").count();
  if (bankNumberVisible < 1) errors.push("Nomor rekening bank tidak tampil");
  const bankHolderVisible = await page.locator("text=a.n. Budi Santoso").count();
  if (bankHolderVisible < 1) errors.push("Nama pemilik rekening tidak tampil");
  const ewalletNumberVisible = await page.locator("text=081234567890").count();
  if (ewalletNumberVisible < 1) errors.push("Nomor e-wallet tidak tampil");
  console.log("PASS: detail rekening bank & e-wallet tampil lengkap");

  // Klik tombol salin nomor rekening bank pertama, cek clipboard
  const copyButtons = page.locator('button[aria-label^="Salin nomor"]');
  const count = await copyButtons.count();
  if (count < 2) errors.push(`Tombol salin harusnya ada 2 (bank + e-wallet), ditemukan ${count}`);

  await copyButtons.first().click();
  await page.waitForTimeout(300);
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  if (clipboardText !== "1234567890") {
    errors.push(`Clipboard seharusnya "1234567890", didapat "${clipboardText}"`);
  } else {
    console.log("PASS: tombol salin nomor rekening berfungsi, clipboard berisi nomor yang benar");
  }

  const copiedLabel = await page.locator("text=Tersalin!").count();
  if (copiedLabel < 1) errors.push('Label tombol tidak berubah jadi "Tersalin!" setelah klik');
  console.log("PASS: feedback visual \"Tersalin!\" muncul");

  await browser.close();
}

main()
  .then(() => {
    if (errors.length) {
      console.error("ERRORS:", errors);
      process.exit(1);
    }
    console.log("ALL CHECKS (stage 3, public page) PASSED");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
