// Verifikasi preview editor Mode Registrasi-Saja (RegistrationPreview) —
// dijalankan lewat domain nyata setelah deploy:
//   DOMAIN_URL=https://wedding.ecodigitus.com STAGING_SSH_HOST=edig-prod-01 node scripts/verify-registration-preview.mjs
// STAGING_SSH_HOST dipakai untuk membaca DB (psql lewat docker exec) — cek
// bahwa klik di preview TIDAK membuat tamu/RSVP sungguhan.
// Tanpa E2E_EMAIL/E2E_PASSWORD: membuat 1 akun uji `regpreview-<ts>@example.com` (pola verify-*.mjs lain).
// Dengan E2E_EMAIL + E2E_PASSWORD: login ke akun yang sudah ada & memakai event miliknya (tidak register/publish);
// mode awal event dicatat dan DIKEMBALIKAN di akhir. Kredensial hanya dari env, tidak pernah ditulis di file.
import { execSync } from "node:child_process";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.DOMAIN_URL ?? "http://localhost:3000";
const SSH_HOST = process.env.STAGING_SSH_HOST;
const POSTGRES_CONTAINER =
  process.env.POSTGRES_CONTAINER ?? (SSH_HOST ? "wedding-saas-postgres-1" : "weeding-saas-postgres-1");
const API = process.env.API_URL ?? (/localhost|127\.0\.0\.1/.test(BASE) ? "http://localhost:8000" : BASE);
const EXISTING = !!(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);
const email = EXISTING ? process.env.E2E_EMAIL : `regpreview-${Date.now()}@example.com`;
const password = EXISTING ? process.env.E2E_PASSWORD : "password123";
const errors = [];
let passed = 0;

function pass(msg) {
  passed += 1;
  console.log(`PASS: ${msg}`);
}
function fail(msg) {
  errors.push(msg);
  console.log(`FAIL: ${msg}`);
}
function check(cond, okMsg, failMsg) {
  if (cond) pass(okMsg);
  else fail(failMsg);
}

function psqlValue(sql) {
  const b64 = Buffer.from(sql).toString("base64");
  const dockerCmd = `echo ${b64} | base64 -d | docker exec -i ${POSTGRES_CONTAINER} psql -U wedding -d wedding_saas -t -A`;
  const fullCmd = SSH_HOST ? `ssh -o BatchMode=yes ${SSH_HOST} "${dockerCmd}"` : dockerCmd;
  return execSync(fullCmd, { stdio: "pipe" }).toString().trim();
}

async function launch() {
  try {
    return await chromium.launch({ channel: "msedge", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function main() {
  const browser = await launch();
  const context = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await context.newPage();
  const apiWrites = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err}`));
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("Failed to load resource")) {
      errors.push(`console: ${msg.text()}`);
    }
  });
  page.on("request", (req) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method())) {
      apiWrites.push(`${req.method()} ${new URL(req.url()).pathname}`);
    }
  });

  // --- akses dasar lewat domain ---
  const root = await page.goto(`${BASE}/${EXISTING ? "login" : "register"}`, { waitUntil: "networkidle" });
  check(root?.status() === 200, `akses ${BASE} halaman auth -> 200`, `akses halaman auth status ${root?.status()}`);

  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  if (!EXISTING && (await page.locator('input[name="full_name"]').count())) {
    await page.fill('input[name="full_name"]', "Uji Preview Registrasi");
  }
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 15000 });
  pass(EXISTING ? "login akun yang sudah ada ke dashboard" : "register + login ke dashboard");

  const emailSql = email.replace(/'/g, "''");
  const slugSql = `SELECT slug FROM events WHERE owner_id = (SELECT id FROM users WHERE email='${emailSql}') ORDER BY created_at DESC LIMIT 1;`;
  let slug = EXISTING ? psqlValue(slugSql) : "";
  if (!slug) {
    // Akun baru, atau akun yang sudah ada tapi belum punya event: buat event dasar lewat UI.
    await page.goto(`${BASE}/dashboard/editor`, { waitUntil: "networkidle" });
    await page.fill('input[name="partner1_name"]', "Wira");
    await page.fill('input[name="partner2_name"]', "Sari");
    await page.fill('input[name="event_date"]', "2027-06-01");
    await page.fill('textarea[name="lokasi"]', "Gedung Serbaguna");
    await page.click('button:has-text("Simpan")');
    await page.waitForSelector("text=Perubahan tersimpan.", { timeout: 15000 });
    await page.click('button:has-text("Publish")');
    await page.waitForSelector("text=Undangan berhasil dipublish!", { timeout: 15000 });
    pass("event dasar tersimpan & dipublish");
    slug = psqlValue(slugSql);
  }
  check(!!slug, `slug event = ${slug}`, "gagal ambil slug event dari DB");
  const evSql = `(SELECT id FROM events WHERE slug='${slug}')`;
  const guests0 = psqlValue(`SELECT count(*) FROM guests WHERE event_id=${evSql};`);
  const rsvps0 = psqlValue(`SELECT count(*) FROM rsvps WHERE event_id=${evSql};`);
  const mode0 = psqlValue(`SELECT mode FROM events WHERE slug='${slug}';`);
  console.log(`state awal: mode=${mode0} guests=${guests0} rsvps=${rsvps0}`);

  const preview = page.locator('p:text-is("Preview") >> xpath=following-sibling::div[1]');

  // --- mode Nonaktif: preview = undangan lengkap ---
  await page.goto(`${BASE}/dashboard/editor`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => !!document.querySelector('input[name="partner1_name"]')?.value);
  const p1 = await page.inputValue('input[name="partner1_name"]');
  const p2 = await page.inputValue('input[name="partner2_name"]');
  const pairText = `${p1} & ${p2}`;
  if (mode0 === "registration_only") {
    // Event yang sudah Aktif dimatikan dulu supaya urutan tes sama; dikembalikan di akhir.
    await page.click('button:has-text("Mode Registrasi-Saja: Aktif")');
    await page.waitForSelector('button:has-text("Mode Registrasi-Saja: Nonaktif")', { timeout: 15000 });
  }
  let text = (await preview.innerText()).replace(/\s+/g, " ");
  check(
    !text.includes("KONFIRMASI KEHADIRAN") && text.toLowerCase().includes(p1.toLowerCase()) && !text.includes("Kirim RSVP"),
    "mode Nonaktif: preview menampilkan undangan lengkap (bukan halaman registrasi)",
    "mode Nonaktif: preview bukan undangan lengkap"
  );

  // --- aktifkan mode ---
  await page.click('button:has-text("Mode Registrasi-Saja: Nonaktif")');
  await page.waitForSelector('button:has-text("Mode Registrasi-Saja: Aktif")', { timeout: 15000 });
  pass("toggle Mode Registrasi-Saja -> Aktif");

  text = (await preview.innerText()).replace(/\s+/g, " ");
  check(
    text.includes("KONFIRMASI KEHADIRAN") && text.includes("RSVP") && text.includes(pairText),
    "mode Aktif: preview menampilkan halaman registrasi (judul, RSVP, nama pasangan)",
    `mode Aktif: preview tidak menampilkan halaman registrasi. Teks: ${text.slice(0, 200)}`
  );
  check(
    text.includes("Buku Tamu") && text.includes("Kirim RSVP"),
    "mode Aktif: preview memuat Buku Tamu dan tombol Kirim RSVP",
    "mode Aktif: Buku Tamu / Kirim RSVP tidak ada di preview"
  );
  check(
    !/AKAD|RESEPSI|DRESS CODE/.test(text),
    "mode Aktif: chrome undangan (Akad/Resepsi/Dress code) tidak ada di preview",
    "mode Aktif: preview masih memuat bagian undangan lengkap"
  );
  check(
    (await preview.locator("[inert]").count()) >= 1,
    "preview dibungkus atribut inert (tidak bisa diklik/difokus)",
    "wrapper inert tidak ditemukan di preview"
  );

  // --- preview ikut data form yang belum disimpan ---
  await page.fill('input[name="partner1_name"]', p1 + "X");
  text = (await preview.innerText()).replace(/\s+/g, " ");
  check(text.includes(`${p1}X & ${p2}`), "preview ikut berubah saat form diedit (belum disimpan)", "preview tidak ikut perubahan form");
  await page.fill('input[name="partner1_name"]', p1);

  // --- klik di preview tidak boleh menulis apa pun ---
  apiWrites.length = 0;
  await preview.getByText("Kirim RSVP").click({ force: true, timeout: 3000 }).catch(() => {});
  await preview.getByText("Hadir", { exact: true }).click({ force: true, timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(800);
  check(apiWrites.length === 0, "klik di preview tidak memicu request tulis ke API", `request tulis tak terduga: ${apiWrites.join(", ")}`);
  const guests = psqlValue(`SELECT count(*) FROM guests WHERE event_id=(SELECT id FROM events WHERE slug='${slug}');`);
  const rsvps = psqlValue(`SELECT count(*) FROM rsvps WHERE event_id=(SELECT id FROM events WHERE slug='${slug}');`);
  check(guests === guests0 && rsvps === rsvps0, "DB: tamu & RSVP tidak bertambah setelah klik di preview", `DB berubah: guests ${guests0}->${guests} rsvps ${rsvps0}->${rsvps}`);

  // --- aksesibilitas editor dengan preview baru ---
  const axe = await new AxeBuilder({ page }).analyze();
  const serious = axe.violations.filter((v) => ["serious", "critical"].includes(v.impact));
  check(
    serious.length === 0,
    "axe: 0 pelanggaran serious/critical di editor (mode Aktif)",
    `axe: ${serious.map((v) => `${v.id}(${v.nodes.length})`).join(", ")}`
  );

  // --- halaman publik cocok dengan preview ---
  const pub = await page.goto(`${BASE}/${slug}`, { waitUntil: "networkidle" });
  check(page.url().endsWith(`/r/${slug}`), "/{slug} redirect ke /r/{slug}", `redirect salah: ${page.url()}`);
  check(pub?.status() === 200, "halaman publik /r/{slug} -> 200", `halaman publik status ${pub?.status()}`);
  const pubText = (await page.locator("main").innerText()).replace(/\s+/g, " ");
  check(
    pubText.includes("KONFIRMASI KEHADIRAN") && pubText.includes(pairText) && pubText.includes("RSVP") && pubText.includes("Buku Tamu"),
    "halaman publik memuat elemen yang sama dengan preview",
    "halaman publik tidak cocok dengan preview"
  );

  // --- API lewat domain (routing NPM) + CORS ---
  const health = await page.request.get(`${API}/health`);
  check(health.status() === 200, "API /health lewat domain -> 200", `/health status ${health.status()}`);
  const pubApi = await page.request.get(`${API}/invitations/${slug}`);
  check(pubApi.status() === 200, "API /invitations/{slug} lewat domain -> 200", `/invitations/{slug} status ${pubApi.status()}`);

  // --- kembalikan mode: preview kembali ke undangan ---
  await page.goto(`${BASE}/dashboard/editor`, { waitUntil: "networkidle" });
  await page.click('button:has-text("Mode Registrasi-Saja: Aktif")');
  await page.waitForSelector('button:has-text("Mode Registrasi-Saja: Nonaktif")', { timeout: 15000 });
  text = (await preview.innerText()).replace(/\s+/g, " ");
  check(
    !text.includes("KONFIRMASI KEHADIRAN") && text.toLowerCase().includes(p1.toLowerCase()) && !text.includes("Kirim RSVP"),
    "toggle balik ke Nonaktif: preview kembali ke undangan lengkap",
    "preview tidak kembali ke undangan lengkap"
  );

  if (mode0 === "registration_only") {
    await page.click('button:has-text("Mode Registrasi-Saja: Nonaktif")');
    await page.waitForSelector('button:has-text("Mode Registrasi-Saja: Aktif")', { timeout: 15000 });
  }
  const modeEnd = psqlValue(`SELECT mode FROM events WHERE slug='${slug}';`);
  check(modeEnd === mode0, `mode event dikembalikan ke semula (${mode0})`, `mode akhir ${modeEnd} != awal ${mode0}`);
  const guests1 = psqlValue(`SELECT count(*) FROM guests WHERE event_id=${evSql};`);
  const rsvps1 = psqlValue(`SELECT count(*) FROM rsvps WHERE event_id=${evSql};`);
  check(guests1 === guests0 && rsvps1 === rsvps0, "jumlah tamu & RSVP tidak berubah selama tes", `data berubah: guests ${guests0}->${guests1}, rsvps ${rsvps0}->${rsvps1}`);

  await browser.close();
  console.log(`\n${passed} lolos, ${errors.length} masalah. akun uji: ${email}, slug: ${slug}`);
  if (errors.length) {
    console.log(errors.map((e) => ` - ${e}`).join("\n"));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
