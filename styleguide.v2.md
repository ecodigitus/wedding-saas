# STYLEGUIDE.md — Brand & UI Style Guide

| | |
|---|---|
| **Versi** | 5 — gap axe-core lintas-palet di Halaman Registrasi-Saja ditutup (§14); v4: spesifikasi layout Halaman Registrasi-Saja (§5.7), diimplementasi & live di staging; v3: audit kontras WCAG AA terhitung + 4 template undangan (lihat Bagian 12–13) |
| **Referensi** | PRD.v2.md, task.v2.md (Fase 1) |
| **Cakupan** | Dashboard (mempelai/owner), Halaman undangan publik, Halaman registrasi-saja, Editor |
| **Prinsip utama** | Elegan tapi ringan (loading cepat di HP low-end), tidak terasi generik |

---

## 1. Prinsip Desain

1. **Mobile-first, selalu.** 90%+ traffic tamu dari mobile browser. Desain, test, dan optimasi dari layar kecil dulu, baru scale ke desktop.
2. **Ringan sebelum indah.** Setiap elemen visual (font custom, animasi, gambar besar) harus lolos cek "apakah ini bikin loading > 2 detik di 4G?" sebelum dipakai.
3. **Elegan tanpa berlebihan.** Target user adalah pasangan yang ingin tampil "high-end" tanpa biaya desainer — hindari elemen yang terasa murahan (clipart, gradient norak) atau terlalu ramai.
4. **Konsisten lintas 3 pilar.** Dashboard, editor, dan halaman publik harus terasa satu produk, meskipun halaman publik per-undangan bisa sangat berbeda temanya (tergantung template yang dipilih user).

---

## 2. Warna

### 2.1 Warna Sistem (Dashboard, Editor, Marketing Site)

Ini warna untuk *produk kita sendiri* — bukan untuk template undangan (yang temanya ditentukan user).

| Token | Hex | Penggunaan |
|---|---|---|
| `--color-primary` | `#7A5C61` | Warna utama brand — dusty rose, hangat, cocok tema wedding tanpa terlalu manis |
| `--color-primary-dark` | `#5C4348` | Hover state, teks penting di atas latar terang |
| `--color-secondary` | `#D9C4A3` | Aksen hangat (gold muda), untuk badge/highlight, dipakai secukupnya |
| `--color-background` | `#FBF8F5` | Latar utama — off-white hangat, bukan putih pure |
| `--color-surface` | `#FFFFFF` | Kartu, modal, elemen di atas background |
| `--color-border` | `#E8E0D8` | Garis pembatas halus |
| `--color-text-primary` | `#2E2325` | Teks utama |
| `--color-text-secondary` | `#6B5D5F` | Teks sekunder, caption, helper text |
| `--color-success` | `#487259` | Konfirmasi RSVP hadir, status sukses |
| `--color-danger` | `#AC5156` | RSVP tidak hadir, error, aksi destruktif |
| `--color-warning` | `#836430` | Peringatan (mis. kuota tamu mendekati limit) |

*(Perbaikan v3: nilai success/danger/warning digelapkan ~5-20% dari draf awal — versi asli gagal WCAG AA 4.5:1 saat dipakai sebagai teks/badge, ketahuan lewat `frontend/scripts/audit-contrast.mjs`. Tetap satu keluarga hue.)*

**Kontras & aksesibilitas:** semua kombinasi teks-di-atas-background wajib lolos WCAG AA (kontras rasio ≥ 4.5:1 untuk teks normal) — berlaku di **seluruh produk** (dashboard, editor, halaman publik), selaras dengan PRD.v2.md Bagian 6. Diverifikasi terhitung (bukan kira-kira mata) lewat `frontend/scripts/audit-contrast.mjs` — jalankan ulang tiap kali menambah/mengubah token warna atau template baru.

### 2.2 Warna Template Undangan

Template undangan (yang dipilih tamu/mempelai) **tidak terikat** ke palet di atas — tiap template punya palet sendiri (misal: sage green, dusty blue, burgundy classic). Yang wajib konsisten antar-template hanyalah:
- Kontras teks tetap lolos AA
- Ada minimal 1 warna aksen untuk CTA (tombol RSVP, tombol amplop digital)

---

## 3. Tipografi

| Token | Font | Penggunaan |
|---|---|---|
| `--font-heading` | Playfair Display (serif) | Judul besar di dashboard/marketing, bukan di undangan (undangan pakai font dari template) |
| `--font-body` | Inter | Body text dashboard, form, tabel — prioritas keterbacaan di ukuran kecil |
| `--font-mono` | (tidak dipakai di UI user-facing) | Hanya untuk kode internal/dokumentasi teknis |

**Implementasi (baru di v2):** self-host Playfair Display & Inter (mis. `next/font` di Next.js atau `@font-face` lokal), subset Latin saja, `font-display: swap` — jangan panggil ke CDN font eksternal agar tidak menambah request di halaman publik yang perf-kritis. Lihat task.v2.md Bagian 0 untuk task setupnya.

**Skala ukuran (dashboard & marketing):**

| Level | Ukuran | Penggunaan |
|---|---|---|
| H1 | 32px / 2rem | Judul halaman |
| H2 | 24px / 1.5rem | Judul section |
| H3 | 18px / 1.125rem | Sub-section, judul kartu |
| Body | 16px / 1rem | Teks utama |
| Small | 14px / 0.875rem | Caption, helper text, label form |

**Catatan khusus halaman undangan publik:** ukuran font boleh lebih besar (min 16px body) karena banyak diakses tamu usia lebih tua yang mungkin kurang familiar dengan UI kecil di HP. *(Ini keputusan produk, bukan bagian dari klaim kepatuhan WCAG AA — WCAG AA sendiri tidak menetapkan ukuran font minimum.)*

---

## 4. Spacing & Layout

- Gunakan skala 4px sebagai basis: `4, 8, 12, 16, 24, 32, 48, 64px`
- Container max-width dashboard: `1200px`, dengan padding horizontal `16px` di mobile
- Halaman undangan publik: single-column, max-width `480px` di desktop juga (biar terasa seperti "kartu undangan", bukan website lebar)
- Jarak antar-section di halaman publik: minimal `48px` agar tidak terasa padat

---

## 5. Komponen Utama

### 5.1 Button

| Variant | Penggunaan | Style |
|---|---|---|
| Primary | Aksi utama (Publish, Simpan, Kirim RSVP) | `--color-primary` background, teks putih, radius 8px |
| Secondary | Aksi sekunder (Batal, Kembali) | Border `--color-border`, teks `--color-text-primary` |
| Danger | Hapus, konfirmasi tidak hadir | `--color-danger` background |
| Ghost/Text | Aksi tersier (Lihat detail, Export) | Tanpa background, teks `--color-primary` |

Semua button: min height `44px` untuk touch target mobile yang nyaman.

### 5.2 Form Input

- Border radius `8px`, border `1px solid --color-border`
- Focus state: border `--color-primary` + subtle shadow, jangan hilangkan outline demi aksesibilitas
- Label selalu di atas input (bukan placeholder-only) — penting untuk usability tamu yang kurang familiar teknologi

### 5.3 Card

- Background `--color-surface`, border radius `12px`, shadow halus (`0 1px 3px rgba(0,0,0,0.08)`)
- Dipakai untuk: kartu ucapan di buku tamu, kartu pilihan template
- **Bukan untuk daftar RSVP** — daftar RSVP di dashboard memakai Table (§5.6), bukan Card, karena datanya tabular dan perlu discan cepat per baris (nama, jumlah pax, status). Status memakai Badge (§5.4) di kolom terakhir.

### 5.4 Badge/Status

- Status RSVP "Hadir": pill hijau (`--color-success` background 10% opacity, teks solid)
- Status RSVP "Tidak Hadir": pill merah (`--color-danger` versi sama)
- **Status "Menunggu"** (diundang tapi belum merespon): pill abu netral — **baru tersedia setelah Kelola Tamu (UW-08) aktif di Fase 2**, karena butuh roster tamu yang bisa direkonsiliasi terhadap RSVP yang masuk. Di Fase 1, RSVP bersifat self-submit tanpa roster (tamu mengisi nama sendiri), sehingga dashboard RSVP Fase 1 hanya menampilkan 2 status: Hadir / Tidak Hadir.

### 5.5 Empty State

Setiap halaman list (RSVP, buku tamu) wajib punya empty state yang ramah — ilustrasi/icon sederhana + copy yang membantu (mis. "Belum ada RSVP masuk. Yuk share link undanganmu ke tamu!"), bukan tabel kosong polos. *(Task konkret: lihat task.v2.md Bagian 5 & 6.)*

### 5.6 Layout Editor (baru di v2)

Editor (UW-01, UW-02) memakai split-view agar preview real-time terasa langsung, bukan cuma form biasa:

- **Desktop (≥ 1024px):** form input di kiri (± 60% lebar), panel preview di kanan (± 40% lebar, `position: sticky` saat form di-scroll).
- **Mobile/Tablet (< 1024px):** tab/toggle di bagian atas — "Form" dan "Preview" — preview tampil full-width saat tab aktif, agar tidak memaksakan 2 kolom sempit di layar kecil.
- Update preview di-debounce ± 300ms saat user mengetik di form, agar tidak membebani render saat tiap keystroke.
- Palet warna & tipografi di panel preview mengikuti **template yang dipilih user** (§2.2), bukan token warna sistem (§2.1) — hanya frame/chrome editor di sekitarnya yang pakai token sistem.

### 5.7 Layout Halaman Registrasi-Saja (baru di v4 — diimplementasi & live di staging)

Halaman `/r/{slug}` (RG-02, lihat `PRD.v2.md` Bagian 3 & `task.v2.md` Bagian 11) untuk pasangan yang undangannya sudah dibuat di luar platform. **Bukan undangan** — ini halaman konfirmasi kehadiran yang tamu buka dari undangan vendor. Desainnya harus terbaca sebagai pelengkap, bukan sebagai undangan kedua yang bersaing dengan yang sudah tamu lihat.

**Palet: reuse, jangan bikin baru.** Warna diambil dari `TEMPLATE_THEME[event.template_id]` (§2.2) — 7 palet yang sudah ada. **Tidak ada palet baru untuk halaman ini, dan tidak ada entri baru di `frontend/scripts/audit-contrast.mjs`** — 52 pengecekan yang sudah lolos sudah mencakup kombinasi `bg`/`text`/`accent`/`muted` yang dipakai di sini. Ini menggantikan ide awal "palet aksen kurasi khusus halaman registrasi": reuse lebih murah, dan menghindari dua sumber kebenaran warna yang bisa drift.

**Yang ADA di halaman ini:**
- Header ringkas: nama mempelai, tanggal, lokasi — cukup untuk tamu yakin tidak salah alamat, tidak lebih
- Form RSVP (komponen sama, `RsvpForm`)
- Buku tamu (komponen sama)
- Amplop Digital kalau add-on-nya aktif — tetap relevan di mode ini, tamu tetap mau transfer
- QR check-in tamu, tampil langsung setelah konfirmasi "hadir" (RG-05)

**Yang SENGAJA TIDAK ADA** — semua ini chrome undangan, dan menampilkannya justru membuat halaman terasa seperti undangan kedua yang bersaing dengan undangan vendor:
- Hero beranimasi (`hero-stage-*`), partikel kerlip (`SparkleParticles`), scroll-reveal (`ScrollReveal`)
- Galeri foto/video, musik latar, countdown timer
- Dekorasi khas template (bingkai klasik, corner brackets monogram, scallop header taman-manis)

**Layout:** satu kolom, mobile-first (§8 — mayoritas tamu buka dari HP), lebar konten maksimal ± 560px di desktop supaya form tidak melebar tidak wajar. Prioritas: form RSVP harus terlihat **tanpa scroll** di viewport mobile — ini satu-satunya alasan tamu membuka halaman ini, beda dari halaman undangan yang wajar dibuka dari atas dan di-scroll.

**Kartu form tetap `bg-surface` eksplisit** — aturan yang sama dengan halaman undangan (§12, Log Perubahan v2→v3): jangan biarkan kartu form ikut warna ambient template, supaya template gelap (`monokrom`) tetap aman tanpa perlu varian dark-mode untuk semua komponen form. Di halaman tanpa chrome undangan ini risikonya lebih besar, karena porsi layar yang diisi form jauh lebih dominan.

**Copy (§6):** tone menyesuaikan, tapi framing-nya beda dari halaman undangan — judul & CTA bicara soal *konfirmasi kehadiran*, bukan *undangan*. Contoh: "Konfirmasi kehadiranmu ya" bukan "Kami mengundangmu". Judul Open Graph juga ikut aturan ini (RG-02/UW-06), karena link ini di-share sebagai pelengkap undangan vendor.

---

## 6. Tone of Voice (Copy)

- **Bahasa Indonesia santai-hangat**, bukan formal-korporat. Contoh: "Yuk buat undangan impianmu" bukan "Silakan buat undangan Anda sekarang."
- Gunakan **"kamu"**, bukan "Anda" — konsisten di seluruh produk (dashboard, email, notifikasi).
- Pesan error tetap sopan & solutif: "Ups, tanggal acara nggak boleh di masa lalu ya" bukan "Error: invalid date."
- Untuk halaman publik undangan: tone menyesuaikan template (bisa lebih formal/klasik untuk template tradisional), tapi CTA (tombol RSVP) tetap jelas & tidak ambigu.

---

## 7. Ikonografi & Imagery

- Icon set: gunakan 1 library konsisten (misal Lucide/Phosphor) — jangan campur beberapa gaya icon. *(Task setup: lihat task.v2.md Bagian 0.)*
- Icon di dashboard: outline style, ukuran `20px` default
- Foto/ilustrasi marketing: hindari stock photo yang terasa generik-korporat; prioritaskan foto pasangan asli (dengan izin) atau ilustrasi custom bertema hangat

---

## 8. Responsif — Breakpoint

| Breakpoint | Lebar | Prioritas |
|---|---|---|
| Mobile | < 640px | **Utama** — desain & test dari sini dulu |
| Tablet | 640–1024px | Sekunder |
| Desktop | > 1024px | Tersier — dashboard WO mungkin lebih sering diakses dari sini |

---

## 9. Checklist Sebelum Ship UI Baru

- [ ] Sudah dicek di viewport mobile (< 640px) dulu, bukan desktop dulu
- [ ] Kontras teks lolos WCAG AA
- [ ] Tidak menambah font/gambar baru yang bikin loading page > 2 detik
- [ ] Copy pakai "kamu", tone hangat, bukan korporat
- [ ] Empty state & error state sudah **dibangun** (bukan cuma didesain di Figma), sesuai task.v2.md
- [ ] Kalau menambah warna: sudah ditambahkan ke `frontend/scripts/audit-contrast.mjs` dan skripnya dijalankan — **atau** dipastikan me-reuse palet yang sudah ada (§5.7), jangan bikin sumber kebenaran warna kedua

---

## 10. Referensi Teknis

- Implementasi token warna/font di frontend: gunakan CSS variables sesuai token di atas (`--color-*`, `--font-*`), jangan hardcode hex/nama font langsung di komponen.
- Selaras dengan `PRD.v2.md` non-functional requirement: loading < 2 detik di 4G, mobile-first, WCAG AA seluruh produk.

---

## 11. Log Perubahan (v1 → v2)

- §5.4: status "Menunggu" diberi catatan dependensi — tidak punya jalur data sampai Kelola Tamu (UW-08) aktif di Fase 2; Fase 1 hanya 2 status (Hadir/Tidak Hadir).
- §5.3: diperjelas Card **bukan** untuk daftar RSVP (yang sebelumnya disebut di sini padahal task.md memakai Table) — dipindahkan ke §5.6/§5.4.
- §5.6 (baru): spesifikasi layout Editor (split-view desktop, tab mobile, debounce preview) — sebelumnya "Editor" disebut di Cakupan tapi tidak punya spesifikasi layout.
- §3: tambah catatan implementasi font (self-host + subset + font-display: swap).
- §2.1: kontras WCAG AA ditegaskan berlaku ke seluruh produk (sebelumnya PRD versi awal membatasi ke template saja — sudah diselaraskan di PRD.v2.md).
- §9: checklist empty state diperjelas harus "dibangun", bukan cuma didesain.

## 12. Log Perubahan (v2 → v3)

- §2.1: nilai `--color-success`/`--color-danger`/`--color-warning` digelapkan — versi v2 gagal WCAG AA 4.5:1 saat dipakai sebagai teks/badge (ketahuan lewat audit terhitung, bukan cek visual).
- §2.2/template: tambah template ke-4 "Elegan Monokrom" (latar gelap, aksen gold) — 3 template v2 juga diberi dekorasi layout nyata (bingkai, divider, bentuk organik) bukan cuma beda warna.
- Kartu form RSVP/Buku Tamu di halaman publik sekarang selalu punya background terang eksplisit (`bg-surface`), tidak lagi ikut warna ambient template — supaya aman dipakai di template gelap tanpa perlu varian dark-mode untuk semua komponen form.
- Ditambahkan `frontend/scripts/audit-contrast.mjs` sebagai alat verifikasi kontras WCAG AA yang bisa dijalankan ulang, bukan cuma klaim kepatuhan tanpa bukti hitung.

## 13. Log Perubahan (v3 → v4) — Layout Halaman Registrasi-Saja

> **Sudah diimplementasi & live di `https://demo.ecodigitus.com`.** Bagian ini aslinya penambahan dokumen murni (nol kode). Requirement di `PRD.v2.md` Bagian 3 (tabel RG); breakdown & log implementasi di `task.v2.md` Bagian 11 + Log Perubahan v22→v23.

- **§5.7 (baru):** spesifikasi layout halaman `/r/{slug}` untuk Mode Registrasi-Saja — halaman konfirmasi kehadiran yang tamu buka dari undangan vendor lain, bukan undangan kedua.
- **Keputusan warna: reuse `TEMPLATE_THEME`, nol palet baru.** Ide awal (dibahas lisan) mau membuat 3–5 warna aksen kurasi khusus halaman ini supaya nyambung dengan undangan vendor. Dibatalkan setelah dicek: 7 palet template existing sudah lolos audit kontras terhitung (52 pengecekan), dan `template_id` sudah bisa dipakai sebagai pemilihnya. Konsekuensinya halaman ini **tidak menambah satu pun entri audit kontras baru** — sekaligus menghindari sumber kebenaran warna kedua yang bisa drift dari yang pertama.
- **Daftar eksplisit apa yang sengaja TIDAK ditampilkan** (hero beranimasi, partikel kerlip, scroll-reveal, galeri, musik, countdown, dekorasi khas template) — semuanya chrome undangan. Ditulis eksplisit karena semua elemen itu sudah ada di `InvitationView.tsx` dan default yang wajar bagi implementor adalah me-reuse komponen itu apa adanya, yang justru salah untuk halaman ini.
- **Aturan `bg-surface` eksplisit untuk kartu form ditegaskan ulang** — sama seperti di halaman undangan (§12), tapi risikonya lebih besar di sini karena porsi layar yang diisi form jauh lebih dominan tanpa chrome undangan di sekitarnya. Template gelap (`monokrom`) adalah kasus uji utamanya.
- **Prioritas layout:** form RSVP terlihat tanpa scroll di viewport mobile — beda dari halaman undangan yang wajar dibuka dari atas lalu di-scroll. Tamu membuka halaman ini dengan satu niat saja.
- **§6 (Tone):** framing copy halaman ini bicara *konfirmasi kehadiran*, bukan *undangan* — termasuk judul Open Graph, karena link-nya di-share sebagai pelengkap undangan vendor.
- **§9 (Checklist):** tambah item — kalau menambah warna, wajib masuk `audit-contrast.mjs` **atau** dipastikan me-reuse palet yang sudah ada.
- **Verifikasi saat implementasi:** `frontend/scripts/verify-registration-mode.mjs` (baru) mengonfirmasi 0 axe-core violation di `/r/{slug}`, dijalankan lokal & ke `https://demo.ecodigitus.com` — tapi awalnya cuma dengan palet default (`klasik`).
- **Gap ditutup (Bagian 14):** `scripts/verify-templates.mjs` diperluas untuk axe-scan `/r/{slug}` per template — **0 pelanggaran di semua 7 palet**, termasuk `monokrom` (kasus uji utama di atas). Spot-check visual manual untuk `monokrom` & `editorial` juga bersih — kartu form tetap terang (`bg-surface`) di atas latar gelap, tidak ada teks tak terbaca.

## 14. Log Perubahan (v4 → v5) — Gap axe-core lintas-palet ditutup

Diminta langsung pemilik produk ("yes tutup gap") setelah Bagian 13 mencatat verifikasi awal `/r/{slug}` cuma memakai 1 dari 7 palet template. `scripts/verify-templates.mjs` (harness ganti-template-per-event yang sudah ada untuk `/{slug}`) diperluas: tiap iterasi template, toggle Mode Registrasi-Saja aktif sesaat → kunjungi `/r/{slug}` → screenshot + axe-scan → toggle balik ke nonaktif. **0 axe-core violation di semua 7 palet** (termasuk `monokrom`, yang paling berisiko karena halaman ini tidak punya chrome undangan). `/{slug}` tetap 0 pelanggaran (regression check). Spot-check visual manual (bukan cuma percaya axe buta) untuk `monokrom` & `editorial` — bersih, kartu form konsisten `bg-surface` sesuai §5.7/§12. Detail teknis lengkap (kenapa tidak perlu grant paket, kenapa tidak diulang ke domain nyata) ada di `task.v2.md` Log Perubahan v23→v24.
