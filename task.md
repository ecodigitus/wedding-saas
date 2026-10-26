# TASK.md — Breakdown Development Fase 1 (MVP)

| | |
|---|---|
| **Referensi** | PRD.md — Scope: UW-01 s/d UW-06, BT-01, BT-06 |
| **Target** | Undangan bisa dipublish < 5 menit, RSVP jalan, buku tamu jalan, export data jalan |
| **Stack** | Backend: Python (FastAPI) · Frontend: Next.js + Tailwind · DB: PostgreSQL + Redis |

Status: `[ ]` belum dikerjakan · `[~]` in progress · `[x]` selesai

---

## 0. Setup Project

- [ ] Init repo monorepo (`/backend`, `/frontend`) atau 2 repo terpisah — putuskan struktur dulu
- [ ] Setup FastAPI project skeleton (`app/main.py`, `app/api/`, `app/models/`, `app/core/config.py`)
- [ ] Setup Next.js project skeleton (App Router) + Tailwind config
- [ ] Setup PostgreSQL lokal (docker-compose) + Redis lokal
- [ ] Setup `.env` template (DB_URL, REDIS_URL, JWT_SECRET, S3_*, dll) — jangan commit `.env` asli
- [ ] Setup linting/formatting: `ruff`/`black` (backend), `eslint`/`prettier` (frontend)
- [ ] Setup CI dasar (lint + test on push) — bisa GitHub Actions

## 1. Database & Model

- [ ] Desain ERD final untuk tabel: `users`, `events`, `invitations`, `guests`, `rsvps`, `guestbook_entries`
- [ ] Tulis migration awal (Alembic untuk FastAPI/SQLAlchemy)
- [ ] Tambahkan kolom `tenant_id`/`owner_id` di tabel relevan (multi-tenant di level row)
- [ ] Seed data dummy untuk development (1 event contoh + beberapa guest)

## 2. Auth & User Management (Backend)

- [ ] Endpoint register (email + password)
- [ ] Endpoint login → return JWT
- [ ] Google OAuth login
- [ ] Middleware auth (verify JWT, inject `current_user`)
- [ ] Endpoint `GET /me` untuk ambil profil user login

## 3. Undangan Editor (UW-01, UW-02)

**Backend:**
- [ ] Model `Event` (nama mempelai, tanggal, lokasi, template_id, slug unik)
- [ ] CRUD endpoint `/events` (create, read, update — punya sendiri saja, cek ownership)
- [ ] Validasi input: tanggal tidak boleh di masa lalu, slug harus unik & url-safe

**Frontend:**
- [ ] Halaman editor: form input data mempelai, tanggal, lokasi
- [ ] Preview real-time (update tampilan saat form berubah, tanpa perlu save dulu)
- [ ] Minimal 3 template desain untuk pilihan awal

## 4. Halaman Undangan Publik (UW-03, UW-06)

**Backend:**
- [ ] Endpoint publik `GET /invitations/{slug}` (tanpa auth) — return data event untuk render
- [ ] Rate limiting endpoint publik (pakai Redis) untuk cegah abuse

**Frontend:**
- [ ] Halaman publik `/[slug]` — render undangan dari data event
- [ ] Embed Google Maps untuk lokasi acara
- [ ] Info jadwal akad/resepsi & dress code
- [ ] Meta tag Open Graph dinamis (title, image, description) per undangan untuk preview WhatsApp
- [ ] Optimasi loading < 2 detik di koneksi 4G (lazy load gambar, minimal JS)

## 5. RSVP (UW-04, UW-05)

**Backend:**
- [ ] Model `RSVP` (guest_name, jumlah_pax, status_hadir, event_id, created_at)
- [ ] Endpoint publik `POST /invitations/{slug}/rsvp` — submit RSVP tanpa login
- [ ] Endpoint privat `GET /events/{id}/rsvps` — lihat semua RSVP (owner only)
- [ ] Endpoint export `GET /events/{id}/rsvps/export` → return CSV

**Frontend:**
- [ ] Form RSVP di halaman publik undangan (nama, konfirmasi hadir/tidak, jumlah orang)
- [ ] Dashboard mempelai: tabel daftar RSVP + status
- [ ] Tombol export CSV di dashboard

## 6. Buku Tamu Digital (BT-01, BT-06)

**Backend:**
- [ ] Model `GuestbookEntry` (nama, pesan, event_id, created_at)
- [ ] Endpoint publik `POST /invitations/{slug}/guestbook` — submit ucapan
- [ ] Endpoint privat `GET /events/{id}/guestbook` — lihat semua ucapan
- [ ] Endpoint export `GET /events/{id}/guestbook/export` → CSV

**Frontend:**
- [ ] Form ucapan/doa di halaman publik undangan
- [ ] List ucapan tampil di halaman publik (opsional, bisa di-toggle mempelai)
- [ ] Dashboard: lihat & export semua ucapan

## 7. Testing

- [ ] Unit test model & endpoint utama (auth, RSVP, guestbook)
- [ ] Test rate limiting endpoint publik
- [ ] Test manual: buka undangan di HP low-end (cek loading time)
- [ ] Test share link ke WhatsApp — pastikan Open Graph preview muncul benar

## 8. Deployment

- [ ] Setup staging environment (server terpisah dari production)
- [ ] Setup subdomain wildcard di Nginx untuk kebutuhan Fase 2 nanti (siapkan dari awal)
- [ ] Deploy backend + frontend ke staging
- [ ] Smoke test end-to-end di staging sebelum lanjut Fase 2

---

## Urutan Pengerjaan yang Disarankan

1. Setup Project → Database & Model → Auth
2. Undangan Editor → Halaman Undangan Publik (paralel dengan RSVP backend)
3. RSVP (backend + frontend) → Buku Tamu (backend + frontend)
4. Testing menyeluruh → Deploy staging → validasi ke 20–30 pasangan (sesuai target PRD)

## Catatan

- Item Fase 2+ (payment, custom domain, QR Check-in, Wedding Planner, program Mitra) **belum masuk file ini** — akan dibuatkan `task.md` terpisah per fase setelah Fase 1 selesai & divalidasi.
- Referensi detail requirement: lihat `PRD.md` bagian 3 (Scope Produk).
