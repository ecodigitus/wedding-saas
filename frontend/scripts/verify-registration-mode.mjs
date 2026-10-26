// Verifikasi Mode Registrasi-Saja (RG-01..RG-07, task.v2.md Bagian 11) —
// dijalankan lokal sebelum deploy DAN ulang lewat domain nyata setelah
// deploy (set DOMAIN_URL + STAGING_SSH_HOST). Paket di-grant langsung via
// psql (sama pola dengan verify-package-model.mjs), bukan lewat Xendit
// sungguhan.
import { execSync } from "node:child_process";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.DOMAIN_URL ?? "http://localhost:3000";
const SSH_HOST = process.env.STAGING_SSH_HOST; // mis. "15.232.71.64" — kalau diisi, psql dijalankan di server itu
const POSTGRES_CONTAINER = process.env.POSTGRES_CONTAINER ?? (SSH_HOST ? "wedding-saas-postgres-1" : "weeding-saas-postgres-1");
const email = `regmode-${Date.now()}@example.com`;
const password = "password123";
const errors = [];

// Base64-encode SQL sebagai stdin psql, lalu (kalau SSH_HOST diisi) bungkus
// dalam satu string perintah remote — menghindari neraka quoting SQL yang
// sudah mengandung tanda kutip di dalam ssh + docker exec + psql -c.
function runSql(sql, { asValue } = {}) {
  const b64 = Buffer.from(sql).toString("base64");
  const flags = asValue ? "-t -A" : "-t";
  const dockerCmd = `echo ${b64} | base64 -d | docker exec -i ${POSTGRES_CONTAINER} psql -U wedding -d wedding_saas ${flags}`;
  const fullCmd = SSH_HOST ? `ssh ${SSH_HOST} "${dockerCmd}"` : dockerCmd;
  return execSync(fullCmd, { stdio: "pipe" }).toString();
}

function psql(sql) {
  runSql(sql);
}

function psqlValue(sql) {
  return runSql(sql, { asValue: true }).trim();
}

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("pageerror", (err) => errors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("Failed to load resource")) {
      errors.push(msg.text());
    }
  });

  await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 10000 });
  console.log("PASS: register + redirect ke dashboard");

  await page.goto(`${BASE}/dashboard/editor`, { waitUntil: "networkidle" });
  await page.fill('input[name="partner1_name"]', "Wira");
  await page.fill('input[name="partner2_name"]', "Sari");
  await page.fill('input[name="event_date"]', "2027-06-01");
  await page.fill('textarea[name="lokasi"]', "Gedung Serbaguna");
  await page.click('button:has-text("Simpan")');
  await page.waitForSelector("text=Perubahan tersimpan.", { timeout: 10000 });
  await page.click('button:has-text("Publish")');
  await page.waitForSelector("text=Undangan berhasil dipublish!", { timeout: 10000 });
  console.log("PASS: event dasar tersimpan & dipublish");

  const slug = psqlValue(`SELECT slug FROM events WHERE owner_id = (SELECT id FROM users WHERE email='${email}');`);
  if (!slug) throw new Error("Gagal ambil slug event dari DB");
  console.log(`slug = ${slug}`);

  // Grant paket 'intimate' via psql — sama pola dengan verify-package-model.mjs.
  psql(`UPDATE events SET package='intimate' WHERE slug='${slug}';`);
  console.log("PASS: paket 'intimate' di-grant via psql");

  // --- Toggle Mode Registrasi-Saja di editor ---
  await page.goto(`${BASE}/dashboard/editor`, { waitUntil: "networkidle" });
  await page.click('button:has-text("Mode Registrasi-Saja: Nonaktif")');
  await page.waitForSelector('button:has-text("Mode Registrasi-Saja: Aktif")', { timeout: 10000 });
  console.log("PASS: toggle Mode Registrasi-Saja berhasil diaktifkan");

  const templatePickerLabel = await page.textContent("body");
  if (!templatePickerLabel.includes("Palet warna halaman registrasi")) {
    errors.push("Label pemilih template tidak berubah jadi 'Palet warna halaman registrasi'");
  } else {
    console.log("PASS: label pemilih template berubah sesuai mode");
  }
  if (templatePickerLabel.includes("Musik Latar")) {
    errors.push("Kartu Musik Latar/Galeri/Countdown masih tampil walau mode registrasi-saja aktif");
  } else {
    console.log("PASS: kartu Musik Latar/Galeri/Countdown tersembunyi di mode registrasi-saja");
  }
  if (!templatePickerLabel.includes("Cara Sambungkan")) {
    errors.push("Panduan 'Cara Sambungkan' tidak muncul");
  } else {
    console.log("PASS: panduan 'Cara Sambungkan' muncul");
  }
  await page.waitForSelector(`code:has-text("/r/${slug}")`, { timeout: 10000 });
  console.log("PASS: link registrasi ditampilkan di kartu Cara Sambungkan");

  // --- /{slug} harus redirect ke /r/{slug} ---
  await page.goto(`${BASE}/${slug}`, { waitUntil: "networkidle" });
  if (!page.url().endsWith(`/r/${slug}`)) {
    errors.push(`/{slug} tidak redirect ke /r/{slug} — URL akhir: ${page.url()}`);
  } else {
    console.log("PASS: /{slug} redirect ke /r/{slug}");
  }

  const regPageBody = await page.textContent("body");
  if (!regPageBody.includes("Konfirmasi Kehadiran")) {
    errors.push("Halaman registrasi tidak menampilkan heading 'Konfirmasi Kehadiran'");
  }
  if (regPageBody.includes("hero-stage") || (await page.locator(".sparkle-particle").count()) > 0) {
    errors.push("Chrome undangan (hero animasi/partikel) SENGAJA tidak boleh ada di halaman registrasi");
  }
  console.log("PASS: halaman registrasi tidak merender chrome undangan");

  // --- RSVP anonim (auto-enroll, RG-05) ---
  await page.fill('input[name="guest_name"]', "Tamu Anonim");
  await page.fill('input[name="jumlah_pax"]', "2");
  await page.click('button:has-text("Hadir")');
  await page.click('button:has-text("Kirim RSVP")');
  await page.waitForSelector("text=Makasih ya udah konfirmasi kehadiranmu", { timeout: 10000 });
  const qrVisibleAfterSubmit = await page.locator("canvas").count();
  if (qrVisibleAfterSubmit < 1) {
    errors.push("QR check-in tidak muncul setelah auto-enroll RSVP hadir");
  } else {
    console.log("PASS: QR check-in muncul setelah auto-enroll RSVP hadir");
  }

  const guestCount = psqlValue(
    `SELECT count(*) FROM guests WHERE event_id = (SELECT id FROM events WHERE slug='${slug}');`
  );
  if (guestCount !== "1") {
    errors.push(`Harusnya tepat 1 Guest ter-auto-enroll, ditemukan ${guestCount}`);
  } else {
    console.log("PASS: tepat 1 Guest ter-auto-enroll di DB");
  }
  const selfRegistered = psqlValue(
    `SELECT self_registered FROM guests WHERE event_id = (SELECT id FROM events WHERE slug='${slug}');`
  );
  if (selfRegistered !== "t") {
    errors.push(`self_registered harusnya true, ditemukan '${selfRegistered}'`);
  } else {
    console.log("PASS: self_registered=true tercatat di DB");
  }

  // --- Reload: localStorage handoff harus tetap menampilkan QR tanpa submit ulang ---
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("canvas", { timeout: 10000 });
  const formVisibleAfterReload = await page.locator('input[name="guest_name"]').count();
  if (formVisibleAfterReload > 0) {
    errors.push("Form RSVP anonim muncul lagi setelah reload — localStorage handoff gagal");
  } else {
    console.log("PASS: reload halaman tetap menampilkan QR (localStorage handoff bekerja)");
  }

  // --- axe-core di halaman registrasi ---
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  if (results.violations.length > 0) {
    errors.push(
      `${results.violations.length} axe violations di /r/${slug}: ` +
        results.violations.map((v) => v.id).join(", ")
    );
  } else {
    console.log("PASS: 0 axe violations di halaman registrasi");
  }

  await browser.close();

  // cleanup — kembalikan DB ke baseline.
  psql(`DELETE FROM users WHERE email='${email}';`);
  console.log("Cleanup: data test dihapus.");
}

main()
  .then(() => {
    if (errors.length) {
      console.error("ERRORS:", errors);
      process.exit(1);
    }
    console.log("\nALL CHECKS PASSED — Mode Registrasi-Saja verified end-to-end.");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
