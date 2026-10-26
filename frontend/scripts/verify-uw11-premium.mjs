import { chromium } from "playwright";

const BASE = process.env.DOMAIN_URL ?? "http://localhost:3000";
const email = process.argv[2];
const password = "password123";

if (!email) {
  console.error("Usage: node verify-uw11-premium.mjs <email-sudah-premium>");
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

  await page.goto(`${BASE}/dashboard/editor`, { waitUntil: "networkidle" });

  // Buat event dasar dulu kalau belum ada (form Musik & Galeri butuh event.id).
  if ((await page.locator('input[name="music_url"]').count()) === 0) {
    await page.fill('input[name="partner1_name"]', "Budi");
    await page.fill('input[name="partner2_name"]', "Ani");
    await page.fill('input[name="event_date"]', "2027-01-01");
    await page.fill('textarea[name="lokasi"]', "Balai Kota");
    await page.click('button:has-text("Simpan")');
    await page.waitForSelector("text=Perubahan tersimpan.", { timeout: 10000 });
  }

  const musicInputVisible = await page.locator('input[name="music_url"]').count();
  if (musicInputVisible !== 1) errors.push("Input music_url tidak muncul untuk event dengan add-on musik_galeri_countdown");
  console.log("PASS: event dengan add-on musik_galeri_countdown menampilkan form Musik & Galeri");

  await page.fill('input[name="music_url"]', "https://example.com/music.mp3");

  await page.click('button:has-text("Countdown timer: Nonaktif")');
  const activeToggle = await page.locator('button:has-text("Countdown timer: Aktif")').count();
  if (activeToggle < 1) errors.push("Toggle countdown timer tidak berubah jadi Aktif setelah diklik");
  console.log("PASS: toggle countdown timer berfungsi");

  await page.click('button:has-text("Tambah link galeri")');
  await page.click('button:has-text("Tambah link galeri")');
  const galleryInputs = page.locator('input[id^="gallery_url_"]');
  await galleryInputs.nth(0).fill("https://example.com/foto1.jpg");
  await galleryInputs.nth(1).fill("https://example.com/video1.mp4");

  await page.click('button:has-text("Simpan Musik & Galeri")');
  await page.waitForSelector("text=Musik & Galeri tersimpan.", { timeout: 10000 });
  console.log("PASS: Musik & Galeri tersimpan");

  const publishBtn = page.locator('button:has-text("Publish")');
  if ((await publishBtn.count()) > 0) {
    await publishBtn.click();
    await page.waitForSelector("text=Undangan berhasil dipublish!", { timeout: 10000 });
  }

  // CountdownTimer sengaja tidak setState sinkron di effect (react-hooks/
  // set-state-in-effect) — angka baru muncul lewat tick pertama setInterval,
  // ~1 detik setelah mount. Tunggu itu sebelum menganggap tidak muncul.
  try {
    await page.waitForSelector('[role="timer"]', { timeout: 3000 });
  } catch {
    // biarkan errors.push di bawah menangkapnya
  }
  const previewCountdown = await page.locator('[role="timer"]').count();
  if (previewCountdown < 1) errors.push("Countdown timer tidak muncul di preview editor");
  const previewGallery = await page.locator("text=Galeri").count();
  if (previewGallery < 1) errors.push("Section Galeri tidak muncul di preview editor");
  const previewMusicButton = await page.locator('button[aria-label*="musik latar"]').count();
  if (previewMusicButton < 1) errors.push("Tombol pemutar musik tidak muncul di preview editor");
  console.log("PASS: preview editor menampilkan countdown, galeri, dan tombol musik");

  await browser.close();
}

main()
  .then(() => {
    if (errors.length) {
      console.error("ERRORS:", errors);
      process.exit(1);
    }
    console.log("ALL CHECKS (stage 2) PASSED");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
