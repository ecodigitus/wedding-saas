import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";

const TEMPLATE_LABELS = {
  klasik: "Klasik",
  "modern-minimal": "Modern Minimal",
  botanical: "Botanical",
  monokrom: "Elegan Monokrom",
  editorial: "Editorial Modern",
  monogram: "Monogram Elegan",
  "taman-manis": "Taman Manis",
  "burgundy-royal": "Burgundy Royal",
};

const OUT_DIR = "./verify-screenshots";
fs.mkdirSync(OUT_DIR, { recursive: true });
const consoleIssues = [];

async function shot(page, name) {
  const path = `${OUT_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`screenshot: ${path}`);
}

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      consoleIssues.push(`[${msg.type()}] ${page.url()} :: ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => consoleIssues.push(`[pageerror] ${page.url()} :: ${err.message}`));

  const rand = Math.random().toString(36).slice(2, 8);
  const email = `verify-tpl-${rand}@example.com`;

  await page.goto("http://localhost:3000/register");
  await page.fill("input[name=full_name]", "Verifier Template");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", "password123");
  await page.click("button[type=submit]");
  await page.waitForURL("**/dashboard");

  await page.click('a[href="/dashboard/editor"]');
  await page.waitForURL("**/dashboard/editor");
  await page.fill('input[name="partner1_name"]', "Sekar");
  await page.fill('input[name="partner2_name"]', "Wira");
  await page.fill('input[name="event_date"]', "2027-02-14");
  await page.fill('textarea[name="lokasi"]', "Gedung Serba Guna, Bandung");
  await page.fill('input[name="dress_code"]', "Formal");

  // Screenshot picker dengan 6 opsi template (preview swatch baru).
  await shot(page, "tpl-00-picker");

  await page.click("button:has-text('Publish')");
  await page.waitForSelector("text=Undangan berhasil dipublish!");

  await page.goto("http://localhost:3000/dashboard");
  const slugHref = await page.getAttribute('a[target="_blank"]', "href");
  const slug = slugHref.replace(/^\//, "");
  console.log("slug:", slug);

  const desktop = await browser.newContext({ viewport: { width: 800, height: 1000 } });
  const dpage = await desktop.newPage();

  const templates = Object.keys(TEMPLATE_LABELS);
  const axeViolationsByTemplate = {};
  // Gap yang ditemukan setelah Mode Registrasi-Saja (RG-01..07) di-deploy:
  // axe-core di `/r/{slug}` cuma pernah dites dengan palet default (`klasik`)
  // — belum diulang untuk ke-6 palet lain, termasuk `monokrom` (latar gelap)
  // yang paling berisiko karena halaman ini tidak punya chrome undangan
  // sebagai konteks tambahan (styleguide.v2.md §5.7). Ditutup di sini (bukan
  // di verify-registration-mode.mjs) karena harness ganti-template-per-event
  // sudah ada persis di loop ini — menambah 1 axe-scan per iterasi jauh lebih
  // murah daripada membangun ulang harness yang sama di skrip lain.
  const registrationAxeViolationsByTemplate = {};
  for (const tpl of templates) {
    await page.goto("http://localhost:3000/dashboard/editor");
    await page.waitForSelector("text=Editor Undangan");
    await page.click(`button:has-text("${TEMPLATE_LABELS[tpl]}")`);
    await page.click("button:has-text('Simpan')");
    await page.waitForSelector("text=Perubahan tersimpan.");

    await page.goto(`http://localhost:3000/${slug}`);
    await page.waitForSelector("text=RSVP");
    // Tunggu animasi masuk hero (.hero-stage, max delay 0.75s + durasi 0.7s =
    // ~1.45s, lihat globals.css) selesai dulu sebelum screenshot/axe-scan —
    // tanpa ini, scan menangkap elemen di tengah fade (opacity < 1) dan
    // axe-core salah lapor "color-contrast" (bukan bug desain, cuma state
    // transisi sesaat yang otomatis kelar tanpa perlu interaksi apa pun).
    await page.waitForTimeout(1700);
    await shot(page, `tpl-${tpl}-mobile`);

    // Template baru (editorial, monogram) belum pernah di-axe-scan — cek semua
    // sekalian di sini, murah karena halaman sudah dibuka untuk screenshot.
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    axeViolationsByTemplate[tpl] = results.violations.map((v) => v.id);

    // Desktop shot juga per template — penting khusus utk editorial (grid info
    // 2 kolom, rata kiri) & monogram (badge + bingkai sudut), beda struktur
    // dari 4 template lama yang cuma beda warna/font.
    await dpage.goto(`http://localhost:3000/${slug}`);
    await dpage.waitForSelector("text=RSVP");
    await dpage.waitForTimeout(1700);
    await shot(dpage, `tpl-${tpl}-desktop`);

    // Mode Registrasi-Saja (RG-02) — palet sama dipakai lewat `template_id`
    // (styleguide.v2.md §5.7, tidak ada palet baru), jadi cukup toggle mode
    // aktif sesaat lalu axe-scan `/r/{slug}` untuk template yang sedang aktif.
    // Toggle DIBALIK lagi di akhir supaya iterasi template berikutnya tidak
    // ke-redirect dari `/{slug}`.
    await page.goto("http://localhost:3000/dashboard/editor");
    await page.waitForSelector("text=Editor Undangan");
    await page.click('button:has-text("Mode Registrasi-Saja: Nonaktif")');
    await page.waitForSelector('button:has-text("Mode Registrasi-Saja: Aktif")');

    await page.goto(`http://localhost:3000/r/${slug}`);
    await page.waitForSelector("text=RSVP");
    await shot(page, `tpl-${tpl}-registration-mobile`);
    const regResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    registrationAxeViolationsByTemplate[tpl] = regResults.violations.map((v) => v.id);

    await page.goto("http://localhost:3000/dashboard/editor");
    await page.waitForSelector("text=Editor Undangan");
    await page.click('button:has-text("Mode Registrasi-Saja: Aktif")');
    await page.waitForSelector('button:has-text("Mode Registrasi-Saja: Nonaktif")');
  }

  await browser.close();

  console.log("\n=== AXE VIOLATIONS PER TEMPLATE (/{slug}, undangan penuh) ===");
  let totalViolations = 0;
  for (const [tpl, violations] of Object.entries(axeViolationsByTemplate)) {
    totalViolations += violations.length;
    console.log(`${tpl}: ${violations.length === 0 ? "0 pelanggaran" : violations.join(", ")}`);
  }

  console.log("\n=== AXE VIOLATIONS PER TEMPLATE (/r/{slug}, Mode Registrasi-Saja) ===");
  for (const [tpl, violations] of Object.entries(registrationAxeViolationsByTemplate)) {
    totalViolations += violations.length;
    console.log(`${tpl}: ${violations.length === 0 ? "0 pelanggaran" : violations.join(", ")}`);
  }

  console.log("\n=== CONSOLE ISSUES ===");
  if (consoleIssues.length === 0) {
    console.log("(tidak ada error/warning console)");
  } else {
    for (const issue of consoleIssues) console.log(issue);
  }

  if (totalViolations > 0 || consoleIssues.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("VERIFY FAILED:", err);
  process.exit(1);
});
