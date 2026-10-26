// Beda dari verify-*.mjs lain: script ini nembak URL STAGING sungguhan
// (bukan localhost) lewat browser asli. Wajib dijalankan setelah setiap
// deploy frontend — smoke test via curl saja TIDAK bisa mendeteksi bug
// NEXT_PUBLIC_API_URL kosong (lihat README.md § Deploy ke staging), karena
// curl tidak menjalankan JS di browser tamu.
import { chromium } from "playwright";

const STAGING_URL = process.env.STAGING_URL ?? "http://15.232.71.64:3000";

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`ok: ${msg}`);
}

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();
  const failedRequests = [];
  page.on("requestfailed", (req) => failedRequests.push(`${req.method()} ${req.url()}`));

  const rand = Math.random().toString(36).slice(2, 8);
  const email = `staging-check-${rand}@example.com`;

  await page.goto(`${STAGING_URL}/register`);
  await page.fill('input[name="full_name"]', "Staging Check");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');

  // Kalau NEXT_PUBLIC_API_URL salah/kosong, ini akan timeout menunggu
  // redirect ke /dashboard yang tidak pernah terjadi, dan pesan error di
  // halaman akan berbunyi "Terjadi kesalahan..." (lihat error di bawah).
  try {
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  } catch {
    const errorText = await page.locator("text=/kesalahan|salah|gagal/i").first().textContent().catch(() => null);
    throw new Error(
      `Register via ${STAGING_URL} gagal redirect ke /dashboard. ` +
        `Pesan di halaman: "${errorText}". ` +
        `Kemungkinan NEXT_PUBLIC_API_URL salah saat build frontend — cek README.md § Deploy ke staging.`
    );
  }
  assert(true, `register via ${STAGING_URL} sukses, redirect ke /dashboard`);

  await page.goto(`${STAGING_URL}/dashboard/billing`);
  await page.waitForSelector("text=Upgrade ke Premium", { timeout: 10000 });
  assert(true, "halaman billing bisa fetch status dari backend (bukan stuck di 'Memuat...')");

  if (failedRequests.length) {
    console.log("\n=== failed network requests ===");
    failedRequests.forEach((r) => console.log(r));
  }

  await browser.close();
  console.log("\nSTAGING SMOKE TEST LOLOS — frontend berhasil bicara ke backend lewat browser sungguhan.");
}

main().catch((err) => {
  console.error("VERIFICATION FAILED:", err.message);
  process.exit(1);
});
