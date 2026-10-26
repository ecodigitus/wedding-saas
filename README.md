# Wedding SaaS — Undangan Pernikahan Digital

MVP Fase 1: editor undangan, halaman publik, RSVP, dan buku tamu. Lihat
[`PRD.v2.md`](PRD.v2.md), [`task.v2.md`](task.v2.md), dan
[`styleguide.v2.md`](styleguide.v2.md) untuk detail requirement & desain.

## Stack

- **Backend:** Python 3.12 · FastAPI · SQLAlchemy · Alembic · PostgreSQL · Redis
- **Frontend:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4
- **Infra lokal:** Docker Compose (Postgres + Redis)

## Jalankan di lokal

### 1. Database & cache

```bash
docker compose up -d
```

Postgres jalan di `localhost:5433` (bukan 5432 — cek `docker-compose.yml` kalau
port itu dipakai proses lain di komputermu), Redis di `localhost:6379`.

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash; pakai .venv/bin/activate di macOS/Linux
pip install -r requirements-dev.txt
cp .env.example .env            # lalu isi JWT_SECRET dengan random string
alembic upgrade head
python seed.py                  # opsional — bikin user & undangan contoh
uvicorn app.main:app --reload
```

Backend jalan di `http://localhost:8000` (docs interaktif di `/docs`).

Login contoh dari seed: `demo@wedding-saas.dev` / `password123`.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Frontend jalan di `http://localhost:3000`.

## Testing

```bash
# Backend — pytest pakai SQLite in-memory + fakeredis, tidak butuh Docker
cd backend && source .venv/Scripts/activate && pytest -v

# Backend — lint
ruff check app/ tests/ seed.py && black --check app/ tests/ seed.py

# Frontend — lint & type check
cd frontend && npm run lint && npm run build
```

## Verifikasi manual di browser

Beberapa script Playwright di `frontend/scripts/` yang drive browser Edge
sungguhan dan cek console error. Jalankan setelah backend + frontend dev
server hidup:

```bash
cd frontend
node scripts/verify-browser.mjs          # register -> editor -> publish -> RSVP -> buku tamu -> export CSV
node scripts/verify-browser-2.mjs        # loop submit RSVP/ucapan dari halaman publik + cek XSS ter-sanitasi
node scripts/verify-templates.mjs        # screenshot ke-4 template undangan (klasik/modern-minimal/botanical/monokrom)
node scripts/verify-error-messages.mjs   # cek pesan error backend tidak bocor mentah berbahasa Inggris
```

Untuk verifikasi ke **staging/domain sungguhan** (bukan localhost — wajib
setelah tiap deploy, lihat § Deploy ke staging): `verify-staging*.mjs` dan
`verify-domain-*.mjs` (butuh argumen email/slug akun test, lihat isi filenya).

Screenshot hasilnya masuk ke `frontend/verify-screenshots/` (di-gitignore).

## Audit kontras WCAG AA

`frontend/scripts/audit-contrast.mjs` menghitung rasio kontras sungguhan
(relative luminance, bukan kira-kira mata) untuk semua kombinasi warna yang
dipakai — token sistem, komponen (Button/Badge), dan tiap template undangan.
Jalankan ulang setiap kali menambah/mengubah warna:

```bash
cd frontend && node scripts/audit-contrast.mjs
```

## Deploy ke staging

Image di-build lokal (server staging resource-nya kecil & dipakai bareng
Odoo produksi klien lain), lalu ditransfer — bukan build dari source di
server.

```bash
# 1. Build image lokal
cd backend && docker build -t wedding-saas-backend:latest .
cd ../frontend && docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://demo.ecodigitus.com \
  --build-arg NEXT_PUBLIC_SITE_URL=https://demo.ecodigitus.com \
  -t wedding-saas-frontend:latest .
```

**Penting:** `NEXT_PUBLIC_API_URL` WAJIB di-set ke alamat backend yang bisa
diakses dari browser tamu — nilai ini di-inline ke bundle JS saat build
(`next build`), tidak bisa diubah lagi lewat env var container saat runtime.

- **Pakai `https://demo.ecodigitus.com`** (domain, bukan IP:port langsung) —
  sejak domain+HTTPS live (Log Perubahan v8), ini yang benar. Backend juga
  diakses lewat domain yang sama (routing path-based di Nginx Proxy Manager
  server utama, lihat Bagian 8), bukan `15.232.71.64:8000` langsung —
  memanggil IP:port HTTP langsung dari halaman HTTPS akan diblokir browser
  sebagai *mixed content*.
- Kalau build-arg ini lupa diisi sama sekali, Next.js memperlakukan ARG yang
  kosong sebagai *string kosong* (bukan "tidak di-set"), jadi tidak jatuh ke
  fallback `http://localhost:8000` di kode — semua fetch dari frontend malah
  nyasar ke path relatif di origin frontend sendiri, gagal dengan pesan
  generik yang membingungkan. Ini nyata pernah terjadi di staging (lihat
  `task.v2.md` Log Perubahan v5) — makanya WAJIB dicek tiap kali rebuild.
- Backend juga perlu `CORS_ORIGINS` di `backend.env` (Lightsail) memasukkan
  origin domain yang dipakai (`https://demo.ecodigitus.com`) — kalau tidak,
  request browser ke backend akan ditolak CORS meski build-arg di atas sudah
  benar.
- **`CORS_ORIGINS` HANYA domain, JANGAN tambahkan `http://15.232.71.64:3000`**
  (keputusan v1.13, `PRD.v2.md` Bagian 24) — sebelumnya IP itu ikut
  di-whitelist supaya dashboard bisa diakses langsung untuk debug, tapi itu
  yang membuat bug nyata mungkin terjadi: link/QR yang dibagikan ke tamu
  (dibangun dari `window.location.origin`, lihat `lib/site.ts`) ikut berisi
  IP kalau owner kebetulan membuka dashboard dari situ. `NEXT_PUBLIC_SITE_URL`
  (build-arg baru, wajib diisi domain juga) jadi lapis pertahanan kedua, tapi
  jangan buka lagi jalur IP-nya di CORS.
- `NEXT_PUBLIC_SITE_URL` WAJIB diisi domain juga (`https://demo.ecodigitus.com`)
  — dipakai `lib/site.ts` untuk membangun link/QR yang dibagikan ke tamu
  (Copy link personal, Cara Sambungkan RG-07). Beda dari `NEXT_PUBLIC_API_URL`:
  ini bukan alamat yang dipanggil, tapi domain kanonik yang HARUS muncul di
  link tercetak — kalau kosong, jatuh ke `window.location.origin` (ikut host
  yang sedang diakses, bisa jadi IP kalau dashboard dibuka dari situ).
- **Verifikasi `BUILD_ID` cocok sebelum `docker save`** — pernah ketemu kasus
  `docker images` menunjukkan tag `:latest` "sudah berubah" padahal itu
  snapshot sementara di tengah proses BuildKit (attestation/SBOM), bukan hasil
  build final. Cek: `docker create --name c <image> && docker cp
  c:/app/.next/BUILD_ID . && docker rm c`, bandingkan dengan yang sedang
  jalan di server (`docker exec wedding-saas-frontend-1 cat
  /app/.next/BUILD_ID`) — kalau beda, image yang mau di-deploy bukan build
  yang dimaksud.

```bash
# 2. Transfer ke server (image sudah di-build, bukan source code)
docker save wedding-saas-backend:latest -o backend.tar
docker save wedding-saas-frontend:latest -o frontend.tar
scp backend.tar frontend.tar ubuntu@15.232.71.64:/tmp/

# 3. Load & jalankan di server
ssh ubuntu@15.232.71.64 "docker load -i /tmp/backend.tar && docker load -i /tmp/frontend.tar && rm /tmp/*.tar"
ssh ubuntu@15.232.71.64 "cd /opt/wedding-saas && docker compose -f docker-compose.prod.yml up -d --no-deps backend frontend"

# 4. Migrasi (kalau ada perubahan schema)
ssh ubuntu@15.232.71.64 "docker exec wedding-saas-backend-1 alembic upgrade head"

# 5. Verifikasi — WAJIB lewat browser sungguhan ke alamat staging (bukan
#    curl atau localhost), karena bug build-arg di atas cuma kelihatan saat
#    JS jalan di browser tamu, bukan dari smoke test curl biasa.
```

## Struktur proyek

```
backend/     FastAPI app, model, migration, test
frontend/    Next.js app (dashboard + editor + halaman publik)
docker-compose.yml   Postgres + Redis untuk dev lokal
PRD.v2.md, task.v2.md, styleguide.v2.md   dokumen produk (revisi pasca crosscheck)
```

## Yang belum masuk Fase 1

Payment, custom domain, Smart WhatsApp broadcast, QR Check-in, Wedding
Planner, dan program Mitra masuk Fase 2+ — lihat roadmap di `PRD.v2.md`
Bagian 9. `task.v2.md` punya catatan keamanan forward-looking (verifikasi
signature webhook untuk Fase 2, storage privat untuk Fase 3) yang perlu
dibawa saat `task.md` fase-fase itu dibuat.

**Mode Registrasi-Saja** (RG-01 s/d RG-07) — menyambungkan sistem registrasi &
QR check-in kita ke undangan yang sudah dibuat di luar platform (vendor lain
/ undangan cetak), lewat halaman baru `/r/{slug}`. Sudah diimplementasi &
live di `https://demo.ecodigitus.com`, termasuk axe-core 0 pelanggaran di
semua 7 palet template, dan QR check-in hasil auto-enroll dikonfirmasi
benar-benar bisa di-scan (bukan cuma tampil di layar). Requirement di
`PRD.v2.md` Bagian 3, 19–22; breakdown & log implementasi di `task.v2.md`
Bagian 11 + Log Perubahan v22→v25. Harga: 3 paket per-acara yang sama
(Intimate/Celebration/Grand),
tanpa SKU baru — dikonfirmasi pemilik produk.
