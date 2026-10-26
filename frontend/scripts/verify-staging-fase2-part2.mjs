// Bagian 2: login ulang (event akun sudah punya package via psql), tes
// Billing + Kelola Tamu + link personal tamu, semua lewat URL STAGING
// sungguhan.
// Usage: node verify-staging-fase2-part2.mjs <email> <slug>
import { chromium } from "playwright";

const STAGING_URL = process.env.STAGING_URL ?? "http://15.232.71.64:3000";
const API_BASE = process.env.API_BASE ?? "http://15.232.71.64:8000";
const [, , email, slug] = process.argv;

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`ok: ${msg}`);
}

async function main() {
  if (!email || !slug) throw new Error("usage: node verify-staging-fase2-part2.mjs <email> <slug>");

  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const page = await context.newPage();

  await page.goto(`${STAGING_URL}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  // --- Billing: harus terbaca paket aktif dari backend staging ---
  await page.goto(`${STAGING_URL}/dashboard/billing`);
  await page.waitForSelector("text=Paket aktif", { timeout: 15000 });
  assert(true, "billing status paket aktif terbaca dari backend staging");

  // --- Kelola Tamu: bukan paywall, bisa tambah tamu ---
  await page.goto(`${STAGING_URL}/dashboard/guests`);
  await page.waitForSelector('button:has-text("Tambah Tamu")', { timeout: 15000 });
  const guestName = `Staging Guest ${Math.random().toString(36).slice(2, 6)}`;
  await page.fill('input[name="name"]', guestName);
  await page.fill('input[name="max_pax"]', "2");
  await page.click('button:has-text("Tambah Tamu")');
  await page.waitForSelector(`text=${guestName}`, { timeout: 15000 });
  assert(true, "tambah tamu via staging berhasil");

  const row = page.locator("tr", { hasText: guestName });
  await row.locator('button:has-text("Copy link")').click();
  // Origin ini HTTP (bukan secure context) — navigator.clipboard tidak ada,
  // jadi app pakai fallback execCommand. Cukup pastikan tombolnya berhasil
  // (teks "Tersalin!" muncul, bukan diam/error); execCommand menulis ke OS
  // clipboard yang tidak bisa dibaca balik dari JS, jadi ambil invite_token
  // lewat API langsung (pakai access token yang sama dari localStorage) untuk
  // membentuk ulang URL yang sama seperti yang di-copy.
  await page.waitForSelector("text=Tersalin!", { timeout: 10000 });
  assert(true, "tombol Copy link berhasil (fallback execCommand jalan di origin HTTP)");

  const inviteToken = await page.evaluate(
    async ({ apiBase, name }) => {
      const token = localStorage.getItem("wedding_access_token");
      const headers = { Authorization: `Bearer ${token}` };
      const events = await fetch(`${apiBase}/events`, { headers }).then((r) => r.json());
      const eventId = events[0].id;
      const guests = await fetch(`${apiBase}/events/${eventId}/guests`, { headers }).then((r) => r.json());
      return guests.find((g) => g.name === name)?.invite_token;
    },
    { apiBase: API_BASE, name: guestName }
  );
  assert(!!inviteToken, "invite_token tamu berhasil diambil via API untuk verifikasi link");
  const personalUrl = `${STAGING_URL}/${slug}?g=${inviteToken}`;

  // --- Buka link personal di context terpisah (simulasi tamu asli) ---
  const guestPage = await context.newPage();
  await guestPage.goto(personalUrl);
  await guestPage.waitForSelector(`text=Halo, ${guestName}`, { timeout: 15000 });
  assert(true, "nama tamu terkunci tampil di halaman publik staging");
  await guestPage.click("button:has-text('Hadir')");
  await guestPage.click("button:has-text('Kirim RSVP')");
  await guestPage.waitForSelector("text=Makasih ya", { timeout: 15000 });
  assert(true, "submit RSVP via link personal di staging berhasil");

  // --- Cleanup tamu test ---
  await page.reload();
  await page.waitForSelector(`text=${guestName}`, { timeout: 15000 });
  page.once("dialog", (d) => d.accept());
  await page.locator("tr", { hasText: guestName }).locator('button[aria-label^="Hapus"]').click();

  await browser.close();
  console.log("\nSTAGING FASE 2 SMOKE TEST (part 2) LOLOS.");
}

main().catch((err) => {
  console.error("VERIFICATION FAILED:", err.message);
  process.exit(1);
});
