import { chromium } from "playwright";
import fs from "node:fs";

const OUT_DIR = "./verify-screenshots";
fs.mkdirSync(OUT_DIR, { recursive: true });

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`ok: ${msg}`);
}

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();

  await page.goto("http://localhost:3000/login");
  await page.fill('input[name="email"]', "demo@wedding-saas.dev");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");

  await page.goto("http://localhost:3000/dashboard/editor");
  await page.waitForSelector("text=Editor Undangan");

  // Input type harus "time", bukan "datetime-local" lagi
  const akadType = await page.getAttribute('input[name="waktu_akad"]', "type");
  const resepsiType = await page.getAttribute('input[name="waktu_resepsi"]', "type");
  assert(akadType === "time", `input waktu_akad type="time" (aktual: ${akadType})`);
  assert(resepsiType === "time", `input waktu_resepsi type="time" (aktual: ${resepsiType})`);

  await page.fill('input[name="event_date"]', "2027-06-15");
  await page.fill('input[name="waktu_akad"]', "08:30");
  await page.fill('input[name="waktu_resepsi"]', "11:00");
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT_DIR}/waktu-akad-fix-form.png` });

  // Preview harus tampilkan jam yang benar (bukan NaN/kosong)
  const bodyText = await page.textContent("body");
  assert(bodyText.includes("08.30"), "preview tampilkan jam akad yang benar (08.30)");
  assert(bodyText.includes("11.00"), "preview tampilkan jam resepsi yang benar (11.00)");
  assert(!bodyText.includes("Invalid Date") && !bodyText.includes("NaN"), "tidak ada Invalid Date/NaN di preview");

  await page.click("button:has-text('Simpan')");
  await page.waitForSelector("text=Perubahan tersimpan.", { timeout: 10000 });
  assert(true, "simpan berhasil (backend menerima datetime gabungan)");

  // Reload halaman, pastikan jam yang sama muncul lagi setelah dimuat ulang
  // dari server (bukan cuma state form lokal)
  await page.reload();
  await page.waitForSelector("text=Editor Undangan");
  const akadValueAfterReload = await page.inputValue('input[name="waktu_akad"]');
  const resepsiValueAfterReload = await page.inputValue('input[name="waktu_resepsi"]');
  assert(akadValueAfterReload === "08:30", `waktu_akad tetap "08:30" setelah reload (aktual: ${akadValueAfterReload})`);
  assert(
    resepsiValueAfterReload === "11:00",
    `waktu_resepsi tetap "11:00" setelah reload (aktual: ${resepsiValueAfterReload})`
  );

  await browser.close();
  console.log("\nSEMUA VERIFIKASI FIX WAKTU AKAD/RESEPSI LOLOS.");
}

main().catch((err) => {
  console.error("VERIFICATION FAILED:", err.message);
  process.exit(1);
});
