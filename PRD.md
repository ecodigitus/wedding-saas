# PRD: SaaS Undangan Pernikahan Digital

| | |
|---|---|
| **Versi** | 1.0 |
| **Tanggal** | 7 Agustus 2026 |
| **Status** | Draft — untuk review sebelum development |
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

### Pilar 1 — Undangan Website

| ID | Requirement | Tier | Prioritas |
|---|---|---|---|
| UW-01 | User dapat memilih template & mengisi data mempelai, tanggal, lokasi acara | Lite/Premium | P0 |
| UW-02 | Preview real-time saat editing | Lite/Premium | P0 |
| UW-03 | Info acara: peta lokasi (embed Google Maps), jadwal akad/resepsi, dress code | Lite/Premium | P0 |
| UW-04 | Tamu dapat submit RSVP (hadir/tidak + jumlah pax) | Lite/Premium | P0 |
| UW-05 | Dashboard mempelai untuk lihat status RSVP & export data (CSV) | Lite/Premium | P0 |
| UW-06 | Link undangan unik & shareable, dengan Open Graph preview untuk WhatsApp | Lite/Premium | P0 |
| UW-07 | Smart WhatsApp: broadcast undangan ke banyak tamu sekaligus dari dashboard | Premium | P1 |
| UW-08 | Kelola tamu: buat grup tamu, atur sesi acara, batasi pax per undangan | Premium | P1 |
| UW-09 | Amplop digital (integrasi QRIS/transfer bank/e-wallet) | Premium | P1 |
| UW-10 | Custom domain & hapus watermark | Premium | P1 |
| UW-11 | Musik latar, galeri foto/video, countdown timer | Premium | P2 |
| UW-12 | Multi-bahasa | — | P3 (Fase 2) |

### Pilar 2 — Buku Tamu Digital & Check-in

| ID | Requirement | Tier | Prioritas |
|---|---|---|---|
| BT-01 | Tamu dapat menulis ucapan/doa di buku tamu digital | Lite/Premium | P1 |
| BT-02 | QR Check-in di venue: generate QR unik per tamu, scan saat kedatangan | Premium | P2 |
| BT-03 | Selfie Check-in: tamu foto diri saat check-in | Premium | P2 |
| BT-04 | Auto Thank You Message terkirim otomatis setelah check-in | Premium | P2 |
| BT-05 | Data kehadiran real-time & kategori tamu (VIP, keluarga, kolega, dll) | Premium | P2 |
| BT-06 | Export data tamu & kehadiran (CSV/Excel) | Lite/Premium | P1 |

### Pilar 3 — Wedding Planner

| ID | Requirement | Tier | Prioritas |
|---|---|---|---|
| WP-01 | Budget Planner: input & pantau anggaran per kategori | Premium | P3 (Fase 2) |
| WP-02 | To-Do List persiapan pernikahan dengan due date | Premium | P3 (Fase 2) |
| WP-03 | Rundown acara (jadwal detail hari-H, editable) | Premium | P3 (Fase 2) |
| WP-04 | Daftar Seserahan (barang, kisaran biaya, sumber beli) | Premium | P3 (Fase 2) |
| WP-05 | Data Seragam (daftar penerima seragam) | Premium | P3 (Fase 2) |
| WP-06 | Tabungan Nikah: target tabungan bersama pasangan | Premium | P3 (Fase 2) |
| WP-07 | Vendor List: tambah & bandingkan vendor pilihan sendiri | Premium | P3 (Fase 2) |

### Growth — Program Mitra/Referral

| ID | Requirement | Prioritas |
|---|---|---|
| MT-01 | User dapat generate kode/link referral pribadi | P3 (Fase 3) |
| MT-02 | Sistem tracking transaksi yang berasal dari kode referral | P3 (Fase 3) |
| MT-03 | Dashboard mitra: lihat komisi (15%) & ajukan penarikan | P3 (Fase 3) |

---

## 4. User Stories (contoh, MVP Fase 1)

1. *Sebagai calon pengantin*, saya ingin memilih template undangan dan mengisi data acara saya, agar saya bisa langsung punya undangan digital tanpa desainer.
2. *Sebagai calon pengantin*, saya ingin mem-broadcast link undangan ke banyak kontak WhatsApp sekaligus, agar saya tidak perlu kirim satu-satu manual.
3. *Sebagai tamu undangan*, saya ingin submit RSVP langsung dari link undangan, agar saya tidak perlu membalas chat terpisah.
4. *Sebagai calon pengantin*, saya ingin melihat dashboard siapa saja yang sudah RSVP dan berapa jumlah tamu yang akan datang, agar saya bisa menyiapkan venue/catering dengan akurat.

---

## 5. Functional Requirements (ringkas per modul)

**Auth & User Management**
- Registrasi/login via email atau Google OAuth
- 1 akun bisa mengelola 1 atau lebih "event" (untuk kasus WO multi-klien di fase lanjut)

**Undangan Editor**
- CRUD template & konten undangan
- Validasi input (tanggal acara tidak boleh di masa lalu, format nomor WA valid, dll)

**RSVP & Guest Management**
- Endpoint publik (tanpa login) untuk submit RSVP dari link undangan
- Rate limiting untuk cegah spam submission

**Payment**
- Integrasi Midtrans/Xendit untuk upgrade tier Lite → Premium
- Webhook handling untuk konfirmasi pembayaran

---

## 6. Non-Functional Requirements

| Kategori | Requirement |
|---|---|
| **Performa** | Halaman undangan publik harus load < 2 detik di koneksi 4G biasa |
| **Skalabilitas** | Sistem harus tahan traffic spike H-1 acara (bisa 10–50x baseline dalam beberapa jam) |
| **Keamanan** | Data tamu (nama, nomor WA) dienkripsi at-rest; endpoint publik RSVP di-rate-limit |
| **Ketersediaan** | Uptime target 99.5% untuk halaman undangan publik (ini yang paling kritis, karena tamu buka H-1/H-H) |
| **Mobile-first** | 90%+ traffic tamu diasumsikan dari mobile browser, bukan desktop |
| **Aksesibilitas** | Kontras warna & ukuran font template minimal WCAG AA |

---

## 7. Arsitektur Teknis

**Backend:** Python (FastAPI), PostgreSQL, Redis untuk cache & rate limiting, S3-compatible storage untuk aset media.

**Frontend:** Next.js (React) + Tailwind CSS — dipilih karena kebutuhan SSR untuk SEO & Open Graph preview saat link di-share ke WhatsApp.

**Infrastruktur:** Multi-tenant dengan `tenant_id` di level row (bukan DB per-tenant di awal), subdomain wildcard via Nginx reverse proxy, CDN untuk aset statis.

**Payment Gateway:** Midtrans atau Xendit (dukung QRIS, VA, e-wallet lokal).

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
| Fase 2 — Monetisasi | Bulan 3 | Payment, custom domain, UW-07 s/d UW-10 |
| Fase 3 — Check-in | Bulan 4–5 | BT-02 s/d BT-05 |
| Fase 4 — Planner | Bulan 6–8 | WP-01 s/d WP-07 |
| Fase 5 — Growth | Bulan 8+ | MT-01 s/d MT-03, white-label WO |

---

## 10. Risiko & Open Questions

**Risiko:**
- Load spike H-1 acara bisa mematikan sistem jika caching tidak solid sejak Fase 1.
- Scope Wedding Planner (Fase 4) berisiko dikerjakan terlalu dini sebelum Pilar 1–2 punya traksi cukup.
- Musiman bisnis (peak April–Juni, Sept–Des) mempengaruhi cashflow di luar musim.

**Open Questions (perlu keputusan sebelum development dimulai):**
- Berapa harga pasti tier Lite vs Premium? (perlu validasi survei ke calon user)
- Apakah 1 akun = 1 event, atau perlu dukungan multi-event dari awal untuk kasus WO?
- Payment gateway: Midtrans atau Xendit — perlu bandingkan fee & kemudahan integrasi.

---

## 11. Appendix

- Dokumen terkait: `rencana-produk-saas-undangan-pernikahan.md` (rencana produk & business model)
- Benchmark: [katsudoto.id](https://katsudoto.id)
