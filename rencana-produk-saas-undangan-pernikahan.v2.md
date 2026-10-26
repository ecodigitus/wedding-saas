# Rencana Produk: SaaS Undangan Pernikahan Digital

*Versi revisi 2 — diselaraskan dengan PRD.v2.md pasca crosscheck internal (lihat catatan perubahan di Bagian 9)*

---

## 1. Value Proposition

**"Satu platform untuk merencanakan, mengundang, dan menyambut tamu di hari pernikahanmu — dari H-6 bulan sampai hari-H."**

Berbeda dari sekadar "invitation builder", produk ini dibangun sebagai **3 pilar** yang saling menopang, sehingga user tinggal di platform sejak masa perencanaan (retensi tinggi), bukan cuma 1 hari saat kirim undangan.

---

## 2. Target Segmen & Model Bisnis

| Segmen | Kebutuhan | Model Monetisasi |
|---|---|---|
| Pasangan langsung (B2C) | Simple, cepat, murah, all-in-one | Freemium → paket Lite/Premium (Rp 50–500rb — **asumsi awal, pending validasi survei ke 10–15 calon pengantin, lihat Bagian 8**) |
| **Pasangan yang undangannya sudah ada (B2C — baru di v3)** | **Cuma butuh sistem registrasi + check-in venue; undangannya sudah dibeli dari vendor lain atau sudah dicetak** | **3 paket yang sama (Intimate/Celebration/Grand) — lihat Bagian 10** |
| Wedding Organizer (B2B) | White-label, multi-klien, reseller | Subscription bulanan + revenue share |
| Percetakan/Vendor | Bundling produk fisik + digital | Partnership/affiliate |
| Individu/reseller (Mitra) | Cari komisi tanpa modal | Program referral 15% komisi |

*(Catatan v3: kolom "Model Monetisasi" baris pertama masih menyebut Lite/Premium — model itu sudah digantikan 3 paket per-acara sejak `PRD.v2.md` Bagian 18. Dibiarkan apa adanya supaya sejarah keputusan tetap terbaca, bukan karena masih berlaku.)*

---

## 3. Struktur Produk: 3 Pilar

### Pilar 1 — Undangan Website

| Fitur | Tier |
|---|---|
| Editor undangan (pilih template, isi data mempelai, tanggal, lokasi) | Lite & Premium |
| Preview real-time saat editing | Lite & Premium |
| Info acara: peta lokasi, jadwal akad/resepsi, dress code | Lite & Premium |
| RSVP digital + jumlah tamu (pax) | Lite & Premium |
| Dashboard mempelai: status RSVP & export data (CSV) | Lite & Premium |
| Link undangan unik & shareable, dengan Open Graph preview untuk WhatsApp | Lite & Premium |
| **Smart WhatsApp** — broadcast undangan ke banyak tamu sekaligus dari dashboard | Premium |
| Kelola tamu: grup tamu, sesi acara, batas pax per undangan | Premium |
| Amplop digital (transfer bank/QRIS/e-wallet) | Premium |
| Custom domain, hapus watermark | Premium |
| Musik latar, galeri foto/video, countdown timer | Premium |
| Multi-bahasa | Fase 5 |

*(Perbaikan v2: 3 fitur P0 — Preview real-time, Dashboard RSVP + export, Link unik + Open Graph — sebelumnya tidak tercantum di tabel ini walau sudah jadi requirement P0 di PRD. Multi-bahasa dipindah dari label "Fase 2" ke "Fase 5" agar sesuai roadmap Bagian 5.)*

### Pilar 2 — Buku Tamu Digital & Check-in

| Fitur | Tier |
|---|---|
| Buku tamu digital (ucapan & doa tertulis) | Lite & Premium |
| **QR Check-in** di venue (scan saat kedatangan) | Premium |
| Selfie Check-in | Premium |
| Auto Thank You Message (otomatis terkirim setelah check-in) | Premium |
| Data tamu real-time & akurat (identifikasi kategori tamu) | Premium |
| Export data tamu (CSV/Excel) | Lite & Premium |
| **Mode Registrasi-Saja — dipakai tanpa website undangan kita, disambung dari undangan vendor lain / undangan cetak** (baru di v3, **diimplementasi & live di staging**) | Butuh paket aktif |

### Pilar 3 — Wedding Planner

| Fitur | Tier |
|---|---|
| Budget Planner (rencana & pantau anggaran) | Fase 4 |
| To-Do List persiapan pernikahan | Fase 4 |
| Rundown acara (jadwal detail hari-H) | Fase 4 |
| Daftar Seserahan (barang, biaya, sumber beli) | Fase 4 |
| Data Seragam (siapa dapat seragam) | Fase 4 |
| Tabungan Nikah (target tabungan bersama pasangan) | Fase 4 |
| Vendor List (bandingkan & pilih vendor) | Fase 4 |

*(Perbaikan v2: seluruh baris sebelumnya berlabel "Fase 2" — tidak konsisten dengan roadmap Bagian 5 yang menaruh Wedding Planner di Fase 4. Sudah diselaraskan.)*

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
- **Bisa dipakai tanpa harus pindah undangan** (Mode Registrasi-Saja, baru di v3 — diimplementasi & live di staging): kompetitor menjual *undangannya* sebagai produk, sehingga pasangan yang sudah punya undangan otomatis bukan pasar mereka. Kalau sistem registrasi + check-in kita bisa disambung ke undangan vendor mana pun (atau ke undangan kertas lewat QR cetak), objection terbesar saat jualan — *"undangan saya sudah ada / sudah bayar vendor lain"* — hilang. Ini juga membalik posisi kita terhadap vendor undangan: dari kompetitor jadi pelengkap, yang membuka jalur distribusi lewat mereka (relevan bareng Program Mitra, Fase 5)

---

## 5. Roadmap Bertahap

| Fase | Fokus | Output |
|---|---|---|
| **Fase 1 (Bulan 1–2)** | MVP Pilar 1: editor undangan, RSVP, buku tamu teks | Validasi ke 20–30 pasangan gratis |
| **Fase 2 (Bulan 3)** | Payment gateway, custom domain, tier Lite/Premium, Smart WhatsApp broadcast, kelola tamu, amplop digital, musik/galeri/countdown | Mulai monetisasi |
| **Fase 3 (Bulan 4–5)** | Pilar 2: QR Check-in, Selfie Check-in, Auto Thank You | Target acara skala menengah-besar |
| **Fase 4 (Bulan 6–8)** | Pilar 3: Wedding Planner suite lengkap | Naikkan retensi & lifetime value |
| **Fase 5 (Bulan 9+)** | Program Mitra/referral, white-label untuk WO, Multi-bahasa | Scale lewat partnership & pasar baru |

*(Perbaikan v2: "Smart WhatsApp broadcast" dipindahkan dari output Fase 1 ke Fase 2 — sebelumnya bertentangan dengan PRD yang menandai fitur ini Premium/P1 dan menjadwalkannya Fase 2; task.md juga sudah mengeluarkannya dari scope Fase 1. Fase 5 mulai "Bulan 9+" — sebelumnya "Bulan 8+" tumpang tindih dengan akhir Fase 4.)*

---

## 6. Arsitektur Teknis (Full Custom)

**Backend (Python):**
- FastAPI untuk API-heavy service, async-friendly untuk trafik spike H-1 acara
- PostgreSQL (data terstruktur) + Redis (cache, rate limiting link publik **dan endpoint tulis** — submit RSVP & buku tamu)
- S3-compatible storage untuk foto/musik/aset template — **bucket privat default untuk aset milik tamu (foto/selfie), akses via signed URL; aset publik/template dipisah**
- JWT (access token pendek + refresh token) + OAuth Google untuk auth; password di-hash dengan argon2id/bcrypt
- Payment gateway lokal: Midtrans/Xendit (QRIS, VA, e-wallet) — **webhook wajib diverifikasi signature sebelum mengubah status tier**

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

---

## 9. Log Perubahan (v1 → v2)

- Pilar 1: tambah 3 fitur P0 yang sebelumnya hilang (Preview real-time, Dashboard RSVP + export, Link unik + Open Graph); Multi-bahasa dipindah ke label "Fase 5".
- Pilar 3 (Wedding Planner): label fase diperbaiki dari "Fase 2" ke "Fase 4" agar sesuai roadmap Bagian 5.
- Roadmap Bagian 5: Smart WhatsApp broadcast dipindah dari output Fase 1 ke Fase 2; Fase 5 mulai "Bulan 9+" (bukan "Bulan 8+") untuk hilangkan overlap dengan Fase 4.
- Harga Rp 50–500rb ditandai eksplisit sebagai asumsi awal pending validasi survei (sebelumnya berpotensi dibaca sebagai angka final).
- Arsitektur teknis: tambah catatan storage privat/signed-URL, rate limit endpoint tulis, password hashing, JWT hardening, dan verifikasi signature webhook — menyelaraskan dengan requirement keamanan baru di PRD.v2.md.

---

## 10. Log Perubahan (v2 → v3) — Segmen baru: pasangan yang undangannya sudah ada

> **Sudah diimplementasi & live di `https://demo.ecodigitus.com`** (v2 → v3 aslinya penambahan dokumen murni). Requirement teknis di `PRD.v2.md` Bagian 3 (tabel RG) & Bagian 19–20; breakdown & log implementasi di `task.v2.md` Bagian 11 + Log Perubahan v22→v23.

- **Bagian 2:** tambah segmen **"Pasangan yang undangannya sudah ada"** — sudah beli undangan digital dari vendor lain atau sudah cetak undangan kertas, cuma butuh sistem registrasi + check-in venue. Selama ini segmen ini otomatis tersaring keluar karena produk mewajibkan undangan dibuat di platform kita.
- **Pilar 2:** tambah baris "Mode Registrasi-Saja". Ditaruh di Pilar 2 (bukan Pilar 1) karena nilai yang dijual di mode ini murni buku tamu digital + QR check-in — website undangan justru yang sengaja tidak dipakai.
- **Bagian 4 (Diferensiasi):** tambah poin "bisa dipakai tanpa harus pindah undangan". Ini diferensiasi struktural, bukan cuma fitur: kompetitor menjual *undangannya* sebagai produk, jadi pasangan yang sudah punya undangan bukan pasar mereka. Efek sampingnya membalik posisi kita terhadap vendor undangan — dari kompetitor jadi pelengkap — yang membuka jalur distribusi lewat mereka (relevan bareng Program Mitra, Fase 5).
- **Harga sudah diputuskan (dikonfirmasi pemilik produk pasca-deploy): samakan dengan yang ada sekarang.** Pakai 3 paket yang sama (Intimate/Celebration/Grand) tanpa SKU baru, konsisten dengan prinsip "paket dibedakan kapasitas, bukan fitur" (`PRD.v2.md` Bagian 18) — mode ini memakai lebih sedikit produk tapi konsumsi kapasitas tamu & infrastruktur check-in identik. Alternatif yang sengaja tidak dipilih: SKU "QR Only" berdiskon, karena berisiko mengkanibalisasi paket inti.
- **Catatan:** tabel-tabel di dokumen ini masih memakai label Lite/Premium yang sudah digantikan model 3 paket per-acara sejak `PRD.v2.md` Bagian 18. Dibiarkan apa adanya (ditandai, bukan ditulis ulang) supaya sejarah keputusan tetap terbaca — konsisten dengan cara `PRD.v2.md` menandai bagian yang superseded.
