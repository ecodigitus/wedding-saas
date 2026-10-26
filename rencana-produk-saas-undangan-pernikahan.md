# Rencana Produk: SaaS Undangan Pernikahan Digital

*Versi revisi — benchmark terhadap Katsudoto.id*

---

## 1. Value Proposition

**"Satu platform untuk merencanakan, mengundang, dan menyambut tamu di hari pernikahanmu — dari H-6 bulan sampai hari-H."**

Berbeda dari sekadar "invitation builder", produk ini dibangun sebagai **3 pilar** yang saling menopang, sehingga user tinggal di platform sejak masa perencanaan (retensi tinggi), bukan cuma 1 hari saat kirim undangan.

---

## 2. Target Segmen & Model Bisnis

| Segmen | Kebutuhan | Model Monetisasi |
|---|---|---|
| Pasangan langsung (B2C) | Simple, cepat, murah, all-in-one | Freemium → paket Lite/Premium (Rp 50–500rb) |
| Wedding Organizer (B2B) | White-label, multi-klien, reseller | Subscription bulanan + revenue share |
| Percetakan/Vendor | Bundling produk fisik + digital | Partnership/affiliate |
| Individu/reseller (Mitra) | Cari komisi tanpa modal | Program referral 15% komisi |

---

## 3. Struktur Produk: 3 Pilar

### Pilar 1 — Undangan Website

| Fitur | Tier |
|---|---|
| Editor undangan (pilih template, isi data mempelai, tanggal, lokasi) | Lite & Premium |
| Info acara: peta lokasi, jadwal akad/resepsi, dress code | Lite & Premium |
| RSVP digital + jumlah tamu (pax) | Lite & Premium |
| **Smart WhatsApp** — broadcast undangan ke banyak tamu sekaligus dari dashboard | Premium |
| Kelola tamu: grup tamu, sesi acara, batas pax per undangan | Premium |
| Amplop digital (transfer bank/QRIS/e-wallet) | Premium |
| Custom domain, hapus watermark | Premium |
| Musik latar, galeri foto/video, countdown timer | Premium |
| Multi-bahasa | Fase 2 |

### Pilar 2 — Buku Tamu Digital & Check-in

| Fitur | Tier |
|---|---|
| Buku tamu digital (ucapan & doa tertulis) | Lite & Premium |
| **QR Check-in** di venue (scan saat kedatangan) | Premium |
| Selfie Check-in | Premium |
| Auto Thank You Message (otomatis terkirim setelah check-in) | Premium |
| Data tamu real-time & akurat (identifikasi kategori tamu) | Premium |
| Export data tamu (CSV/Excel) | Lite & Premium |

### Pilar 3 — Wedding Planner

| Fitur | Tier |
|---|---|
| Budget Planner (rencana & pantau anggaran) | Fase 2 |
| To-Do List persiapan pernikahan | Fase 2 |
| Rundown acara (jadwal detail hari-H) | Fase 2 |
| Daftar Seserahan (barang, biaya, sumber beli) | Fase 2 |
| Data Seragam (siapa dapat seragam) | Fase 2 |
| Tabungan Nikah (target tabungan bersama pasangan) | Fase 2 |
| Vendor List (bandingkan & pilih vendor) | Fase 2 |

### Growth Channel — Program Mitra/Referral

- Komisi 15% dari setiap transaksi berhasil via kode/link referral
- Tanpa minimum followers, tanpa deposit
- Penarikan komisi langsung dari dashboard mitra

---

## 4. Diferensiasi vs Katsudoto (dan kompetitor sejenis)

Karena fitur-fitur di atas sudah jadi standar pasar, diferensiasi perlu dicari di **eksekusi**, bukan daftar fitur:

- **Kecepatan onboarding**: target user bisa publish undangan Lite dalam < 5 menit tanpa perlu isi banyak form
- **Harga lebih agresif untuk tier Lite** guna menembus kota tier-2/3 yang belum terlayani baik
- **UX dashboard tamu yang lebih ringan** (loading cepat di HP low-end, penting untuk jaringan non-4G stabil)
- **Bundling dengan WO/percetakan lokal** sebagai channel distribusi, bukan cuma jual langsung ke pasangan

---

## 5. Roadmap Bertahap

| Fase | Fokus | Output |
|---|---|---|
| **Fase 1 (Bulan 1–2)** | MVP Pilar 1: editor undangan, RSVP, Smart WhatsApp broadcast, buku tamu teks | Validasi ke 20–30 pasangan gratis |
| **Fase 2 (Bulan 3)** | Payment gateway, custom domain, tier Lite/Premium | Mulai monetisasi |
| **Fase 3 (Bulan 4–5)** | Pilar 2: QR Check-in, Selfie Check-in, Auto Thank You | Target acara skala menengah-besar |
| **Fase 4 (Bulan 6–8)** | Pilar 3: Wedding Planner suite lengkap | Naikkan retensi & lifetime value |
| **Fase 5 (Bulan 8+)** | Program Mitra/referral, white-label untuk WO | Scale lewat partnership |

---

## 6. Arsitektur Teknis (Full Custom)

**Backend (Python):**
- FastAPI untuk API-heavy service, async-friendly untuk trafik spike H-1 acara
- PostgreSQL (data terstruktur) + Redis (cache, rate limiting link publik)
- S3-compatible storage untuk foto/musik/aset template
- JWT + OAuth Google untuk auth
- Payment gateway lokal: Midtrans/Xendit (QRIS, VA, e-wallet)

**Frontend (JavaScript):**
- Next.js (React) — penting untuk SEO & Open Graph preview saat link di-share ke WhatsApp
- Editor undangan berbasis canvas (Fabric.js atau sejenis)
- Tailwind CSS untuk konsistensi visual template

**Infrastruktur:**
- Multi-tenant dengan `tenant_id`/`user_id` di level row, bukan DB per-tenant
- CDN untuk aset statis & foto tamu
- Subdomain wildcard (`namamempelai.domainku.id`) via Nginx reverse proxy
- Caching agresif untuk menahan traffic spike saat semua tamu buka link H-1

---

## 7. Risiko yang Perlu Diantisipasi

- **Musiman**: peak season April–Juni & Sept–Des, perlu strategi cashflow di low season
- **Kompetisi harga**: banyak alternatif gratis (Canva dkk), fitur RSVP/QR Check-in/dashboard jadi alasan bayar
- **Load spike**: link viral H-1 acara — caching & CDN harus solid sejak awal
- **Kompleksitas fitur Wedding Planner**: risiko over-scope di Fase 4 jika dikerjakan sebelum Pilar 1–2 stabil dan punya traksi

---

## 8. Langkah Selanjutnya

1. Validasi asumsi harga Lite/Premium dengan survei kecil ke 10–15 calon pengantin
2. Desain ERD database untuk 3 pilar (undangan, check-in, planner) dengan skema multi-tenant
3. Setup boilerplate FastAPI + Next.js untuk mulai MVP Fase 1
