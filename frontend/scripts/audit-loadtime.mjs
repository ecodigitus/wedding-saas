// Uji loading halaman publik di bawah throttle "Regular 4G" sungguhan (CDP
// Network.emulateNetworkConditions), bukan asumsi — sesuai NFR PRD.v2.md
// Bagian 6: "halaman undangan publik harus load < 2 detik di koneksi 4G biasa".

import { chromium } from "playwright";

// Profil "Regular 4G" umum dipakai Lighthouse/WebPageTest.
const REGULAR_4G = {
  offline: false,
  downloadThroughput: (4 * 1024 * 1024) / 8, // 4 Mbps
  uploadThroughput: (1.5 * 1024 * 1024) / 8, // 1.5 Mbps
  latency: 150, // ms RTT
};

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });

  // Register + publish 1 undangan dulu (tanpa throttle) supaya ada slug nyata untuk diuji.
  const setupPage = await browser.newPage();
  const rand = Math.random().toString(36).slice(2, 8);
  await setupPage.goto("http://localhost:3001/register");
  await setupPage.fill("input[name=full_name]", "Verifier Loadtime");
  await setupPage.fill("input[name=email]", `verify-load-${rand}@example.com`);
  await setupPage.fill("input[name=password]", "password123");
  await setupPage.click("button[type=submit]");
  await setupPage.waitForURL("**/dashboard");
  await setupPage.click('a[href="/dashboard/editor"]');
  await setupPage.waitForURL("**/dashboard/editor");
  await setupPage.fill('input[name="partner1_name"]', "Load");
  await setupPage.fill('input[name="partner2_name"]', "Test");
  await setupPage.fill('input[name="event_date"]', "2027-03-01");
  await setupPage.fill('textarea[name="lokasi"]', "Test Venue, Jakarta");
  await setupPage.click("button:has-text('Publish')");
  await setupPage.waitForSelector("text=Undangan berhasil dipublish!");
  await setupPage.goto("http://localhost:3001/dashboard");
  const slugHref = await setupPage.getAttribute('a[target="_blank"]', "href");
  const slug = slugHref.replace(/^\//, "");
  await setupPage.close();
  console.log("slug uji:", slug);

  // Halaman baru, KOSONG cache, dengan throttle 4G aktif.
  const context = await browser.newContext();
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", REGULAR_4G);
  // CPU throttle 4x — mendekati HP low-end, bukan cuma network.
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  const start = Date.now();
  await page.goto(`http://localhost:3001/${slug}`, { waitUntil: "load" });
  const loadTime = Date.now() - start;

  const perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    return {
      domContentLoaded: nav.domContentLoadedEventEnd,
      loadEvent: nav.loadEventEnd,
      transferSize: nav.transferSize,
    };
  });

  console.log(`\nWaktu load (goto 'load' event, throttle Regular 4G + CPU 4x): ${loadTime}ms`);
  console.log(`Performance API — domContentLoaded: ${perf.domContentLoaded.toFixed(0)}ms, loadEvent: ${perf.loadEvent.toFixed(0)}ms`);
  console.log(`Transfer size dokumen utama: ${(perf.transferSize / 1024).toFixed(1)} KB`);
  console.log(`\n[${loadTime < 2000 ? "PASS" : "FAIL"}] Target < 2000ms`);

  const resources = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((r) => ({
      name: r.name.replace(/^http:\/\/localhost:3001/, ""),
      duration: Math.round(r.duration),
      size: Math.round(r.transferSize / 1024),
    }))
  );
  resources.sort((a, b) => b.duration - a.duration);
  console.log("\n=== Resource paling lambat (top 10) ===");
  for (const r of resources.slice(0, 10)) {
    console.log(`${r.duration}ms  ${r.size}KB  ${r.name}`);
  }

  await browser.close();
}

main().catch((err) => {
  console.error("AUDIT FAILED:", err);
  process.exit(1);
});
