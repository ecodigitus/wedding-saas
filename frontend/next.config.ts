import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output minimal (cuma file yang dibutuhkan runtime) — penting untuk image
  // Docker yang kecil, krusial di server staging dengan disk terbatas.
  output: "standalone",
  // OWASP A05 — jangan umumkan framework & versi lewat header `x-powered-by`.
  poweredByHeader: false,
  // Dev server Next.js menolak cross-origin request ke asset dev secara
  // default — tanpa ini, JS gagal load lewat tunnel (ngrok dkk) dan form
  // jatuh ke native HTML submit (GET + query string, bukan lewat API kita).
  allowedDevOrigins: [
    "*.ngrok-free.dev",
    "*.ngrok-free.app",
    "*.ngrok.io",
    "*.ngrok.app",
  ],
  // OWASP A05 (Security Misconfiguration) — ditemukan saat security review,
  // sebelumnya tidak ada satu pun header ini. Bukan CSP penuh — itu butuh
  // allowlist hati-hati (embed Google Maps, font self-host) + testing
  // ekstensif, dicatat sebagai rekomendasi terpisah, bukan dipasang sekarang.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // HSTS — domain ini selalu HTTPS (Cloudflare + NPM); tanpa
          // includeSubDomains/preload karena subdomain lain milik aplikasi lain.
          // Browser mengabaikan header ini di http://localhost.
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
        ],
      },
    ];
  },
};

export default nextConfig;
