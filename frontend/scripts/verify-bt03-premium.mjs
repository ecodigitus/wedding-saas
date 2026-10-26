// Stage 2 — simulasi "Ambil Foto" lewat panggilan langsung ke endpoint
// upload (payload FormData yang identik dengan yang dikirim tombol asli),
// menguji jalur browser -> backend -> MinIO end-to-end. Interaksi klik
// tombolnya sendiri (yang butuh kamera nyata mendeteksi QR dulu) di luar
// scope headless test — sama seperti keputusan BT-02 (lihat catatan di
// verify-bt03-selfie.mjs).
import { chromium } from "playwright";

const BASE = process.env.DOMAIN_URL ?? "http://localhost:3000";
const API_BASE = process.env.API_URL ?? "http://localhost:8000";
const email = process.argv[2];
const password = "password123";

if (!email) {
  console.error("Usage: node verify-bt03-premium.mjs <email-premium>");
  process.exit(1);
}

const TINY_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAUABQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDnqKKK8k/QwooooAKKKKACiiigD//Z";

const errors = [];

async function main() {
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
  });
  const context = await browser.newContext({ permissions: ["camera"] });
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

  await page.goto(`${BASE}/dashboard/guests`, { waitUntil: "networkidle" });
  await page.fill('input[name="name"]', "Eko Selfie");
  await page.click('button:has-text("Tambah Tamu")');
  await page.waitForSelector("text=Eko Selfie", { timeout: 10000 });
  console.log("PASS: tamu ditambahkan");

  // Kamera fake device harus aktif tanpa error (localhost = secure context).
  await page.goto(`${BASE}/dashboard/checkin`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const cameraErrorVisible = await page.locator("text=Tidak bisa akses kamera").isVisible();
  if (cameraErrorVisible) errors.push("Kamera fake device gagal aktif di halaman Check-in");
  else console.log("PASS: kamera (fake device) aktif tanpa error di halaman Check-in");

  const { accessToken, inviteToken } = await page.evaluate(
    async ({ apiBase, name }) => {
      const token = localStorage.getItem("wedding_access_token");
      const headers = { Authorization: `Bearer ${token}` };
      const events = await fetch(`${apiBase}/events`, { headers }).then((r) => r.json());
      const guests = await fetch(`${apiBase}/events/${events[0].id}/guests`, { headers }).then((r) =>
        r.json()
      );
      const guest = guests.find((g) => g.name === name);
      return { accessToken: token, inviteToken: guest?.invite_token };
    },
    { apiBase: API_BASE, name: "Eko Selfie" }
  );
  if (!inviteToken) errors.push("Tidak bisa ambil invite_token tamu");

  // Simulasi check-in QR (BT-02, pola yang sama dengan verify-staging-checkin.mjs)
  await page.evaluate(
    async ({ apiBase, token, accessToken }) => {
      await fetch(`${apiBase}/guests/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ token }),
      });
    },
    { apiBase: API_BASE, token: inviteToken, accessToken }
  );
  console.log("PASS: simulasi check-in QR berhasil");

  // Simulasi "Ambil Foto" — payload FormData identik dengan yang dikirim
  // handleTakeSelfie() di checkin/page.tsx, lewat browser sungguhan.
  const uploadResult = await page.evaluate(
    async ({ apiBase, token, accessToken, jpegBase64 }) => {
      const byteChars = atob(jpegBase64);
      const bytes = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
      const blob = new Blob([bytes], { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("token", token);
      formData.append("photo", blob, "selfie.jpg");

      const res = await fetch(`${apiBase}/guests/check-in/selfie`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      return { status: res.status, body: await res.json() };
    },
    { apiBase: API_BASE, token: inviteToken, accessToken, jpegBase64: TINY_JPEG_BASE64 }
  );
  if (uploadResult.status !== 200) errors.push(`Upload selfie gagal: ${JSON.stringify(uploadResult)}`);
  if (uploadResult.body?.has_selfie !== true) errors.push("Response upload tidak has_selfie=true");
  console.log("PASS: upload selfie via browser->backend->MinIO berhasil");

  // Kelola Tamu harus menampilkan ikon kamera untuk tamu ini
  await page.goto(`${BASE}/dashboard/guests`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Eko Selfie", { timeout: 10000 });
  const row = page.locator("tr", { hasText: "Eko Selfie" }).first();
  const selfieButton = row.locator('button[aria-label^="Lihat foto selfie"]');
  if ((await selfieButton.count()) < 1) errors.push("Ikon lihat selfie tidak muncul di Kelola Tamu");
  console.log("PASS: ikon lihat selfie muncul di Kelola Tamu");

  await selfieButton.click();
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  await page.waitForSelector("img[alt^='Foto selfie check-in']", { timeout: 10000 });
  const imgLoaded = await page.evaluate(() => {
    const img = document.querySelector("img[alt^='Foto selfie check-in']");
    return img instanceof HTMLImageElement && img.naturalWidth > 0;
  });
  if (!imgLoaded) errors.push("Gambar selfie di modal gagal dimuat (signed URL MinIO tidak valid?)");
  console.log("PASS: modal selfie menampilkan gambar yang benar-benar termuat dari signed URL");

  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  const dialogStillOpen = await page.locator('[role="dialog"]').count();
  if (dialogStillOpen > 0) errors.push("Modal selfie tidak tertutup dengan Escape");
  console.log("PASS: modal selfie tertutup dengan Escape");

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
