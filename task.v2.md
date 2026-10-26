# TASK.md — Breakdown Development Fase 1 (MVP) — v2

| | |
|---|---|
| **Versi** | 28 — `CORS_ORIGINS` staging diketatkan ke domain saja, akses langsung via IP server sudah ditutup total (lihat Log Perubahan v27 → v28). |
| **Referensi** | PRD.v2.md — Scope: UW-01 s/d UW-06, BT-01, BT-06 |
| **Target** | Undangan bisa dipublish < 5 menit, RSVP jalan, buku tamu jalan, export data jalan |
| **Stack** | Backend: Python (FastAPI) · Frontend: Next.js + Tailwind · DB: PostgreSQL + Redis |

Status: `[ ]` belum dikerjakan · `[~]` in progress · `[x]` selesai

---

## 0. Setup Project

- [x] Init repo monorepo (`/backend`, `/frontend`) atau 2 repo terpisah — putuskan struktur dulu — **monorepo, 1 repo**
- [x] Setup FastAPI project skeleton (`app/main.py`, `app/api/`, `app/models/`, `app/core/config.py`)
- [x] Setup Next.js project skeleton (App Router) + Tailwind config — **Next.js 16, Tailwind v4**
- [x] Setup PostgreSQL lokal (docker-compose) + Redis lokal
- [x] Setup `.env` template (DB_URL, REDIS_URL, JWT_SECRET, S3_*, dll) — jangan commit `.env` asli
- [x] Setup linting/formatting: `ruff`/`black` (backend), `eslint`/`prettier` (frontend) — eslint dari `eslint-config-next`, prettier belum ditambah terpisah (belum ada kebutuhan format konflik)
- [x] Setup CI dasar (lint + test on push) — bisa GitHub Actions — `.github/workflows/ci.yml`
- [x] **(baru)** Setup font sesuai styleguide.v2.md §3: self-host Playfair Display + Inter (`next/font` atau `@font-face` lokal), subset Latin, `font-display: swap`
- [x] **(baru)** Pilih & install 1 icon library (Lucide atau Phosphor) sesuai styleguide.v2.md §7 — jangan campur lebih dari satu — **lucide-react**, dipakai di Export/Logout/RSVP toggle/EmptyState/link eksternal
- [x] **(baru)** Pilih library password hashing backend (mis. `passlib[argon2]` atau `bcrypt`) — dipakai di Bagian 2 — **argon2-cffi**

## 1. Database & Model

- [x] Desain ERD final untuk tabel: `users`, `events`, `invitations`, `guests`, `rsvps`, `guestbook_entries` — **"invitations" digabung ke `events`** (1 event = 1 slug undangan, tidak perlu tabel terpisah)
- [x] Tulis migration awal (Alembic untuk FastAPI/SQLAlchemy)
- [x] Tambahkan kolom `tenant_id`/`owner_id` di tabel relevan (multi-tenant di level row) — `Event.owner_id`
- [x] Seed data dummy untuk development (1 event contoh + beberapa guest) — `backend/seed.py`
- [x] **(baru — perbaiki gap UW-03)** Perluas model `Event` agar punya field untuk semua data yang diminta UW-03: `dress_code` (text), `waktu_akad` & `waktu_resepsi` (timestamp, terpisah — dua acara bisa beda waktu/lokasi), dan referensi peta (`maps_url` atau `lokasi_lat`/`lokasi_lng`). Tanpa ini, frontend (Bagian 4) tidak punya data untuk ditampilkan.
- [~] **(baru — keamanan, PRD.v2.md Bagian 6)** Tentukan strategi enkripsi untuk kolom PII (nama tamu di `guests`/`rsvps`): minimal enkripsi volume + TLS in-transit sebagai baseline, atau column-level encryption (`pgcrypto`) jika dibutuhkan lebih ketat. Dokumentasikan lokasi & rotasi kunci di secrets manager — jangan hardcode di `.env` yang di-commit. — **Keputusan diambil (baseline), belum diimplementasi**: Postgres di staging hanya reachable dari dalam network Docker compose terisolasi (tidak ada port ke host/internet), jadi risiko sniffing in-transit rendah tanpa TLS eksplisit. Kalau mau lebih ketat: aktifkan `sslmode=require` antara backend↔postgres atau `pgcrypto` di kolom nama tamu.

## 2. Auth & User Management (Backend)

- [x] Endpoint register (email + password)
- [x] **(baru)** Hash password dengan argon2id/bcrypt (cost memadai) sebelum disimpan; jangan pernah log password plaintext
- [x] **(baru)** Kebijakan password minimal (panjang ≥ 8 karakter) & pesan error yang tidak membocorkan apakah email sudah terdaftar (cegah user enumeration)
- [x] Endpoint login → return JWT
- [x] **(baru)** JWT access token berumur pendek (mis. 15–30 menit) + refresh token; pin algoritma (HS256/RS256), tolak `alg: none`
- [x] **(baru)** Endpoint logout/revoke refresh token
- [x] **(baru)** Rate limit endpoint login (Redis) untuk cegah brute-force
- [~] Google OAuth login — **backend siap** (endpoint `/auth/google` verifikasi id_token via `google-auth`, return 503 kalau `GOOGLE_CLIENT_ID` belum diisi), **frontend belum ada tombol "Login with Google"**. Butuh project Google Cloud Console dulu (langkah eksternal, cuma bisa dilakukan pemilik akun) sebelum bisa disambungkan & dites end-to-end.
- [x] Middleware auth (verify JWT, inject `current_user`)
- [x] Endpoint `GET /me` untuk ambil profil user login

## 3. Undangan Editor (UW-01, UW-02)

**Backend:**
- [x] Model `Event` (nama mempelai, tanggal, lokasi, `dress_code`, `waktu_akad`, `waktu_resepsi`, `maps_url`, template_id, slug unik) — field diperluas, lihat Bagian 1
- [x] CRUD endpoint `/events` (create, read, update — punya sendiri saja, cek ownership)
- [x] Validasi input: tanggal tidak boleh di masa lalu, slug harus unik & url-safe

**Frontend:**
- [x] Halaman editor: form input data mempelai, tanggal, lokasi, dress code, jadwal akad/resepsi
- [x] Preview real-time (update tampilan saat form berubah, tanpa perlu save dulu) — layout split-view sesuai styleguide.v2.md §5.6. **Debounce 300ms sengaja tidak diimplementasi**: preview murni re-render client-side tanpa network call, jadi tidak ada beban yang perlu didebounce — instant update justru UX lebih baik.
- [x] Minimal 3 template desain untuk pilihan awal — **4 template**: Klasik, Modern Minimal, Botanical, Elegan Monokrom (layout beda nyata, bukan cuma warna)
- [x] **(baru — perbaiki gap UW-01)** Komponen pemilih template: galeri card dengan thumbnail preview per template, state "terpilih" jelas terlihat

## 4. Halaman Undangan Publik (UW-03, UW-06)

**Backend:**
- [x] Endpoint publik `GET /invitations/{slug}` (tanpa auth) — return data event untuk render, termasuk field baru (dress_code, jadwal akad/resepsi, peta)
- [x] Rate limiting endpoint publik (pakai Redis) untuk cegah abuse

**Frontend:**
- [x] Halaman publik `/[slug]` — render undangan dari data event
- [x] Embed Google Maps untuk lokasi acara (pakai `maps_url`/koordinat dari Bagian 1) — **lazy, tombol "Tampilkan peta" dulu** (lihat item loading time di bawah)
- [x] Info jadwal akad/resepsi (dua waktu terpisah) & dress code
- [x] Meta tag Open Graph dinamis (title, image, description) per undangan untuk preview WhatsApp
- [x] Optimasi loading < 2 detik di koneksi 4G (lazy load gambar, minimal JS, font self-hosted dari Bagian 0) — **diukur sungguhan** pakai Playwright + CDP `Network.emulateNetworkConditions` (profil Regular 4G) + CPU throttle 4x (`scripts/audit-loadtime.mjs`): awalnya 2.0-2.4s (gagal), penyebab utama embed Google Maps pihak ketiga (>70% waktu load). Setelah dijadikan lazy (baru dimuat saat diklik): konsisten ~1.4-1.5s. domContentLoaded selalu <800ms.

## 5. RSVP (UW-04, UW-05)

**Backend:**
- [x] Model `RSVP` (guest_name, jumlah_pax, status_hadir, event_id, created_at)
- [x] Endpoint publik `POST /invitations/{slug}/rsvp` — submit RSVP tanpa login
- [x] **(baru — keamanan)** Rate limiting pada endpoint `POST /rsvp` ini sendiri (Redis) — bukan cuma di endpoint `GET` Bagian 4, karena endpoint tulis inilah vektor spam yang sebenarnya
- [x] **(baru — keamanan, cegah stored XSS/OWASP A03)** Sanitasi & batasi panjang `guest_name` di server sebelum disimpan
- [x] Endpoint privat `GET /events/{id}/rsvps` — lihat semua RSVP (owner only)
- [x] Endpoint export `GET /events/{id}/rsvps/export` → return CSV. **Catatan traceability:** endpoint ini memenuhi UW-05 **dan** BT-06 (export data tamu & kehadiran) — lihat Bagian 6 untuk kejelasan kenapa export buku tamu bukan pemenuhan BT-06.

**Frontend:**
- [x] Form RSVP di halaman publik undangan (nama, konfirmasi hadir/tidak, jumlah orang) — plus validasi jumlah pax (1-20) di sisi client sebelum kirim ke server
- [x] Dashboard mempelai: tabel daftar RSVP + status (Badge, sesuai styleguide.v2.md §5.3/§5.4)
- [x] Tombol export CSV di dashboard
- [x] **(baru)** Empty state ramah saat belum ada RSVP masuk (copy + ilustrasi sederhana, sesuai styleguide.v2.md §5.5) — bukan tabel kosong polos

## 6. Buku Tamu Digital (BT-01)

> **Catatan traceability (v2):** modul ini memenuhi BT-01 (tulis ucapan). BT-06 ("export data tamu & kehadiran") dipenuhi oleh export RSVP di Bagian 5, **bukan** oleh export ucapan di bawah — karena `GuestbookEntry` tidak punya kolom kehadiran. Export ucapan di bawah tetap dikerjakan sebagai nilai tambah turunan BT-01, bukan sebagai pemenuhan BT-06.

**Backend:**
- [x] Model `GuestbookEntry` (nama, pesan, event_id, created_at)
- [x] Endpoint publik `POST /invitations/{slug}/guestbook` — submit ucapan
- [x] **(baru — keamanan)** Rate limiting pada endpoint `POST /guestbook` ini (Redis)
- [x] **(baru — keamanan, cegah stored XSS/OWASP A03)** Sanitasi & batasi panjang `pesan` di server sebelum disimpan; saat render ulang di frontend, pastikan di-escape (default React aman selama tidak memakai `dangerouslySetInnerHTML`)
- [x] Endpoint privat `GET /events/{id}/guestbook` — lihat semua ucapan
- [x] Endpoint export `GET /events/{id}/guestbook/export` → CSV (nilai tambah, bukan pemenuhan BT-06 — lihat catatan di atas)
- [x] **(baru)** Endpoint publik `GET /invitations/{slug}/guestbook` — list ucapan untuk ditampilkan di halaman publik (rate-limited sama seperti GET invitations)

**Frontend:**
- [x] Form ucapan/doa di halaman publik undangan
- [x] List ucapan tampil di halaman publik (opsional, bisa di-toggle mempelai) — **selalu tampil di Fase 1**, toggle on/off belum ada (nice-to-have, bukan blocker)
- [x] Dashboard: lihat & export semua ucapan
- [x] **(baru)** Empty state ramah saat belum ada ucapan masuk, sesuai styleguide.v2.md §5.5

## 7. Testing

- [x] Unit test model & endpoint utama (auth, RSVP, guestbook) — 25 test pytest (`backend/tests/`), semua lolos
- [x] Test rate limiting endpoint publik — **cakup endpoint POST (rsvp, guestbook), bukan hanya GET** — `test_rsvp_submit_rate_limited`, `test_guestbook_submit_rate_limited`
- [x] **(baru)** Test stored XSS: submit `guest_name`/`pesan` berisi `<script>` atau payload HTML, pastikan tersanitasi/di-escape saat disimpan & dirender — pytest + diverifikasi ulang di browser sungguhan (Playwright)
- [x] **(baru)** Test password hashing: pastikan password tidak pernah tersimpan/ter-log plaintext
- [x] Test manual: buka undangan di HP low-end (cek loading time) — **diganti versi terukur**: emulasi viewport mobile (Playwright) + throttle network "Regular 4G" & CPU 4x via CDP (`scripts/audit-loadtime.mjs`), bukan cuma buka di HP fisik. Lihat hasil di Bagian 4.
- [x] Test share link ke WhatsApp — pastikan Open Graph preview muncul benar — meta tag OG diverifikasi lewat SSR HTML (curl + Playwright); rendering asli di WhatsApp app tidak bisa dites dari sini
- [x] **(baru)** Audit kontras warna WCAG AA terhitung (`scripts/audit-contrast.mjs`) — 32 pengecekan di semua token sistem + 4 template, semua lolos 4.5:1/3:1 setelah 3 warna token (success/danger/warning) digelapkan karena awalnya gagal

## 8. Deployment

- [x] Setup staging environment (server terpisah dari production) — Lightsail `15.232.71.64` (server bersama, ada Odoo produksi klien lain — deploy dengan `mem_limit` ketat per container supaya tidak ganggu)
- [x] Setup domain + HTTPS untuk staging — **update, lihat Log Perubahan v7 → v8**: `https://demo.ecodigitus.com`, bukan lewat Nginx biasa tapi Nginx Proxy Manager (NPM) di server terpisah (`100.79.166.41`, "server utama" — juga menjalankan banyak service produksi klien lain: beberapa Odoo, app PHP/Node lain), routing path-based (bukan subdomain wildcard) ke Lightsail `15.232.71.64`. HTTPS ditangani Cloudflare (mode Flexible) di depan NPM, bukan Let's Encrypt langsung.
- [x] Deploy backend + frontend ke staging — image di-build lokal, di-transfer via `docker save`/`scp`/`docker load`, dijalankan via `docker-compose.prod.yml`
- [x] Smoke test end-to-end di staging — **update, lihat Log Perubahan v4 → v5**: regresi Playwright penuh (Fase 1 & 2) sekarang benar-benar dijalankan lewat browser sungguhan ke URL staging (`scripts/verify-staging-fase1.mjs`, `scripts/verify-staging-fase2-part1.mjs`/`part2.mjs`), bukan cuma localhost — celah ini yang sebelumnya menyembunyikan 2 bug production (lihat log v5)

## 9. Fase 2 (sebagian) — Payment/Billing (Xendit) + Kelola Tamu (UW-08)

Diprioritaskan atas pilihan pemilik produk: Payment/Billing infrastructure duluan, lalu Kelola Tamu. Custom Domain dan Smart WhatsApp sengaja **belum** dikerjakan (di luar scope batch ini).

**Backend:**
- [x] Model `Payment` (`user_id`, `tier_purchased`, `amount_idr`, `status`, `xendit_invoice_id` unik, `checkout_url`, `paid_at`) + kolom `User.tier` (`lite`/`premium`, default `lite`) + migration (backfill aman untuk baris existing)
- [x] Integrasi Xendit Invoice API (`app/services/xendit.py`) — buat invoice, redirect sukses/gagal ke dashboard billing
- [x] Endpoint `GET /billing/status`, `POST /billing/upgrade`, `POST /billing/webhook/xendit`
- [x] **(keamanan)** Verifikasi webhook via header `x-callback-token` dibandingkan `hmac.compare_digest` (constant-time) — tolak kalau token kosong/tidak cocok; invoice tak dikenal diabaikan diam-diam (204), bukan dibocorkan lewat status code beda
- [x] Model `Guest` diperluas: `session_label`, `max_pax` (default 1), `invite_token` unik (`secrets.token_urlsafe(9)`) + migration backfill token unik ke baris existing
- [x] CRUD endpoint Kelola Tamu (`/events/{id}/guests`) — digembok `require_premium` (402 kalau bukan Premium)
- [x] Endpoint publik `GET /invitations/{slug}/guest/{token}` — data minimal (nama, max_pax, status), tidak expose kategori/sesi/event_id
- [x] RSVP submission menerima `guest_token` opsional: kalau ada, nama tamu dikunci (anti-impersonasi) & `jumlah_pax` divalidasi ≤ `max_pax`; submit ulang via token yang sama melakukan upsert (update baris RSVP lama, bukan duplikat)
- [x] Test pytest: webhook signature (tolak token salah/kosong, terima token benar), upgrade tier setelah webhook PAID, gating premium Kelola Tamu, CRUD, alur token→RSVP, validasi max_pax — 40 test lolos total (naik dari 25 di Fase 1)

**Frontend:**
- [x] `lib/types.ts` + `lib/api.ts`: tipe & fetcher untuk billing (`BillingStatus`, `Payment`) dan guests (`Guest`, `GuestInput`, `PublicGuest`)
- [x] Dashboard Billing (`/dashboard/billing`) — harga dari `premium_price_idr` (bukan hardcode di frontend), tombol upgrade redirect ke `checkout_url` Xendit, deteksi `?status=success|failed` dari redirect
- [x] Dashboard Kelola Tamu (`/dashboard/guests`) — paywall kalau bukan Premium (cek `user.tier` dari `useAuth()`, konsisten dengan gating backend), CRUD tamu, badge status (Menunggu/Hadir/Tidak Hadir), copy link personal (`/{slug}?g={invite_token}`)
- [x] `StatusBadge` (`components/ui.tsx`) — tambah varian `"menunggu"` (sebelumnya sengaja dibatasi ke hadir/tidak_hadir di Fase 1 karena belum ada roster tamu untuk direkonsiliasi)
- [x] `DashboardNav` — tambah link "Kelola Tamu" & "Billing"
- [x] Halaman publik `[slug]` — deteksi `?g=token` (searchParams), fetch data tamu server-side, teruskan ke `RsvpForm`
- [x] `RsvpForm` — mode "link personal": nama ditampilkan terkunci ("Halo, {nama}!"), input `jumlah_pax` dibatasi `max`={max_pax tamu}, kirim `guest_token` saat submit
- [x] Verifikasi end-to-end (`scripts/verify-fase2.mjs`, Playwright): login premium → billing status → Kelola Tamu (tambah tamu, copy link, cek badge Menunggu) → buka link personal di context terpisah (nama terkunci, cap pax) → submit RSVP → status di dashboard owner berubah jadi Hadir → validasi server menolak `jumlah_pax` melebihi `max_pax` (422) → paywall Kelola Tamu untuk user Lite. Semua lolos, 0 console error.

- [x] Halaman RSVP dashboard (`/dashboard/rsvp`) digabung dengan roster tamu — tamu Premium yang belum RSVP sama sekali (`rsvp_status === "menunggu"`) sekarang juga muncul di tabel ini (bukan cuma di Kelola Tamu), dengan baris placeholder ("—" untuk jumlah/waktu) + ringkasan header "N menunggu respons". User Lite (tanpa roster) tidak berubah — tetap hanya menampilkan submission RSVP aktual.

**Belum dikerjakan (di luar scope batch ini, jangan dianggap selesai):**
- [x] Kredensial Xendit asli — **update, lihat Log Perubahan v8 → v9**: sudah terpasang (Test Mode) + diverifikasi end-to-end dengan invoice sungguhan (bukan cuma mock lagi)
- [x] Amplop Digital (UW-09) — **update, lihat Log Perubahan v12 → v13**: opsi 1 (info transfer statis, tanpa QRIS) sudah diimplementasi. Upload QRIS & integrasi disbursement masih belum.
- [ ] Custom Domain (UW-10 atau setara) — belum digarap *(perbaikan label: sebelumnya salah tertulis "UW-09" di sini — per PRD.v2.md, UW-09 itu Amplop Digital, Custom Domain adalah UW-10)*
- [ ] Smart WhatsApp broadcast (UW-07) — belum digarap

---

## 10. Fase 3 (sebagian) — QR Check-in (BT-02)

Scope Fase 3 penuh per PRD.v2.md: BT-02 (QR Check-in), BT-03 (Selfie Check-in),
BT-04 (Auto Thank You Message), BT-05 (data kehadiran real-time & kategori
tamu). Batch ini **cuma BT-02** — dipilih karena satu-satunya yang tidak
butuh integrasi eksternal baru (BT-03 butuh keputusan provider S3-compatible,
BT-04 butuh integrasi WhatsApp yang sama dengan UW-07 yang juga belum
digarap). BT-05 (kategori tamu) sudah sebagian terpenuhi dari Fase 2
(`Guest.category`); "data kehadiran real-time" akan otomatis terisi begitu
BT-02 aktif (check-in venue jadi sumber data selain RSVP self-report).

**Desain:**
- Tiap tamu di roster (Kelola Tamu, UW-08) sudah punya `invite_token` unik —
  dipakai ulang sebagai payload QR, tidak perlu kolom/token baru.
- QR ditampilkan ke tamu di halaman publik personalnya (`/{slug}?g={token}`)
  begitu mereka konfirmasi **hadir** — di-generate di browser tamu (client-side,
  library `qrcode`), tidak ada endpoint generate-image di backend.
- Scan dilakukan HANYA oleh pemilik akun (mempelai/WO) dari halaman dashboard
  khusus, pakai kamera device — bukan endpoint publik — supaya tamu tidak bisa
  check-in diri sendiri secara curang. Decode QR pakai library `jsqr` (baca
  frame kamera via `<video>`+`<canvas>`, murni di browser, tidak kirim
  gambar ke server).
- Idempotent: check-in ulang pada tamu yang sudah check-in tidak error, cuma
  tampil "sudah check-in sebelumnya" + waktu aslinya.
- **Keputusan produk (dikonfirmasi ke pemilik produk):** QR check-in
  **sengaja dibatasi** ke tamu roster yang diundang lewat link personal
  Kelola Tamu — TIDAK berlaku buat tamu yang RSVP lewat link undangan umum
  (anonim, tanpa `guest_token`). Artinya kalau owner cuma share satu link
  undangan ke semua tamu (pola paling umum), QR check-in efektif tidak akan
  muncul buat siapa pun — owner harus input tamu satu-satu di Kelola Tamu +
  share link personal masing-masing supaya fitur ini kepakai. Trade-off ini
  disadari & diterima, bukan bug.

**Backend:**
- [x] Tambah kolom `Guest.checked_in_at` (nullable timestamp) + migration —
  simpan sebagai field di `Guest`, bukan tabel terpisah (relasi 1:1, tidak
  perlu riwayat multi-scan untuk kebutuhan sekarang)
- [x] Endpoint `POST /guests/check-in` (bukan `/events/{id}/guests/{id}/...`
  seperti rencana awal — diubah saat implementasi karena saat scan cuma ada
  `invite_token` di tangan, `event_id`/`guest_id` belum diketahui sampai
  token itu dicocokkan; ownership dicek dari `event.owner_id` setelah lookup)
  — owner only, gated `require_premium` sama seperti Kelola Tamu — set
  `checked_in_at = now()` kalau belum, kalau sudah return data existing
  (idempotent, bukan error)
- [x] `GuestOut` tambah field `checked_in_at: datetime | None`
- [x] Test pytest: check-in sukses, check-in ulang idempotent, non-owner
  ditolak, non-premium ditolak (402) — 5 test baru, total pytest 40 → 45

**Frontend:**
- [x] Install `qrcode` (generate) + `jsqr` (decode dari kamera)
- [x] Halaman publik personal (`RsvpForm`/halaman `[slug]`): kalau
  `status_hadir === true`, tampilkan QR code (encode `invite_token`) +
  pesan "Tunjukkan QR ini saat kedatangan" — juga tampil ulang tanpa perlu
  submit lagi kalau tamu buka link personalnya kedua kali (`already_responded`
  + `status_hadir === true`)
- [x] Halaman dashboard baru `/dashboard/checkin` — akses kamera device
  (`getUserMedia`), scan QR real-time, panggil endpoint check-in, tampilkan
  feedback (nama tamu + sukses/sudah check-in sebelumnya)
- [x] Kelola Tamu: kolom "Check-in" per tamu (centang + jam, atau "—")
- [x] **(baru — perbaiki gap UX)** Tombol "Lihat QR" per tamu di Kelola Tamu
  (`GuestQrModal`) — awalnya QR cuma bisa dilihat tamu sendiri di halaman
  publik personalnya, **setelah** mereka konfirmasi hadir. Ketahuan
  membingungkan owner (QR "tidak ada" padahal fiturnya sudah jalan — tamu
  cuma RSVP lewat link umum, bukan link personal). Sekarang owner bisa
  preview + download QR (PNG) kapan saja dari dashboard, tidak perlu nunggu
  tamu RSVP dulu — buat siapin/cetak kartu QR sebelum acara.
- [x] Verifikasi: pytest untuk backend; Playwright untuk generate-QR di
  halaman publik (visual, cek kanvas benar-benar berisi gambar) + panggilan
  endpoint check-in langsung (simulasi "seolah ter-scan") untuk verifikasi
  update status di Kelola Tamu. Loop decode `jsQR` dari kamera SUNGGUHAN
  tidak tervalidasi (perlu device asli) — **lihat temuan penting di bawah**,
  ternyata ini bukan cuma gap testing tapi keterbatasan nyata di staging.

**Temuan penting — kamera (`getUserMedia`) TIDAK BISA jalan di staging saat ini:**
Sama seperti bug Clipboard API yang ketahuan sebelumnya (Log Perubahan v5),
`navigator.mediaDevices` **tidak ada sama sekali** di browser kalau origin-nya
bukan secure context (HTTPS atau `localhost`) — dikonfirmasi lewat
`window.isSecureContext === false` di `http://15.232.71.64:3000`. Beda dari
Clipboard API, kamera **tidak punya fallback legacy** apa pun (vendor-prefix
`getUserMedia` sudah lama dihapus browser modern) — jadi ini bukan bug kode
yang bisa diperbaiki, murni keterbatasan platform. Halaman `/dashboard/checkin`
sudah menampilkan pesan error yang jelas (bukan crash/diam), tapi **scan QR
sungguhan cuma akan berfungsi setelah staging punya HTTPS** — yang notabene
juga butuh domain (item "belum" lain di Bagian 8). Sisi tampilan QR ke tamu
(canvas, `qrcode` library) TIDAK terpengaruh — itu berfungsi normal di HTTP.

Opsi buat tes sisi scan sebelum domain+HTTPS siap: (1) tes di `localhost`
(sudah diverifikasi, lolos); (2) tunnel HTTPS sementara (ngrok dkk) ke
staging; (3) di Chrome/Edge, flag
`chrome://flags/#unsafely-treat-insecure-origin-as-secure` bisa menandai
origin ini "aman" secara lokal di device tester — cukup buat WO/mempelai
gladiresik sebelum domain beres, jangan dipakai user umum.

---

## 11. Fase 3 (lanjutan) — Mode Registrasi-Saja (RG-01 s/d RG-07)

> **STATUS: SUDAH DIIMPLEMENTASI & LIVE DI STAGING** (`https://demo.ecodigitus.com`).
> Checkbox di bagian ini diisi `[x]` sesuai realisasinya — beberapa catatan
> "beda dari rencana" ditambahkan inline. Requirement & keputusan produknya
> ada di `PRD.v2.md` Bagian 3 (tabel RG) + Bagian 19/20. Ringkasan deploy &
> bug yang ditemukan selama implementasi ada di Log Perubahan v22 → v23
> (bagian bawah file ini).

Untuk pasangan yang **undangannya sudah ada di luar platform** — sudah beli
undangan digital dari vendor lain, atau sudah cetak undangan kertas — tapi
butuh sistem registrasi + check-in venue. Hari ini mereka harus bikin undangan
kedua di platform kita, yang jadi objection terbesar saat jualan.

### 11.1 Kenapa ini murah (hasil audit kode, bukan asumsi)

Sebagian besar sudah jalan hari ini — dicek langsung ke kode sebelum rencana
ini ditulis:

- `POST /invitations/{slug}/rsvp` (`app/api/routes/rsvp.py`) dikunci ke `slug`
  + `guest_token` **opsional**, bukan ke template undangan. Jalur RSVP anonim
  (tamu isi nama sendiri) **sudah berfungsi** — tidak perlu endpoint baru.
- Payload QR check-in murni `invite_token` (`components/GuestQrCode.tsx`),
  independen dari halaman mana pun yang merender undangan. Seluruh alur
  check-in venue tidak perlu disentuh sama sekali.
- `template_id` sejak awal `String(50)` free-string tanpa enum/allowlist —
  bisa langsung **di-reuse** sebagai pemilih palet halaman registrasi. Tidak
  perlu kolom tema baru, tidak perlu palet warna baru, dan karena 7 palet
  existing sudah lolos `scripts/audit-contrast.mjs` (52 pengecekan), mode ini
  **tidak menambah satu pun entri audit kontras**.
- Upsert RSVP untuk tamu ber-token sudah ada (`rsvp.py`, cabang `existing`) —
  dipakai ulang untuk kunjungan kedua tamu auto-enroll, nol logic baru.

Yang genuinely belum ada: halaman registrasi yang tidak ikut merender template
undangan, penanda mode di `Event`, dan auto-enroll (RG-05).

### 11.2 Desain & keputusan teknis

**Penanda mode.** `Event.mode`: `String(20)`, `server_default="full"`,
`nullable=False` — nilai `"full"` (perilaku sekarang) | `"registration_only"`.
Pakai pola `server_default` yang sama dengan migrasi `show_countdown`
sebelumnya, supaya baris existing terisi tanpa langkah backfill terpisah.
**Berbeda dari `package`/`addons`, kolom ini BOLEH masuk `EventUpdate`** dan
diubah owner langsung — mode tidak memberi kapabilitas berbayar apa pun, cuma
memilih halaman publik mana yang disajikan. (Alasan ini perlu ditulis di
komentar model, karena pembaca berikutnya akan wajar curiga setelah pola
webhook-only `package`/`addons`.)

**RG-05 auto-enroll adalah syarat kelayakan, bukan pelengkap.** QR check-in
sengaja dibatasi ke tamu roster ber-link-personal (keputusan produk di Bagian
10 di atas). Di mode ini undangan vendor umumnya memuat **satu** link umum
untuk semua tamu → tanpa auto-enroll tidak ada tamu yang pernah punya
`invite_token` → **nol QR terbentuk**, kita menjual sistem QR yang tidak
menghasilkan QR. Auto-enroll menutup celah: tamu RSVP dari link umum → baris
`Guest` terbentuk otomatis → `invite_token`-nya dikembalikan → QR langsung
tampil di layar tamu untuk di-screenshot.

**Dedupe: tidak bisa lewat SQL, dan itu bukan bug yang bisa diperbaiki.**
`Guest.name` dienkripsi Fernet (`app/db/encrypted_types.py`) — non-deterministik
(IV acak per nilai), jadi `WHERE name = '...'` **tidak akan pernah cocok**.
Solusi yang dipilih: serahkan `invite_token` hasil auto-enroll ke browser tamu
(`localStorage`, key per slug), sehingga kunjungan berikutnya otomatis masuk
jalur upsert link-personal yang sudah ada. Nol mesin dedupe baru.
**Trade-off yang diterima:** tamu yang RSVP dari 2 device berbeda menghasilkan
2 baris roster + 2 QR — owner hapus manual dari Kelola Tamu. Opsi masa depan
kalau jadi keluhan nyata: blind index (kolom `name_fingerprint` =
HMAC-SHA256 dari nama ternormalisasi — searchable tanpa membocorkan plaintext)
+ backfill sekali jalan. **Jangan** ambil jalan pintas "decrypt semua tamu lalu
bandingkan di Python" — itu membuat endpoint publik bekerja proporsional ke
ukuran roster (sampai 1.200 baris), amplifikasi beban yang tidak perlu.

### 11.3 Backend

- [x] Kolom `Event.mode` + migrasi Alembic (`server_default="full"`,
      `nullable=False`) — aditif, tidak menyentuh data existing. Migrasi
      `d1f4a9c3e8b2`
- [x] `mode` masuk `EventUpdate` + `EventOut` + `EventPublicOut`
      (`app/schemas/event.py`) — `EventPublicOut` perlu supaya frontend tahu
      harus redirect. Divalidasi lewat `Literal["full", "registration_only"]`
      (bukan `str` bebas seperti `template_id`) — Pydantic otomatis menolak
      nilai lain dengan 422
- [x] **Auto-enroll (RG-05)** di `submit_rsvp` (`app/api/routes/rsvp.py`):
      kalau `event.mode == "registration_only"` **dan** `payload.guest_token`
      kosong **dan** `event.package is not None` → buat `Guest` baru (`name` =
      nama tersanitasi dari form, `max_pax` = `payload.jumlah_pax`,
      `self_registered=True` — kolom baru, lihat catatan di bawah), lalu buat
      `RSVP` yang tertaut ke guest itu
- [x] **Penegakan kapasitas paket di jalur publik** — diekstrak jadi
      `guest_capacity_remaining(db, event)` di `app/services/guest_capacity.py`
      (baru, bukan di `guests.py` seperti rencana awal — dipisah ke modul
      `services/` biar tidak ada import lintas-route-module), dipanggil dari
      `create_guest` (owner) DAN auto-enroll (publik). Kalau penuh: 409
      dengan pesan ke tamu ("Kuota tamu acara ini sudah penuh, hubungi
      mempelai ya") — beda dari pesan 409 `create_guest` yang menyebut
      "upgrade paket" (ditujukan ke owner)
- [x] `RSVPOut` tambah `guest_token: str | None` — diisi manual lewat helper
      `_to_rsvp_out()` (bukan dari atribut ORM, `RSVP` tidak punya kolom ini),
      **hanya** dipanggil dengan nilai non-None dari cabang yang baru membuat
      Guest. Komentar eksplisit ditulis di schema & route
- [x] Rate limit khusus jalur auto-enroll (`rsvp-autoenroll`, **15/60s** —
      sesuai usulan) — **beda dari rencana**: diterapkan manual di dalam
      handler (`await limiter(request)`), BUKAN lewat `Depends()` di
      dekorator route seperti limiter `rsvp-submit` yang sudah ada. Alasannya:
      mode baru diketahui SETELAH event di-lookup dari slug, dan
      `Depends()` di dekorator berlaku unconditional untuk semua request ke
      endpoint itu — tidak bisa dibuat kondisional per-mode dari sana.
      `submit_rsvp` jadi `async def` untuk bisa `await` limiter secara manual
- [x] Gating paket: mode registrasi-saja tetap butuh `event.package is not None`
      untuk auto-enroll (karena membuat baris roster = fitur Kelola Tamu).
      Event tanpa paket → jalur RSVP anonim lama (tanpa roster, tanpa QR),
      perilaku persis seperti sekarang
- [x] **(Baru, tidak ada di rencana awal)** Kolom `Guest.self_registered`
      (`Boolean`, default `False`) + migrasi `9a2c7e15f4d0` — ditambahkan
      untuk memenuhi item §11.4 "tandai tamu hasil auto-enroll", read-only
      (tidak ada di `GuestCreate`/`GuestUpdate`)
- [x] Test pytest (`tests/test_registration_mode.py`, baru):
  - [x] auto-enroll membuat tepat 1 `Guest` + mengembalikan `guest_token`
        (+ `self_registered=True`)
  - [x] submit ulang dengan token itu = upsert, **tidak** membuat guest ke-2
  - [x] kapasitas penuh → 409 dengan pesan yang ditujukan ke tamu
  - [x] `mode="full"` **tidak** auto-enroll — perilaku RSVP anonim lama utuh
        (regression guard, ditulis & dijalankan lebih dulu sesuai TDD)
  - [x] event tanpa paket → tidak auto-enroll, RSVP tetap masuk
  - [x] `guest_token` tidak pernah muncul di response untuk guest existing
        (dites dari 2 jalur: upsert auto-enroll DAN link personal biasa,
        yang terakhir sekaligus jadi regression check `self_registered=False`
        untuk guest yang diinput owner)
  - [x] `mode` di-PATCH ke nilai asing → 422
  - [x] **(tambahan)** rate limit auto-enroll (15/60s) terbukti beda dari
        default (5/60s) lewat test volume request
  - [x] **(tambahan, diminta pemilik produk — "mau ada QR checkin juga?")**
        `guest_token` hasil auto-enroll benar-benar bisa di-scan lewat
        `POST /guests/check-in` (BT-02, endpoint yang sama dipakai tamu
        roster biasa) — sebelum test ini, RG-05 cuma terbukti "menampilkan
        sesuatu yang terlihat seperti QR" (canvas render, lihat 11.6), belum
        "menghasilkan QR check-in yang berfungsi", yang justru tujuan utama
        mode ini
  - **92 pytest lolos** (naik dari 83), `ruff check` bersih

### 11.4 Frontend

- [x] Route baru `app/r/[slug]/page.tsx` — header ringkas (nama mempelai +
      tanggal + lokasi), `RsvpForm`, `GuestbookSection`, plus `GiftInfoSection`
      (lihat catatan di bawah — awalnya tidak ada di rencana route ini, lalu
      ditambahkan). **Reuse komponen apa adanya**, tidak di-fork — tidak
      memakai `InvitationView` sama sekali. Palet dari
      `resolveTemplateTheme(event.template_id)`
- [x] `app/r/[slug]/not-found.tsx` — sejajar dengan `app/[slug]/not-found.tsx`
- [x] `/r/{slug}?g={token}` berfungsi identik dengan `/{slug}?g={token}` —
      `RsvpForm` menerima `guestToken`/`guestInfo` dari prop server yang sama
- [x] `app/[slug]/page.tsx`: `redirect()` server-side ke `/r/{slug}` (meneruskan
      `?g=` kalau ada) saat `mode === "registration_only"`
- [x] Open Graph (UW-06) untuk `/r/{slug}`: "Konfirmasi Kehadiran — X & Y"
- [x] Simpan `guest_token` hasil auto-enroll ke `localStorage` (key per slug) —
      **beda dari rencana**: dibaca lewat `useSyncExternalStore` (bukan
      `useEffect`+`setState` langsung), lihat catatan bug di bawah
- [x] Tampilkan QR segera setelah RSVP "hadir" — reuse `GuestQrCode`
- [x] Editor: toggle "Mode Registrasi-Saja" (RG-01, label akhir beda tipis
      dari draf "Undangan saya dibuat di luar platform"). Saat aktif:
      kartu Musik Latar/Galeri/Countdown disembunyikan total (bukan cuma
      dinonaktifkan), Amplop Digital dipertahankan, pemilih template
      relabel jadi "Palet warna halaman registrasi". PATCH `mode` langsung
      terkirim saat toggle diklik (tidak nunggu tombol "Simpan" form utama)
- [x] Publish tetap wajib — tombol Publish relabel jadi "Publish halaman
      registrasi" saat mode aktif
- [x] **Panduan "Cara sambungkan" (RG-07)** — komponen baru
      `RegistrationLinkCard.tsx`: link siap-copy, snippet
      `<a href="…">Konfirmasi Kehadiran</a>`, dan QR PNG (RG-06, payload URL
      penuh `/r/{slug}`). Fallback `window.prompt` untuk copy gagal sudah
      tercakup lewat `copyToClipboard()` yang sudah ada (tidak perlu kode baru)
- [x] Kelola Tamu: badge "Daftar sendiri" di kolom Nama untuk
      `guest.self_registered === true`
- [x] `/dashboard/checkin` — deteksi payload berupa URL (`/^https?:\/\//i`)
      SEBELUM panggil backend, tampilkan "Ini QR pendaftaran/undangan, bukan
      QR tamu" — lebih cepat & jelas daripada round-trip ke backend yang
      cuma akan bilang "tamu tidak ditemukan"

**Bug ditemukan lewat lint (React Compiler `react-hooks/set-state-in-effect`),
diperbaiki sebelum dianggap selesai:** implementasi awal `RsvpForm`/
`RegistrationLinkCard` memanggil `setState` sinkron di badan effect (baca
`localStorage`/`window.location.origin` lalu langsung `setState`) — lolos
functionally tapi dilarang linter proyek ini. Diperbaiki dengan 2 pendekatan:
`RegistrationLinkCard` pakai lazy `useState(() => window.location.origin)`
tanpa effect (aman karena komponen ini cuma pernah dipasang setelah
`useMyEvent()` selesai fetch client-side, tidak pernah ada di SSR HTML);
`RsvpForm` direstrukturisasi pakai `useSyncExternalStore` untuk baca
`localStorage` (snapshot server selalu `null`, dikoreksi otomatis setelah
hidrasi), effect yang tersisa (fetch `getPublicGuest`) semua `setState`-nya
di dalam callback promise — pola yang sama dengan `lib/use-my-event.ts`.

### 11.5 Keamanan (OWASP) — ringkasan yang wajib dicek saat review

- **A01 Broken Access Control** — 3 titik, **ketiganya dikonfirmasi via pytest**
  (`test_registration_mode.py`): (1) kapasitas paket ditegakkan di jalur
  publik lewat `guest_capacity_remaining()` yang sama dengan `create_guest`;
  (2) `guest_token` di response hanya untuk guest yang baru dibuat (dites di
  2 jalur — auto-enroll upsert & link personal); (3) `mode` boleh
  owner-editable karena tidak memberi kapabilitas berbayar
- **A03 Injection/XSS** — nama tamu lewat `sanitize_name` yang sudah ada; buku
  tamu sudah tersanitasi. Nol mekanisme baru, tapi jalur masuknya bertambah
  (auto-enroll menulis nama ke roster, bukan cuma ke tabel RSVP) — pastikan
  sanitasi ada di jalur baru itu juga
- **A05 Security Misconfiguration** — `X-Frame-Options: DENY` tetap **global**
  (`frontend/next.config.ts`, `backend/app/main.py`). Mode ini tidak butuh
  pengecualian framing apa pun karena embed di luar scope. Kalau nanti embed
  digarap: pengecualian **per-route** + `frame-ancestors` allowlist per-event,
  `/dashboard/*` wajib tetap DENY (kalau di-blanket, dashboard owner terbuka ke
  clickjacking)
- **Kebocoran Referer** — `Referrer-Policy` sekarang global
  `strict-origin-when-cross-origin`. Untuk `/r/*` turunkan ke `no-referrer`:
  link dari halaman vendor bisa membawa `?g={token}` dan halaman vendor bisa
  punya tracker pihak ketiga. Dampak rendah (token cuma berlaku untuk 1 tamu),
  tapi mitigasinya satu baris
- **`guest_token` di `localStorage`** — trade-off diterima: token cuma
  mengizinkan ubah RSVP sendiri + lihat QR sendiri, bukan akses data tamu lain.
  Risiko device bersama/hilang dianggap sepadan dengan hilangnya kebutuhan
  mesin dedupe
- **UU PDP** — notice privasi di form `/r/{slug}` **lebih penting** dari di
  halaman undangan biasa: tamu datang dari halaman vendor dan mungkin tidak
  sadar sudah berpindah ke sistem lain. Notice harus menyebut siapa pengelola
  datanya

### 11.6 Verifikasi

- [x] pytest untuk seluruh kasus di 11.3 — regression guard `mode="full"`
      ditulis & dijalankan lebih dulu (TDD). **92 pytest lolos** (dari 83,
      termasuk test check-in sungguhan yang ditambahkan di Log Perubahan
      v24→v25)
- [x] Playwright (`frontend/scripts/verify-registration-mode.mjs`, baru):
      `/r/{slug}` ter-render; RSVP anonim → QR muncul di layar; **reload
      halaman → QR masih muncul tanpa submit ulang** (bukti `useSyncExternalStore`
      + `localStorage` + upsert bekerja); `/{slug}` redirect ke `/r/{slug}`;
      toggle mode di editor + panduan "Cara Sambungkan" muncul; `self_registered`
      tercatat benar di DB. **Dijalankan 2×**: lokal (`localhost:3000`) dan ulang
      ke domain nyata (`https://demo.ecodigitus.com`, via `STAGING_SSH_HOST` —
      psql grant lewat SSH+`docker exec`, Postgres staging tidak expose port).
      Kapasitas-penuh (409 pesan ramah) & `/r/{slug}?g={token}` dites via pytest,
      tidak diulang di Playwright (redundan)
- [x] axe-core 0 pelanggaran di `/r/{slug}` — dites dengan palet default
      (`klasik`) di kedua run (lokal & domain nyata); **gap ditutup**: diulang
      untuk ke-6 palet lain via `scripts/verify-templates.mjs` (diperluas,
      lihat Log Perubahan v23→v24) — **0 pelanggaran di semua 7 palet**
      termasuk `monokrom`
- [x] `tsc --noEmit` + `eslint` + `ruff check` bersih — 2 error
      `react-hooks/set-state-in-effect` ditemukan & diperbaiki (lihat catatan
      bug di 11.4) sebelum lolos
- [x] Verifikasi ke `https://demo.ecodigitus.com` setelah deploy — Backup-First
      Protocol diikuti (`pg_dump -Fc` segar, `wedding_saas_pre_regmode_20260820.dump`,
      diverifikasi via `pg_restore -l`, 54 TOC entries) walau migrasi ini murni
      aditif (nol `DROP COLUMN`, beda dari precedent v16→v17 yang memang
      men-drop kolom)

### 11.7 Genuinely di luar scope batch ini

- **Embed iframe/widget** form RSVP ke dalam halaman vendor — mayoritas vendor
  undangan digital di pasar tidak mengizinkan inject HTML/iframe, jadi effort +
  kerja keamanannya tidak sepadan sebelum ada permintaan nyata
- **API partner B2B2C** + webhook RSVP untuk vendor — butuh API key per-tenant,
  scoping, HMAC. Tunggu vendor benar-benar minta; relevan bareng Program Mitra
  (Fase 5)
- **Dedupe lintas-device** (blind index `name_fingerprint`) — lihat alasan di
  11.2, ditunda sampai jadi keluhan nyata
- **UW-10 Custom Domain** — masih ditunda seperti sebelumnya, tidak terkait
- ~~**Harga mode ini**~~ — **diputuskan pasca-deploy**: pemilik produk konfirmasi
  "samakan dengan yang ada sekarang", jadi 3 paket yang sama tanpa SKU baru
  (lihat `PRD.v2.md` Bagian 10 & Log Perubahan v22→v23 di bawah). Nol
  perubahan kode — `PACKAGE_CATALOG` sudah dipakai apa adanya sejak implementasi
- ~~**Gap axe-core lintas-palet**~~ — **ditutup di Log Perubahan v23→v24**:
  `scripts/verify-templates.mjs` diperluas untuk axe-scan `/r/{slug}` per
  template (bukan cuma `/{slug}`), 0 pelanggaran di semua 7 palet termasuk
  `monokrom`.

### 11.8 Urutan pengerjaan yang disarankan

1. Kolom `Event.mode` + migrasi + schema (paling dasar, semua bergantung ini)
2. Test regression `mode="full"` **dulu** — pastikan jalur RSVP lama tidak
   berubah sebelum menyentuhnya
3. Ekstrak helper kapasitas + auto-enroll backend + test kasus keamanannya
4. Route `/r/[slug]` + redirect dari `/{slug}`
5. `localStorage` handoff + tampilkan QR
6. Toggle editor + panduan "Cara sambungkan" + QR tingkat-acara
7. Playwright + axe-core → deploy staging (dengan backup DB dulu)

---

## Urutan Pengerjaan yang Disarankan

1. Setup Project → Database & Model → Auth
2. Undangan Editor → Halaman Undangan Publik (paralel dengan RSVP backend)
3. RSVP (backend + frontend) → Buku Tamu (backend + frontend)
4. Testing menyeluruh → Deploy staging → validasi ke 20–30 pasangan (sesuai target PRD)

## Catatan

- Item Fase 2+ (payment, custom domain, QR Check-in, Wedding Planner, program Mitra) **belum masuk file ini** — akan dibuatkan `task.md` terpisah per fase setelah Fase 1 selesai & divalidasi.
- Referensi detail requirement: lihat `PRD.v2.md` bagian 3 (Scope Produk).

### Catatan keamanan untuk task.md fase berikutnya (jangan lupa saat dibuat)

Dua gap keamanan dari audit **relevan mulai fase setelah Fase 1**, bukan Fase 1 — dicatat di sini agar tidak hilang saat `task.md` Fase 2/3 dibuat:

- **Fase 2 (Payment):** webhook konfirmasi pembayaran wajib verifikasi signature/callback token dari Midtrans/Xendit sebelum mengubah status tier; tambahkan idempotency key untuk cegah replay; jangan percaya body webhook tanpa verifikasi.
- **Fase 3 (Selfie Check-in, BT-03):** foto wajah tamu adalah PII sensitif — bucket S3 untuk aset ini wajib privat by default, akses lewat signed URL berdurasi pendek, terpisah dari aset publik/template.
- **Privasi (mulai Fase 1):** tambahkan notice singkat penggunaan data di form RSVP & buku tamu, sesuai PRD.v2.md Bagian 5 "Privasi & Retensi Data" (UU PDP No. 27/2022).

---

## Log Perubahan (v1 → v2)

- Bagian 0: tambah task setup font, icon library, dan pilihan library password hashing.
- Bagian 1: perluas Model `Event` dengan `dress_code`, `waktu_akad`, `waktu_resepsi`, `maps_url` (sebelumnya UW-03 tidak punya backing data); tambah task strategi enkripsi PII.
- Bagian 2: tambah password hashing, kebijakan password, JWT hardening (exp pendek + refresh token + pin algoritma), endpoint revoke, rate limit login.
- Bagian 3 & 4: sinkronkan dengan field Model Event baru; tambah task komponen pemilih template; tambah spesifikasi debounce/split-view preview.
- Bagian 5 & 6: tambah rate limiting eksplisit di endpoint POST (sebelumnya hanya disebut di GET); tambah sanitasi input cegah stored XSS; tambah empty state; perbaiki label traceability BT-06 (dipenuhi export RSVP, bukan export buku tamu).
- Bagian 7: tambah test XSS dan test password hashing; perluas test rate limiting ke endpoint POST.
- Tambah catatan keamanan forward-looking untuk task.md Fase 2 (webhook signature) dan Fase 3 (storage privat foto selfie), plus privasi/UU PDP mulai Fase 1.

---

## Log Perubahan (v2 → v3) — Fase 1 selesai dieksekusi

Hampir semua item dicentang `[x]` — dikerjakan, dibangun, dan diverifikasi lewat kombinasi 25 test pytest, ESLint bersih, dan 6 script Playwright yang bisa dijalankan ulang (`frontend/scripts/`: `verify-browser.mjs`, `verify-browser-2.mjs`, `verify-templates.mjs`, `verify-error-messages.mjs`, `audit-contrast.mjs`, `audit-loadtime.mjs`).

**Genuinely masih terbuka (`[ ]`/`[~]`), jangan dianggap selesai:**
- Google OAuth — backend siap, frontend belum ada tombolnya, butuh Google Cloud Console project dari pemilik akun dulu.
- Enkripsi PII kolom (Bagian 1) — keputusan baseline diambil (network Docker terisolasi), belum diimplementasi TLS/pgcrypto eksplisit.
- Subdomain wildcard Nginx (Bagian 8) — belum ada domain untuk staging, masih akses via IP:port.

**Temuan konkret dari testing yang berujung perbaikan kode (bukan cuma "sudah dites"):**
- Loading halaman publik awalnya 2.0-2.4s (gagal target <2s di NFR PRD) karena embed Google Maps pihak ketiga makan >70% waktu load — diperbaiki jadi lazy ("tap to load"), sekarang konsisten ~1.4-1.5s.
- 3 token warna (`--color-success`/`--color-danger`/`--color-warning`) gagal WCAG AA 4.5:1 saat dipakai sebagai teks/badge — ketahuan lewat audit kontras terhitung, bukan cek visual, sudah diperbaiki.
- Pesan error validasi bocor prefix teknis Inggris ("Value error, ...") ke user — diperbaiki di `parseErrorMessage`.
- Kartu form RSVP/Buku Tamu di halaman publik tidak punya background eksplisit — akan pecah kontras di template gelap — diperbaiki jadi selalu kartu terang.
- Bug logika: klik "Publish" langsung (tanpa "Simpan" dulu) mengirim `is_published` ke endpoint create yang mengabaikannya diam-diam — status tetap draft walau UI bilang sukses. Diperbaiki jadi create-lalu-update dua langkah.

---

## Log Perubahan (v3 → v4) — Fase 2 sebagian: Payment/Billing (Xendit) + Kelola Tamu

Tambah Bagian 9. Prioritas dipilih pemilik produk: Payment/Billing dulu, lalu Kelola Tamu (UW-08); Custom Domain & Smart WhatsApp ditunda. Detail lengkap ada di Bagian 9 — ringkasan: model `Payment` + `User.tier`, integrasi Xendit Invoice API + webhook (verifikasi `x-callback-token` via `hmac.compare_digest`), Kelola Tamu (CRUD + link personal per tamu via `invite_token`) digembok Premium, RSVP publik terhubung ke token tamu (nama terkunci, `max_pax` divalidasi server-side). Total test pytest naik 25 → 40. Diverifikasi end-to-end lewat Playwright (`scripts/verify-fase2.mjs`) mencakup gating premium, CRUD, copy-link, submit RSVP via link personal di browser context terpisah, dan penolakan `jumlah_pax` melebihi batas.

Genuinely belum dikerjakan: kredensial Xendit asli (baru diuji via mock), Custom Domain, Smart WhatsApp.

Deploy staging: `http://15.232.71.64:3000` (frontend) & `:8000` (backend) — server Lightsail bersama yang juga menjalankan Odoo produksi klien lain; resource dialokasikan dengan `mem_limit` ketat per container, dipantau via `docker stats` agar tidak mengganggu.

---

## Log Perubahan (v4 → v5) — 2 bug production ditemukan & diperbaiki, celah metodologi testing ditutup

Dipicu laporan user tidak bisa login/register di staging. Investigasi menemukan **akar masalah metodologi**: seluruh verifikasi Playwright sejak Fase 1 (termasuk yang "LOLOS") dijalankan ke `localhost` (dev server), tidak pernah ke URL staging sungguhan lewat browser asli — smoke test staging sebelumnya cuma `curl` (cek halaman ke-serve, tidak menjalankan JS). Celah ini menyembunyikan 2 bug yang sudah ada sejak deploy pertama:

1. **`NEXT_PUBLIC_API_URL` kosong saat build image frontend** — Next.js inline env var ini ke bundle JS saat *build* (bukan runtime container), dan ARG Docker yang tidak diisi jadi *string kosong* (bukan "tidak diisi"), sehingga fallback `?? "http://localhost:8000"` di kode tidak pernah kepakai. Akibatnya semua fetch dari browser tamu nyasar ke path relatif di origin frontend sendiri (port 3000), gagal dengan pesan generik. **Dampak: login/register/semua panggilan API dari UI staging tidak pernah benar-benar berfungsi sejak deploy pertama Fase 1**, sampai perbaikan ini. Fix: selalu pass `--build-arg NEXT_PUBLIC_API_URL=http://15.232.71.64:8000` saat build (didokumentasikan di README.md § Deploy ke staging); defensive fix di kode, `??` diganti `||` supaya env var kosong tidak lolos begitu saja.
2. **Tombol "Copy link" (Kelola Tamu) memakai `navigator.clipboard` yang tidak ada di origin HTTP** — Clipboard API browser cuma tersedia di secure context (HTTPS/localhost); staging masih HTTP polos (belum ada domain, lihat Bagian 8). Tombol gagal diam-diam tanpa fallback. Fix: `lib/clipboard.ts` — coba Clipboard API dulu, fallback ke `document.execCommand("copy")`, fallback terakhir `window.prompt` untuk copy manual.

**Perbaikan metodologi (bukan cuma perbaikan bug):** ditambahkan 3 script regresi baru yang menembak URL staging sungguhan lewat browser asli, bukan localhost — `scripts/verify-staging.mjs` (smoke test dasar), `scripts/verify-staging-fase1.mjs` (editor, halaman publik, RSVP anonim, buku tamu, export CSV), `scripts/verify-staging-fase2-part1.mjs` + `part2.mjs` (billing, Kelola Tamu, link personal — dipisah 2 bagian karena butuh set tier premium manual via `psql` di antaranya). Semua lolos setelah kedua bug diperbaiki. Data test dibersihkan dari database staging setiap habis dipakai (bounded `DELETE ... WHERE`, cuma baris test milik sendiri).

**Rekomendasi ke depan:** jalankan `scripts/verify-staging*.mjs` setiap habis deploy frontend, jangan andalkan `curl` smoke test saja — kelas bug ini (env var build-time yang salah, Web API yang butuh secure context) cuma kelihatan kalau JS benar-benar dieksekusi di browser terhadap URL staging asli.

---

## Log Perubahan (v5 → v6) — Fase 3 sebagian: QR Check-in (BT-02)

Tambah Bagian 10. Dipilih sebagai satu-satunya item Fase 3 yang bisa
dikerjakan tanpa integrasi eksternal baru (beda dari BT-03/BT-04 yang butuh
S3/WhatsApp). Ringkasan: `Guest.checked_in_at` + endpoint `POST
/guests/check-in` (idempotent, owner-only, premium), QR di-generate
client-side (`qrcode`) di halaman publik personal tamu begitu status hadir,
di-scan lewat `jsqr` di halaman dashboard baru `/dashboard/checkin`. Test
pytest naik 40 → 45.

**Temuan penting (bukan cuma fitur baru — ada keterbatasan platform nyata):**
kamera (`getUserMedia`) sama sekali tidak bisa diakses di staging saat ini
karena originnya masih HTTP polos (bukan secure context) — persis pola yang
sama dengan bug Clipboard API di v5, tapi kali ini **tidak ada fallback**
yang mungkin secara teknis (beda dari clipboard yang punya `execCommand`).
Sisi tampilkan-QR-ke-tamu tetap berfungsi normal di HTTP; yang terdampak
cuma sisi scan (dashboard mempelai/WO). Diverifikasi lewat browser sungguhan
ke staging (`scripts/verify-staging-checkin.mjs`) — semua lolos termasuk
konfirmasi pesan error kamera yang jelas (bukan crash), dengan pengecualian
loop decode QR dari kamera sungguhan yang memang tidak bisa dites tanpa
HTTPS atau device asli. Ini menaikkan urgensi keputusan domain+TLS (Bagian 8,
"Subdomain wildcard Nginx" — sebelumnya "belum ada domain, akses masih via
IP:port") karena sekarang ada 2 fitur (Clipboard, Camera) yang menunggu itu.

Genuinely belum dikerjakan: BT-03 (Selfie Check-in, butuh keputusan provider S3), BT-04 (Auto Thank You, butuh integrasi WhatsApp/UW-07), BT-05 di luar apa yang sudah otomatis terpenuhi dari BT-02+kategori tamu Fase 2.

---

## Log Perubahan (v6 → v7) — Perbaiki gap UX QR Check-in: preview dari sisi owner

Dipicu laporan pemilik produk sendiri: coba QR check-in di akun asli
(`huhu@gmail.com`, di-upgrade manual ke Premium via `psql` staging atas
permintaan), RSVP "Hadir" lewat link undangan **umum** (bukan link personal
Kelola Tamu) — QR tidak muncul. Investigasi menunjukkan ini bukan bug, tapi
konsekuensi desain: QR memang cuma muncul buat tamu roster yang RSVP lewat
link personal (`?g={token}`). Dikonfirmasi ke pemilik produk untuk
dipertahankan (bukan diperluas ke semua RSVP anonim) — lihat catatan
"Keputusan produk" di Bagian 10.

Ditambahkan `GuestQrModal` (tombol "Lihat QR" per tamu di Kelola Tamu) —
owner sekarang bisa preview + download PNG QR tamu kapan saja dari dashboard,
tanpa perlu tamu itu buka link personalnya dan konfirmasi hadir dulu. Berguna
buat siapin/cetak QR sebelum acara. Diverifikasi lewat browser sungguhan ke
staging (`scripts/verify-staging-qr-preview.mjs`).

---

## Log Perubahan (v7 → v8) — Domain + HTTPS live, kamera QR Check-in akhirnya benar-benar jalan

Dipicu keputusan pemilik produk untuk pasang domain (`demo.ecodigitus.com`,
sudah di-set proxied lewat Cloudflare sebelumnya). Prosesnya tidak sesederhana
rencana awal (Let's Encrypt langsung di Lightsail):

1. Domain resolve ke IP Cloudflare, bukan Lightsail — karena proxied.
2. Reverse proxy yang dituju ternyata bukan di Lightsail, tapi di server
   **terpisah** (`100.79.166.41`, disebut "server utama" oleh pemilik produk)
   — server ini juga menjalankan banyak service produksi klien lain (beberapa
   Odoo — `odoo19_shared`, `odoo18_shared`, `odoo16_shared`, `edig_saas_master`
   — plus app PHP/Node lain, dikelola via Portainer). Baru diketahui saat
   eksplorasi read-only, bukan sebelumnya.
3. Reverse proxy di server itu bukan Nginx biasa, tapi **Nginx Proxy Manager**
   (container `npm`, jc21/nginx-proxy-manager) — dikelola lewat web UI (port
   81), bukan file `/etc/nginx/sites-enabled/` yang bisa diedit manual.
4. Karena server ini asing & sensitif (banyak service produksi klien lain),
   diputuskan pemilik produk yang setup sendiri lewat UI NPM (bukan diserahkan
   ke akses SSH langsung) — Claude cuma kasih konfigurasi "Custom Nginx
   Configuration" (routing path-based: `/auth`, `/billing`, `/events`,
   `/invitations`, `/guests` → backend Lightsail `:8000`; sisanya → frontend
   `:3000`) buat ditempel sendiri di tab Advanced proxy host.
5. SSL/TLS diserahkan ke Cloudflare (mode **Flexible** — Cloudflare urus HTTPS
   ke browser pengunjung, koneksi Cloudflare↔origin tetap HTTP polos) — bukan
   Let's Encrypt di origin, lebih simpel karena Cloudflare sudah di depan.

**2 masalah lanjutan ketahuan pas tes login pertama kali (bukan langsung mulus):**
- `CORS_ORIGINS` di `backend.env` (Lightsail) belum memasukkan
  `https://demo.ecodigitus.com` — diperbaiki (backup dulu, tambah origin baru).
- Frontend masih di-build dengan `NEXT_PUBLIC_API_URL=http://15.232.71.64:8000`
  — begitu diakses lewat `https://demo.ecodigitus.com`, ini jadi **mixed
  content** (halaman HTTPS manggil API HTTP polos), diblokir browser. Rebuild
  ulang dengan `NEXT_PUBLIC_API_URL=https://demo.ecodigitus.com` (manfaatkan
  routing path-based yang sudah disiapkan di NPM — frontend & backend jadi
  satu origin, sekaligus menghindari isu CORS/mixed-content sekalian).

**Hasil akhir — dikonfirmasi lewat browser sungguhan** (`scripts/verify-domain-https.mjs`, `scripts/verify-domain-checkin.mjs`): `window.isSecureContext === true`, `navigator.clipboard` & `navigator.mediaDevices` akhirnya **tersedia** (sebelumnya `undefined` total di HTTP polos — lihat Log Perubahan v5 & v6), dan yang paling penting: **halaman scan QR Check-in (`/dashboard/checkin`) tidak lagi menampilkan error kamera** — video kamera benar-benar dapat frame. Fitur yang dibangun di v6 (BT-02) sekarang genuinely bisa dipakai end-to-end, bukan cuma separuh (tampilan QR jalan, scan tidak) seperti sebelumnya.

Akun asli pemilik produk (`huhu@gmail.com`) di-upgrade manual ke tier Premium via `psql` staging atas permintaan langsung (bukan lewat Xendit — kredensial asli masih belum ada).

**Regresi penuh ulang ke domain baru** (bukan cuma smoke test): seluruh `scripts/verify-staging-fase1.mjs`, `verify-staging-fase2-part1.mjs`/`part2.mjs`, `verify-staging-checkin.mjs`, `verify-staging-qr-preview.mjs` dijalankan ulang dengan `STAGING_URL=https://demo.ecodigitus.com` (bukan IP:port lama) — semua lolos, termasuk `verify-staging-checkin.mjs` yang assertion kameranya diperbaiki supaya adaptif (`isSecure` check dari protokol URL) alih-alih selalu mengharapkan error kamera seperti sebelumnya. `https://demo.ecodigitus.com` sekarang jadi alamat utama staging — dokumentasi/script lain masih menyebut IP:port lama sebagai fallback default kalau `STAGING_URL` tidak di-set (tetap valid buat akses langsung, tapi domain yang direkomendasikan).

---

## Log Perubahan (v8 → v9) — Kredensial Xendit asli terpasang, dites end-to-end sungguhan

Pemilik produk generate API key di dashboard Xendit (Test Mode) dengan izin **Money-in (Read+Write) saja** — sesuai rekomendasi least-privilege, karena kode cuma memanggil satu endpoint (`POST /v2/invoices`), tidak ada fitur Xendit lain yang dipakai. Webhook callback URL diarahkan ke `https://demo.ecodigitus.com/billing/webhook/xendit`, verification token diambil dari halaman Webhooks Xendit.

**Kejadian saat setup:** file export key dari dashboard Xendit (`secret_api_key.csv`) sempat tersimpan mentah di root repo, belum ter-gitignore — langsung ditambahkan ke `.gitignore` sebelum kena `git add`. Test webhook pertama dari dashboard Xendit gagal 401 karena token belum dipasang di server — ini yang membuktikan validasi tokennya benar-benar jalan (bukan bypass diam-diam), bukan bug.

**Diverifikasi end-to-end dengan uang sungguhan (Test Mode, bukan mock lagi):** akun test → klik Upgrade → invoice ASLI dibuat via Xendit API (`checkout-staging.xendit.co/...`) → payment tersimpan `pending` di DB dengan `xendit_invoice_id` asli → webhook disimulasikan dengan token yang benar & `id` yang cocok dengan invoice asli → response 204, payment berubah `paid`, `User.tier` otomatis jadi `premium`. Dicek juga: token salah tetap ditolak 401 (regresi keamanan aman). Data test dibersihkan dari staging setelahnya.

Genuinely masih pakai Test Mode (`xnd_development_...`), bukan Live — perlu langkah verifikasi bisnis di Xendit dulu sebelum pindah ke uang sungguhan produksi.

---

## Log Perubahan (v9 → v10) — Fix bug UX: input waktu akad/resepsi minta tanggal yang tidak pernah dipakai

Dilaporkan pemilik produk lewat screenshot: field "Waktu akad"/"Waktu resepsi" di Editor pakai `<input type="datetime-local">` (minta tanggal + jam), tapi `InvitationView.tsx` (`formatTime()`) cuma menampilkan jamnya ke tamu — tanggal yang diisi user di situ selalu dibuang, tidak pernah dipakai di mana pun. User bingung karena diminta isi data yang percuma & ambigu (tanggal apa yang harus dipilih?).

**Fix:** ganti jadi `<input type="time">` (cuma minta jam), digabung otomatis dengan "Tanggal acara" (`combineDateTime()`) saat dikirim ke backend — kolom DB (`waktu_akad`/`waktu_resepsi`, tetap `timestamp`) & schema backend tidak berubah, cuma cara frontend membentuk nilainya. Diverifikasi lokal + langsung ke domain (`scripts/verify-waktu-akad-fix.mjs`, `scripts/verify-domain-waktu-akad.mjs`) — termasuk cek round-trip lewat backend (isi jam → simpan → reload → jam yang sama muncul lagi, bukan cuma state form lokal).

---

## Log Perubahan (v10 → v11) — Security review penuh (OWASP Top 10 2021)

Review sistematis kategori A01–A10 terhadap seluruh kode yang dibangun sejak awal proyek (bukan cuma diff terakhir — repo belum pernah di-commit sama sekali sampai titik ini). Ringkasan per kategori:

- **A01 Broken Access Control** — diperiksa, **tidak ada temuan**. Semua endpoint owner-scoped (events, guests, rsvp, guestbook) konsisten memanggil `get_event_or_404` + cek `guest.event_id` cocok, tidak ada IDOR.
- **A02 Cryptographic Failures** — password hashing (argon2, default param aman) & JWT (algoritma di-pin) sudah baik. **Ditambahkan**: validator `JWT_SECRET` minimal 32 karakter (cegah operator deploy dengan secret lemah).
- **A03 Injection** — SQL: nihil (ORM konsisten, tidak ada raw SQL string-formatted). **Ditemukan 1 stored XSS asli**: `maps_url` dirender sebagai `<a href>` tanpa validasi skema — owner (atau akun ter-compromise) bisa isi `javascript:...`, dieksekusi saat **tamu** klik "Buka di Google Maps". Diperbaiki di backend (`schemas/event.py`, validator tolak skema selain http/https) + frontend (`isSafeHttpUrl` defense-in-depth di `InvitationView.tsx`). 3 test baru.
- **A04 Insecure Design** — **ditemukan 1 gap**: endpoint publik `GET /invitations/{slug}/guest/{token}` tidak punya rate limit sama sekali (beda dari endpoint publik lain). Diperbaiki (120/60s, konsisten dengan pola lain). Webhook Xendit sudah idempotent & aman dari replay abuse.
- **A05 Security Misconfiguration** — **ditemukan 2 gap**: (1) `cors_origin_regex` default mengizinkan semua `*.vercel.app` (peninggalan percobaan deploy Vercel yang ditinggalkan) — dihapus jadi default `None`; staging kebetulan sudah override manual jadi string kosong (aman secara teknis karena Starlette pakai `fullmatch`, bukan `match`), tapi default kode-nya tetap berbahaya untuk deployment lain. (2) Nol security header sama sekali (X-Frame-Options, X-Content-Type-Options, Referrer-Policy) — ditambahkan di backend (middleware) & frontend (`next.config.ts headers()`). CSP penuh **belum** dipasang (butuh testing ekstensif untuk allowlist Google Maps embed dkk, dicatat sebagai rekomendasi terpisah, bukan blocker).
- **A06 Vulnerable/Outdated Components** — `pip-audit`: 41 vulnerability di 8 paket. Setelah dianalisis, **tidak ada yang genuinely exploitable** di pola pakai kita (HS256 tunggal, tidak ada JWKS client, tidak ada file upload/StaticFiles) — tapi tetap di-bump yang aman (`pyjwt`, `bleach`, `requests`, `python-multipart`) turun jadi 16 vulnerability di 3 paket (sisanya: `pip` bukan runtime, `pytest` dev-only, `starlette` butuh upgrade mayor terpisah — dicatat sebagai rekomendasi, bukan dikerjakan sekarang karena lompatan versi terlalu jauh untuk di-test dadakan). `npm audit`: 0 vulnerability dari awal.
- **A07 Identification & Authentication Failures** — **ditemukan 1 timing side-channel nyata**: `login()` skip `argon2.verify()` sama sekali kalau email tidak ditemukan (short-circuit `or`), beda ~71ms (diukur langsung) dibanding email yang ada tapi password salah — bisa dipakai enumerasi email meski pesan errornya sama. Diperbaiki: `verify_password` SELALU dipanggil (pakai dummy hash kalau user tidak ada). Test timing baru ditambahkan.
- **A08 Software/Data Integrity** — CI bersih (dependency terkunci versi, action resmi saja, tidak ada auto-deploy). Webhook Xendit sudah diverifikasi HMAC constant-time (lihat v9). Repo belum pernah commit — nol risiko secret di git history, tapi juga berarti proteksi `.gitignore` belum pernah teruji nyata.
- **A09 Logging & Monitoring** — **ditemukan gap**: nol logging aplikasi sama sekali (cuma access log default uvicorn). Ditambahkan `logging.basicConfig` + log `WARNING` untuk login gagal (`auth.py`) dan webhook Xendit ditolak (`billing.py`) — proporsional untuk skala MVP ini (`docker logs`), bukan infra SIEM penuh.
- **A10 SSRF** — diperiksa, **tidak ada temuan**. Cuma 1 HTTP call keluar di seluruh backend (Xendit), ke base URL yang di-hardcode, bukan dari input user.

**Insiden kecil saat setup**: file `secret_api_key.csv` (export key Xendit dari dashboard) sempat tersimpan mentah di root repo sebelum di-gitignore-kan — sudah ditangani di v9.

Semua fix diverifikasi: 51 test pytest lolos (naik dari 45), regresi Playwright penuh (lokal + domain) 0 console error, lint bersih. Dideploy ke staging, security header & CORS fix dikonfirmasi live via `curl` langsung ke `demo.ecodigitus.com`.

---

## Log Perubahan (v11 → v12) — Enkripsi kolom PII at-rest (`Guest.name`, `RSVP.guest_name`)

Tindak lanjut temuan A02 di security review v11: nama tamu & nama pengisi RSVP tersimpan plaintext di database. Data ini privat (cuma pemilik event yang boleh baca lewat dashboard) — beda dari buku tamu (`guestbook_entries`), yang sengaja tampil publik di halaman undangan by design, jadi **tidak** ikut dienkripsi (enkripsi di situ tidak menambah kerahasiaan apa pun, cuma menambah kompleksitas).

- **Mekanisme**: `EncryptedString`, sebuah SQLAlchemy `TypeDecorator` (`app/db/encrypted_types.py`) yang transparan di layer ORM — model tetap baca/tulis `str` biasa, enkripsi/dekripsi terjadi otomatis di `process_bind_param`/`process_result_value`. Pakai `Fernet` dari `cryptography` (PyCA, bukan crypto racikan sendiri): AES-128-CBC + HMAC-SHA256 authenticated encryption, jadi ciphertext yang diubah/dipalsukan otomatis gagal didekripsi (`InvalidToken`) alih-alih diam-diam korup.
- **Key management**: `PII_ENCRYPTION_KEY` (env var baru, wajib diisi key Fernet valid — divalidasi saat startup via `field_validator` di `config.py`, gagal cepat kalau salah format). Key **beda** antara lokal dan staging (masing-masing di-generate terpisah, staging disimpan hanya di `backend.env` server). Kehilangan/mengganti key = data lama tidak bisa didekripsi lagi — didokumentasikan di `.env.example`.
- **Migrasi data existing** (`b7ae4cff03dd`): autogenerate Alembic cuma menghasilkan ALTER tipe kolom (`VARCHAR(150)` → `Text`, perlu karena ciphertext lebih panjang dari plaintext) tanpa mengenkripsi baris yang sudah ada — kalau dibiarkan begitu saja, ORM langsung gagal baca semua data lama setelah migrasi (`EncryptedString` selalu mencoba dekripsi apa pun yang dibaca). Migrasi ditulis ulang manual: perluas kolom dulu, lalu enkripsi semua baris existing in-place lewat SQL langsung (bukan ORM, untuk hindari dependency ke model saat migrasi). `downgrade()` simetris (dekripsi balik sebelum kolom dikecilkan lagi).
- **Verifikasi lokal**: 51 test pytest tetap lolos, round-trip encrypt/decrypt diverifikasi manual, export CSV tamu tetap menampilkan nama plaintext yang benar ke owner.
- **Deploy ke staging** (mengikuti Backup-First Protocol — ada data real milik `huhu@gmail.com` di database staging):
  1. Backup `pg_dump -Fc` staging sebelum migrasi apa pun (`/opt/wedding-saas/backups/wedding_saas_pre_pii_encryption_20260813_0347.dump`, diverifikasi valid via `pg_restore --list`).
  2. Key Fernet staging di-generate terpisah dari lokal, ditambahkan ke `backend.env` (backup timestamped dari file env diambil dulu).
  3. Image backend baru ditransfer via `docker save` → `scp` → `docker load` (pola yang sama dipakai di semua deploy staging sebelumnya), restart **hanya** container backend (`--no-deps`) — frontend, postgres, redis, dan kedua container Odoo di server yang sama tidak disentuh.
  4. `alembic upgrade head` dijalankan langsung di container staging — mengenkripsi data tamu & RSVP real milik `huhu@gmail.com` in-place.
  5. Verifikasi: query `psql` langsung ke tabel `guests`/`rsvps` menunjukkan ciphertext (`gAAAAA...`, format token Fernet) menggantikan plaintext, jumlah baris tidak berubah (0 data hilang). Verifikasi dekripsi benar dilakukan lewat ORM aplikasi di dalam container (read-only, tanpa perlu password akun `huhu@gmail.com`) — nama tamu & RSVP asli terbaca benar (`hana`, `kupet`).
  6. Uptime container `odoo18-odoo-1`/`odoo18-db-1` dicek tidak berubah sebelum/sesudah deploy — konfirmasi kedua container Odoo di server yang sama tidak pernah direstart oleh perubahan ini.

---

## Log Perubahan (v12 → v13) — UW-09 Amplop Digital (opsi 1: info transfer statis, tanpa QRIS)

Dipicu pertanyaan langsung pemilik produk soal UW-09. Karena backend belum punya infrastruktur upload gambar sama sekali (config S3 di `.env.example` masih belum dipakai, disiapkan Fase 3), user diberi 3 opsi scope (tanpa upload/URL eksternal/upload S3 baru) dan memilih **opsi 1: cuma teks, tanpa gambar QRIS** — MVP tercepat, nol dependency eksternal baru.

- **Data**: 6 kolom nullable baru di `Event` (`bank_name`, `bank_account_number`, `bank_account_holder`, `ewallet_name`, `ewallet_number`, `ewallet_account_holder`) — migrasi `fa1749bd25df`, cuma `ADD COLUMN` polos (autogenerate Alembic cukup, beda dari migrasi enkripsi PII v11→v12 yang butuh backfill manual, karena ini kolom baru tanpa data existing yang perlu ditransformasi).
- **Tidak dienkripsi** (beda dari `Guest.name`/`RSVP.guest_name`) — data ini sengaja tampil publik di halaman undangan, satu-satunya tujuannya supaya tamu bisa transfer; enkripsi di sini tidak menambah kerahasiaan apa pun (alasan sama dengan buku tamu, lihat v11→v12).
- **Gating Premium**: dicek di route `PATCH /events/{id}` (bukan endpoint terpisah) — kalau payload menyentuh salah satu dari 6 field gift & user bukan Premium, ditolak `402` dengan pesan konsisten seperti `require_premium` di `deps.py`. Field lain (partner name, lokasi, dll) tetap bisa diupdate user tier lite seperti biasa — hanya field gift yang di-gate.
- **Endpoint publik** (`GET /invitations/{slug}`) menampilkan field gift apa adanya kalau terisi — tidak re-check tier saat baca (kalau field-nya terisi berarti sudah lolos gate saat disimpan).
- **Frontend**: kartu "Amplop Digital" terpisah di halaman Editor (bukan bagian form utama) — tombol simpan sendiri, karena cuma bisa disunting setelah event sudah ada. Tier lite lihat CTA upgrade, tier Premium lihat 6 input teks. Halaman publik menampilkan section "Kirim Hadiah" (cuma render kalau minimal satu akun terisi) lewat komponen client baru `GiftInfoSection.tsx` (perlu interaktivitas tombol salin-ke-clipboard, jadi dipisah dari `InvitationView.tsx` yang tetap server component — pola yang sama dengan `LazyMapEmbed.tsx`).
- **Verifikasi**: 54 test pytest lolos (naik dari 51, +3 test baru: gate 402 untuk tier lite, persist+tampil publik untuk Premium, field non-gift tidak ikut ke-gate). `tsc --noEmit` & `eslint` bersih. Verifikasi manual end-to-end via curl (gate 402 → upgrade tier via DB lokal → isi data → cek endpoint publik). Verifikasi UI lewat Playwright (`scripts/verify-gift-info*.mjs`, 3 tahap): tier lite menampilkan upsell bukan form, tier Premium bisa isi & simpan, halaman publik menampilkan detail rekening + tombol salin benar-benar menyalin nomor yang tepat ke clipboard (diverifikasi baca ulang clipboard, bukan cuma cek UI berubah). Scan aksesibilitas axe-core di halaman Editor & halaman publik: 0 pelanggaran.
- **Genuinely belum dikerjakan** (sengaja ditunda, di luar scope batch ini): upload gambar QRIS (opsi 2/3 yang ditolak user), integrasi payment gateway/disbursement untuk amplop digital "aktif" (dana lewat platform dulu baru diteruskan — beda kelas risiko dari billing upgrade tier yang sudah ada), UW-07 (Smart WhatsApp) dan UW-10 (Custom Domain) masih seperti v11→v12.
- **Deploy ke staging**: backup `pg_dump -Fc` dulu (`wedding_saas_pre_amplop_digital_20260813_1327.dump`, diverifikasi lewat `pg_restore --list`, 41 TOC entries). Backend & frontend di-rebuild lokal (frontend dengan `--build-arg NEXT_PUBLIC_API_URL=https://demo.ecodigitus.com` seperti biasa), ditransfer via `docker save`→`scp`→`docker load`, restart cuma `backend`+`frontend` (`--no-deps`) — postgres, redis, dan kedua container Odoo tidak disentuh (uptime terkonfirmasi tidak berubah setelahnya). Migrasi `fa1749bd25df` dijalankan, kolom baru terkonfirmasi ada tanpa mengubah jumlah baris `events` (tetap 2, milik `huhu@gmail.com` & `haha@gmail.com`). Ketiga skrip `verify-gift-info*.mjs` + scan a11y dijalankan ulang lewat `DOMAIN_URL=https://demo.ecodigitus.com` (bukan cuma localhost) — semua lolos, termasuk tombol salin-ke-clipboard yang butuh HTTPS (lihat catatan Secure-context Web API di memori proyek).

---

## Log Perubahan (v13 → v14) — UW-11: Musik Latar, Galeri Foto/Video (URL eksternal), Countdown Timer

Lanjutan langsung dari UW-09 — pemilik produk memilih UW-11 sebagai fitur backlog berikutnya (dari 3 opsi: UW-11, UW-10 Custom Domain, UW-07 Smart WhatsApp — UW-11 dipilih karena paling self-contained, nol keputusan infra/API eksternal). Untuk galeri, ditawarkan opsi scope yang sama seperti QRIS di UW-09 (tanpa upload/via URL eksternal/upload S3 baru) dan dipilih **via URL eksternal** — konsisten, nol infrastruktur upload baru. Musik latar mengikuti keputusan yang sama (awalnya sempat dipikirkan preset lagu bebas royalti bundel, tapi dibatalkan — tidak ada cara membuat/memverifikasi lisensi file audio sungguhan dalam sesi ini) sehingga dibuat via URL eksternal juga, konsisten dengan galeri.

- **Data**: 3 kolom baru di `Event` — `music_url` (nullable `String(500)`), `gallery_urls` (nullable, tipe **`JSON`**, bukan `ARRAY` Postgres — lihat catatan di bawah), `show_countdown` (`Boolean`, `NOT NULL default False`). Migrasi `ca9d40830deb`.
- **Insight teknis penting**: percobaan pertama pakai `sqlalchemy.ARRAY(String(500))` untuk `gallery_urls` — gagal total di test suite (`tests/conftest.py` pakai **SQLite in-memory**, bukan Postgres, untuk kecepatan; `ARRAY` murni tipe Postgres, tidak bisa di-compile SQLite). Migrasi lama dihapus, model diganti ke `JSON` (portable ke kedua dialect — kita cuma pernah baca/tulis list utuh, tidak pernah query ke dalam elemennya, jadi tidak kehilangan kapabilitas apa pun), migrasi di-generate ulang.
- **`show_countdown` NOT NULL ke tabel yang sudah ada isinya**: sama seperti pola di `is_published` awal, tapi kali ini tabel `events` staging sudah punya baris (beda dari `CREATE TABLE` awal). Autogenerate Alembic tidak otomatis kasih `server_default`, jadi migrasi ditulis ulang manual — tambah `server_default=sa.false()` saat `ADD COLUMN`, baru dilepas lagi sesudahnya (`alter_column(..., server_default=None)`) supaya skema akhir tetap konsisten dengan kolom Boolean lain (default cuma di level ORM/Python, bukan DB) tanpa gagal saat backfill baris lama.
- **Gating Premium**: field terpisah (`_UW11_FIELDS`) dari `_GIFT_INFO_FIELDS` (UW-09) di route `PATCH /events/{id}` — pesan error beda per fitur meski mekanisme gate-nya sama persis.
- **Validasi keamanan**: `music_url` & setiap item `gallery_urls` divalidasi skema http/https (fungsi `_assert_safe_http_scheme` di-generalize dari validator `maps_url` yang sudah ada, dipakai bertiga sekarang) — cegah stored XSS lewat `javascript:...`. `gallery_urls` juga dibatasi maks 12 item & 500 karakter/link.
- **Frontend — Editor**: kartu "Musik Latar, Galeri & Countdown" terpisah (pola sama dengan Amplop Digital) — toggle countdown (tombol `aria-pressed`, bukan checkbox — pola toggle yang sudah dipakai di picker template & tab mobile), input link musik, daftar link galeri dinamis (tambah/hapus per baris, maks 12).
- **Frontend — halaman publik** (`InvitationView.tsx`):
  - `CountdownTimer.tsx` (komponen client baru) — target dihitung dari `waktu_akad`/`waktu_resepsi` (yang paling awal) atau tengah malam `event_date` kalau keduanya kosong. **Catatan React Compiler**: percobaan pertama panggil `setState` sinkron di awal `useEffect` (untuk render angka langsung tanpa delay) kena error baru `react-hooks/set-state-in-effect` dari `eslint-plugin-react-hooks@7.1.1` (aturan React Compiler). Diperbaiki: `setState` cuma dipanggil di dalam callback `setInterval` (async), konsekuensinya angka baru muncul ~1 detik setelah mount alih-alih instan — dianggap wajar untuk countdown, dan lebih penting: menghindari potensi hydration mismatch (nilai `Date.now()` server vs klien beda) karena state tetap mulai `null` di kedua sisi.
  - `MusicPlayer.tsx` (komponen client baru) — tombol play/jeda manual (browser blokir autoplay bersuara), state `playing` disinkron lewat event `onPlay`/`onPause` asli di elemen `<audio>`, bukan diasumsikan langsung dari pemanggilan `.play()` (yang async & bisa gagal diam-diam).
  - Galeri dirender langsung di `InvitationView.tsx` (tanpa komponen client terpisah — `<img>`/`<video controls>` tidak butuh interaktivitas JS), tipe media disniff dari ekstensi URL (`.mp4/.webm/.mov/.m4v` → video, selainnya → gambar).
- **Temuan di luar scope (dicatat, tidak diperbaiki)**: saat `npm run lint` dijalankan, muncul 2 error React Compiler baru (`react-hooks/set-state-in-effect` di `app/dashboard/guests/page.tsx`, `react-hooks/immutability`/hoisting di `app/dashboard/checkin/page.tsx`) — di file yang **sama sekali tidak disentuh** baik di UW-09 maupun UW-11. Kemungkinan besar sudah ada sejak `eslint-plugin-react-hooks@7.1.1` ter-install (lockfile belum pernah di-commit ke git sebelum sesi ini, jadi tidak ada riwayat untuk dikonfirmasi persis kapan). Belum diperbaiki karena di luar scope kedua fitur ini — perlu ditangani terpisah.
- **Verifikasi**: 59 test pytest lolos (naik dari 54, +5 test baru: gate 402, persist+tampil publik, tolak skema `javascript:`, tolak >12 item galeri). `tsc --noEmit` bersih, `eslint` bersih untuk semua file yang diubah sesi ini. Verifikasi UI lewat Playwright (`scripts/verify-uw11*.mjs`, 3 tahap + a11y): tier lite menampilkan upsell, tier Premium bisa isi & simpan (musik, toggle countdown, tambah/hapus link galeri), halaman publik menampilkan countdown timer, tombol musik, dan galeri (gambar + video) dengan benar. Scan aksesibilitas axe-core: 0 pelanggaran di Editor & halaman publik.
- **Genuinely belum dikerjakan**: upload galeri/musik langsung (butuh infrastruktur S3, ditolak user demi konsistensi dengan UW-09), UW-07 (Smart WhatsApp), UW-10 (Custom Domain) — masih seperti v11→v12.
- **Perbaikan lint pre-existing** (di luar scope UW-11, tapi dikerjakan sekaligus atas permintaan langsung sebelum deploy): 2 error `react-hooks` (React Compiler) yang ditemukan di file yang tidak disentuh fitur ini — `app/dashboard/guests/page.tsx` (`setLoadingGuests(false)` dipanggil sinkron di body effect padahal nilainya tidak pernah teramati UI di jalur itu, karena render sudah `return` lebih awal untuk kasus `!event`/`!isPremium` sebelum sampai ke JSX yang membaca state itu — dihapus, bukan cuma dipindah) dan `app/dashboard/checkin/page.tsx` (`handleScanned` dipakai di `useEffect` sebelum posisi deklarasinya secara tekstual — aman secara runtime karena function hoisting, tapi linter React Compiler tidak menganalisis itu; diperbaiki dengan memindah deklarasi ke atas `useEffect`, plus hapus 1 komentar `eslint-disable` yang jadi tidak terpakai lagi setelahnya). Diverifikasi lewat smoke test Playwright manual (`scripts/verify-lint-fix-smoke.mjs`, `scripts/verify-guests-premium-smoke.mjs`) — tier lite & premium untuk kedua halaman (Kelola Tamu, QR Check-in) tetap berperilaku sama seperti sebelum fix, 0 error console. `npm run lint` bersih total (0 error) setelahnya.
- **Deploy ke staging**: backup dulu (`wedding_saas_pre_uw11_20260813_1457.dump`, diverifikasi `pg_restore --list`, 41 TOC entries). Backend & frontend di-rebuild lokal (sudah termasuk fix lint di atas), ditransfer via `docker save`→`scp`→`docker load`, restart cuma `backend`+`frontend` (`--no-deps`). Migrasi `ca9d40830deb` dijalankan — kolom baru terkonfirmasi ada, jumlah baris `events` tetap 3 (2 data real + 1 event test dari verifikasi UW-09 sebelumnya) tanpa berubah. Ketiga skrip `verify-uw11*.mjs` + scan a11y dijalankan ulang lewat `DOMAIN_URL=https://demo.ecodigitus.com` — semua lolos. Uptime & resource `odoo18-odoo-1`/`odoo18-db-1` dicek tidak berubah.

---

## Log Perubahan (v14 → v15) — BT-05: Dashboard Ringkasan Kategori Tamu & Kehadiran Real-time

Sisa BT-05 yang belum digarap dari batch BT-02 (v5→v6): datanya (`Guest.category`, `Guest.checked_in_at`) sudah ada sejak Fase 2/BT-02, tapi belum ada tampilan ringkasan/dashboard-nya. Fitur ini **murni frontend** — nol perubahan backend/skema, karena semua data yang dibutuhkan sudah dikirim lewat `GuestOut` (dipakai `listGuests`, endpoint yang sudah ada).

- **Kelola Tamu** (`app/dashboard/guests/page.tsx`):
  - Kartu "Ringkasan per Kategori" baru — tabel jumlah tamu/RSVP hadir/sudah check-in per kategori, dihitung client-side (`useMemo`) dari data `guests` yang sama dengan tabel roster di bawahnya, tidak fetch ulang. Tamu tanpa kategori dikelompokkan sebagai "Tanpa kategori" (bukan disembunyikan), supaya totalnya tetap konsisten dengan total tamu. Baris "Total" di bawah.
  - Filter kategori (`<select>` polos, bukan komponen baru) di atas tabel roster — populated dinamis dari kategori yang benar-benar ada di roster event itu (bukan daftar hardcode VIP/Keluarga/dll, supaya owner bebas pakai label kategori apa saja).
- **QR Check-in** (`app/dashboard/checkin/page.tsx`): counter "X dari Y tamu sudah check-in" — roster di-fetch sekali di awal (`listGuests`), lalu tiap scan sukses meng-update entry tamu terkait secara lokal (bukan re-fetch semua tamu) supaya counter naik instan tanpa round-trip tambahan. `aria-live="polite"` dipasang di counter-nya supaya pengguna screen reader juga tahu angkanya berubah saat scan berlangsung (real-time secara visual, tapi tanpa itu senyap buat non-sighted user).
- **Verifikasi**: `tsc --noEmit` & `eslint` bersih (0 error). Playwright 3 tahap (`scripts/verify-bt05*.mjs`): tambah 4 tamu lintas kategori → ringkasan menghitung benar per kategori termasuk "Tanpa kategori" → filter kategori memfilter tabel dengan benar → simulasi check-in via panggilan API langsung ke `/guests/check-in` (kamera tidak bisa dites headless tanpa fake device) → counter di halaman Check-in naik dari "0 dari 4" ke "1 dari 4" setelah reload. Scan aksesibilitas axe-core di kedua halaman: 0 pelanggaran.
- **Catatan proses**: percobaan verifikasi pertama pakai akun test yang sama dua kali berturut-turut — data tamu menumpuk (bukan idempotent), sempat bikin angka ringkasan/filter salah dan selector Playwright ambigu (2 baris "Budi VIP"). Diperbaiki dengan pakai akun baru per run, bukan bug di aplikasinya.
- **Deploy ke staging**: murni perubahan frontend (nol migrasi/skema baru), jadi tanpa backup DB — cuma image frontend yang di-rebuild, ditransfer, restart **hanya** container `frontend` (`--no-deps`), `backend`/postgres/redis/kedua container Odoo sama sekali tidak disentuh (uptime `backend` & Odoo terkonfirmasi tidak berubah). Ketiga skrip `verify-bt05*.mjs` + scan a11y dijalankan ulang lewat `DOMAIN_URL=https://demo.ecodigitus.com` — semua lolos.

---

## Log Perubahan (v15 → v16) — BT-03: Selfie Check-in (upload S3 privat + signed URL)

Beda mendasar dari UW-09/UW-11: foto selfie diambil **saat itu juga** lewat kamera, bukan link yang sudah ada — jadi pendekatan "URL eksternal" yang dipakai 2 fitur sebelumnya tidak berlaku di sini. Pemilik produk memilih provider **AWS S3** (region `ap-southeast-3`, bucket privat, IAM user scoped `s3:PutObject`+`s3:GetObject` saja) setelah dikasih 3 opsi. Karena kredensial AWS asli belum ada saat pengerjaan, disepakati: bangun semuanya sekarang pakai env var placeholder (pola yang sama dengan `.env.example` sejak awal), tes lokal pakai **MinIO** (container Docker baru, S3-compatible) — kode `boto3` yang sama persis jalan ke keduanya, tinggal ganti kredensial saat deploy staging.

- **Infra dev baru**: `docker-compose.yml` (lokal) dapat service `minio` (port 9000 API, 9001 console). Bucket `wedding-saas-private-dev` dibuat sekali manual via boto3 script.
- **Data**: 1 kolom baru di `Guest` — `selfie_key` (nullable `String(255)`, cuma object KEY di S3, BUKAN URL/foto mentah). Tidak dienkripsi (beda dari `Guest.name`) — string ini cuma path referensi, foto asli sudah privat lewat bucket + signed URL. Migrasi `b39a3a41cfad`, `ADD COLUMN` polos (nullable, tanpa masalah backfill).
- **`app/core/storage.py`** (baru): wrapper tipis di atas `boto3` — client dibuat lazy (bukan singleton module-level) supaya import tidak pernah gagal kalau S3 belum dikonfigurasi. `S3_ENDPOINT_URL` kosong → boto3 pakai endpoint AWS S3 asli otomatis (`addressing_style="auto"`); diisi (MinIO/R2/dst) → `addressing_style="path"` wajib. `make_selfie_key` generate nama object acak (`selfies/{guest_id}/{uuid}.jpg`) — bukan `guest_id` polos, cegah tebak-tebakan key.
- **`app/utils/image.py`** (baru) — OWASP "Unrestricted File Upload": header `Content-Type` dari klien tidak pernah dipercaya begitu saja. Setiap upload didekode ulang lewat Pillow (`Image.open().verify()`, bukti benar-benar gambar valid — file teks/script yang disamarkan pakai ekstensi `.jpg` ditolak), lalu **selalu di-encode ulang jadi JPEG bersih** (buang payload/metadata tersembunyi termasuk GPS EXIF — privasi tamu), diperkecil maks 1600px sisi terpanjang, dibatasi 8MB.
- **Endpoint baru**:
  - `POST /guests/check-in/selfie` (multipart, `token` + `photo`) — dipanggil terpisah SETELAH check-in QR (BT-02) sukses, bukan digabung ke `/guests/check-in`, supaya alurnya tetap 2 langkah jelas (scan dulu, foto opsional). Ownership check sama seperti check-in QR (invite_token → event → `owner_id`).
  - `GET /events/{event_id}/guests/{guest_id}/selfie-url` — signed URL berdurasi 5 menit, dibuat on-demand tiap owner klik lihat foto (tidak disimpan/di-cache), supaya link yang somehow bocor otomatis kedaluwarsa cepat.
  - Keduanya di-gate Premium (`require_premium`), konsisten dengan BT-02.
- **Frontend**:
  - QR Check-in (`checkin/page.tsx`): tombol "Ambil Foto" muncul di kartu hasil setelah check-in sukses — capture frame BARU dari video feed yang sama (bukan reuse frame QR-scan yang sudah lama/fokus ke QR bukan wajah tamu) via `canvas.toBlob`, upload lewat `uploadCheckInSelfie` (fetch manual dengan `FormData`, bukan lewat `authFetch` yang selalu paksa `Content-Type: application/json` — browser perlu set boundary multipart sendiri).
  - Kelola Tamu (`guests/page.tsx`): ikon kamera muncul di baris tamu yang `has_selfie`, klik buka `SelfieModal.tsx` (komponen baru, pola sama dengan `GuestQrModal.tsx` — Escape untuk tutup, fokus terkelola) yang fetch signed URL on-demand lalu render `<img>`.
- **Testing**: `moto` (mock AWS S3 in-memory, dev dependency baru) dipakai di `test_storage.py` untuk verifikasi `storage.py` sendiri — PENTING: `s3_endpoint_url` di-override ke `None` di test (bukan endpoint MinIO), karena moto meng-intercept endpoint AWS asli, bukan endpoint custom. Endpoint-level test di `test_guests.py` pakai `monkeypatch` langsung ke fungsi `upload_private_object`/`generate_signed_url` (bukan moto) — isolasi murni logika endpoint (validasi, gating, ownership, persist) dari detail S3. 78 test pytest lolos total (naik dari 59: +4 storage, +7 validasi gambar, +8 endpoint selfie).
- **Verifikasi UI**: Playwright dengan `--use-fake-device-for-media-stream` (pola yang sudah ada dari BT-02) — kamera aktif tanpa error di `localhost` (secure context). Interaksi klik tombol "Ambil Foto" sendiri **tidak** diuji headless (butuh kamera nyata mendeteksi QR dulu untuk sampai ke state itu — limitasi yang sama & sudah diterima sebelumnya untuk BT-02, lihat `verify-staging-checkin.mjs`). Sebagai gantinya, jalur upload disimulasikan lewat panggilan browser sungguhan ke endpoint (payload `FormData` identik) — tetap menguji end-to-end browser→backend→MinIO, termasuk: ikon selfie muncul di Kelola Tamu, modal terbuka, **gambar benar-benar termuat** dari signed URL (`naturalWidth > 0`, bukan cuma cek elemen ada), modal tertutup dengan Escape. Scan aksesibilitas axe-core: 0 pelanggaran di Check-in, Kelola Tamu, dan modal selfie.
- **Belum di-deploy ke staging** — menunggu kredensial AWS S3 asli dari pemilik produk (bucket + IAM access key). Kode sepenuhnya siap, tinggal isi env var (`S3_ENDPOINT_URL` kosong, `S3_ACCESS_KEY`/`S3_SECRET_KEY`/`S3_BUCKET_PRIVATE`/`S3_REGION` diisi kredensial asli) + jalankan migrasi `b39a3a41cfad`.

---

## Log Perubahan (v16 → v17) — Model bisnis diganti total: 3 Paket per-acara (Intimate/Celebration/Grand) menggantikan Lite/Premium per-akun

Dipicu pemilik produk membagikan pitch deck asli Ecodigitus ("Sistem QR Wedding") yang menjelaskan model bisnis nyata yang akan dipakai untuk menjual produk ini — **bukan** langganan Lite (gratis)/Premium (Rp150rb, per-akun, sekali bayar berlaku selamanya untuk semua event akun itu) seperti yang dibangun sejak Bagian 9, melainkan **3 paket per-acara**, dibedakan dari kapasitas tamu & jumlah pintu check-in (bukan dari fitur — fitur inti sama di semua paket):

| Paket | Kapasitas tamu | Harga |
|---|---|---|
| Intimate | 200 | Rp399.000 |
| Celebration | 600 | Rp699.000 |
| Grand | 1.200 | Rp1.099.000 |

Dikonfirmasi eksplisit lewat 4 pertanyaan klarifikasi ke pemilik produk sebelum implementasi: (1) Amplop Digital (UW-09), Musik/Galeri/Countdown (UW-11), Selfie Check-in (BT-03) — tidak disebut di pitch deck — **tetap jadi add-on berbayar terpisah** (bukan dibundel gratis ke paket, bukan dihapus); (2) "jumlah pintu" **tidak ditegakkan teknis**, murni informasi ke customer; (3) kapasitas tamu (200/600/1.200) **ditegakkan teknis**; (4) akun real existing di staging (`huhu@gmail.com`/`haha@gmail.com`, masih di model lite/premium lama) **boleh direset**, tidak perlu migrasi data. **Harga add-on** (Rp100.000/add-on, flat) adalah asumsi kerja — pitch deck tidak menyebutkannya — sama seperti pola `premium_price_idr` sebelumnya, gampang disesuaikan lewat 1 dict.

**Data model:**
- `Event` dapat 2 kolom baru: `package` (`str | None` — "intimate"/"celebration"/"grand") dan `addons` (`JSON`, list add-on key yang dimiliki). **Sengaja TIDAK ada di `EventUpdate` schema sama sekali (OWASP A01)** — cuma bisa berubah lewat webhook Xendit setelah pembayaran terverifikasi, tidak pernah dari request user langsung (kalau bocor ke `EventUpdate`, user bisa PATCH event-nya sendiri jadi `package: "grand"` gratis).
- `Payment` digeneralisasi jadi event-scoped: `event_id` (nullable FK, `ondelete=CASCADE`), `item_type` (`"package"|"addon"`), `item_key` (key katalog) — menggantikan `tier_purchased` yang selalu `"premium"` (konsep account-wide lama, tidak ada pemetaan valid ke event untuk baris historis). `user_id` tetap dipertahankan untuk lookup cepat.
- `User.tier` & properti `is_premium` **dihapus total**.
- Migrasi `87dfdc0e390c`: semua kolom baru nullable (tidak perlu `server_default` trick seperti migrasi `show_countdown` sebelumnya), `DROP COLUMN payments.tier_purchased` & `DROP COLUMN users.tier`. Diverifikasi lolos `alembic upgrade head` lokal tanpa masalah.
- Katalog paket & add-on (`app/core/packages.py`, baru) — `PACKAGE_CATALOG`/`ADDON_CATALOG`, plain dict module-level (bukan `Settings` field), jadi satu-satunya sumber kebenaran harga/kapasitas — frontend render langsung dari `BillingStatusOut.catalog`, tidak duplikat hardcode di frontend (cegah drift data).

**Gating backend:**
- `require_premium` (dependency lama, akun-wide) diganti `require_event_with_package` — resolve `Event` via `get_event_or_404` lalu cek `event.package is not None` (402 kalau belum), return `Event`-nya langsung supaya route body tidak perlu `get_event_or_404` lagi. Dipakai di semua route Kelola Tamu yang punya `event_id` di path.
- Route TANPA `event_id` di path (`POST /guests/check-in`, `POST /guests/check-in/selfie` — cuma punya `invite_token`, event baru diketahui setelah resolve guest) — cek `event.package is None` inline setelah resolve guest→event, bukan lewat dependency.
- Kapasitas tamu baru (`create_guest`): hitung `Guest` existing per event, tolak `409` kalau `>= PACKAGE_CATALOG[event.package]["max_guests"]`. "Jumlah pintu" sengaja **tidak** ada penegakan teknis sama sekali (keputusan produk, murni informasi paket).
- Amplop Digital (UW-09) & UW-11 gate di `PATCH /events/{id}` diganti dari cek `current_user.is_premium` jadi cek keanggotaan add-on spesifik di `event.addons` (`"amplop_digital"`/`"musik_galeri_countdown"`) — field lain (nama mempelai, lokasi, dll) tetap bisa diupdate tanpa add-on apa pun.
- Selfie Check-in (BT-03) gate diganti dari `require_premium` jadi cek `"selfie_checkin" in (event.addons or [])` — sekarang butuh add-on spesifik, bukan cuma "event punya paket".
- **Bug keamanan ditemukan & diperbaiki lewat TDD** (bukan cuma "sudah dites"): `get_guest_selfie_url` awalnya cek kepemilikan add-on (402) **sebelum** cek kepemilikan tamu (404) — attacker yang probing `guest_id` milik owner lain di bawah `event_id` miliknya sendiri akan dapat 402 (membocorkan status billing event lain) alih-alih 404 bersih. Diperbaiki: urutan dibalik, cek kepemilikan/keberadaan tamu (404) SELALU jalan duluan, cek add-on (402) baru setelah itu — dicatat sebagai prinsip umum untuk endpoint gated serupa.

**Billing routes** (`app/api/routes/billing.py`, rombak total) — pindah ke `/events/{event_id}/billing/...` (konsisten pola nested resource lain): `GET .../billing/status` (return `package`, `addons`, `catalog`, `latest_payment`), `POST .../billing/purchase` (body `{item_type, item_key}` generik untuk paket ATAU add-on — validasi: add-on tidak bisa dibeli sebelum ada paket, item yang sudah dimiliki ditolak 409). Webhook `POST /billing/webhook/xendit` (tetap global, prefix tidak berubah) — verifikasi HMAC & idempotency check TIDAK berubah (logic itu sudah benar), cuma baris efek sampingnya diganti: `event.package = payment.item_key` (untuk `item_type="package"`) atau `event.addons.append(...)` (untuk `"addon"`), menggantikan `user.tier = payment.tier_purchased` lama.

**Frontend:**
- `lib/types.ts`/`lib/api.ts`: `User.tier` dihapus, `Event` dapat `package`/`addons`, `BillingStatus` baru (`package`, `addons`, `catalog`, `latest_payment`), `getBillingStatus(eventId)`/`createPurchase(eventId, {item_type, item_key})` event-scoped (sebelumnya account-scoped tanpa parameter).
- `dashboard/billing/page.tsx` — redesign total: grid 3 kartu paket (pola sama dengan template picker Editor, badge "Paket aktif" di kartu yang dimiliki) + grid 3 kartu add-on (badge "✓ Sudah aktif" / tombol "Tambah add-on", disabled kalau belum ada paket sama sekali) — menggantikan 1 kartu tunggal "Upgrade ke Premium".
- Gating `isPremium` (`user?.tier === "premium"`) diganti `event?.package != null` di `guests/checkin/rsvp/editor page.tsx`. Di `guests/page.tsx`/`checkin/page.tsx`, urutan guard diperbaiki jadi `!event` dicek **sebelum** `!hasPackage` (sebelumnya kebalik) — konsekuensi: user yang belum pernah bikin event sama sekali sekarang lihat EmptyState "Belum ada undangan", bukan paywall paket, saat mengunjungi Kelola Tamu/Check-in tanpa event.
- Copy teks upsell diganti dari "Upgrade ke Premium" jadi bahasa paket/add-on yang sesuai konteks ("Kelola Tamu perlu paket aktif", "Lihat Paket", "Beli Add-on", dll).

**Testing:**
- Fixture `make_premium` diganti `give_package(event_id, package)`/`give_addon(event_id, addon)` (set langsung `Event.package`/`Event.addons` di DB test, bypass Xendit). Fixture `published_premium_event` **sengaja dipertahankan nama & signature-nya** (dipakai 50+ callsite di `test_guests.py`/`test_events.py`) — cuma implementasi internalnya diganti panggil `give_package`, supaya diff minimal tanpa mengubah perilaku observable test manapun.
- Test baru: kapasitas tamu ditegakkan (409 di tamu ke-(N+1)), beli add-on tanpa paket ditolak (409), beli item yang sudah dimiliki ditolak (409), gating 402 utuh untuk paket vs add-on terpisah. Kasus "tamu ada tapi event-nya tidak punya paket" (skenario yang secara arsitektur tidak lagi bisa dicapai lewat API normal karena `create_guest` sendiri sudah butuh paket) diuji dengan insert `Guest` langsung via `db_session`, bypass API, khusus untuk menguji defense-in-depth check di endpoint check-in/selfie.
- `test_billing.py` ditulis ulang total (13 test) untuk alur beli-per-event yang baru.
- **83 test pytest lolos** (naik dari 78), `ruff check` bersih, `tsc --noEmit` & `eslint` frontend bersih (0 error).
- Verifikasi UI lewat Playwright baru (`scripts/verify-package-model.mjs` + `verify-package-model-premium.mjs`, 2 tahap): tahap 1 — 3 kartu paket dengan harga dari backend, tombol add-on nonaktif sebelum ada paket, klik "Pilih paket" tanpa Xendit lokal menampilkan pesan error yang jelas (bukan crash), axe-core 0 pelanggaran di Billing (state belum ada paket). Tahap 2 (setelah paket+add-on di-set via `psql`, simulasi pembayaran sukses) — Kelola Tamu/Check-in terbuka, Billing menampilkan status aktif yang benar, kartu Editor Amplop Digital/Musik&Galeri terbuka, axe-core 0 pelanggaran (state paket+add-on aktif). Skrip verifikasi lama yang menyebut tier/premium (`verify-lint-fix-smoke.mjs`, `verify-gift-info*.mjs`, `verify-uw11*.mjs`, `verify-fase2.mjs`, plus skrip staging `verify-domain-a11y.mjs`/`verify-staging-checkin.mjs`/`verify-staging-fase2-part1.mjs`/`part2.mjs`) diperbarui ke mekanisme grant baru (`UPDATE events SET package=...`/`addons=...`, bukan lagi `UPDATE users SET tier=...`) dan teks UI baru, dijalankan ulang lokal — semua lolos. Ketahuan & diperbaiki sekalian 2 bug test lama yang tidak berkaitan langsung dengan model bisnisnya: (a) beberapa skrip mengasumsikan paywall paket muncul untuk akun yang belum pernah bikin event sama sekali — sekarang tidak lagi berlaku karena urutan guard `!event`/`!hasPackage` diperbaiki (lihat poin Frontend di atas), butuh tambahan langkah "buat event dasar dulu" di skrip; (b) format `Intl.NumberFormat` Rupiah browser menyisipkan spasi (`"Rp 399.000"`), bukan menempel (`"Rp399.000"`) seperti asumsi awal skrip.

**Deploy ke staging** — dilakukan atas instruksi langsung pemilik produk ("langsung update ke server"), tetap mengikuti Backup-First Protocol lebih dulu (bukan langsung eksekusi):
1. Backup dulu — backup existing terbaru di `/opt/wedding-saas/backups/` ternyata sudah 5 hari (Aug 13), tidak cukup baru untuk migrasi yang men-drop kolom `users.tier` bermuatan data real — diambil backup segar (`pg_dump -Fc`, `wedding_saas_pre_package_model_20260818_1601.dump`, diverifikasi valid via `pg_restore -l`, 41 TOC entries, disimpan permanen di `/opt/wedding-saas/backups/` bukan `/tmp`).
2. **Ketahuan staging tertinggal 2 migrasi** (masih di `ca9d40830deb`, migrasi BT-03 `b39a3a41cfad` belum pernah dijalankan — sesuai catatan "belum di-deploy" di Log Perubahan v15→v16, menunggu kredensial AWS S3). Dicek dulu jalur upload selfie (`StorageNotConfiguredError`) sudah ditangani graceful (503, bukan crash) kalau S3 tidak dikonfigurasi — aman dijalankan bersamaan migrasi paket, fitur BT-03 sendiri tetap belum bisa dipakai sampai kredensial AWS diisi (tidak berubah dari sebelumnya).
3. Ditemukan & dibersihkan sekalian: field config `premium_price_idr`/`PREMIUM_PRICE_IDR` sudah jadi dead code (tidak direferensi di mana pun setelah `billing.py` dirombak) — dihapus dari `config.py` & `.env.example` sebelum build image (pytest 83 tetap lolos, ruff bersih).
4. Image backend+frontend di-build lokal (frontend dengan `--build-arg NEXT_PUBLIC_API_URL=https://demo.ecodigitus.com`), ditransfer via `docker save`→`scp`→`docker load`, restart **backend dulu** (`--no-deps`) → jalankan `alembic upgrade head` (menerapkan `b39a3a41cfad` lalu `87dfdc0e390c` sekaligus) → verifikasi kolom `package`/`addons` ada di `events`, kolom `tier` sudah hilang dari `users`, jumlah baris `users`/`events`/`payments` (6/5/2) tidak berubah → baru restart **frontend** (`--no-deps`).
5. Verifikasi end-to-end lewat browser sungguhan ke `https://demo.ecodigitus.com` (`scripts/verify-package-model.mjs` + `-premium.mjs` dengan `DOMAIN_URL`): tahap 1 sampai ke langkah "Pilih paket" — di sini ketahuan (bukan bug, justru **konfirmasi positif**) staging punya kredensial Xendit Test Mode asli (beda dari lokal), jadi klik itu benar-benar membuat invoice Xendit nyata dan redirect ke `checkout-staging.xendit.co` (dikonfirmasi juga lewat query tabel `payments`: `item_type='package', item_key='intimate', amount_idr=399000, status='pending'`) — assersi skrip yang mengasumsikan 503 (khusus lokal) di-skip untuk staging, sisanya lolos. Paket+add-on di-grant manual via `psql` (bypass penyelesaian checkout Xendit sungguhan, pola yang sama dengan verifikasi staging sebelumnya) untuk tahap 2 — semua lolos termasuk axe-core 0 pelanggaran.
6. Akun real `huhu@gmail.com`/`haha@gmail.com` dikonfirmasi ter-reset seperti disetujui (`event.package IS NULL`, event & data lain tidak hilang) — bukan dihapus, cuma perlu beli paket baru.
7. Data test (akun + event + payment percobaan) dibersihkan via `DELETE FROM users WHERE email=...` (cascade ke event/payment terkait) — jumlah baris kembali ke baseline (6/5/2) persis sama seperti sebelum migrasi.
8. Uptime `odoo18-odoo-1`/`odoo18-db-1` & `docker stats` dicek tidak berubah sepanjang proses — kedua container Odoo di server yang sama tidak pernah tersentuh.

**Genuinely belum dikerjakan / di luar scope batch ini:**
- Penegakan teknis "jumlah pintu" — keputusan produk eksplisit: tidak ditegakkan, cuma informasi.
- UW-07 (Smart WhatsApp), UW-10 (Custom Domain) — masih di luar scope, tidak terkait perubahan ini (UW-10 sempat dibahas ulang saat diskusi pitch deck ini, tetap diputuskan skip untuk saat ini oleh pemilik produk).
- BT-03 (Selfie Check-in) masih belum bisa dipakai sungguhan di staging — kolom `selfie_key` sekarang ada, tapi kredensial AWS S3 asli masih belum diisi (`S3_ACCESS_KEY`/`S3_SECRET_KEY`/`S3_BUCKET_PRIVATE` di `backend.env` staging masih kosong), tidak berubah dari Log Perubahan v15→v16.

---

## Log Perubahan (v17 → v18) — 2 template undangan baru: Editorial Modern & Monogram Elegan

Dipicu pertanyaan langsung pemilik produk ("template undangan yang ada terlalu sederhana ga sih?"). Diagnosis: 4 template existing (Klasik, Modern Minimal, Botanical, Elegan Monokrom) sebenarnya 1 layout struktur yang sama persis (`InvitationView.tsx`), cuma beda warna/font/align lewat `TEMPLATE_THEME` — belum ada variasi *layout* nyata. Dibuatkan 2 template baru dengan struktur genuinely berbeda, bukan cuma skin warna baru:

- **Editorial Modern** (`id: "editorial"`) — rata kiri, tipografi besar-bold (dipakai bareng Modern Minimal, direfaktor jadi flag `isBigStackedName`), badge pill "UNDANGAN PERNIKAHAN" solid (bukan teks polos), divider berupa blok tebal (bukan garis tipis). Beda struktural nyata: section info (Akad/Resepsi/Lokasi/Dress Code) dirender sebagai **grid 2 kolom** (`grid grid-cols-2`) — Akad & Resepsi bersisian, Lokasi `col-span-2` — bukan ditumpuk vertikal seperti 5 template lain.
- **Monogram Elegan** (`id: "monogram"`) — centered, serif, palet burgundy/blush. Beda struktural: lambang inisial mempelai (`MonogramBadge`, lingkaran berisi "X&Y" dari huruf pertama nama masing-masing) di atas hero, dan bingkai **4 siku sudut terpisah** (`CornerBrackets`) menggantikan bingkai garis utuh yang dipakai Klasik/Monokrom — tekstur dekoratif yang genuinely beda, bukan variasi warna dari pola yang sama.
- Divider baru untuk keduanya (garis-lingkaran-garis untuk monogram, blok tebal untuk editorial) — beda dari 4 pola divider existing.
- **Tidak ada perubahan backend/skema** — `template_id` sudah free-string tanpa enum/allowlist constraint sejak awal (`String(50)`, tanpa validasi nilai), jadi 2 ID baru langsung diterima tanpa migrasi apa pun.
- **Palet warna dihitung manual dulu** (rasio kontras relative-luminance, formula sama dengan `scripts/audit-contrast.mjs`) sebelum ditulis ke kode — bukan trial-and-error visual — supaya lolos WCAG AA dari awal: `editorial` (bg `#F5F1EA`, text `#2B2118` 13.99:1, accent `#A3441F` 5.48:1, muted `#6E5D4D` 5.59:1), `monogram` (bg `#FBF3F4`, text `#3A2530` 12.93:1, accent `#7C2D42` 8.32:1, muted `#7D5D65` 5.30:1). Kedua template + pill putih-di-atas-accent-solid (khusus editorial) ditambahkan ke `scripts/audit-contrast.mjs` — total 47 pengecekan, 0 gagal.
- Grid pemilih template di Editor (`app/dashboard/editor/page.tsx`) disesuaikan dari `lg:grid-cols-4` jadi `lg:grid-cols-3` supaya 6 opsi (naik dari 4) tersusun rapi 2 baris × 3, bukan 4+2 timpang. Tidak perlu perubahan lain — grid & thumbnail preview ("Aa" swatch) sudah 100% data-driven dari `TEMPLATES`/`TEMPLATE_THEME`, otomatis ke-render begitu 2 entri baru ditambahkan.
- **Verifikasi**: `tsc --noEmit` & `eslint` bersih. `scripts/verify-templates.mjs` dirombak jadi data-driven dari `TEMPLATE_LABELS` (sebelumnya ternary chain hardcode 4 nama) + ditambah axe-core scan per template (sebelumnya cuma screenshot+console-error check, template baru belum pernah di-a11y-scan) + desktop screenshot per template (sebelumnya cuma 1 shot "current") — dijalankan ulang untuk 6 template: 0 axe violation di semua, 0 console error. Verifikasi manual tambahan (screenshot debug, dihapus setelah dicek) mengonfirmasi grid 2 kolom editorial benar-benar bersisian saat Akad & Resepsi keduanya terisi (bukan cuma saat kosong seperti di run otomatis awal).
- **Deploy staging**: dilakukan atas instruksi langsung pemilik produk. Berhubung murni perubahan frontend (nol migrasi/skema, `template_id` sudah free-string tanpa allowlist), **tanpa backup DB** — cukup image frontend di-rebuild (`--build-arg NEXT_PUBLIC_API_URL=https://demo.ecodigitus.com`), ditransfer via `docker save`→`scp`→`docker load`, restart **hanya** container `frontend` (`--no-deps`). Backend/postgres/redis/kedua container Odoo (`odoo18-odoo-1`/`odoo18-db-1`) tidak disentuh sama sekali (uptime terkonfirmasi tidak berubah). Diverifikasi lewat browser sungguhan ke `https://demo.ecodigitus.com`: kedua kartu template baru muncul di picker Editor, dan Monogram Elegan berhasil dipublish + badge inisial monogram terkonfirmasi tampil di halaman publik. Data test dibersihkan, row count kembali ke baseline (6 users/5 events).

---

## Log Perubahan (v18 → v19) — Template ke-7: Taman Manis (terinspirasi riset kompetitor Katsudoto)

Dipicu pemilik produk membagikan 2 link undangan Katsudoto asli (gaya "romantic illustrated": foto hero pasangan besar, font script/cursive, kartu bergerigi/postage-stamp, countdown bentuk awan, galeri foto bertumpuk, ilustrasi bunga/ceri custom) dan bertanya "bisa ga templatenya gitu?". Diagnosis lewat screenshot Playwright sungguhan ke kedua link (bukan tebak-tebak dari deskripsi) — 2 link ternyata 1 desain yang sama, cuma beda bentuk frame foto cover. Ditemukan 2 blocker nyata yang TIDAK ditiru: **(1) foto hero pasangan** — produk ini belum punya fitur upload foto cover sama sekali (di luar scope batch ini, butuh infrastruktur upload mirip BT-03); **(2) ilustrasi custom** (bunga/ceri/pita) — aset berbayar (kemungkinan Freepik/Envato), tidak bisa direplikasi presisi pakai CSS/SVG polos. Sisanya (kartu bergerigi, countdown custom shape, galeri bertumpuk, font script, kartu info kotak) genuinely bisa ditiru murni CSS — dibangun sebagai template baru **"Taman Manis"** (`id: "taman-manis"`), pakai placeholder dekoratif (bukan foto asli) di posisi hero.

- **Font baru**: `Dancing_Script` (Google Font, cursive/script) di-load via `next/font/google` di `app/layout.tsx` sebagai `--font-script`, didaftarkan ke `@theme inline` (`globals.css`) supaya Tailwind generate utility class `font-script`. **Cuma dipakai di 1 elemen** (nama mempelai template ini) — bukan token font sistem baru, konsisten dengan cara `--font-heading`/`--font-body` dipakai selektif per konteks.
- **`ScallopHeader`** (komponen baru) — blok pastel solid (placeholder pengganti foto hero, karena belum ada fitur upload foto) dengan ikon bunga + label "UNDANGAN PERNIKAHAN", tepi bawah bergerigi dibuat dari baris lingkaran kecil warna background halaman yang "memotong" tepi blok warna solid — bukan `mask-image` CSS (kompatibilitas browser lebih luas, konsisten dengan preferensi teknik CSS-murni yang sudah dipakai template lain).
- **Countdown** — `CountdownTimer` (komponen sama persis, tidak diubah) dibungkus kartu pil pastel rounded-full besar, meniru kesan "cloud shape" tanpa perlu bentuk blob SVG custom.
- **Info Akad/Resepsi/Lokasi/Dress Code** — dirender sebagai kartu kotak individual (border rounded) menggantikan baris teks polos yang dipakai 6 template lain — beda struktural nyata, bukan cuma warna.
- **Galeri** — foto ditampilkan bertumpuk/miring bergantian (`rotate-2`/`-rotate-2`, border putih tebal, shadow) menggantikan grid rapi — dites langsung dengan 3 URL foto sungguhan + toggle countdown aktif (butuh add-on `musik_galeri_countdown` di-grant manual via `psql`, pola yang sama dengan verifikasi UW-11 sebelumnya) untuk memastikan kombinasi "countdown + galeri bertumpuk" (state paling ramai/berisiko) tetap rapi & lolos axe-core.
- **Palet dihitung manual dulu** (sama seperti editorial/monogram): bg `#F7F1F5`, text `#4A3244` (10.30:1), accent `#A83768` (5.53:1), muted `#795D71` (5.21:1), plus warna header pastel `#F3C6D3` dengan teks `#7A3049` (5.89:1) — ditambahkan ke `scripts/audit-contrast.mjs`, total **52 pengecekan, 0 gagal**.
- **Tidak ada perubahan backend/skema** — sama seperti editorial/monogram, `template_id` free-string tanpa allowlist.
- **Verifikasi**: `tsc --noEmit` & `eslint` bersih. `scripts/verify-templates.mjs` dijalankan ulang untuk 7 template (nambah `taman-manis` ke `TEMPLATE_LABELS`): 0 axe violation & 0 console error di semua. Verifikasi tambahan manual (debug script, dihapus setelah dicek) khusus state galeri+countdown "ramai" — 0 axe violation juga.
- **Deploy staging**: dilakukan atas instruksi langsung pemilik produk, pola sama persis dengan v17→v18 (murni frontend, tanpa backup DB): image di-rebuild (`--build-arg NEXT_PUBLIC_API_URL=https://demo.ecodigitus.com`), ditransfer, restart **hanya** `frontend` (`--no-deps`) — backend/postgres/redis/kedua Odoo tidak disentuh (uptime tidak berubah). Diverifikasi lewat browser sungguhan ke `https://demo.ecodigitus.com`: kartu "Taman Manis" muncul di picker Editor, publish berhasil, dan heading nama mempelai bergaya tulisan tangan terkonfirmasi tampil di halaman publik. Data test dibersihkan, row count kembali ke baseline (6 users/5 events).

---

## Log Perubahan (v19 → v20) — Scroll-reveal animation di halaman undangan publik (semua 7 template)

Lanjutan riset kompetitor Katsudoto (v18→v19) — pemilik produk mengingatkan bahwa link yang dibagikan itu preview undangan Katsudoto yang **beranimasi**, sedangkan review sebelumnya cuma dari screenshot statis (tidak menangkap animasi apa pun). Direkam ulang lewat Playwright: video (`recordVideo`) + burst screenshot beruntun (interval 150-400ms) di titik-titik yang paling mungkin beranimasi — cover idle, transisi klik "Open Invitation", dan tiap titik scroll — supaya animasinya benar-benar kelihatan frame-by-frame (bukan tebak-tebak dari deskripsi). Ditemukan 3 pola animasi nyata: (1) partikel kerlip mengambang idle di cover, (2) transisi buka-gerbang bertahap (flash putih → foto fade-in → logo monogram slide dari atas → dekorasi menyusul), (3) **scroll-reveal di setiap section** — teks/tombol/dekorasi mulai transparan lalu fade-in penuh begitu section masuk viewport, pola paling konsisten & dominan di seluruh halaman mereka. Pemilik produk pilih mulai dari (3) — dampak besar, effort paling kecil, dan gampang di-generalize ke semua section yang sudah ada tanpa perlu koreografi animasi khusus per elemen seperti (2).

- **`ScrollReveal.tsx`** (komponen baru, `"use client"`) — fade + slide-up sekali saat section pertama kali masuk viewport, pakai `IntersectionObserver`. Toggle CLASS DOM langsung lewat `ref` (**bukan React state**) — keputusan disengaja, 3 alasan: (a) kelas "tersembunyi" (`reveal-pending`) cuma pernah ditambah lewat JS, tidak pernah ada di HTML hasil SSR — jadi kalau JS gagal load/dimatikan, konten TETAP kelihatan penuh (progressive enhancement, bukan prasyarat tampil); (b) tidak ada flash-of-invisible-content pas hydrate; (c) tidak perlu `setState` sinkron di body effect (`react-hooks/set-state-in-effect`, aturan React Compiler yang beberapa kali ketemu sesi ini) untuk sesuatu yang murni presentational.
- **Hormat `prefers-reduced-motion`** — dicek lewat `window.matchMedia`, kalau aktif kelas `reveal-pending` tidak pernah ditambah sama sekali (section langsung penuh kelihatan dari awal, nol animasi) — bonus aksesibilitas (WCAG 2.3.3) konsisten dengan fokus a11y proyek ini sejak awal (kontras WCAG AA, axe-core di semua fitur).
- **Section yang sudah kelihatan saat mount (mis. hero di atas fold) sengaja dilewati** — dicek sekali lewat `getBoundingClientRect()` sebelum kelas disable ditambah, supaya tidak ada kedip "hilang sebentar lalu muncul lagi" untuk konten yang dari awal sudah tampak. Hero (section nama mempelai) sengaja **tidak** dibungkus `ScrollReveal` — itu section pertama yang selalu di atas fold, beda konsep dari "reveal saat scroll" (animasi transisi buka-gerbang di poin (2) atas, yang belum dikerjakan batch ini).
- **Diterapkan ke 4 section** yang sudah ada di `InvitationView.tsx` (Akad/Resepsi/Lokasi/Dress Code, Peta, Galeri, Kirim Hadiah) — otomatis berlaku di **semua 7 template** sekaligus (satu komponen shared, bukan per-template), nol perubahan ke masing-masing template yang sudah ada selain membungkus section-nya.
- **CSS baru** di `globals.css`: `.reveal-target` (transition base), `.reveal-pending` (opacity 0, translate-y), `.reveal-visible` (reset ke normal) — didesain supaya default TANPA kelas apa pun = penuh kelihatan (aman untuk SSR/no-JS/crawler).
- **Tidak ada perubahan backend/skema** — murni frontend, sama seperti editorial/monogram/taman-manis.
- **Verifikasi**: `tsc --noEmit` & `eslint` bersih (0 error, konfirmasi keputusan DOM-class-langsung berhasil menghindari `react-hooks/set-state-in-effect`). Skrip debug (dihapus setelah dicek) memverifikasi 3 hal lewat pembacaan `getComputedStyle`/class langsung: (a) hero tetap opacity 1 sejak awal; (b) section di bawah fold mulai `reveal-pending`/opacity 0, lalu jadi `reveal-visible`/opacity 1 setelah di-scroll masuk viewport (`scrollIntoView`); (c) dengan `prefers-reduced-motion: reduce` (emulasi via Playwright `reducedMotion: "reduce"`), section **tidak pernah** dapat kelas `reveal-pending` sama sekali — langsung opacity 1 tanpa perlu scroll. `scripts/verify-templates.mjs` dijalankan ulang untuk 7 template: 0 axe violation & 0 console error di semua, dan screenshot full-page mengonfirmasi tidak ada section yang ke-capture dalam keadaan transparan/nyangkut.
- **Genuinely belum dikerjakan saat itu** (poin 1 & 2 dari 3 pola animasi yang ditemukan) — **poin 1 (partikel kerlip idle) sudah dikerjakan langsung setelahnya, lihat di bawah**; poin 2 (transisi buka-gerbang bertahap) masih ditunda, lihat catatan keputusan produk di bawah.
- **Deploy staging**: belum dilakukan — menunggu keputusan/permintaan terpisah, pola yang sama dengan template-template sebelumnya sebelum akhirnya diminta deploy.

**Partikel kerlip idle di hero (`SparkleParticles`, komponen baru)** — 4 tanda "✦" kecil di sekitar hero, posisi tetap (bukan acak), animasi float+twinkle lewat `@keyframes` CSS murni (`sparkle-float` di `globals.css`) — **tidak butuh JS/effect sama sekali**, jadi tidak ada isu hydration atau `react-hooks/set-state-in-effect` yang perlu dihindari (beda dari `ScrollReveal` yang butuh JS untuk deteksi viewport). `prefers-reduced-motion` dihormati langsung lewat `@media` query CSS (animasi dimatikan, partikel tetap terlihat diam — bukan hilang total). Warna partikel ikut `theme.accent` tiap template (reuse token yang sudah lolos audit kontras, tidak perlu pengecekan kontras baru karena bukan teks/elemen interaktif — dekorasi `aria-hidden`, `pointer-events-none`). Diterapkan generik ke semua 7 template (satu komponen shared, konsisten dengan `ScrollReveal`). Diverifikasi: `tsc`/`eslint` bersih, `scripts/verify-templates.mjs` dijalankan ulang untuk 7 template — 0 axe violation & 0 console error di semua, screenshot dicek manual untuk pastikan posisi partikel tidak menabrak elemen dekoratif template lain (corner brackets monogram, scallop header taman-manis, bingkai klasik/monokrom) — aman di semua.

**Keputusan produk untuk transisi buka-gerbang bertahap (poin 2)**: berbeda dari partikel kerlip (murni dekoratif, nol risiko), meniru transisi ini apa adanya berarti **seluruh konten halaman (kartu undangan + RSVP + Buku Tamu) disembunyikan di balik klik "Buka Undangan"** — perubahan model interaksi yang nyata, bukan cuma animasi tambahan: (a) berisiko ke funnel konversi RSVP (klik ekstra sebelum tamu bisa isi form, ketergantungan JS baru untuk fitur inti yang sebelumnya tidak butuh interaksi apa pun untuk diakses); (b) bakal mematahkan puluhan skrip verifikasi Playwright yang selama ini langsung berinteraksi dengan form RSVP/Buku Tamu tanpa langkah "buka gerbang" dulu. Ditanyakan balik ke pemilik produk (bukan diputuskan sepihak) — rekomendasi yang diberikan: **untuk undangan pernikahan yang dibagikan luas ke tamu beragam (bukan produk showcase/game), animasi masuk otomatis tanpa klik lebih tepat** daripada gerbang wajib — dapat sebagian besar kesan "reveal premium" tanpa risiko funnel/reliabilitas. Pemilik produk setuju, diimplementasi sebagai berikut.

---

## Log Perubahan (v20 → v21) — Animasi masuk hero otomatis (bertahap, tanpa gerbang klik)

Pengganti "transisi buka-gerbang bertahap" yang lebih aman untuk funnel RSVP: elemen hero (badge monogram → eyebrow/pill → nama → tanggal → divider → countdown) fade-in **otomatis berurutan** begitu halaman dibuka, TANPA tombol/klik wajib dan TANPA menyembunyikan konten apa pun — RSVP & Buku Tamu tetap bisa langsung diakses seperti sebelumnya, nol perubahan ke skrip verifikasi existing yang berinteraksi dengan form tersebut.

- **`@keyframes hero-stage-in`** (CSS murni di `globals.css`) + 6 kelas `.hero-stage-1` s/d `.hero-stage-6` (`animation-delay` bertingkat 0/0.15/0.3/0.45/0.6/0.75s, durasi masing-masing 0.7s, total ~1.45s sampai semua elemen settle). **Berbeda dari `ScrollReveal` — ini TIDAK butuh JS sama sekali** (murni `@keyframes` + `animation-delay`), karena tidak perlu deteksi posisi scroll (hero selalu di atas fold, cukup "mainkan begitu elemen ter-render"). Konsekuensinya: aman 100% untuk kondisi apa pun (SSR, JS gagal load, no-JS) — CSS diproses browser terlepas dari JS berjalan atau tidak, beda dari `ScrollReveal` yang justru butuh JS untuk mekanismenya sendiri.
- **`prefers-reduced-motion: reduce`** — `animation: none` di media query, elemen langsung tampil penuh tanpa animasi sama sekali.
- **Diterapkan ke elemen hero** yang sudah ada di `InvitationView.tsx` (tidak ada elemen baru): `MonogramBadge` (stage-1, khusus monogram), eyebrow/pill (stage-2), nama mempelai (stage-3), tanggal (stage-4), divider (stage-5), countdown (stage-6, opsional). Template tanpa elemen tertentu (mis. tanpa `MonogramBadge`) otomatis skip stage itu — tidak masalah, cuma berarti elemen pertama templat itu mulai 0.15s lebih "telat" dari yang secara teori perlu, beda yang tidak terasa.
- **Bug ditemukan & diperbaiki lewat proses verifikasi sendiri (bukan cuma "sudah dites")**: run pertama `scripts/verify-templates.mjs` setelah perubahan ini melaporkan axe-core `color-contrast` di **semua 7 template** — awalnya terlihat seperti regresi serius. Investigasi: skrip mengambil screenshot & menjalankan axe-scan tepat setelah `waitForSelector("text=RSVP")`, yang resolve jauh lebih cepat dari total durasi animasi (~1.45s) — scan menangkap elemen hero di TENGAH fade (opacity < 1), sehingga rasio kontras efektif saat itu memang rendah (bukan salah desain warna — palet yang sama sudah lolos `scripts/audit-contrast.mjs` di opacity penuh). Diperbaiki dengan menambah `page.waitForTimeout(1700)` (margin di atas 1.45s) sebelum screenshot/axe-scan di `verify-templates.mjs`, supaya scan menguji keadaan akhir yang stabil — sesuai praktik pengujian aksesibilitas yang wajar (uji steady-state, bukan frame transisi animasi masuk singkat yang otomatis kelar tanpa interaksi apa pun). Setelah fix ini, ulang jalan: 0 axe violation di semua 7 template seperti semula.
- **Verifikasi timing** (skrip debug, dihapus setelah dicek) mengonfirmasi staged fade bekerja sesuai desain: t=50ms semua stage masih opacity 0, t=550ms stage lebih awal mulai fade sementara stage belakangan masih 0, t=1350ms semua stage sudah opacity 1 penuh — dan dengan `prefers-reduced-motion: reduce`, semua stage langsung opacity 1 di t=20ms (animasi benar-benar dilewati, bukan cuma dipercepat).
- **Tidak ada perubahan backend/skema, tidak ada skrip verifikasi lain yang perlu diupdate** — beda dari opsi gerbang-klik yang ditolak, pendekatan ini murni tambahan CSS di atas markup yang sudah ada, RSVP/Buku Tamu tidak tersentuh sama sekali.
- **Genuinely tidak dikerjakan** (ditolak eksplisit oleh keputusan produk di atas): gerbang klik "Buka Undangan" yang menyembunyikan seluruh halaman — pertimbangan funnel RSVP & beban update puluhan skrip verifikasi dianggap tidak sepadan dengan nilai animasinya untuk kasus pakai undangan pernikahan yang dibagikan luas.
- **Deploy staging**: dilakukan atas instruksi langsung pemilik produk, pola sama dengan deploy frontend-only sebelumnya (nol migrasi/skema, tanpa backup DB) — image di-rebuild, ditransfer, restart **hanya** `frontend` (`--no-deps`), backend/postgres/redis/kedua Odoo tidak disentuh (uptime tidak berubah). Diverifikasi lewat browser sungguhan ke `https://demo.ecodigitus.com`: polling opacity `.hero-stage` tiap 150ms mengonfirmasi progres staggered asli di server nyata (0 → bertahap → 1 penuh dalam ~1.2 detik, pola identik dengan yang diuji di lokal), `.sparkle-particle` terkonfirmasi 4 elemen ter-render, dan scroll-reveal (`.reveal-target`) dari batch v19→v20 masih berfungsi normal setelah deploy ini. Sempat ada kebingungan kecil: cek pertama pakai `waitForTimeout(50)` setelah event `commit` menunjukkan semua opacity sudah 1 (terlihat seperti animasi tidak jalan) — ternyata cuma miskalibrasi waktu tunggu terhadap latensi jaringan nyata (`commit` fire jauh lebih awal dari cat pertama di koneksi remote dibanding localhost), bukan bug; dikonfirmasi ulang lewat polling tiap 150ms sejak `domcontentloaded` yang menunjukkan progres bertahap dengan jelas. Data test dibersihkan, row count kembali ke baseline (6 users/5 events).

---

## Log Perubahan (v21 → v22) — Rencana Mode Registrasi-Saja (RG-01 s/d RG-07) ditulis; **nol kode berubah**

> **Batch ini murni dokumen.** Tidak ada file `.py`/`.ts`/`.tsx` yang disentuh,
> tidak ada migrasi, tidak ada deploy, tidak ada test dijalankan — karena tidak
> ada yang perlu dites. Bagian 11 yang baru dibuat semuanya `[ ]`.

Dipicu pertanyaan langsung pemilik produk: *"kalau undangan nikahannya sudah ada, apakah bisa disambung ke website kita buat registrasi?"* — segmen pasangan yang sudah beli undangan dari vendor lain atau sudah cetak undangan kertas, tapi butuh sistem registrasi + check-in venue.

**Audit kode dulu sebelum menulis rencana** (bukan langsung merancang dari asumsi) — dan hasilnya mengubah bentuk rencananya secara substansial di 3 tempat:

1. **Ternyata jauh lebih murah dari dugaan awal.** Jalur RSVP anonim sudah berfungsi hari ini (`guest_token` opsional di `rsvp.py`), payload QR check-in murni `invite_token` sehingga seluruh alur check-in venue tidak perlu disentuh, dan upsert RSVP untuk tamu ber-token sudah ada untuk dipakai ulang. Yang genuinely baru cuma: penanda mode di `Event`, halaman `/r/{slug}`, dan auto-enroll.
2. **Ide "palet aksen kurasi baru" dibatalkan.** Rencana awal (dibahas lisan) mau membuat 3–5 warna aksen baru khusus halaman registrasi supaya nyambung dengan undangan vendor. Setelah dicek, `template_id` sejak awal `String(50)` free-string tanpa allowlist, dan 7 palet template existing sudah lolos `scripts/audit-contrast.mjs` (52 pengecekan). Jadi diputuskan **reuse palet yang ada** lewat `template_id` — lebih murah, nol kolom baru, nol entri audit kontras baru, nol risiko drift.
3. **Ditemukan cacat fatal yang tidak terlihat dari level konsep, jadi requirement wajib (RG-05).** QR check-in sengaja dibatasi ke tamu roster ber-link-personal — trade-off yang sudah tercatat & diterima di Bagian 10. Di mode registrasi-saja konsekuensinya berubah kelas: undangan vendor umumnya memuat **satu** link umum untuk semua tamu, jadi tidak ada tamu yang pernah punya `invite_token` dan **nol QR terbentuk** — kita akan menjual "Sistem QR Wedding" yang tidak menghasilkan QR sama sekali. Auto-enroll (tamu anonim otomatis masuk roster + langsung dapat QR-nya) karena itu ditetapkan syarat kelayakan mode ini, bukan fitur pelengkap.

**Konsekuensi keamanan dari RG-05, karena auto-enroll berarti endpoint publik tanpa login menulis baris `Guest`** — tiga guard, dua di antaranya baru: (a) penegakan kapasitas paket harus ada di jalur publik juga, saat ini cuma ada di route owner `create_guest` (`guests.py:72-78`) sehingga tanpa ini kapasitas berbayar bisa dilewati; (b) `invite_token` yang dikembalikan ke browser hanya boleh milik guest yang baru dibuat di request itu — kalau aturan ini tidak ditulis di kode, penambahan dedupe-by-nama di masa depan otomatis membuka jalur pengambilalihan RSVP + QR tamu lain lewat tebak-nama (OWASP A01); (c) rate limit yang **sengaja lebih longgar** dari 5/60s milik RSVP sekarang, karena mode ini mengarahkan semua tamu ke satu endpoint dan tamu di venue (WiFi bersama) + pengguna seluler Indonesia (NAT operator) banyak berbagi satu IP — throttle IP ketat akan memblokir tamu yang sah, dan guard sebenarnya memang kapasitas paket.

**Batas teknis yang ditemukan saat audit & bentuk trade-off-nya:** dedupe tamu berdasarkan nama tidak mungkin di level SQL karena `Guest.name` dienkripsi Fernet (`app/db/encrypted_types.py`) yang non-deterministik — IV acak per nilai, jadi `WHERE name = '...'` tidak akan pernah cocok. Dipilih: serahkan `invite_token` ke `localStorage` browser tamu supaya kunjungan berikutnya masuk jalur upsert yang **sudah ada** (nol mesin dedupe baru). Duplikat lintas-device diterima sebagai konsekuensi (owner hapus manual). Jalan pintas "decrypt semua tamu lalu bandingkan di Python" **ditolak eksplisit** — membuat endpoint publik bekerja proporsional ke ukuran roster (sampai 1.200 baris), amplifikasi beban yang tidak perlu. Opsi masa depan kalau jadi keluhan nyata: blind index `name_fingerprint` (HMAC-SHA256 ternormalisasi) + backfill.

**Dua jalur integrasi ditolak untuk sekarang, dicatat supaya tidak dibahas ulang dari nol:** embed iframe form RSVP ke halaman vendor (mayoritas vendor undangan digital tidak mengizinkan inject HTML/iframe, dan butuh pengecualian per-route dari `X-Frame-Options: DENY` yang sekarang global di `next.config.ts` + `main.py`, plus `frame-ancestors` allowlist per-event), dan API partner B2B2C dengan webhook (butuh API key per-tenant + HMAC — tunggu vendor benar-benar minta, relevan bareng Program Mitra Fase 5).

**Dua temuan kecil sekalian saat audit, dicatat sebagai task di Bagian 11:** (a) pesan error `/dashboard/checkin` akan menyesatkan kalau petugas men-scan QR registrasi generik di gerbang ("token tidak valid", padahal payload-nya URL bukan token) — perlu diperjelas; (b) baris **Versi** di header file ini tertinggal di "11" sementara Log Perubahan sudah sampai v21 — diselaraskan jadi 22.

**Dokumen lain yang ikut diperbarui di batch yang sama:** `PRD.v2.md` (tabel RG di Bagian 3, requirement keamanan di Bagian 5, catatan roadmap Bagian 9, Open Question harga di Bagian 10, Log Perubahan Bagian 19), `rencana-produk-saas-undangan-pernikahan.v2.md` (segmen & value proposition), `styleguide.v2.md` (§5.7 layout halaman registrasi).

**Harga mode ini belum diputuskan pemilik produk** — rencana berasumsi pakai 3 paket yang sama tanpa SKU baru, konsisten dengan prinsip "paket dibedakan kapasitas, bukan fitur". Sama seperti harga add-on Rp100.000, ini asumsi kerja yang perlu dikonfirmasi.

---

## Log Perubahan (v22 → v23) — Mode Registrasi-Saja (RG-01 s/d RG-07) diimplementasi & di-deploy

Lanjutan langsung dari rencana v21→v22, dieksekusi di sesi yang sama atas instruksi pemilik produk ("lanjut", kemudian "langsung deploy ya"). Semua checkbox di Bagian 11 sekarang `[x]` dengan catatan inline di tempat implementasi berbeda tipis dari rencana. Ringkasan di sini fokus ke **apa yang beda dari rencana** dan **bug yang ditemukan selama proses** — bukan mengulang seluruh desain yang sudah benar di Bagian 11.

**3 perbedaan dari rencana (semuanya perbaikan, bukan penyederhanaan):**

1. **`app/services/guest_capacity.py` (modul baru)** menggantikan rencana awal "ekstrak helper ke `guests.py`, import dari `rsvp.py`" — dipisah ke `services/` supaya tidak ada precedent import lintas-route-module (tidak ada satu pun route file lain yang saling import di codebase ini).
2. **Rate limit auto-enroll diterapkan manual di dalam handler**, bukan lewat `Depends()` di dekorator seperti limiter lain — karena mode cuma diketahui setelah event di-lookup dari slug, dan sebuah `Depends()` di dekorator berlaku unconditional untuk semua request. `submit_rsvp` jadi `async def` untuk bisa `await` limiter secara manual. Ini satu-satunya endpoint di codebase yang memanggil `RateLimiter` di luar `Depends()`.
3. **Kolom `Guest.self_registered` (baru, tidak ada di rencana awal Bagian 11.2/11.3)** — ditambahkan untuk memenuhi item §11.4 "tandai tamu hasil auto-enroll" (badge "Daftar sendiri" di Kelola Tamu) yang di draf rencana belum punya mekanisme data pendukung.

**Bug ditemukan lewat lint, bukan cuma "sudah dites" (React Compiler `react-hooks/set-state-in-effect`):** implementasi awal `RsvpForm.tsx`/`RegistrationLinkCard.tsx` membaca `localStorage`/`window.location.origin` di badan `useEffect` lalu langsung `setState` — berfungsi normal di browser, tapi dilarang linter proyek ini (aturan React Compiler yang sama alasannya dengan kenapa `ScrollReveal.tsx` sebelumnya menghindari React state demi manipulasi DOM langsung, lihat Log Perubahan v19→v20). Diperbaiki dengan 2 pendekatan sesuai konteks masing-masing:
- `RegistrationLinkCard.tsx` — lazy `useState(() => window.location.origin)` TANPA effect sama sekali. Aman karena komponen ini cuma pernah dipasang dari `editor/page.tsx` SETELAH `useMyEvent()` selesai fetch client-side (event selalu `null` di render pertama, baik server maupun client) — subtree ini tidak pernah ada di HTML hasil SSR, jadi nol risiko hydration mismatch.
- `RsvpForm.tsx` — direstrukturisasi pakai `useSyncExternalStore(subscribeNever, getSnapshot, getServerSnapshot)` untuk baca token di `localStorage`. Snapshot server selalu `null` (localStorage tidak ada di server), React otomatis "mengoreksi" ke nilai asli begitu hidrasi selesai tanpa perlu effect+setState manual. Effect yang tersisa (fetch `getPublicGuest` begitu token ditemukan) SEMUA `setState`-nya sudah di dalam callback promise (`.then()/.catch()/.finally()`) — pola yang sama dengan `lib/use-my-event.ts`, yang memang sudah lolos rule ini sejak awal.

**Testing:** 8 test pytest baru (`tests/test_registration_mode.py`) — lihat 11.3 untuk daftar lengkap. **91 pytest lolos** (naik dari 83), `ruff check`/`tsc --noEmit`/`eslint` bersih.

**Verifikasi end-to-end** (`frontend/scripts/verify-registration-mode.mjs`, baru) — dijalankan 2×: lokal (`localhost:3000`, Postgres via `docker exec` langsung) dan ulang ke domain nyata (`https://demo.ecodigitus.com`, via `STAGING_SSH_HOST=15.232.71.64` — psql grant paket dijalankan lewat `ssh ... "echo <base64 SQL> | base64 -d | docker exec -i wedding-saas-postgres-1 psql ..."` untuk menghindari neraka quoting SQL bersarang, karena Postgres staging tidak expose port ke luar). Kedua run **PASSED** semua 15 assertion, termasuk yang paling kritis: **reload halaman setelah auto-enroll RSVP tetap menampilkan QR tanpa submit ulang** — bukti `useSyncExternalStore` bekerja benar di HTTPS staging, bukan cuma di localhost.

**Deploy ke staging** — dilakukan atas instruksi langsung pemilik produk, tetap mengikuti Backup-First Protocol walau migrasi ini murni aditif (nol `DROP COLUMN`, beda dari precedent v16→v17): backup terbaru sebelumnya (18 Agustus) sudah 2 hari, di luar ambang aman — diambil backup segar (`pg_dump -Fc`, `wedding_saas_pre_regmode_20260820.dump`, diverifikasi via `pg_restore -l`, 54 TOC entries) sebelum migrasi. Proses: image dibangun lokal (`--build-arg NEXT_PUBLIC_API_URL=https://demo.ecodigitus.com`), `docker save`→`scp`→`docker load`, restart **backend dulu** (`--no-deps`) → `alembic upgrade head` (`d1f4a9c3e8b2` lalu `9a2c7e15f4d0`) → verifikasi kolom `mode`/`self_registered` ada, jumlah baris `users`/`events`/`payments` (6/5/10) tidak berubah → restart **frontend** (`--no-deps`). **Nol perubahan config Nginx Proxy Manager** — `/r/{slug}` otomatis jatuh ke aturan "everything else → frontend" yang sudah ada (rute ini tidak menambah prefix API baru; semua panggilan backend dari halaman ini lewat prefix `/invitations/` yang sudah di-routing). Uptime `odoo18-odoo-1`/`odoo18-db-1` dikonfirmasi tidak berubah. Tarball & dump sementara dibersihkan dari `/tmp` di kedua sisi.

**Gap yang ditemukan saat implementasi, dicatat bukan ditutup diam-diam** (detail di 11.6/11.7): axe-core di `/r/{slug}` cuma dites dengan palet default (`klasik`), belum diulang untuk ke-6 palet lain termasuk `monokrom` yang paling berisiko (latar gelap, tanpa chrome undangan sebagai konteks tambahan).

**Harga mode ini diputuskan setelah deploy** — diminta langsung oleh pemilik produk: "untuk harga samakan dengan yang ada sekarang". Jadi 3 paket per-acara yang sama (Intimate/Celebration/Grand), tanpa SKU baru, bukan lagi asumsi kerja tapi keputusan final — dicatat di `PRD.v2.md` Bagian 10 ("Keputusan yang sudah diambil"), bukan lagi Open Question. Nol perubahan kode diperlukan: `PACKAGE_CATALOG` (`app/core/packages.py`) sudah dipakai apa adanya oleh mode registrasi-saja sejak baris kode pertama diimplementasi — keputusan ini murni mengonfirmasi apa yang sudah berjalan.

**Genuinely belum dikerjakan / di luar scope batch ini** — tidak berubah dari yang sudah dicatat di rencana v21→v22: embed iframe, API partner B2B2C, dedupe lintas-device, UW-10 Custom Domain.

---

## Log Perubahan (v23 → v24) — Gap axe-core lintas-palet di Mode Registrasi-Saja ditutup

Diminta langsung oleh pemilik produk ("yes tutup gap") setelah gap ini dicatat di Log Perubahan v22→v23: axe-core di `/r/{slug}` cuma pernah dites dengan palet default (`klasik`), belum diulang untuk ke-6 palet lain — termasuk `monokrom` (latar gelap) yang disebut paling berisiko karena halaman registrasi tidak punya chrome undangan sebagai konteks tambahan.

**Pendekatan: perluas `scripts/verify-templates.mjs`, bukan `verify-registration-mode.mjs`** — sesuai rekomendasi yang sudah ditulis saat gap ini pertama ditemukan. `verify-templates.mjs` sudah punya harness ganti-template-per-event yang persis dibutuhkan (loop 7 template, masing-masing di-set lewat editor lalu event yang sama dipakai ulang) — menambah 1 axe-scan tambahan per iterasi jauh lebih murah daripada membangun ulang harness serupa di skrip lain. Per iterasi template, ditambahkan: toggle Mode Registrasi-Saja ke aktif → kunjungi `/r/{slug}` → screenshot + axe-scan → toggle mode balik ke nonaktif (supaya iterasi template berikutnya tidak ke-redirect saat mengunjungi `/{slug}` untuk cek yang sudah ada). Tidak perlu grant paket via psql sama sekali — render halaman registrasi tidak butuh paket aktif (paket cuma ditegakkan saat auto-enroll RSVP sungguhan, bukan saat sekadar menampilkan halamannya), jadi skrip ini tetap murni UI-driven seperti sebelumnya, tanpa shortcut DB.

**Hasil: 0 axe-core violation di semua 7 palet** (`klasik`, `modern-minimal`, `botanical`, `monokrom`, `editorial`, `monogram`, `taman-manis`) untuk `/r/{slug}`, dan 0 pelanggaran juga tetap terkonfirmasi untuk `/{slug}` (regression check, tidak berubah dari sebelumnya). 0 console error/warning di seluruh 14 kombinasi (7 palet × 2 halaman). Screenshot mobile disimpan per palet (`tpl-{id}-registration-mobile.png`) untuk spot-check visual manual — dicek langsung untuk `monokrom` (kasus uji utama) dan `editorial` (struktur beda, header rata-tengah di halaman registrasi meski template aslinya rata-kiri): keduanya bersih secara visual, kartu form tetap terang (`bg-surface`) di atas latar gelap `monokrom` sesuai aturan styleguide.v2.md §5.7/§12, tidak ada teks tak terbaca atau elemen tumpang tindih (di luar badge dev-mode Next.js yang bukan bagian UI aplikasi).

**Dijalankan lokal saja** (tidak diulang ke `https://demo.ecodigitus.com`) — gap ini murni soal cakupan PALET, bukan soal lingkungan (lokal vs domain nyata sudah dikonfirmasi identik untuk palet `klasik` di Log Perubahan v22→v23), jadi mengulang ke staging tidak menambah sinyal baru untuk gap spesifik ini.

**Docker Desktop sempat mati saat sesi ini dimulai** — dinyalakan ulang, container `postgres`/`redis` lokal tetap dari sesi sebelumnya (data tidak hilang). Backend & frontend lokal di-restart bersih di port 8000/3000 (ada sisa proses dari sesi sebelumnya yang perlu di-`taskkill` dulu karena port 3000 masih terpakai socket basi).

Tidak ada perubahan kode aplikasi di batch ini — murni perluasan skrip verifikasi. `task.v2.md` §11.6/§11.7 diperbarui untuk mencerminkan gap ini sudah ditutup (checkbox & bullet terkait direvisi, bukan ditulis ulang seluruhnya).

---

## Log Perubahan (v24 → v25) — QR check-in hasil auto-enroll dikonfirmasi benar-benar bisa di-scan

Dipicu pertanyaan konfirmasi pemilik produk: "Mode Registrasi-Saja itu kan mau ada QR checkin juga". Jawabannya ya — QR check-in bukan cuma bagian dari mode ini, RG-05 (auto-enroll) memang **dirancang** khusus supaya QR check-in bisa terbentuk sama sekali di mode ini (lihat §11.2: tanpa auto-enroll, nol QR pernah terbentuk karena undangan vendor umumnya cuma satu link umum untuk semua tamu). Tapi pertanyaan ini menyingkap gap testing nyata: seluruh test & verifikasi sebelumnya (§11.3, §11.6) cuma membuktikan **QR-nya tampil di layar** (canvas render, komponen `GuestQrCode` yang sama dipakai tamu roster biasa) — belum ada satu test pun yang benar-benar memanggil endpoint check-in (`POST /guests/check-in`, BT-02) dengan `guest_token` hasil auto-enroll untuk membuktikan QR itu **benar-benar bisa dipakai check-in**, bukan cuma "terlihat seperti QR".

**Analisis kode dulu sebelum menulis test** (bukan asumsi): dibaca `check_in_guest` (`app/api/routes/guests.py:200-228`) — endpoint ini cuma mencocokkan `Guest.invite_token`, verifikasi kepemilikan event (`event.owner_id == current_user.id`) dan `event.package is not None`. **Tidak ada pengecekan `self_registered` atau `mode` sama sekali** — endpoint ini sepenuhnya tidak peduli bagaimana baris `Guest` itu terbentuk (manual oleh owner atau auto-enroll), selama `invite_token`-nya valid dan event-nya berpaket. Secara desain seharusnya sudah otomatis bekerja tanpa perubahan kode apa pun.

**Ditulis 1 test pytest baru** (`test_autoenroll_guest_can_actually_be_checked_in`, `tests/test_registration_mode.py`) untuk membuktikan analisis itu, bukan cuma mempercayainya: RSVP anonim di mode registrasi-saja → ambil `guest_token` dari response → panggil `POST /guests/check-in` sebagai owner dengan token itu → **PASSED**, `checked_in_at` terisi, `already_checked_in=False`, dan `self_registered=True` tetap terkonfirmasi di roster. **92 pytest lolos** (naik dari 91), `ruff check` bersih.

Satu test lain (`test_login_timing_consistent_regardless_of_email_existing`, tidak terkait Mode Registrasi-Saja sama sekali) sempat gagal di run gabungan — dikonfirmasi flaky karena beban sistem (banyak proses/container berjalan bersamaan sesi ini), lolos bersih saat dijalankan sendiri. Bukan regresi dari batch ini.

**Tidak ada perubahan kode aplikasi** — analisis mengonfirmasi mekanisme check-in sudah bekerja untuk tamu auto-enroll sejak implementasi awal (Log Perubahan v22→v23), murni menambah test yang sebelumnya hilang untuk membuktikannya secara eksplisit, bukan cuma "seharusnya bekerja".

---

## Log Perubahan (v25 → v26) — Bug billing: downgrade/beli-ulang paket sekarang ditolak

Dipicu pertanyaan pemilik produk: *"itu setelah beli yang billing grand, masih bisa milih yang intimate?"*. Bukan bagian dari Mode Registrasi-Saja (Bagian 11) — ini gap di sistem paket-per-acara yang sudah ada sejak Log Perubahan v16→v17, cuma baru ketahuan sekarang lewat pertanyaan ini.

**Dibaca kode dulu sebelum menjawab** (bukan tebak-tebak): di `create_purchase` (`routes/billing.py`), blok validasi cuma ada untuk `item_type="addon"` (cek `event.package is None` & item sudah dimiliki) — **untuk `item_type="package"` tidak ada pengecekan apa pun**. Owner yang sudah punya `package="grand"` bisa saja bayar lagi untuk `"intimate"`; begitu Xendit konfirmasi lunas, webhook (`event.package = payment.item_key`) menimpa `"grand"` jadi `"intimate"` tanpa syarat sama sekali. Di frontend (`dashboard/billing/page.tsx`), kartu paket cuma di-disable untuk paket yang **sedang aktif** (`disabled={isActive}`) — kartu paket lain (termasuk yang lebih kecil) tetap bisa diklik.

**Risiko nyata, bukan cuma kosmetik**: kalau event itu sudah punya tamu di roster melebihi kapasitas paket baru (mis. 300 tamu di bawah Grand/1.200, lalu di-downgrade ke Intimate/200), 300 tamu itu tidak terhapus (aman), tapi event langsung "kepenuhan" — tidak ada tamu baru yang bisa ditambah (baik manual maupun auto-enroll Mode Registrasi-Saja) sampai beli paket lebih besar lagi. Tanpa peringatan apa pun saat klik beli.

**Keputusan yang dikonfirmasi ke pemilik produk** (3 opsi ditawarkan): blokir total downgrade/beli-ulang — **dipilih**, dibanding opsi "izinkan kalau jumlah tamu masih di bawah kapasitas baru" (lebih fleksibel tapi lebih rumit) atau "biarkan, cukup dicatat".

**Fix:**
- Backend — `create_purchase` menolak (409) kalau `item_type="package"` dan `item["max_guests"] <= PACKAGE_CATALOG[event.package]["max_guests"]`. Dibandingkan lewat `max_guests` dari katalog (bukan daftar nama paket hardcode) supaya otomatis benar kalau katalog berubah. Pesan eksplisit ke owner: sudah punya paket apa, kapasitas berapa, harus pilih yang lebih besar.
- Frontend — kartu paket dengan `max_guests <= activePkg.max_guests` (dan bukan paket aktif itu sendiri) di-disable + label "Kapasitas lebih kecil/sama", supaya tidak ada tombol yang pasti akan ditolak backend kalau diklik.
- 3 test pytest baru (`test_billing.py`): downgrade ditolak (409), beli ulang paket sama ditolak (409), **upgrade tetap bisa** (regression guard — guard ini cuma menolak turun/sama, bukan naik). **95 pytest lolos** (naik dari 92), `ruff check`/`tsc --noEmit`/`eslint` bersih.

**Verifikasi** (`scripts/verify-package-downgrade-guard.mjs`, baru) — dijalankan 2×: lokal dan ke domain nyata (`STAGING_SSH_HOST`, psql via SSH+base64 stdin seperti skrip lain). Kedua run: grant paket `grand` via psql → kartu Intimate/Celebration terkonfirmasi disabled dengan label yang benar (screenshot diambil & dicek visual) → **panggilan API langsung (bypass UI, lewat `page.evaluate`+`fetch`) ke endpoint purchase tetap ditolak 409** — membuktikan guard-nya di backend, bukan cuma kosmetik UI yang bisa dilewati dengan curl/Postman. Paket event dikonfirmasi tetap `grand` setelah semua percobaan.

**Deploy ke staging** — dikonfirmasi eksplisit oleh pemilik produk sebelum eksekusi. **Tanpa migrasi DB** (murni logic validasi route + UI, nol kolom baru) — konsisten dengan pola deploy frontend/logic-only sebelumnya, tidak perlu backup segar tambahan. Image dibangun lokal (build cache Docker sempat korup akibat Docker Desktop yang tadi mati-hidup, diperbaiki dengan `--no-cache` sekali), `docker save`→`scp`→`docker load`, **backend dan frontend direstart bersamaan** (`--no-deps`, beda dari deploy bermigrasi yang selalu backend dulu — di sini urutan tidak masalah karena tidak ada skema yang berubah). Row count `users`/`events`/`payments` dikonfirmasi tidak berubah (6/6/11 — akun `hihi@gmail.com` yang naikkan `events` dari 5→6 sudah ada sebelum sesi ini, bukan dari test run). Odoo tetangga tidak terganggu.

Nol perubahan skema/migrasi. Nol dampak ke fitur lain — guard ini murni menutup celah di jalur upgrade paket yang sudah ada.

---

## Log Perubahan (v26 → v27) — Bug: link/QR yang dibagikan ke tamu bisa berisi IP server

Dipicu instruksi pemilik produk: *"pastikan tidak ada menuju ke ip server"* / *"yang redirectnya ke ip server kan seharusnya ke link demo.ecodigitus.com"*.

**Ditemukan lewat audit kode**: `window.location.origin` dipakai di 2 tempat untuk membangun link yang dibagikan ke tamu — `dashboard/guests/page.tsx` (Copy link personal, sudah ada sejak UW-08) dan `RegistrationLinkCard.tsx` (Cara Sambungkan, RG-07, baru sesi ini). `window.location.origin` ikut host yang SEDANG diakses saat link itu dibuat — kalau owner membuka dashboard lewat `http://15.232.71.64:3000` (staging masih mengizinkan akses langsung ini di `CORS_ORIGINS`), link/QR yang dihasilkan berisi IP itu, bukan domain. Ini fatal khusus untuk link yang **dicetak di undangan kertas** (RG-06) — kalau IP server berubah di masa depan, link yang sudah dicetak permanen rusak; dan URL berbasis IP juga tidak HTTPS (`http://`), beda dari `https://demo.ecodigitus.com` yang seharusnya.

**Fix**: `lib/site.ts` (baru) — `getSiteOrigin()` mengembalikan `NEXT_PUBLIC_SITE_URL` (build-time constant, sama pola dengan `NEXT_PUBLIC_API_URL`) kalau diisi, fallback ke `window.location.origin` cuma untuk dev lokal (tidak ada domain kanonik untuk dibandingkan di sana). Kedua pemakaian `window.location.origin` diganti `getSiteOrigin()`. `Dockerfile` + `.env.local.example` menambah `ARG`/`ENV NEXT_PUBLIC_SITE_URL`.

**Bug deploy ditemukan di tengah verifikasi — dicatat karena bisa terulang**: build image PERTAMA untuk fix ini (`docker build --build-arg NEXT_PUBLIC_SITE_URL=...`) sempat dianggap selesai lewat `docker images` (ID tag `:latest` berubah), lalu di-deploy — tapi verifikasi lewat akses IP langsung TETAP menunjukkan bug lama. Ditelusuri via `BUILD_ID` (`.next/BUILD_ID`) di dalam image vs container yang jalan: **beda** — image yang di-deploy adalah snapshot `:latest` yang SEMPAT ke-tag di tengah proses build (kemungkinan terkait fitur attestation/SBOM BuildKit yang menghasilkan beberapa manifest bertahap), sebelum build sungguhan selesai dan `:latest` pindah lagi ke image final. Notifikasi background task "build selesai" untuk build itu baru muncul BELAKANGAN, setelah deploy pertama sudah jalan dengan image yang salah. **Pelajaran**: jangan percaya `docker images` ID berubah sebagai sinyal "build selesai" untuk build yang di-background-kan — tunggu notifikasi task completion-nya, dan verifikasi isi image (`BUILD_ID` atau grep fungsi spesifik) sebelum deploy, terutama untuk build yang menghasilkan attestation manifest. Diperbaiki dengan build ulang, verifikasi `BUILD_ID` + isi bundle (`grep getSiteOrigin`) cocok SEBELUM `docker save`, lalu deploy ulang dengan `--force-recreate`.

**Verifikasi definitif** — akses dashboard LANGSUNG lewat `http://15.232.71.64:3000` (skenario yang sebenarnya dikhawatirkan, bukan cuma lewat domain yang otomatis "benar" karena `window.location.origin` kebetulan sama dengan domain): link "Cara Sambungkan" tetap menunjukkan `https://demo.ecodigitus.com/r/{slug}`, **bukan IP**, mengonfirmasi fix bekerja terlepas dari host mana dashboard diakses. Row count `users`/`events`/`payments` kembali ke baseline (6/6/11) setelah cleanup, Odoo tetangga tidak terganggu.

**Rekomendasi ini dikonfirmasi & dieksekusi di Log Perubahan v27→v28** (di bawah) — `CORS_ORIGINS` staging sudah diketatkan ke domain saja.

---

## Log Perubahan (v27 → v28) — `CORS_ORIGINS` staging diketatkan ke domain saja

Dikonfirmasi oleh pemilik produk ("yes") setelah rekomendasi di v26→v27: tutup jalur akses langsung via IP server, bukan cuma perbaiki gejalanya (link/QR).

**Perubahan**: `backend.env` (Lightsail) — `CORS_ORIGINS` dari `http://15.232.71.64:3000,https://demo.ecodigitus.com` jadi `https://demo.ecodigitus.com` saja. Backup diambil dulu (`backend.env.bak.202608210918`, mengikuti konvensi backup yang sudah ada di direktori itu) sebelum edit, sesuai Backup-First Protocol — walau ini cuma file config teks, bukan database.

**Verifikasi — 2 arah, bukan cuma "config sudah diubah":**
- Domain (`https://demo.ecodigitus.com`) tetap 100% normal: register → login → dashboard berhasil, tidak ada regresi.
- Akses langsung via `http://15.232.71.64:3000` sekarang **gagal total** untuk aksi apa pun yang butuh API — dikonfirmasi lewat console browser sungguhan: `Access to fetch at 'https://demo.ecodigitus.com/auth/register' from origin 'http://15.232.71.64:3000' has been blocked by CORS policy`. UI menampilkan pesan error yang jelas ("Gagal daftar. Coba lagi ya."), tidak crash, tetap di halaman register — tidak pernah sampai ke dashboard.

Catatan: frontend (halaman statis Next.js) masih *termuat* kalau diakses lewat IP:3000 (port itu sendiri belum ditutup di level network/firewall) — tapi sekarang genuinely tidak berguna, karena semua panggilan API (login, register, dan seterusnya) ditolak CORS. Menutup port itu sepenuhnya (firewall Lightsail) adalah langkah lebih jauh yang tidak diminta di sesi ini.

Row count kembali baseline (6 users/6 events) setelah cleanup data test, Odoo tetangga tidak terganggu (restart cuma menyentuh container `backend`).

`README.md` § Deploy ke staging diperbarui: bullet baru menegaskan `CORS_ORIGINS` HANYA domain (jangan tambahkan IP lagi di deploy berikutnya), plus catatan `NEXT_PUBLIC_SITE_URL` wajib diisi dan cara verifikasi `BUILD_ID` sebelum `docker save` (pelajaran dari bug deploy di v26→v27).
