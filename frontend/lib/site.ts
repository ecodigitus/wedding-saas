// `window.location.origin` sengaja TIDAK dipakai langsung untuk membangun
// link/QR yang dibagikan ke tamu (link personal Kelola Tamu, link registrasi
// RG-06/RG-07) — origin itu ikut host yang SEDANG diakses saat itu. Kalau
// dashboard dibuka lewat IP server (mis. http://15.232.71.64:3000, yang masih
// diizinkan CORS_ORIGINS staging untuk akses langsung/debug), link & QR yang
// dihasilkan akan berisi IP itu, bukan domain — link ini sering dicetak di
// undangan kertas atau dibagikan permanen, jadi salah origin di sini jauh
// lebih parah daripada salah origin transient lainnya.
//
// `NEXT_PUBLIC_SITE_URL` di-inline ke bundle saat build (sama pola dengan
// `NEXT_PUBLIC_API_URL` di lib/api.ts) — di produksi selalu diisi domain
// kanonik (`https://demo.ecodigitus.com`), jadi link/QR selalu benar
// terlepas dari host mana yang dipakai untuk mengakses dashboard. Fallback
// ke `window.location.origin` hanya relevan di dev lokal (tidak ada domain
// kanonik untuk dibandingkan).
export function getSiteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");
}
