import { chromium } from "playwright";

const DOMAIN = process.env.DOMAIN_URL ?? "https://demo.ecodigitus.com";

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`ok: ${msg}`);
}

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();

  const rand = Math.random().toString(36).slice(2, 8);
  const email = `waktu-akad-check-${rand}@example.com`;

  await page.goto(`${DOMAIN}/register`);
  await page.fill('input[name="full_name"]', "Waktu Akad Check");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  await page.goto(`${DOMAIN}/dashboard/editor`);
  await page.waitForSelector("text=Editor Undangan", { timeout: 15000 });

  const akadType = await page.getAttribute('input[name="waktu_akad"]', "type");
  assert(akadType === "time", `input waktu_akad type="time" di domain (aktual: ${akadType})`);

  await page.fill('input[name="partner1_name"]', "DomainWaktuA");
  await page.fill('input[name="partner2_name"]', "DomainWaktuB");
  await page.fill('input[name="event_date"]', "2027-07-20");
  await page.fill('input[name="waktu_akad"]', "09:00");
  await page.fill('input[name="waktu_resepsi"]', "13:30");
  await page.fill('textarea[name="lokasi"]', "Lokasi Test Domain Waktu Akad");
  await page.waitForTimeout(300);

  const bodyText = await page.textContent("body");
  assert(bodyText.includes("09.00") && bodyText.includes("13.30"), "preview jam benar di domain");

  await page.click("button:has-text('Simpan')");
  await page.waitForSelector("text=Perubahan tersimpan.", { timeout: 10000 });
  assert(true, "simpan berhasil via domain HTTPS");

  await page.reload();
  await page.waitForSelector("text=Editor Undangan", { timeout: 10000 });
  const akadAfterReload = await page.inputValue('input[name="waktu_akad"]');
  const resepsiAfterReload = await page.inputValue('input[name="waktu_resepsi"]');
  assert(akadAfterReload === "09:00", `waktu_akad tetap benar setelah reload di domain (aktual: ${akadAfterReload})`);
  assert(
    resepsiAfterReload === "13:30",
    `waktu_resepsi tetap benar setelah reload di domain (aktual: ${resepsiAfterReload})`
  );

  await browser.close();
  console.log("\nVERIFIKASI FIX WAKTU AKAD DI DOMAIN LOLOS. email test:", email);
}

main().catch((err) => {
  console.error("VERIFICATION FAILED:", err.message);
  process.exit(1);
});
