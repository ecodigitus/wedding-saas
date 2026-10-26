# STYLEGUIDE.md — Brand & UI Style Guide

| | |
|---|---|
| **Referensi** | PRD.md, task.md (Fase 1) |
| **Cakupan** | Dashboard (mempelai/owner), Halaman undangan publik, Editor |
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
| `--color-success` | `#5A8F6F` | Konfirmasi RSVP hadir, status sukses |
| `--color-danger` | `#B5555A` | RSVP tidak hadir, error, aksi destruktif |
| `--color-warning` | `#C99A4A` | Peringatan (mis. kuota tamu mendekati limit) |

**Kontras & aksesibilitas:** semua kombinasi teks-di-atas-background wajib lolos WCAG AA (kontras rasio ≥ 4.5:1 untuk teks normal).

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

**Skala ukuran (dashboard & marketing):**

| Level | Ukuran | Penggunaan |
|---|---|---|
| H1 | 32px / 2rem | Judul halaman |
| H2 | 24px / 1.5rem | Judul section |
| H3 | 18px / 1.125rem | Sub-section, judul kartu |
| Body | 16px / 1rem | Teks utama |
| Small | 14px / 0.875rem | Caption, helper text, label form |

**Catatan khusus halaman undangan publik:** ukuran font boleh lebih besar (min 16px body) karena banyak diakses tamu usia lebih tua yang mungkin kurang familiar dengan UI kecil di HP.

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
- Dipakai untuk: kartu RSVP di dashboard, kartu ucapan di buku tamu, kartu pilihan template

### 5.4 Badge/Status

- Status RSVP "Hadir": pill hijau (`--color-success` background 10% opacity, teks solid)
- Status RSVP "Tidak Hadir": pill merah (`--color-danger` versi sama)
- Status "Menunggu": pill abu netral

### 5.5 Empty State

Setiap halaman list (RSVP, buku tamu) wajib punya empty state yang ramah — ilustrasi/icon sederhana + copy yang membantu (mis. "Belum ada RSVP masuk. Yuk share link undanganmu ke tamu!"), bukan tabel kosong polos.

---

## 6. Tone of Voice (Copy)

- **Bahasa Indonesia santai-hangat**, bukan formal-korporat. Contoh: "Yuk buat undangan impianmu" bukan "Silakan buat undangan Anda sekarang."
- Gunakan **"kamu"**, bukan "Anda" — konsisten di seluruh produk (dashboard, email, notifikasi).
- Pesan error tetap sopan & solutif: "Ups, tanggal acara nggak boleh di masa lalu ya" bukan "Error: invalid date."
- Untuk halaman publik undangan: tone menyesuaikan template (bisa lebih formal/klasik untuk template tradisional), tapi CTA (tombol RSVP) tetap jelas & tidak ambigu.

---

## 7. Ikonografi & Imagery

- Icon set: gunakan 1 library konsisten (misal Lucide/Phosphor) — jangan campur beberapa gaya icon
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
- [ ] Empty state & error state sudah didesain, bukan dibiarkan default browser

---

## 10. Referensi Teknis

- Implementasi token warna/font di frontend: gunakan CSS variables sesuai token di atas (`--color-*`, `--font-*`), jangan hardcode hex/nama font langsung di komponen.
- Selaras dengan `PRD.md` non-functional requirement: loading < 2 detik di 4G, mobile-first, WCAG AA.
