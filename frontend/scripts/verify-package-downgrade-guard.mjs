// Verifikasi guard downgrade paket — dipicu pertanyaan pemilik produk
// ("setelah beli Grand, masih bisa milih Intimate?"). Paket di-grant lewat
// psql (sama pola dengan verify-package-model.mjs), bukan Xendit sungguhan.
import { execSync } from "node:child_process";
import { chromium } from "playwright";

const BASE = process.env.DOMAIN_URL ?? "http://localhost:3000";
const SSH_HOST = process.env.STAGING_SSH_HOST;
const POSTGRES_CONTAINER = process.env.POSTGRES_CONTAINER ?? (SSH_HOST ? "wedding-saas-postgres-1" : "weeding-saas-postgres-1");
const email = `downgrade-guard-${Date.now()}@example.com`;
const password = "password123";
const errors = [];

// Base64 lewat stdin — hindari neraka quoting SQL di ssh+docker+psql
// bersarang (pola sama dengan verify-registration-mode.mjs).
function psqlValue(sql) {
  const b64 = Buffer.from(sql).toString("base64");
  const dockerCmd = `echo ${b64} | base64 -d | docker exec -i ${POSTGRES_CONTAINER} psql -U wedding -d wedding_saas -t -A`;
  const fullCmd = SSH_HOST ? `ssh ${SSH_HOST} "${dockerCmd}"` : dockerCmd;
  return execSync(fullCmd, { stdio: "pipe" }).toString().trim();
}

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 10000 });

  await page.goto(`${BASE}/dashboard/editor`, { waitUntil: "networkidle" });
  await page.fill('input[name="partner1_name"]', "Dewi");
  await page.fill('input[name="partner2_name"]', "Rama");
  await page.fill('input[name="event_date"]', "2027-05-01");
  await page.fill('textarea[name="lokasi"]', "Balai Sudirman");
  await page.click('button:has-text("Simpan")');
  await page.waitForSelector("text=Perubahan tersimpan.", { timeout: 10000 });

  const eventId = psqlValue(`SELECT id FROM events WHERE owner_id = (SELECT id FROM users WHERE email='${email}');`);
  psqlValue(`UPDATE events SET package='grand' WHERE id='${eventId}';`);
  console.log("Paket 'grand' di-grant via psql");

  await page.goto(`${BASE}/dashboard/billing`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Pilih Paket");

  const grandCard = page.locator("button", { hasText: "Grand" });
  const intimateCard = page.locator("button", { hasText: "Intimate" });
  const celebrationCard = page.locator("button", { hasText: "Celebration" });

  await page.screenshot({ path: "./verify-screenshots/downgrade-guard-billing.png", fullPage: true });

  if (!(await grandCard.locator("text=Paket aktif").isVisible())) {
    errors.push("Kartu Grand harusnya menampilkan 'Paket aktif'");
  } else {
    console.log("PASS: kartu Grand menampilkan 'Paket aktif'");
  }

  if (!(await intimateCard.isDisabled())) {
    errors.push("Kartu Intimate harusnya disabled (downgrade dari Grand)");
  } else {
    console.log("PASS: kartu Intimate disabled");
  }
  if (!(await intimateCard.locator("text=Kapasitas lebih kecil/sama").isVisible())) {
    errors.push("Kartu Intimate harusnya menampilkan label 'Kapasitas lebih kecil/sama'");
  } else {
    console.log("PASS: kartu Intimate menampilkan label kapasitas lebih kecil");
  }

  if (!(await celebrationCard.isDisabled())) {
    errors.push("Kartu Celebration harusnya disabled (downgrade dari Grand)");
  } else {
    console.log("PASS: kartu Celebration disabled");
  }

  // Coba paksa lewat API langsung (bypass UI) — backend harus tetap menolak.
  // BASE dipakai langsung (bukan localhost:8000) — di staging, NPM me-routing
  // prefix /events ke backend lewat domain yang sama (lihat memory infra).
  const apiRes = await page.evaluate(
    async ({ eventId, apiBase }) => {
      const token = localStorage.getItem("wedding_access_token");
      const res = await fetch(`${apiBase}/events/${eventId}/billing/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ item_type: "package", item_key: "intimate" }),
      });
      return { status: res.status, body: await res.json() };
    },
    { eventId, apiBase: BASE }
  );

  if (apiRes.status !== 409) {
    errors.push(`Panggilan API langsung harusnya 409, dapat ${apiRes.status}: ${JSON.stringify(apiRes.body)}`);
  } else {
    console.log(`PASS: panggilan API langsung ditolak 409 — "${apiRes.body.detail}"`);
  }

  const packageAfter = psqlValue(`SELECT package FROM events WHERE id='${eventId}';`);
  if (packageAfter !== "grand") {
    errors.push(`Paket harusnya tetap 'grand', ditemukan '${packageAfter}'`);
  } else {
    console.log("PASS: paket tetap 'grand' setelah semua percobaan downgrade");
  }

  await browser.close();
  psqlValue(`DELETE FROM users WHERE email='${email}';`);
  console.log("Cleanup: data test dihapus.");
}

main()
  .then(() => {
    if (errors.length) {
      console.error("ERRORS:", errors);
      process.exit(1);
    }
    console.log("\nALL CHECKS PASSED — guard downgrade paket bekerja.");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
