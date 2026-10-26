import { chromium } from "playwright";

const BASE = process.env.DOMAIN_URL ?? "http://localhost:3000";
const API_BASE = process.env.API_URL ?? "http://localhost:8000";
const email = process.argv[2];
const token = process.argv[3];
const password = "password123";

if (!email || !token) {
  console.error("Usage: node verify-bt05-checkin-counter.mjs <email-premium> <invite-token>");
  process.exit(1);
}

const errors = [];

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext();
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

  const accessToken = await page.evaluate(() => localStorage.getItem("wedding_access_token"));

  await page.goto(`${BASE}/dashboard/checkin`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=/\\d+ dari \\d+ tamu sudah check-in/", { timeout: 10000 });
  const before = await page.locator("text=/\\d+ dari \\d+ tamu sudah check-in/").innerText();
  if (!before.startsWith("0 dari 4")) errors.push(`Counter awal harusnya '0 dari 4 ...', dapat: "${before}"`);
  console.log(`PASS: counter awal "${before}"`);

  // Simulasikan scan sukses via panggilan API langsung (kamera tidak bisa
  // dites headless tanpa fake device) — endpoint yang sama dipakai handleScanned.
  const checkinRes = await page.evaluate(
    async ({ apiBase, tok, accessToken }) => {
      const res = await fetch(`${apiBase}/guests/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ token: tok }),
      });
      return { status: res.status, body: await res.json() };
    },
    { apiBase: API_BASE, tok: token, accessToken }
  );
  if (checkinRes.status !== 200) errors.push(`Check-in API gagal: ${JSON.stringify(checkinRes)}`);
  console.log("PASS: check-in via API berhasil (simulasi hasil scan QR)");

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("text=/\\d+ dari \\d+ tamu sudah check-in/", { timeout: 10000 });
  const after = await page.locator("text=/\\d+ dari \\d+ tamu sudah check-in/").innerText();
  if (!after.startsWith("1 dari 4")) errors.push(`Counter sesudah check-in harusnya '1 dari 4 ...', dapat: "${after}"`);
  console.log(`PASS: counter setelah reload "${after}"`);

  await browser.close();
}

main()
  .then(() => {
    if (errors.length) {
      console.error("ERRORS:", errors);
      process.exit(1);
    }
    console.log("ALL CHECKS (stage 3, check-in counter) PASSED");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
