# PRD: SaaS Undangan Pernikahan Digital

| | |
|---|---|
| **Versi** | 1.14 |
| **Tanggal** | 21 Agustus 2026 |
| **Status** | Draft — revisi pasca crosscheck internal (lihat Bagian 12: Log Perubahan). Bagian 19 (Mode Registrasi-Saja, RG-01 s/d RG-07) **sudah diimplementasi & live di staging** — lihat Bagian 20–22. Bug billing (downgrade paket) diperbaiki & live — lihat Bagian 23. Bug link/QR berisi IP server diperbaiki & live, akses langsung via IP sudah ditutup total — lihat Bagian 24–25. |
| **Benchmark** | Katsudoto.id |

---

## 1. Overview & Latar Belakang

Produk ini adalah platform SaaS yang membantu pasangan merencanakan, mengundang, dan mengelola tamu pernikahan dalam satu tempat. Dibangun sebagai 3 pilar produk (Undangan Website, Buku Tamu Digital & Check-in, Wedding Planner) agar user tetap di platform sejak masa perencanaan (bulan-bulan sebelum acara) hingga hari-H, bukan cuma sekali pakai untuk kirim undangan.

### 1.1 Problem Statement

- Pasangan calon pengantin butuh cara cepat & murah untuk membuat undangan digital, tapi solusi yang ada sering terpisah-pisah (undangan di satu tempat, RSVP manual di Excel, check-in venue masih manual/kertas).
- Wedding Organizer butuh alat yang bisa di-white-label untuk banyak klien tanpa membangun sistem sendiri.
- Tidak ada insentif bagi user untuk kembali ke platform setelah undangan terkirim — retensi rendah, lifetime value kecil.

### 1.2 Goals

1. Menyediakan MVP undangan digital yang bisa dipublish dalam < 5 menit.
2. Membangun retensi lewat fitur perencanaan (Wedding Planner) yang dipakai user berbulan-bulan sebelum acara.
3. Menyediakan jalur monetisasi jelas (freemium → Lite/Premium) dan growth channel (program Mitra).

### 1.3 Non-Goals (di luar scope versi 1.0)

- Tidak membangun marketplace vendor pihak ketiga (baru sebatas "Vendor List" milik user sendiri).
- Tidak menyediakan fitur cetak fisik (undangan kertas, souvenir) — hanya digital.
- Tidak membangun aplikasi mobile native di fase awal (web-responsive dulu).

---

## 2. Target User & Persona

| Persona | Deskripsi | Kebutuhan Utama |
|---|---|---|
| **Pasangan (B2C)** | Usia 22–35, calon pengantin, mengatur pernikahan sendiri | Cepat, murah, mobile-friendly |
| **Wedding Organizer (B2B)** | Mengelola beberapa klien sekaligus | White-label, multi-akun, dashboard klien |
| **Mitra/Referral** | Individu yang promosikan produk | Link/kode referral, dashboard komisi |
| **Tamu undangan** | Penerima link undangan | Buka cepat, RSVP mudah, tanpa install app |

---

## 3. Scope Produk (3 Pilar)

> **Catatan tier (baru di v1.1):** Kolom Tier menandai target monetisasi jangka panjang, bukan gating aktif sejak hari pertama. Selama Fase 1 (validasi ke 20–30 pasangan gratis, lihat Bagian 8), seluruh fitur di scope Fase 1 (UW-01 s/d UW-06, BT-01, BT-06) diakses tanpa gating pembayaran. Gating tier baru berlaku mulai Fase 2 setelah payment gateway terintegrasi (Bagian 5 & 9).
>
> **Superseded di v1.7:** label "Lite"/"Premium" di kolom Tier bawah ini sudah tidak merepresentasikan model bisnis aktual sejak v1.7 — monetisasi sekarang **per-acara** (3 paket: Intimate/Celebration/Grand, dibedakan kapasitas tamu bukan fitur) + add-on terpisah (UW-09, UW-11, BT-03), bukan lagi tier akun-wide sekali-bayar. Baca "Premium" di baris manapun di bawah sebagai "butuh paket aktif + add-on terkait, kalau ada" — lihat Bagian 18 & `task.v2.md` Log Perubahan v16 → v17 untuk detail lengkap.

### Pilar 1 — Undangan Website

| ID | Requirement | Tier | Prioritas |
|---|---|---|---|
| UW-01 | User dapat memilih template & mengisi data mempelai, tanggal, lokasi acara | Lite/Premium | P0 |
| UW-02 | Preview real-time saat editing | Lite/Premium | P0 |
| UW-03 | Info acara: peta lokasi (embed Google Maps), jadwal akad/resepsi, dress code | Lite/Premium | P0 |
| UW-04 | Tamu dapat submit RSVP (hadir/tidak + jumlah pax) | Lite/Premium | P0 |
| UW-05 | Dashboard mempelai untuk lihat status RSVP & export data (CSV) | Lite/Premium | P0 |
| UW-06 | Link undangan unik & shareable, dengan Open Graph preview untuk WhatsApp | Lite/Premium | P0 |
| UW-07 | Smart WhatsApp: broadcast undangan ke banyak tamu sekaligus dari dashboard | Premium | P1 (Fase 2) |
| UW-08 | Kelola tamu: buat grup tamu, atur sesi acara, batasi pax per undangan | Premium | P1 (Fase 2) |
| UW-09 | Amplop digital (integrasi QRIS/transfer bank/e-wallet) | Premium | P1 (Fase 2) |
| UW-10 | Custom domain & hapus watermark | Premium | P1 (Fase 2) |
| UW-11 | Musik latar, galeri foto/video, countdown timer | Premium | P2 (Fase 2) |
| UW-12 | Multi-bahasa | — | P3 (Fase 5) |

### Pilar 2 — Buku Tamu Digital & Check-in

| ID | Requirement | Tier | Prioritas |
|---|---|---|---|
| BT-01 | Tamu dapat menulis ucapan/doa di buku tamu digital | Lite/Premium | P1 |
| BT-02 | QR Check-in di venue: generate QR unik per tamu, scan saat kedatangan | Premium | P2 (Fase 3) |
| BT-03 | Selfie Check-in: tamu foto diri saat check-in | Premium | P2 (Fase 3) |
| BT-04 | Auto Thank You Message terkirim otomatis setelah check-in | Premium | P2 (Fase 3) |
| BT-05 | Data kehadiran real-time & kategori tamu (VIP, keluarga, kolega, dll) | Premium | P2 (Fase 3) |
| BT-06 | Export data tamu, RSVP, & ucapan (CSV/Excel). **Kolom kehadiran real-time baru terisi penuh mulai Fase 3** setelah BT-02/BT-05 (Check-in) aktif — di Fase 1, "kehadiran" berarti status RSVP self-report, bukan hasil scan venue. | Lite/Premium | P1 |

### Pilar 3 — Wedding Planner

| ID | Requirement | Tier | Prioritas |
|---|---|---|---|
| WP-01 | Budget Planner: input & pantau anggaran per kategori | Premium | P3 (Fase 4) |
| WP-02 | To-Do List persiapan pernikahan dengan due date | Premium | P3 (Fase 4) |
| WP-03 | Rundown acara (jadwal detail hari-H, editable) | Premium | P3 (Fase 4) |
| WP-04 | Daftar Seserahan (barang, kisaran biaya, sumber beli) | Premium | P3 (Fase 4) |
| WP-05 | Data Seragam (daftar penerima seragam) | Premium | P3 (Fase 4) |
| WP-06 | Tabungan Nikah: target tabungan bersama pasangan | Premium | P3 (Fase 4) |
| WP-07 | Vendor List: tambah & bandingkan vendor pilihan sendiri | Premium | P3 (Fase 4) |

*(Perbaikan v1.1: label sebelumnya "P3 (Fase 2)" tidak konsisten dengan roadmap Bagian 9 yang menaruh Wedding Planner di Fase 4 — sudah diselaraskan.)*

### Growth — Program Mitra/Referral

| ID | Requirement | Prioritas |
|---|---|---|
| MT-01 | User dapat generate kode/link referral pribadi | P3 (Fase 5) |
| MT-02 | Sistem tracking transaksi yang berasal dari kode referral | P3 (Fase 5) |
| MT-03 | Dashboard mitra: lihat komisi (15%) & ajukan penarikan | P3 (Fase 5) |

*(Perbaikan v1.1: label sebelumnya "P3 (Fase 3)" tidak konsisten dengan roadmap Bagian 9 yang menaruh Program Mitra di Fase 5 — sudah diselaraskan.)*

### Mode Registrasi-Saja (baru di v1.8, diimplementasi & deploy di v1.9) — untuk pasangan yang undangannya sudah ada di luar platform

> **Status: sudah diimplementasi & live di `https://demo.ecodigitus.com`.** Detail implementasi & verifikasi ada di `task.v2.md` Bagian 11 (checkbox terisi) dan Log Perubahan v22 → v23.

Dipicu pertanyaan pemilik produk: *"kalau undangan nikahannya sudah ada, apakah bisa disambung ke website kita buat registrasi?"*. Kasusnya nyata dan umum — pasangan sudah beli undangan digital dari vendor lain, atau sudah cetak undangan kertas, tapi belum punya sistem registrasi & check-in venue. Hari ini jawabannya "tidak bisa tanpa bikin undangan kedua di platform kita", yang jadi objection terbesar saat jualan.

Secara arsitektur, seluruh Pilar 2 (RSVP, roster tamu, QR check-in) **sudah tidak peduli undangannya dibuat di mana** — submit RSVP publik dikunci ke `slug` + `invite_token` opsional, bukan ke template undangan; payload QR check-in murni `invite_token`. Yang belum ada cuma halaman registrasi yang tidak ikut merender template undangan kita.

| ID | Requirement | Paket | Prioritas |
|---|---|---|---|
| RG-01 | Owner dapat menandai event sebagai **registrasi-saja** — undangan utamanya dibuat di luar platform | Butuh paket aktif | P1 |
| RG-02 | Halaman registrasi mandiri (`/r/{slug}`): identitas acara ringkas (nama mempelai + tanggal), form RSVP, buku tamu — **tanpa** chrome undangan (hero beranimasi, galeri, musik, countdown) | Butuh paket aktif | P1 |
| RG-03 | `/{slug}` mengalihkan ke `/r/{slug}` saat mode ini aktif — tidak menyajikan template undangan setengah terisi yang terlihat rusak | Butuh paket aktif | P1 |
| RG-04 | Tema visual halaman registrasi memakai salah satu dari 7 palet template yang sudah ada (owner pilih) — supaya nyambung dengan undangan vendor, **tanpa palet baru** | Butuh paket aktif | P1 |
| RG-05 | **Auto-enroll:** tamu yang RSVP lewat link umum otomatis masuk roster & langsung menerima QR check-in miliknya sendiri | Butuh paket aktif | P1 |
| RG-06 | QR registrasi tingkat-acara (satu QR untuk dicetak di undangan kertas) yang mengarah ke `/r/{slug}` | Butuh paket aktif | P1 |
| RG-07 | Panduan "Cara sambungkan" di dashboard: link siap-copy, snippet tombol HTML, unduh QR PNG untuk dicetak | Butuh paket aktif | P2 |

**RG-06/RG-07 wajib pakai domain kanonik, bukan host akses saat itu** (diperbaiki di v1.13, Bagian 24) — link & QR ini sering **dicetak di undangan kertas** atau dibagikan permanen, jadi harus selalu `https://demo.ecodigitus.com`, terlepas dari host mana dashboard sedang diakses saat link itu dibuat.

**RG-05 adalah syarat kelayakan mode ini, bukan pelengkap.** QR check-in (BT-02) sengaja dibatasi ke tamu roster yang punya link personal (keputusan produk, `task.v2.md` Bagian 10). Di mode registrasi-saja, undangan vendor umumnya cuma memuat **satu** link umum untuk semua tamu — tanpa auto-enroll, tidak ada tamu yang pernah dapat `invite_token`, jadi tidak ada satu pun QR yang terbentuk. Artinya kita menjual "Sistem QR Wedding" yang menghasilkan nol QR. Auto-enroll menutup celah itu: tamu RSVP dari link umum → roster terbentuk otomatis → QR langsung tampil di layar tamu.

**Sengaja di luar scope (keputusan tercatat, bukan kelupaan):**
- **Embed iframe/widget** form RSVP ke dalam halaman vendor — mayoritas vendor undangan digital di pasar (Katsudoto dkk) tidak mengizinkan inject HTML/iframe ke halaman mereka, jadi effort + kerja keamanannya (`frame-ancestors` allowlist per-event, pengecualian per-route dari `X-Frame-Options: DENY` yang sekarang global) tidak sepadan sebelum ada permintaan nyata.
- **API partner B2B2C** (vendor memanggil API kita untuk buat tamu, terima webhook RSVP) — masuk akal sebagai jalur distribusi, tapi butuh API key per-tenant, scoping, dan webhook ber-HMAC. Tunggu ada vendor yang benar-benar minta; relevan bareng Program Mitra (Fase 5).

---

## 4. User Stories

### 4.1 MVP Fase 1

1. *Sebagai calon pengantin*, saya ingin memilih template undangan dan mengisi data acara saya, agar saya bisa langsung punya undangan digital tanpa desainer.
2. *Sebagai calon pengantin*, saya ingin membagikan link undangan saya ke WhatsApp dengan preview foto & judul yang menarik (bukan cuma link polos), agar tamu lebih tertarik membukanya. *(UW-06 — diperbaiki di v1.1; versi sebelumnya menonjolkan "broadcast ke banyak kontak sekaligus" yang sebenarnya UW-07/Fase 2, lihat 4.2)*
3. *Sebagai tamu undangan*, saya ingin submit RSVP langsung dari link undangan, agar saya tidak perlu membalas chat terpisah.
4. *Sebagai calon pengantin*, saya ingin melihat dashboard siapa saja yang sudah RSVP dan berapa jumlah tamu yang akan datang, agar saya bisa menyiapkan venue/catering dengan akurat.

### 4.2 Contoh User Story — Fase 2 (preview, bukan MVP)

5. *Sebagai calon pengantin*, saya ingin mem-broadcast link undangan ke banyak kontak WhatsApp sekaligus dari dashboard, agar saya tidak perlu kirim satu-satu manual. *(UW-07, Premium — baru tersedia setelah Fase 2)*

---

## 5. Functional Requirements (ringkas per modul)

**Auth & User Management**
- Registrasi/login via email atau Google OAuth
- Password di-hash dengan algoritma kuat (argon2id atau bcrypt cost memadai) — tidak pernah disimpan atau di-log plaintext; kebijakan panjang minimal & anti-brute-force (rate limit + lockout/backoff) pada endpoint login
- JWT: access token berumur pendek + refresh token; algoritma ditentukan & di-pin (tolak `alg: none`); endpoint logout/revoke tersedia
- **Model event per akun (diputuskan di v1.1 — sebelumnya Open Question):** Fase 1 = 1 akun mengelola 1 event aktif (disederhanakan untuk validasi cepat). Skema data dirancang 1-akun-ke-banyak-event sejak awal, sehingga dukungan multi-event untuk kasus WO multi-klien bisa diaktifkan di Fase 5 tanpa migrasi skema ulang.

**Undangan Editor**
- CRUD template & konten undangan
- Validasi input (tanggal acara tidak boleh di masa lalu, format nomor WA valid, dll)

**RSVP & Guest Management**
- Endpoint publik (tanpa login) untuk submit RSVP dari link undangan
- Rate limiting **pada endpoint tulis (POST submit RSVP, POST submit ucapan)**, bukan hanya endpoint baca — ini yang jadi vektor spam sebenarnya
- Sanitasi & escape semua input teks bebas (nama tamu, ucapan) sebelum disimpan dan saat dirender ulang di halaman publik, untuk mencegah stored XSS (OWASP A03)

**Mode Registrasi-Saja (RG-01 s/d RG-07 — diimplementasi di v1.9, lihat Bagian 20)**
- `Event` dapat penanda mode (`"full"` | `"registration_only"`). Berbeda dari `package`/`addons` yang hanya boleh diubah webhook pembayaran, penanda mode **boleh** diubah owner langsung — mode tidak memberi kapabilitas berbayar apa pun, cuma memilih halaman publik mana yang disajikan
- Auto-enroll (RG-05) menambah baris `Guest` dari endpoint **publik tanpa login**, jadi wajib: (a) penegakan kapasitas paket di jalur publik itu juga — bukan cuma di route owner `POST /events/{id}/guests`, kalau tidak kapasitas berbayar bisa dilewati; (b) rate limit; (c) `invite_token` yang dikembalikan ke browser **hanya** milik tamu yang baru dibuat di request itu — tidak pernah token tamu yang sudah ada, karena itu akan jadi jalur pengambilalihan RSVP tamu lain lewat tebak-nama (OWASP A01)
- Halaman registrasi tidak boleh dapat pengecualian framing — `X-Frame-Options: DENY` tetap berlaku global selama embed masih di luar scope

**Payment**
- Integrasi Xendit (dipilih, lihat Bagian 10) untuk upgrade tier Lite → Premium — **diimplementasi**: Invoice API + webhook, lihat `task.v2.md` Bagian 9
- Webhook handling untuk konfirmasi pembayaran — **wajib verifikasi signature/callback token dari gateway sebelum mengubah status tier**; terapkan idempotency key untuk mencegah replay; jangan percaya isi body webhook tanpa verifikasi, rekonsiliasi ulang lewat status API gateway
- Pembelian paket (per-acara, Bagian 18) **hanya boleh upgrade** — menolak (409) pembelian paket dengan kapasitas sama atau lebih kecil dari yang sudah dimiliki event tersebut. **Diperbaiki di v1.12** (Bagian 23) setelah ditemukan tidak ada guard sama sekali sejak model paket ini diimplementasi (v1.7) — owner bisa bayar lagi untuk paket lebih kecil, webhook lama menimpa `event.package` tanpa syarat

**Media & Storage**
- Bucket S3-compatible bersifat privat secara default untuk aset milik tamu (mis. foto selfie check-in, Fase 3); akses lewat signed URL berdurasi pendek
- Aset publik (template, ilustrasi) dipisah dari aset privat; tidak ada public listing pada bucket privat

**Privasi & Retensi Data**
- Form RSVP & buku tamu menyertakan notice singkat penggunaan data tamu (nama, kontak, dan foto sejak fase yang relevan)
- Data tamu disimpan sesuai kebutuhan operasional acara dan dapat dihapus atas permintaan — sejalan dengan UU PDP No. 27/2022
- Akses ke endpoint export data tamu dibatasi ke owner event (sudah tercakup lewat cek ownership di endpoint privat)

---

## 6. Non-Functional Requirements

| Kategori | Requirement |
|---|---|
| **Performa** | Halaman undangan publik harus load < 2 detik di koneksi 4G biasa |
| **Skalabilitas** | Sistem harus tahan traffic spike H-1 acara (bisa 10–50x baseline dalam beberapa jam) |
| **Keamanan** | Data tamu (nama; nomor WA sejak Fase 2 saat UW-07 aktif) dienkripsi at-rest atau minimal disimpan pada volume terenkripsi + TLS in-transit. Endpoint publik tulis (RSVP, buku tamu) di-rate-limit & disanitasi input (cegah XSS). Autentikasi memakai password hashing kuat + JWT bermasa-berlaku pendek. Webhook payment diverifikasi signature. Storage aset tamu bersifat privat + signed URL. |
| **Ketersediaan** | Uptime target 99.5% untuk halaman undangan publik (ini yang paling kritis, karena tamu buka H-1/H-H) |
| **Mobile-first** | 90%+ traffic tamu diasumsikan dari mobile browser, bukan desktop |
| **Aksesibilitas** | Kontras warna seluruh produk (dashboard, editor, halaman publik, template undangan) minimal WCAG AA (rasio ≥ 4.5:1 untuk teks normal). Ukuran font minimum ditetapkan sebagai keputusan produk terpisah (lihat styleguide.md) — bukan bagian dari klaim kepatuhan WCAG. |

*(Perbaikan v1.1: baris Keamanan & Aksesibilitas diperluas — versi sebelumnya menjanjikan enkripsi nomor WA yang faktanya belum dikumpulkan di Fase 1, dan membatasi WCAG AA hanya ke template padahal styleguide mewajibkannya ke seluruh sistem.)*

---

## 7. Arsitektur Teknis

**Backend:** Python (FastAPI), PostgreSQL, Redis untuk cache & rate limiting, S3-compatible storage untuk aset media (bucket privat default untuk aset milik tamu, akses via signed URL; aset publik/template dipisah).

**Frontend:** Next.js (React) + Tailwind CSS — dipilih karena kebutuhan SSR untuk SEO & Open Graph preview saat link di-share ke WhatsApp.

**Infrastruktur:** Multi-tenant dengan `tenant_id` di level row (bukan DB per-tenant di awal), subdomain wildcard via Nginx reverse proxy, CDN untuk aset statis.

**Payment Gateway:** Xendit — dipilih (lihat Bagian 10), dukung QRIS/VA/e-wallet lokal via Invoice API.

---

## 8. Metrics & Success Criteria (MVP Fase 1)

| Metric | Target |
|---|---|
| Waktu dari signup → undangan published | < 5 menit (median) |
| Jumlah pasangan aktif dalam masa validasi | 20–30 pasangan (gratis) |
| Conversion rate Lite → Premium | Baseline diukur, belum ada target di MVP |
| Uptime halaman undangan publik | ≥ 99.5% |

---

## 9. Roadmap & Fase Rilis

| Fase | Timeline | Scope |
|---|---|---|
| Fase 1 — MVP | Bulan 1–2 | UW-01 s/d UW-06, BT-01, BT-06 |
| Fase 2 — Monetisasi | Bulan 3 | Payment, custom domain, UW-07 s/d UW-11 |
| Fase 3 — Check-in | Bulan 4–5 | BT-02 s/d BT-05 |
| Fase 4 — Planner | Bulan 6–8 | WP-01 s/d WP-07 |
| Fase 5 — Growth | Bulan 9+ | MT-01 s/d MT-03, white-label WO, UW-12 (Multi-bahasa) |

*(Perbaikan v1.1: Fase 2 diperluas mencakup UW-11 yang sebelumnya tidak dijadwalkan di fase manapun; Fase 5 dimulai "Bulan 9+" — sebelumnya "Bulan 8+" tumpang tindih dengan akhir Fase 4; UW-12 dipindahkan ke Fase 5 karena relevan dengan ekspansi pasar/growth.)*

*(Tambahan v1.8/v1.9: **Mode Registrasi-Saja (RG-01 s/d RG-07)** masuk sebagai lanjutan Fase 3, bukan fase baru — bertumpu penuh pada Pilar 2 (roster tamu + QR check-in) yang memang scope Fase 3, dan tidak butuh integrasi eksternal baru sama sekali. Sudah diimplementasi & live di staging sejak v1.9, lihat Bagian 20.)*

---

## 10. Risiko & Open Questions

**Risiko:**
- Load spike H-1 acara bisa mematikan sistem jika caching tidak solid sejak Fase 1.
- Scope Wedding Planner (Fase 4) berisiko dikerjakan terlalu dini sebelum Pilar 1–2 punya traksi cukup.
- Musiman bisnis (peak April–Juni, Sept–Des) mempengaruhi cashflow di luar musim.

**Keputusan yang sudah diambil (v1.1):**
- ✅ Model event per akun: 1 akun = 1 event aktif di Fase 1; skema data disiapkan untuk multi-event di Fase 5 (lihat Bagian 5). *(sebelumnya berstatus Open Question dan bertentangan dengan Bagian 5 versi awal)*
- ✅ Payment gateway: **Xendit** dipilih (bukan Midtrans) — sudah diimplementasi (Invoice API + webhook), lihat `task.v2.md` Bagian 9.
- ✅ Harga tier Premium: dipakai asumsi kerja **Rp 150.000** (nilai tengah rentang Rp 50–500rb) sebagai default awal, disimpan sebagai config (`premium_price_idr`) bukan hardcode di frontend — memudahkan penyesuaian setelah validasi survei, belum final. **Superseded di v1.7** — diganti model 3 paket per-acara (Rp399rb/699rb/1.099rb) dari pitch deck asli pemilik produk, lihat Bagian 18.
- ✅ **Harga Mode Registrasi-Saja (v1.9).** Dikonfirmasi eksplisit oleh pemilik produk: **samakan dengan harga yang sudah ada** — 3 paket per-acara yang sama (Intimate Rp399.000 / Celebration Rp699.000 / Grand Rp1.099.000, Bagian 18), **tanpa SKU baru**. Konsisten dengan prinsip "paket dibedakan kapasitas, bukan fitur" — mode ini memakai *lebih sedikit* produk (tanpa website undangan) tapi konsumsi kapasitas tamu & infrastruktur check-in identik, jadi harga yang sama tetap masuk akal. Alternatif yang sempat dipertimbangkan dan **tidak dipilih**: SKU "QR Only" berdiskon (berisiko mengkanibalisasi paket inti). Nol perubahan kode — `PACKAGE_CATALOG` (`app/core/packages.py`) sudah dipakai apa adanya oleh mode ini sejak implementasi (lihat Bagian 20); keputusan ini cuma mengonfirmasi asumsi kerja yang sudah berjalan sejak awal jadi final.

**Open Questions (masih perlu keputusan sebelum development dimulai):**
- Harga final tier Premium masih menunggu validasi survei ke 10–15 calon pengantin (lihat `rencana-produk-saas-undangan-pernikahan.md` Bagian 8) — Rp 150.000 di atas hanya default kerja sementara.
- Kredensial Xendit **Test Mode** sudah terpasang & diverifikasi end-to-end (lihat `task.v2.md` Log Perubahan v9) — kredensial **Live/produksi** (uang sungguhan) masih belum, perlu verifikasi bisnis di Xendit dulu.

---

## 11. Appendix

- Dokumen terkait: `rencana-produk-saas-undangan-pernikahan.md` (rencana produk & business model), `styleguide.md` (brand & UI), `task.md` (breakdown Fase 1)
- Benchmark: [katsudoto.id](https://katsudoto.id)

---

## 12. Log Perubahan v1.0 → v1.1

Revisi ini menutup 27 temuan dari audit crosscheck 4-dokumen (PRD, rencana produk, styleguide, task.md), diverifikasi adversarial terhadap teks dokumen sebelum diterapkan.

**Roadmap & fase:**
- UW-07 (Smart WhatsApp broadcast) dipastikan Fase 2/Premium di semua tempat; user story MVP Fase 1 yang sebelumnya menyiratkan broadcast dipindahkan ke contoh Fase 2 (Bagian 4.2) dan diganti story UW-06 yang memang P0 Fase 1.
- Label kolom Tier Wedding Planner (WP-01..07) diperbaiki dari "(Fase 2)" menjadi "(Fase 4)"; Program Mitra (MT-01..03) dari "(Fase 3)" menjadi "(Fase 5)" — menyelaraskan dengan roadmap Bagian 9.
- UW-11 & UW-12 yang sebelumnya tidak dijadwalkan di roadmap manapun, sekarang eksplisit: UW-11 masuk Fase 2, UW-12 masuk Fase 5.
- Overlap "Bulan 8" antara Fase 4 dan Fase 5 diperbaiki — Fase 5 mulai Bulan 9.
- Kontradiksi model multi-event (Bagian 5 vs Open Question Bagian 10) diputuskan dan diselaraskan.

**Keamanan (OWASP):**
- Ditambahkan requirement eksplisit: password hashing, JWT hardening, verifikasi signature webhook payment, rate limiting pada endpoint POST publik (bukan hanya GET), sanitasi input pencegah XSS pada buku tamu/RSVP, storage privat + signed URL, dan notice privasi/retensi data (UU PDP).
- Redaksi enkripsi PII diperbaiki agar tidak menjanjikan enkripsi data (nomor WA) yang belum dikumpulkan di Fase 1.

**Lainnya:**
- Cakupan WCAG AA diperluas dari "template saja" menjadi seluruh produk, menyelaraskan dengan styleguide.md.
- BT-06 diklarifikasi: ekspor "kehadiran" penuh baru relevan mulai Fase 3.

---

## 13. Log Perubahan v1.1 → v1.2 — Fase 2 sebagian mulai dieksekusi

- Payment gateway diputuskan: **Xendit** (Bagian 5, 7, 10) — sebelumnya open question "Midtrans atau Xendit". Sudah diimplementasi (Invoice API + webhook terverifikasi signature), lihat `task.v2.md` Bagian 9.
- Harga tier Premium: dipakai default kerja **Rp 150.000/sekali bayar** (nilai tengah asumsi Rp 50–500rb), disimpan sebagai config server (`premium_price_idr`), bukan hardcode — supaya mudah disesuaikan setelah validasi survei harga final (Bagian 10, masih Open Question).
- UW-08 (Kelola Tamu) sebagian diimplementasi: roster tamu per event, link undangan personal per tamu (`invite_token`), batas jumlah orang (`max_pax`) per undangan, digembok tier Premium.
- UW-07 (Smart WhatsApp) dan UW-10 (Custom Domain) **belum** digarap — sengaja ditunda, di luar scope batch Fase 2 ini.

## 14. Log Perubahan v1.2 → v1.3 — UW-09 (Amplop Digital) diimplementasi sebagian

UW-09 diimplementasi **opsi 1 saja** (dipilih eksplisit atas pertimbangan biaya-manfaat): info transfer statis (nama bank/nomor rekening/nama pemilik + nama/nomor/nama pemilik e-wallet), ditampilkan di halaman undangan publik supaya tamu bisa transfer langsung. **Tidak** termasuk upload gambar QRIS (belum ada infrastruktur upload sama sekali di codebase — akan butuh keputusan provider S3 & endpoint upload baru, ditunda) dan **tidak** termasuk integrasi payment gateway/disbursement (yang berarti platform menampung dana tamu dulu sebelum diteruskan — beda kelas risiko dari pembayaran upgrade tier yang sekarang, keduanya di luar scope batch ini). Detail implementasi & verifikasi di `task.v2.md` Log Perubahan v12 → v13.

## 15. Log Perubahan v1.3 → v1.4 — UW-11 (Musik Latar, Galeri, Countdown Timer) diimplementasi sebagian

UW-11 diimplementasi penuh untuk countdown timer, dan **via URL eksternal** (bukan upload) untuk musik latar & galeri foto/video — konsisten dengan keputusan UW-09: belum ada infrastruktur upload S3, dan preset musik bebas royalti yang tadinya dipertimbangkan dibatalkan karena tidak ada cara memverifikasi/menyediakan file audio berlisensi sungguhan dalam sesi kerja ini. Detail implementasi & verifikasi di `task.v2.md` Log Perubahan v13 → v14.

## 16. Log Perubahan v1.4 → v1.5 — BT-05 (Dashboard Kategori Tamu & Kehadiran Real-time) diimplementasi

BT-05 diimplementasi penuh, murni frontend — data pendukungnya (`Guest.category`, `Guest.checked_in_at`) sudah ada sejak Fase 2/BT-02, tinggal ditampilkan sebagai ringkasan per kategori (jumlah tamu/RSVP hadir/sudah check-in) di Kelola Tamu, plus counter kehadiran real-time di halaman QR Check-in. Fokus produk dikonfirmasi tetap **B2C** (pasangan yang atur sendiri) untuk saat ini — segmen B2B/Wedding Organizer (white-label, multi-event per akun) tetap di roadmap Fase 4-5, belum digarap. Detail implementasi & verifikasi di `task.v2.md` Log Perubahan v14 → v15.

## 17. Log Perubahan v1.5 → v1.6 — BT-03 (Selfie Check-in) diimplementasi, infrastruktur upload S3 pertama kali dibangun

BT-03 berbeda dari UW-09/UW-11 — foto diambil langsung lewat kamera saat check-in, bukan link yang sudah ada, jadi pendekatan "URL eksternal" yang dipakai 2 fitur sebelumnya tidak berlaku. Ini pertama kalinya infrastruktur upload S3 (yang sejak Fase 1 disiapkan tapi tidak dipakai) benar-benar dibangun. Provider: **AWS S3** (dipilih dari 3 opsi), bucket privat + IAM scoped minimal, sesuai catatan keamanan yang sudah ditulis sejak PRD awal (Bagian 6: foto wajah tamu = PII sensitif, wajib bucket privat + signed URL). Kredensial AWS asli belum tersedia saat implementasi — dibangun & diuji penuh lokal pakai MinIO (S3-compatible), kode yang sama akan jalan begitu kredensial staging diisi. Detail implementasi & verifikasi di `task.v2.md` Log Perubahan v15 → v16.

## 18. Log Perubahan v1.6 → v1.7 — Model bisnis diganti total: 3 Paket per-acara (Intimate/Celebration/Grand) menggantikan Lite/Premium per-akun

Dipicu pemilik produk membagikan pitch deck asli Ecodigitus ("Sistem QR Wedding") yang menjelaskan model bisnis nyata yang sebenarnya akan dipakai untuk menjual produk ini — bukan tier akun-wide sekali-bayar (Bagian 3, 5, 9, 10 versi sebelumnya), melainkan **3 paket per-acara**, dijual per EVENT bukan per AKUN, dibedakan dari **kapasitas tamu & jumlah "pintu" check-in** (bukan dari fitur — fitur inti Kelola Tamu/QR Check-in/Dashboard sama di semua paket):

| Paket | Kapasitas tamu | Harga |
|---|---|---|
| Intimate | 200 | Rp399.000 |
| Celebration | 600 | Rp699.000 |
| Grand | 1.200 | Rp1.099.000 |

**Keputusan yang dikonfirmasi eksplisit ke pemilik produk** sebelum implementasi:
- UW-09 (Amplop Digital), UW-11 (Musik/Galeri/Countdown), BT-03 (Selfie Check-in) — tidak disebut di pitch deck — **tetap add-on berbayar terpisah** dari paket inti (Rp100.000/add-on, asumsi kerja, bukan dari pitch deck), bukan dibundel gratis dan bukan dihapus.
- "Jumlah pintu" (pembeda Intimate=1/Celebration=3/Grand=multi) **tidak ditegakkan teknis** di Fase 3 — murni informasi ke customer saat memilih paket.
- Kapasitas tamu (200/600/1.200) **ditegakkan teknis** di Kelola Tamu (UW-08) — beda dari jumlah pintu.
- Akun real existing di staging (`huhu@gmail.com`/`haha@gmail.com`, masih di model lite/premium lama) boleh direset ke `package=None`, tidak perlu migrasi data — dikonfirmasi tidak masalah oleh pemilik produk.

**Dampak ke bagian lain dokumen ini** (ditandai superseded di tempat masing-masing, bukan ditulis ulang, supaya sejarah keputusan tetap terbaca): Bagian 3 (kolom Tier per requirement), Bagian 10 (keputusan harga Rp150.000). Bagian 5 (Payment) & Bagian 7 (Arsitektur) tidak berubah secara prinsip — masih Xendit Invoice API + webhook terverifikasi signature, cuma granularitas record pembayarannya sekarang per-acara (`event_id`+`item_type`+`item_key`) bukan per-akun (`tier_purchased`).

Detail implementasi teknis penuh (data model, migrasi, gating backend, bug keamanan yang ditemukan+diperbaiki lewat TDD, testing 83 pytest + Playwright/axe-core) ada di `task.v2.md` Log Perubahan v16 → v17.

**Sudah di-deploy ke staging** (`https://demo.ecodigitus.com`) atas instruksi langsung pemilik produk — didahului backup segar (`pg_dump`, sebelumnya backup terbaru sudah 5 hari, tidak cukup baru untuk migrasi yang men-drop `users.tier`), diverifikasi lewat browser sungguhan ke domain asli termasuk konfirmasi invoice Xendit Test Mode nyata benar-benar terbentuk saat beli paket. Akun real `huhu@gmail.com`/`haha@gmail.com` ter-reset seperti disetujui (event tetap ada, tinggal beli paket baru). Detail lengkap proses deploy di `task.v2.md` Log Perubahan v16 → v17.

---

## 19. Log Perubahan v1.7 → v1.8 — Mode Registrasi-Saja (RG-01 s/d RG-07) masuk scope sebagai **rencana**

> **Superseded di v1.9** — bagian ini aslinya penambahan dokumen murni (nol kode berubah). RG-01 s/d RG-07 sudah diimplementasi & di-deploy sejak v1.9, lihat Bagian 20. Dibiarkan apa adanya (bukan ditulis ulang) supaya sejarah keputusan — termasuk 3 temuan dari audit kode yang mengubah bentuk rencana sebelum implementasi dimulai — tetap terbaca.

Dipicu pertanyaan langsung pemilik produk: *"kalau undangan nikahannya sudah ada, apakah bisa disambung ke website kita buat registrasi?"* — pasangan yang sudah beli undangan dari vendor lain atau sudah cetak undangan kertas, tapi butuh sistem registrasi + check-in venue.

**Temuan utama dari audit kode sebelum menulis rencana** — arsitektur yang sudah ada ternyata hampir seluruhnya mendukung ini tanpa perubahan:
- `POST /invitations/{slug}/rsvp` dikunci ke `slug` + `guest_token` **opsional**, bukan ke template undangan — jalur RSVP anonim (tamu isi nama sendiri) sudah berfungsi hari ini.
- Payload QR check-in murni `invite_token`, independen dari halaman mana pun yang merender undangan.
- `template_id` sejak awal `String(50)` free-string tanpa allowlist — bisa langsung di-reuse sebagai pemilih palet halaman registrasi, tidak perlu kolom tema baru.
- 7 palet template yang ada sudah lolos audit kontras terhitung (52 pengecekan di `scripts/audit-contrast.mjs`) — dengan me-reuse-nya, mode ini tidak menambah satu pun entri audit baru. Ini menggantikan ide awal "palet aksen kurasi baru" yang sempat dipertimbangkan: lebih murah, dan tidak menambah risiko drift data.

**Risiko terbesar yang ditemukan & jadi requirement wajib (RG-05).** QR check-in (BT-02) sengaja dibatasi ke tamu roster yang punya link personal — keputusan produk yang sudah tercatat di `task.v2.md` Bagian 10 dan diterima sebagai trade-off. Di mode registrasi-saja konsekuensinya berubah dari "trade-off" jadi "cacat fatal": undangan vendor umumnya memuat **satu** link umum untuk semua tamu, jadi tanpa auto-enroll tidak ada tamu yang pernah punya `invite_token` dan **nol QR terbentuk** — kita menjual sistem QR yang tidak menghasilkan QR. Karena itu RG-05 (auto-enroll tamu anonim ke roster + langsung tampilkan QR-nya) ditetapkan sebagai syarat kelayakan mode ini, bukan fitur pelengkap.

**Konsekuensi keamanan dari RG-05** (ditambahkan ke Bagian 5): auto-enroll berarti endpoint **publik tanpa login** menambah baris `Guest`. Tiga guard wajib, dua di antaranya baru: (a) penegakan kapasitas paket harus ada di jalur publik itu juga — saat ini kapasitas cuma ditegakkan di route owner `POST /events/{id}/guests`, jadi tanpa ini kapasitas berbayar bisa dilewati; (b) `invite_token` yang dikembalikan ke browser hanya boleh milik tamu yang baru dibuat di request itu, tidak pernah tamu existing — kalau bocor, tebak-nama jadi jalur pengambilalihan RSVP + QR tamu lain (OWASP A01); (c) rate limit, dengan catatan disengaja **lebih longgar** dari 5/60s yang dipakai RSVP sekarang, karena tamu di venue (WiFi bersama) dan pengguna seluler Indonesia (NAT operator) banyak berbagi satu IP — guard sebenarnya adalah kapasitas paket, bukan throttle IP.

**Batas teknis yang ditemukan & diterima sebagai trade-off:** dedupe tamu berdasarkan nama **tidak mungkin di level SQL** — `Guest.name` dienkripsi Fernet (`app/db/encrypted_types.py`) yang non-deterministik (IV acak per nilai), jadi `WHERE name = '...'` tidak akan pernah cocok. Solusi yang dipilih untuk rencana ini: serahkan `invite_token` hasil auto-enroll ke browser tamu (`localStorage`), sehingga kunjungan berikutnya masuk ke jalur upsert link-personal yang **sudah ada** — nol mesin dedupe baru. Konsekuensi yang diterima: tamu yang RSVP dari 2 device berbeda menghasilkan 2 baris roster (owner hapus manual). Opsi masa depan kalau ini jadi keluhan nyata: blind index (kolom `name_fingerprint` = HMAC-SHA256 dari nama ternormalisasi — searchable tanpa membocorkan plaintext) + backfill.

**Dua jalur integrasi yang dipertimbangkan dan sengaja ditolak untuk sekarang** (dicatat supaya keputusannya tidak dibahas ulang dari nol): embed iframe form RSVP ke halaman vendor (mayoritas vendor tidak mengizinkan inject HTML, dan butuh pengecualian per-route dari `X-Frame-Options: DENY` global + `frame-ancestors` allowlist per-event), dan API partner B2B2C (butuh API key per-tenant + webhook ber-HMAC — tunggu vendor benar-benar minta, relevan bareng Program Mitra Fase 5).

**Harga mode ini sudah diputuskan di v1.9** — pakai 3 paket yang sama tanpa SKU baru, dikonfirmasi eksplisit oleh pemilik produk. Lihat Bagian 10 (Keputusan yang sudah diambil) untuk detail & alternatif yang tidak dipilih.

---

## 20. Log Perubahan v1.8 → v1.9 — Mode Registrasi-Saja (RG-01 s/d RG-07) diimplementasi & di-deploy

Lanjutan langsung dari rencana Bagian 19 — dieksekusi di sesi yang sama atas instruksi pemilik produk ("lanjut", kemudian "langsung deploy ya"). Semua desain & keputusan keamanan di Bagian 19 diikuti apa adanya; bagian ini cuma mencatat apa yang genuinely dibangun, dites, dan bug yang ditemukan selama implementasi (bukan cuma "sesuai rencana").

**Data model:**
- `Event.mode` (`String(20)`, default `"full"`) — migrasi `d1f4a9c3e8b2`. **Beda dari `package`/`addons`**, field ini SENGAJA ada di `EventUpdate` dan boleh diubah owner langsung (dibatasi `Literal["full", "registration_only"]` di schema, bukan free-string seperti `template_id`, karena nilainya menentukan percabangan logika).
- `Guest.self_registered` (`Boolean`, default `False`) — migrasi `9a2c7e15f4d0`, ditambahkan saat implementasi (tidak ada di rencana awal Bagian 19) untuk memenuhi item task.v2.md §11.4 "tandai tamu hasil auto-enroll" — badge "Daftar sendiri" di Kelola Tamu. Read-only, tidak ada di `GuestCreate`/`GuestUpdate`.
- `app/services/guest_capacity.py` (baru) — `guest_capacity_remaining(db, event)` diekstrak dari `create_guest` supaya jalur publik auto-enroll wajib memakai pengecekan yang sama persis (OWASP A01, sesuai rencana).

**Backend (`routes/rsvp.py`):** auto-enroll (RG-05) ditambahkan di `submit_rsvp` — kalau `event.mode == "registration_only"`, `payload.guest_token` kosong, dan `event.package is not None`: buat `Guest` baru (`self_registered=True`), cek kapasitas SEBELUM membuat baris, kembalikan `invite_token`-nya lewat `RSVPOut.guest_token` (field baru, **selalu diisi manual lewat helper `_to_rsvp_out`**, tidak pernah dari atribut ORM — RSVP tidak punya kolom ini). Rate limiter kedua (`rsvp-autoenroll`, 15/60s) diterapkan manual di dalam handler (bukan `Depends()` di dekorator) karena mode baru diketahui setelah event di-lookup dari slug.

**Frontend:** route baru `app/r/[slug]/page.tsx` (server component, redirect dari `/{slug}` kalau `mode==="registration_only"`, mempertahankan `?g=` link personal) — header ringkas + `RsvpForm` + `GuestbookSection` + `GiftInfoSection` (Amplop Digital dipertahankan; logic pembangunan `giftAccounts` diekstrak jadi `buildGiftAccounts()` supaya tidak duplikasi dengan `InvitationView.tsx`), TANPA hero beranimasi/partikel/scroll-reveal/galeri/musik/countdown/dekorasi template (sesuai styleguide.v2.md §5.7). `RsvpForm.tsx` menambah localStorage handoff (RG-05) + Editor dashboard menambah toggle mode, panduan "Cara Sambungkan" (`RegistrationLinkCard.tsx`, baru — link + snippet HTML + QR tingkat-acara berpayload URL penuh, beda dari QR tamu berpayload `invite_token`), dan menyembunyikan kartu Musik/Galeri/Countdown saat mode aktif.

**Bug ditemukan & diperbaiki lewat proses lint, bukan cuma "sudah dites" (React Compiler `react-hooks/set-state-in-effect`):** implementasi awal `RsvpForm`/`RegistrationLinkCard` memanggil `setState` sinkron di badan effect (baca `localStorage`/`window.location.origin` lalu langsung `setState`) — pola yang lolos secara fungsional tapi dilarang linter proyek ini (React Compiler rule, sama keluarga dengan alasan `ScrollReveal.tsx` sebelumnya menghindari React state demi manipulasi DOM langsung). Diperbaiki dengan 2 pendekatan berbeda sesuai konteks: (1) `RegistrationLinkCard` — lazy `useState(() => window.location.origin)` tanpa effect sama sekali, aman karena komponen ini **hanya pernah** dipasang setelah `useMyEvent()` selesai fetch client-side (tidak pernah ada di HTML hasil SSR, jadi nol risiko hydration mismatch); (2) `RsvpForm` — direstrukturisasi pakai `useSyncExternalStore` untuk baca `localStorage` (snapshot server selalu `null`, otomatis "dikoreksi" ke nilai asli setelah hidrasi tanpa cascading setState manual), effect yang tersisa (fetch `getPublicGuest`) semua `setState`-nya di dalam callback promise (`.then()/.catch()/.finally()`) — pola yang sudah dipakai `lib/use-my-event.ts`.

**Testing:** 8 test pytest baru (`tests/test_registration_mode.py`) — regression guard `mode="full"` tidak pernah auto-enroll (paling penting, ditulis mengikuti prinsip TDD di rencana), auto-enroll bikin tepat 1 `Guest` + kembalikan token, resubmit dengan token = upsert bukan duplikat, kapasitas penuh → 409 pesan ke tamu (bukan pesan upsell owner), event tanpa paket → tidak auto-enroll, `guest_token` tidak pernah muncul untuk guest existing (dites dari 2 jalur: auto-enroll upsert DAN link personal biasa), `mode` menolak nilai asing (422), rate limit auto-enroll (15/60s) terbukti beda dari default (5/60s). **91 pytest lolos** (naik dari 83, lihat Bagian 22 untuk revisi angka ini), `ruff check` bersih, `tsc --noEmit` & `eslint` bersih (0 error, 0 warning baru).

**Verifikasi end-to-end** (`frontend/scripts/verify-registration-mode.mjs`, baru) — dijalankan 2 kali: lokal (`localhost:3000`) dan ulang ke domain nyata (`https://demo.ecodigitus.com`) via `STAGING_SSH_HOST` (psql grant dijalankan lewat SSH+`docker exec`, bukan koneksi DB langsung — Postgres staging tidak expose port ke luar). Kedua run: register → buat & publish event → grant paket `intimate` via psql → aktifkan toggle mode di editor → konfirmasi label/kartu berubah sesuai mode & panduan "Cara Sambungkan" muncul → `/{slug}` redirect ke `/r/{slug}` → RSVP anonim di halaman registrasi → QR muncul (auto-enroll) → **reload halaman, QR tetap muncul tanpa submit ulang** (bukti `useSyncExternalStore`+localStorage bekerja, termasuk di HTTPS staging) → 0 axe-core violation. Semua **PASSED** di kedua environment.

**Deploy ke staging** — dilakukan atas instruksi langsung pemilik produk ("lanjut" lalu "langsung deploy ya"), tetap mengikuti Backup-First Protocol: backup terbaru sebelumnya (18 Agustus) sudah 2 hari, di luar ambang aman untuk migrasi — diambil backup segar (`pg_dump -Fc`, `wedding_saas_pre_regmode_20260820.dump`, diverifikasi valid via `pg_restore -l`, 54 TOC entries) sebelum migrasi dijalankan, walau migrasi ini murni aditif (nol `DROP COLUMN`). Proses: image dibangun lokal (`--build-arg NEXT_PUBLIC_API_URL=https://demo.ecodigitus.com`), `docker save`→`scp`→`docker load`, restart **backend dulu** (`--no-deps`) → `alembic upgrade head` (menerapkan `d1f4a9c3e8b2` lalu `9a2c7e15f4d0`) → verifikasi kolom `mode`/`self_registered` ada, jumlah baris `users`/`events`/`payments` (6/5/10) tidak berubah → restart **frontend** (`--no-deps`). Tidak ada perubahan konfigurasi Nginx Proxy Manager — `/r/{slug}` otomatis jatuh ke aturan "everything else → frontend" yang sudah ada (rute ini tidak menambah prefix API baru; semua panggilan backend dari halaman ini lewat prefix `/invitations/` yang sudah di-routing). Uptime `odoo18-odoo-1`/`odoo18-db-1` dan container lain di server yang sama dikonfirmasi tidak berubah sepanjang proses. File tarball & dump sementara dibersihkan dari `/tmp` di kedua sisi setelah selesai.

**Harga mode ini dikonfirmasi setelah deploy** — pemilik produk memutuskan "samakan dengan yang ada sekarang", jadi 3 paket yang sama tanpa SKU baru bukan lagi asumsi kerja, tapi keputusan final (dipindah ke Bagian 10, "Keputusan yang sudah diambil"). Nol perubahan kode diperlukan — `PACKAGE_CATALOG` sudah dipakai apa adanya oleh mode ini sejak implementasi.

**Genuinely belum dikerjakan / di luar scope batch ini** (sama seperti yang sudah dicatat di Bagian 19 sebagai keputusan sengaja, tidak berubah): embed iframe ke halaman vendor, API partner B2B2C, dedupe lintas-device (blind index), UW-10 Custom Domain.

**Catatan pada saat itu:** verifikasi axe-core di atas cuma memakai 1 dari 7 palet template (`klasik`) — ditutup di Bagian 21.

---

## 21. Log Perubahan v1.9 → v1.10 — Gap axe-core lintas-palet di Mode Registrasi-Saja ditutup

Diminta langsung pemilik produk ("yes tutup gap") menindaklanjuti gap yang dicatat di Bagian 20: axe-core di `/r/{slug}` baru dites dengan palet default (`klasik`), belum diulang untuk ke-6 palet lain termasuk `monokrom` (latar gelap, paling berisiko karena halaman ini tidak punya chrome undangan sebagai konteks tambahan).

`frontend/scripts/verify-templates.mjs` — harness yang sudah ada untuk ganti-template-per-event & axe-scan `/{slug}` di 7 template — diperluas untuk juga axe-scan `/r/{slug}` per template (toggle mode aktif sesaat, scan, toggle balik), alih-alih menambah parameter ke `verify-registration-mode.mjs` (sesuai rekomendasi yang sudah ditulis saat gap ini pertama ditemukan). Tidak perlu grant paket via psql — render halaman registrasi tidak butuh paket aktif.

**Hasil: 0 axe-core violation di semua 7 palet** untuk `/r/{slug}`, `/{slug}` tetap 0 pelanggaran (regression check). Spot-check visual manual (bukan cuma percaya axe) untuk `monokrom` & `editorial` — bersih, kartu form konsisten `bg-surface` di atas latar gelap sesuai styleguide.v2.md §5.7/§12. Dijalankan lokal saja (Docker Desktop sempat mati di awal sesi, dinyalakan ulang) — tidak diulang ke domain nyata karena gap ini murni soal cakupan palet, bukan soal lingkungan (lokal vs domain nyata sudah dikonfirmasi identik untuk palet `klasik` di Bagian 20). Detail teknis lengkap di `task.v2.md` Log Perubahan v23→v24.

Nol perubahan kode aplikasi — murni perluasan skrip verifikasi.

---

## 22. Log Perubahan v1.10 → v1.11 — QR check-in hasil auto-enroll dikonfirmasi benar-benar bisa di-scan

Dipicu pertanyaan konfirmasi pemilik produk: *"Mode Registrasi-Saja itu kan mau ada QR checkin juga"*. Jawabannya ya — QR check-in bukan cuma bagian dari mode ini, RG-05 (auto-enroll) memang dirancang khusus supaya QR check-in bisa terbentuk sama sekali di mode ini (lihat Bagian 20: tanpa auto-enroll, nol QR pernah terbentuk).

Tapi pertanyaan ini menyingkap gap testing nyata: seluruh test & verifikasi sebelumnya cuma membuktikan **QR-nya tampil di layar** (canvas render) — belum ada satu test pun yang memanggil endpoint check-in (`POST /guests/check-in`, BT-02) dengan `guest_token` hasil auto-enroll untuk membuktikan QR itu **benar-benar bisa dipakai check-in**. Dibaca dulu kode `check_in_guest` — endpoint ini cuma mencocokkan `Guest.invite_token` + kepemilikan event + status paket, **tidak ada pengecekan `self_registered`/`mode` sama sekali**, jadi secara desain seharusnya sudah bekerja tanpa perubahan kode. Ditulis 1 test pytest baru (`test_autoenroll_guest_can_actually_be_checked_in`) untuk membuktikan itu, bukan cuma mempercayainya — **PASSED**. **92 pytest lolos** (naik dari 91), `ruff check` bersih.

Nol perubahan kode aplikasi — mekanisme check-in sudah bekerja untuk tamu auto-enroll sejak implementasi awal (Bagian 20), murni menambah test yang sebelumnya hilang. Detail teknis lengkap di `task.v2.md` Log Perubahan v24 → v25.

---

## 23. Log Perubahan v1.11 → v1.12 — Bug billing: downgrade/beli-ulang paket sekarang ditolak

Dipicu pertanyaan pemilik produk: *"itu setelah beli yang billing grand, masih bisa milih yang intimate?"*. Bukan bagian dari Mode Registrasi-Saja — gap ini ada di sistem paket-per-acara sejak model bisnis diganti (Bagian 18), baru ketahuan sekarang.

**Ditemukan lewat baca kode langsung**: `create_purchase` (`routes/billing.py`) cuma punya validasi untuk pembelian add-on, **tidak ada pengecekan apa pun untuk pembelian paket** — owner yang sudah punya `package="grand"` bisa bayar lagi untuk `"intimate"`, dan webhook lama menimpa `event.package` tanpa syarat begitu lunas. Risikonya nyata: kalau roster sudah punya tamu melebihi kapasitas paket baru, event langsung "kepenuhan" (tidak ada tamu baru bisa ditambah) tanpa peringatan apa pun saat membeli.

**Keputusan yang dikonfirmasi ke pemilik produk**: blokir total downgrade/beli-ulang paket (dari 3 opsi yang ditawarkan — alternatif "izinkan kalau tamu masih di bawah kapasitas baru" tidak dipilih karena lebih rumit tanpa manfaat jelas).

**Fix**: backend menolak (409) pembelian paket dengan kapasitas ≤ paket yang sudah dimiliki (dibandingkan lewat `max_guests` katalog, bukan hardcode nama paket); frontend menonaktifkan kartu paket yang bukan upgrade + label "Kapasitas lebih kecil/sama". 3 test pytest baru (downgrade ditolak, beli-ulang sama ditolak, **upgrade tetap bisa** — regression guard). **95 pytest lolos** (naik dari 92).

**Verifikasi**: dijalankan 2× (lokal + domain nyata) — termasuk **panggilan API langsung via `fetch` yang membypass UI**, tetap ditolak 409, membuktikan guard-nya di backend bukan cuma kosmetik. **Dikonfirmasi & di-deploy ke staging** atas instruksi eksplisit pemilik produk — nol migrasi DB (murni logic + UI), backend & frontend direstart bersamaan. Detail teknis lengkap di `task.v2.md` Log Perubahan v25 → v26.

---

## 24. Log Perubahan v1.12 → v1.13 — Bug: link/QR yang dibagikan ke tamu bisa berisi IP server

Dipicu instruksi pemilik produk: *"pastikan tidak ada menuju ke ip server"* — *"yang redirectnya ke ip server kan seharusnya ke link demo.ecodigitus.com"*.

**Ditemukan lewat audit kode**: link personal Kelola Tamu dan link/QR "Cara Sambungkan" (RG-06/RG-07) dibangun dari `window.location.origin` — yang ikut host yang SEDANG diakses saat link dibuat. Kalau dashboard diakses lewat `http://15.232.71.64:3000` (staging masih mengizinkan ini di `CORS_ORIGINS`), link/QR yang dihasilkan berisi IP itu, bukan domain — fatal khusus untuk link yang dicetak di undangan kertas (permanen, dan bukan HTTPS).

**Fix**: `lib/site.ts` (baru), `getSiteOrigin()` — domain kanonik dari `NEXT_PUBLIC_SITE_URL` (build-time constant, sama pola dengan `NEXT_PUBLIC_API_URL`) kalau diisi, bukan `window.location.origin`. Kedua pemakaian lama diganti.

**Bug deploy ditemukan di tengah verifikasi**: build image pertama sempat salah dianggap selesai (`docker images` menunjukkan ID baru, tapi itu snapshot `:latest` sementara di tengah proses build BuildKit — kemungkinan terkait attestation/SBOM), dan yang ke-deploy adalah image LAMA. Ketahuan lewat perbandingan `BUILD_ID` di dalam image vs container yang jalan — beda. Diperbaiki dengan verifikasi `BUILD_ID` + isi bundle cocok SEBELUM `docker save`, baru deploy ulang.

**Verifikasi definitif**: akses dashboard LANGSUNG lewat IP server (skenario sesungguhnya, bukan lewat domain yang otomatis "benar" karena kebetulan sama) — link "Cara Sambungkan" tetap menunjukkan `https://demo.ecodigitus.com/r/{slug}`, bukan IP. Row count kembali baseline, Odoo tetangga tidak terganggu.

**Rekomendasi ini dikonfirmasi & dieksekusi di Bagian 25** (di bawah). Detail teknis lengkap di `task.v2.md` Log Perubahan v26 → v27.

---

## 25. Log Perubahan v1.13 → v1.14 — `CORS_ORIGINS` staging diketatkan ke domain saja

Dikonfirmasi pemilik produk ("yes") setelah rekomendasi di Bagian 24: tutup total jalur akses langsung via IP server, bukan cuma perbaiki gejalanya.

**Perubahan**: `backend.env` (Lightsail) — `CORS_ORIGINS` dari `http://15.232.71.64:3000,https://demo.ecodigitus.com` jadi `https://demo.ecodigitus.com` saja. Backup file config diambil dulu sebelum edit (Backup-First Protocol).

**Verifikasi 2 arah**: domain tetap 100% normal (register→login→dashboard, nol regresi); akses langsung via IP sekarang **gagal total** untuk aksi apa pun yang butuh API, dikonfirmasi lewat console browser sungguhan (`blocked by CORS policy`) — UI menampilkan pesan error yang jelas, tidak crash, tidak pernah sampai ke dashboard. Port frontend itu sendiri belum ditutup di level network (halaman statis masih termuat), tapi genuinely tidak berguna lagi tanpa akses API.

Row count kembali baseline, Odoo tetangga tidak terganggu. `README.md` § Deploy ke staging diperbarui: `CORS_ORIGINS` HANYA domain, `NEXT_PUBLIC_SITE_URL` wajib diisi, dan cara verifikasi `BUILD_ID` sebelum `docker save` (pelajaran dari bug deploy di Bagian 24). Detail teknis lengkap di `task.v2.md` Log Perubahan v27 → v28.
