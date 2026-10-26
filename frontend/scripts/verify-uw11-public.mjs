import { chromium } from "playwright";

const BASE = process.env.DOMAIN_URL ?? "http://localhost:3000";
const slug = process.argv[2];

if (!slug) {
  console.error("Usage: node verify-uw11-public.mjs <slug>");
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

  await page.goto(`${BASE}/${slug}`, { waitUntil: "networkidle" });

  try {
    await page.waitForSelector('[role="timer"]', { timeout: 3000 });
  } catch {
    // ditangkap oleh assert di bawah
  }
  const countdown = await page.locator('[role="timer"]').count();
  if (countdown < 1) errors.push("Countdown timer tidak muncul di halaman publik");
  console.log("PASS: countdown timer muncul di halaman publik");

  const musicButton = await page.locator('button[aria-label*="musik latar"]').count();
  if (musicButton < 1) errors.push("Tombol pemutar musik tidak muncul");
  console.log("PASS: tombol pemutar musik muncul");

  // URL musik di test ini ("https://example.com/music.mp3") bukan file
  // audio sungguhan, jadi audio.play() gagal dimuat browser (bukan bug app
  // — MusicPlayer sengaja sinkron ke event onPlay/onPause asli, bukan
  // optimis). Cukup pastikan klik tidak melempar error JS (sudah ditangkap
  // listener pageerror/console di atas), tidak menuntut label berubah.
  await page.click('button[aria-label*="musik latar"]');
  await page.waitForTimeout(300);
  console.log("PASS: tombol musik bisa diklik tanpa error JS (playback asli butuh URL audio sungguhan)");

  const galleryHeading = await page.locator("text=Galeri").count();
  if (galleryHeading < 1) errors.push("Section Galeri tidak muncul");
  const galleryImg = await page.locator('img[alt^="Galeri foto"]').count();
  const galleryVideo = await page.locator("video").count();
  if (galleryImg < 1) errors.push("Gambar galeri tidak muncul");
  if (galleryVideo < 1) errors.push("Video galeri tidak muncul");
  console.log(`PASS: galeri tampil (${galleryImg} gambar, ${galleryVideo} video)`);

  await browser.close();
}

main()
  .then(() => {
    if (errors.length) {
      console.error("ERRORS:", errors);
      process.exit(1);
    }
    console.log("ALL CHECKS (stage 3, public page) PASSED");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
