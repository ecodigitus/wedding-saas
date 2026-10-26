import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const DOMAIN = process.env.DOMAIN_URL ?? "https://demo.ecodigitus.com";

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`ok: ${msg}`);
}

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${DOMAIN}/login`);
  await page.fill('input[name="email"]', "a11y-check@example.com");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  // Kelola Tamu butuh event dulu (bukan cuma event punya paket aktif) — buat
  // & publish dulu sebelum ke halaman guests, supaya tidak kena empty-state
  // "Belum ada undangan" duluan.
  await page.goto(`${DOMAIN}/dashboard/editor`);
  await page.waitForSelector("text=Editor Undangan", { timeout: 15000 });
  await page.fill('input[name="partner1_name"]', "A11yA");
  await page.fill('input[name="partner2_name"]', "A11yB");
  await page.fill('input[name="event_date"]', "2027-08-01");
  await page.fill('textarea[name="lokasi"]', "Lokasi Test A11y");
  await page.click("button:has-text('Publish')");
  await page.waitForSelector("text=Undangan berhasil dipublish!", { timeout: 15000 });

  await page.goto(`${DOMAIN}/dashboard`);
  await page.waitForSelector('a[target="_blank"]');
  const slugHref = await page.getAttribute('a[target="_blank"]', "href");
  const slug = slugHref.replace(/^\//, "");

  await page.goto(`${DOMAIN}/dashboard/guests`);
  await page.waitForSelector('button:has-text("Tambah Tamu")', { timeout: 15000 });

  const guestName = `A11y Guest ${Math.random().toString(36).slice(2, 6)}`;
  await page.fill('input[name="name"]', guestName);
  await page.click('button:has-text("Tambah Tamu")');
  await page.waitForSelector(`text=${guestName}`, { timeout: 15000 });

  const row = page.locator("tr", { hasText: guestName });

  // Cek fix aria-label input max_pax (baru ada elemennya setelah 1 tamu ditambah)
  const maxPaxLabel = await row.locator("input[type='number']").getAttribute("aria-label");
  assert(!!maxPaxLabel, `input max_pax punya aria-label di domain (aktual: "${maxPaxLabel}")`);
  await row.locator('button[aria-label^="Lihat QR"]').click();
  await page.waitForSelector('button[aria-label="Tutup"]', { timeout: 10000 });

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  assert(results.violations.length === 0, `0 axe violations dengan modal QR terbuka di domain (aktual: ${results.violations.length})`);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const stillOpen = await page.locator('button[aria-label="Tutup"]').isVisible().catch(() => false);
  assert(!stillOpen, "modal QR tertutup dengan Escape di domain");

  // Cleanup tamu test di sini juga (sebelum `page` dipindah ke halaman lain)
  await row.locator('button[aria-label^="Hapus"]').click();
  await page.waitForSelector(`text=${guestName}`, { state: "detached", timeout: 5000 }).catch(() => {});

  // Cek aria-pressed di halaman publik (Hadir/Tidak Hadir)
  const publicPage = await browser.newPage();
  await publicPage.goto(`${DOMAIN}/${slug}`);
  await publicPage.waitForSelector("text=RSVP", { timeout: 15000 });
  await publicPage.click("button:has-text('Hadir')");
  const ariaPressed = await publicPage.getAttribute("button:has-text('Hadir')", "aria-pressed");
  assert(ariaPressed === "true", `tombol Hadir punya aria-pressed="true" setelah diklik di domain (aktual: ${ariaPressed})`);

  await browser.close();
  console.log(`\nSEMUA VERIFIKASI A11Y DI DOMAIN LOLOS. slug test: ${slug}`);
}

main().catch((err) => {
  console.error("VERIFICATION FAILED:", err.message);
  process.exit(1);
});
