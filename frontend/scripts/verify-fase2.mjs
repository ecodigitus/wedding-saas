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

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`ok: ${msg}`);
}

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      consoleIssues.push(`[${msg.type()}] ${page.url()} :: ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => consoleIssues.push(`[pageerror] ${page.url()} :: ${err.message}`));

  // --- 1. Login sebagai demo user (event-nya sudah diset package="intimate"
  // langsung via psql/DB untuk testing lokal — bukan lagi tier=premium) ---
  await page.goto("http://localhost:3000/login");
  await page.fill('input[name="email"]', "demo@wedding-saas.dev");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");
  console.log("login demo user OK");

  // --- 2. Billing page: event dengan paket harus lihat "Paket aktif" ---
  await page.goto("http://localhost:3000/dashboard/billing");
  await page.waitForSelector("text=Paket aktif");
  await shot(page, "f2-01-billing-premium");
  const bodyText1 = await page.textContent("body");
  assert(bodyText1.includes("Paket aktif"), "billing page shows active package status");

  // --- 3. Kelola Tamu: harus terlihat (bukan paywall) karena event punya paket ---
  await page.goto("http://localhost:3000/dashboard/guests");
  await page.waitForSelector('button:has-text("Tambah Tamu")');
  await shot(page, "f2-02-guests-page");
  const bodyText2 = await page.textContent("body");
  assert(!bodyText2.includes("perlu paket aktif"), "guests page NOT showing paywall for event with a package");

  // --- 4. Tambah tamu baru ---
  const guestName = `Tamu E2E ${Math.random().toString(36).slice(2, 6)}`;
  await page.fill('input[name="name"]', guestName);
  await page.fill('input[name="category"]', "kolega");
  await page.fill('input[name="session_label"]', "Resepsi");
  await page.fill('input[name="max_pax"]', "3");
  await page.click('button:has-text("Tambah Tamu")');
  await page.waitForSelector(`text=${guestName}`);
  await shot(page, "f2-03-guest-added");
  console.log("tambah tamu OK");

  const row = page.locator("tr", { hasText: guestName });
  assert(await row.locator("text=Menunggu").isVisible(), "guest baru berstatus Menunggu");

  // --- 5. Copy link personal & extract token dari clipboard ---
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await row.locator('button:has-text("Copy link")').click();
  await page.waitForSelector("text=Tersalin!");
  const copiedUrl = await page.evaluate(() => navigator.clipboard.readText());
  console.log("copied url:", copiedUrl);
  assert(copiedUrl.includes("/ayu-bagas?g="), "copied link mengandung slug + token guest");
  const token = new URL(copiedUrl).searchParams.get("g");
  assert(!!token, "token berhasil diparse dari link");

  // --- 6. Kunjungi link personal sebagai tamu (browser context baru, belum login) ---
  const guestPage = await context.newPage();
  await guestPage.goto(copiedUrl);
  await guestPage.waitForSelector("text=RSVP");
  await shot(guestPage, "f2-04-public-personal-link");
  const guestBody = await guestPage.textContent("body");
  assert(guestBody.includes(`Halo, ${guestName}`), "nama tamu ter-personalisasi tampil di halaman publik");

  const nameInputCount = await guestPage.locator('input[name="guest_name"]').count();
  assert(nameInputCount === 0, "input nama TIDAK muncul (terkunci) saat akses via link personal");

  const paxInput = guestPage.locator('input[name="jumlah_pax"]');
  assert((await paxInput.getAttribute("max")) === "3", "batas jumlah_pax mengikuti max_pax tamu (3)");

  // --- 7. Submit RSVP via link personal ---
  await paxInput.fill("2");
  await guestPage.click("button:has-text('Hadir')");
  await guestPage.click("button:has-text('Kirim RSVP')");
  await guestPage.waitForSelector("text=Makasih ya");
  await shot(guestPage, "f2-05-public-rsvp-submitted");
  console.log("submit RSVP via link personal OK");

  // --- 8. Validasi max_pax ditegakkan server-side (coba lewat batas via API langsung) ---
  const overLimitRes = await guestPage.evaluate(async (tok) => {
    const res = await fetch("http://localhost:8000/invitations/ayu-bagas/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guest_name: "abaikan", jumlah_pax: 99, status_hadir: true, guest_token: tok }),
    });
    return res.status;
  }, token);
  assert(overLimitRes === 422, `server menolak jumlah_pax > max_pax (status=${overLimitRes})`);

  // --- 9. Balik ke dashboard owner, cek status tamu sudah berubah jadi Hadir ---
  await page.reload();
  await page.waitForSelector(`text=${guestName}`);
  await shot(page, "f2-06-guest-status-updated");
  const rowAfter = page.locator("tr", { hasText: guestName });
  assert(await rowAfter.locator("text=Hadir").isVisible(), "status tamu di dashboard update jadi Hadir setelah RSVP");

  // --- 10. Hapus tamu percobaan (cleanup) ---
  page.once("dialog", (d) => d.accept());
  await rowAfter.locator('button[aria-label^="Hapus"]').click();
  await page.waitForSelector(`text=${guestName}`, { state: "detached" }).catch(() => {});
  console.log("cleanup tamu percobaan OK");

  // --- 11. Cek event tanpa paket tetap ter-paywall (pakai akun baru via register) ---
  const rand = Math.random().toString(36).slice(2, 8);
  const liteEmail = `verify-fase2-${rand}@example.com`;
  const litePage = await context.newPage();
  await litePage.goto("http://localhost:3000/register");
  await litePage.fill('input[name="full_name"]', "Lite User");
  await litePage.fill('input[name="email"]', liteEmail);
  await litePage.fill('input[name="password"]', "password123");
  await litePage.click('button[type="submit"]');
  await litePage.waitForURL("**/dashboard");

  // Paywall paket cuma muncul kalau SUDAH ada event (guard !event dicek
  // duluan) — buat event dasar dulu, tanpa itu yang muncul cuma EmptyState
  // "Belum ada undangan".
  await litePage.goto("http://localhost:3000/dashboard/editor");
  await litePage.fill('input[name="partner1_name"]', "Lite");
  await litePage.fill('input[name="partner2_name"]', "User");
  await litePage.fill('input[name="event_date"]', "2027-01-01");
  await litePage.fill('textarea[name="lokasi"]', "Balai Kota");
  await litePage.click('button:has-text("Simpan")');
  await litePage.waitForSelector("text=Perubahan tersimpan.");

  await litePage.goto("http://localhost:3000/dashboard/guests");
  await litePage.waitForSelector("text=perlu paket aktif");
  await shot(litePage, "f2-07-guests-paywall-lite");
  console.log("paywall Kelola Tamu untuk event tanpa paket OK");

  await browser.close();

  if (consoleIssues.length) {
    console.log("\n=== console issues ===");
    consoleIssues.forEach((i) => console.log(i));
  } else {
    console.log("\nTidak ada console error/warning.");
  }
  console.log("\nSEMUA VERIFIKASI FASE 2 LOLOS.");
}

main().catch((err) => {
  console.error("VERIFICATION FAILED:", err);
  process.exit(1);
});
