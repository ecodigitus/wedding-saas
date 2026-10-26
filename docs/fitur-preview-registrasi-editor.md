# Fitur: Preview Mode Registrasi-Saja di Editor

| | |
|---|---|
| **Produk** | Wedding SaaS (`frontend/`) |
| **Terkait** | RG-01 (penanda mode), RG-02 (halaman `/r/{slug}`), `task.v2.md` Bagian 11 |
| **Tanggal** | 23 Oktober 2026 |
| **Developer** | Ivan Adi Prayoga (IAP), dibantu Claude Code |
| **Tercatat di Odoo** | Task #3786 (project "Ivan - Odoo Developer") |

## 1. Masalah

Di Mode Registrasi-Saja, tamu tidak melihat undangan lengkap. `/{slug}` dialihkan
ke `/r/{slug}` (halaman konfirmasi kehadiran). Tapi panel **Preview** di editor
(`/dashboard/editor`) selalu merender `InvitationView` (undangan lengkap), sehingga
owner melihat tampilan yang berbeda dari yang dilihat tamu.

## 2. Perilaku baru

| Mode event | Isi panel Preview |
|---|---|
| `full` | `InvitationView` (tidak berubah) |
| `registration_only` | `RegistrationPreview` (meniru `/r/{slug}`) |

`RegistrationPreview` memakai data form editor yang **belum disimpan**, jadi
berubah langsung saat owner mengetik. Isinya: judul "Konfirmasi Kehadiran", nama
pasangan, tanggal, lokasi, kartu RSVP, "Kirim Hadiah" (hanya jika add-on Amplop
Digital aktif dan terisi), dan "Buku Tamu".

## 3. Keputusan desain

- **Statis, bukan memakai `RsvpForm` dan `GuestbookSection` asli.** Dua komponen itu
  memanggil API publik (submit RSVP, auto-enroll tamu ke roster, menulis
  `localStorage`, mengirim ucapan). Kalau dirender di editor, owner yang mencoba
  preview akan membuat tamu, RSVP, dan ucapan sungguhan.
- **Wrapper `inert`.** Mematikan fokus, klik, dan ketik, sekaligus menyembunyikan
  preview dari teknologi bantu (ini gambar, bukan form).
- **Gift hanya jika `hasGiftAddon`.** Mengikuti perilaku halaman publik.
- `InvitationView` tidak diubah. Tipe `InvitationData` tidak diekspor, jadi
  komponen baru mendefinisikan tipenya sendiri.

## 4. File

| File | Perubahan |
|---|---|
| `frontend/components/RegistrationPreview.tsx` | Baru |
| `frontend/app/dashboard/editor/page.tsx` | Percabangan di panel Preview (`isRegistrationOnly`) |
| `frontend/scripts/verify-registration-preview.mjs` | Baru: script e2e |
| `frontend/next.config.ts` | `poweredByHeader: false`; header `Strict-Transport-Security` |

**Perhatian pemeliharaan:** kalau tampilan `app/r/[slug]/page.tsx` berubah, ubah
`RegistrationPreview.tsx` juga. Keduanya sengaja tidak berbagi komponen.

## 5. Keamanan (OWASP)

- **A05 (Security Misconfiguration):** header `x-powered-by` dimatikan; HSTS
  (`max-age=31536000`, tanpa `includeSubDomains`/`preload` karena subdomain lain
  milik aplikasi lain) ditambahkan.
- **A01/A04:** preview tidak bisa memicu penulisan data (lihat §3), dibuktikan oleh
  tes "klik di preview tidak memicu request tulis" dan pengecekan jumlah tamu/RSVP
  di DB.

## 6. Domain dan build

Alamat domain tertanam di bundle saat build (`NEXT_PUBLIC_API_URL`,
`NEXT_PUBLIC_SITE_URL`). Untuk produksi saat ini:

```bash
docker build -t wedding-saas-frontend:<tag> \
  --build-arg NEXT_PUBLIC_API_URL=https://wedding.ecodigitus.com \
  --build-arg NEXT_PUBLIC_SITE_URL=https://wedding.ecodigitus.com ./frontend
```

Setelah build, cek `BUILD_ID` image dan grep bundle (`.next/static`) memuat domain
baru dan tidak memuat domain lama, sebelum dikirim ke server.

## 7. Pengujian

`node scripts/verify-registration-preview.mjs` (variabel: `DOMAIN_URL`,
`STAGING_SSH_HOST`, `POSTGRES_CONTAINER`, `E2E_EMAIL`, `E2E_PASSWORD`).

- Tanpa `E2E_EMAIL`/`E2E_PASSWORD`: membuat akun uji `regpreview-<ts>@example.com`.
- Dengan keduanya: login ke akun yang sudah ada. Mode awal event dikembalikan di
  akhir, dan jumlah tamu/RSVP diverifikasi tidak berubah. Kredensial hanya dari
  env, tidak pernah ditulis di file.

Cakupan (21 pemeriksaan): preview undangan vs registrasi per mode, preview ikut
perubahan form, `inert`, tidak ada request tulis, DB tidak berubah, axe (0
pelanggaran serious/critical), redirect `/{slug}` ke `/r/{slug}`, halaman publik
cocok dengan preview, API lewat domain, dan mode dikembalikan.

**Hasil 23 Okt 2026:** 21 lolos, 0 masalah (lingkungan lokal). Di produksi:
pengecekan tanpa login lolos (data sama dengan baseline, header benar, log error 0);
e2e login di domain produksi dijalankan manual oleh developer.

## 8. Deploy produksi

edig-prod-01, `/srv/wedding-saas`, image `wedding-saas-frontend:wedding-20261023c`
(`BUILD_ID` `JI2VotKKr1ZTCMSjz38Nr`). Urutan: backup `docker-compose.prod.yml`,
`docker load`, ganti tag image, `up -d --no-deps --force-recreate frontend`.
Rollback: kembalikan tag ke `wedding-20261023b` (atau `wedding-20261023`) di
compose, lalu ulangi perintah `up`. Backend dan database tidak berubah.
