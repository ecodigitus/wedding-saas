import { chromium } from "playwright";

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`ok: ${msg}`);
}

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();

  await page.goto("http://localhost:3000/login");
  await page.fill('input[name="email"]', "demo@wedding-saas.dev");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");

  await page.goto("http://localhost:3000/dashboard/guests");
  await page.waitForSelector('button:has-text("Tambah Tamu")');

  const guestName = `Tamu Pending ${Math.random().toString(36).slice(2, 6)}`;
  await page.fill('input[name="name"]', guestName);
  await page.fill('input[name="max_pax"]', "2");
  await page.click('button:has-text("Tambah Tamu")');
  await page.waitForSelector(`text=${guestName}`);
  console.log("tambah tamu untuk test merge OK");

  await page.goto("http://localhost:3000/dashboard/rsvp");
  await page.waitForSelector("text=menunggu respons");
  const body = await page.textContent("body");
  assert(body.includes(guestName), "nama tamu pending muncul di halaman RSVP dashboard");
  assert(body.includes("menunggu respons"), "ringkasan header menyebut jumlah menunggu respons");

  const row = page.locator("tr", { hasText: guestName });
  assert(await row.locator("text=Menunggu").isVisible(), "badge Menunggu tampil di baris tamu pending");

  // cleanup
  await page.goto("http://localhost:3000/dashboard/guests");
  await page.waitForSelector(`text=${guestName}`);
  page.once("dialog", (d) => d.accept());
  await page.locator("tr", { hasText: guestName }).locator('button[aria-label^="Hapus"]').click();
  await page.waitForSelector(`text=${guestName}`, { state: "detached" }).catch(() => {});
  console.log("cleanup tamu pending OK");

  await browser.close();
  console.log("\nVERIFIKASI MERGE RSVP+ROSTER LOLOS.");
}

main().catch((err) => {
  console.error("VERIFICATION FAILED:", err);
  process.exit(1);
});
