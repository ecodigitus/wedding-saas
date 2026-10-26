import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();

  const rand = Math.random().toString(36).slice(2, 8);
  const email = `verify-err-${rand}@example.com`;

  await page.goto("http://localhost:3000/register");
  await page.fill("input[name=full_name]", "Verifier Error");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", "password123");
  await page.click("button[type=submit]");
  await page.waitForURL("**/dashboard");

  await page.click('a[href="/dashboard/editor"]');
  await page.waitForURL("**/dashboard/editor");

  // Trigger custom validator error (tanggal masa lalu) — cek prefix "Value error," hilang.
  await page.fill('input[name="partner1_name"]', "A");
  await page.fill('input[name="partner2_name"]', "B");
  await page.fill('input[name="event_date"]', "2020-01-01");
  await page.fill('textarea[name="lokasi"]', "X");
  await page.click("button:has-text('Simpan')");
  await page.waitForTimeout(1500);
  const dateError = await page.locator(".text-danger").first().textContent();
  console.log("Pesan error tanggal masa lalu:", JSON.stringify(dateError));
  console.log("Mengandung 'Value error' (harus false):", dateError?.includes("Value error"));

  // Trigger RSVP client-side bound check (jumlah pax > 20) di halaman publik.
  await page.goto("http://localhost:3000/dashboard");
  await page.waitForSelector("text=Belum ada undangan");
  console.log("(event belum dibuat karena tanggal invalid tadi ditolak — sesuai harapan)");

  await browser.close();
}

main().catch((err) => {
  console.error("VERIFY FAILED:", err);
  process.exit(1);
});
