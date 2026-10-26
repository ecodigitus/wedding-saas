// Audit kontras WCAG AA — hitung rasio kontras sungguhan (relative luminance)
// untuk semua pasangan warna yang benar-benar dipakai di app, bukan estimasi visual.

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function relLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(hex1, hex2) {
  const l1 = relLuminance(hexToRgb(hex1));
  const l2 = relLuminance(hexToRgb(hex2));
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Blend warna dengan alpha di atas background tertentu — mensimulasikan bg-x/10 dkk. */
function blend(fgHex, alpha, bgHex) {
  const fg = hexToRgb(fgHex);
  const bg = hexToRgb(bgHex);
  const mix = (a, b) => Math.round(a * alpha + b * (1 - alpha));
  const r = mix(fg.r, bg.r).toString(16).padStart(2, "0");
  const g = mix(fg.g, bg.g).toString(16).padStart(2, "0");
  const b = mix(fg.b, bg.b).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

const AA_NORMAL = 4.5;
const AA_LARGE = 3.0;

const checks = [];
function check(label, fg, bg, threshold = AA_NORMAL) {
  const ratio = contrastRatio(fg, bg);
  checks.push({ label, fg, bg, ratio, threshold, pass: ratio >= threshold });
}

// ---- Token sistem (styleguide.v2 §2.1) ----
const T = {
  primary: "#7A5C61",
  primaryDark: "#5C4348",
  secondary: "#D9C4A3",
  background: "#FBF8F5",
  surface: "#FFFFFF",
  border: "#E8E0D8",
  textPrimary: "#2E2325",
  textSecondary: "#6B5D5F",
  success: "#487259",
  danger: "#AC5156",
  warning: "#836430",
};

check("Body text (text-primary) / background", T.textPrimary, T.background);
check("Body text (text-primary) / surface (card)", T.textPrimary, T.surface);
check("Secondary text (text-secondary) / background", T.textSecondary, T.background);
check("Secondary text (text-secondary) / surface", T.textSecondary, T.surface);
check("Primary brand text (mis. heading accent) / background", T.primary, T.background, AA_LARGE);
check("Primary-dark text (nav aktif, heading) / background", T.primaryDark, T.background);
check("Danger text / surface", T.danger, T.surface);
check("Success text / surface", T.success, T.surface);
check("Warning text / surface", T.warning, T.surface);

// ---- Komponen: Button (components/ui.tsx) ----
check("Button primary: teks putih / bg-primary", "#FFFFFF", T.primary);
check("Button danger: teks putih / bg-danger", "#FFFFFF", T.danger);
check("Button secondary: text-primary(token) / bg-surface", T.textPrimary, T.surface);
check("Button ghost: text-primary(brand) / bg-background", T.primary, T.background, AA_LARGE);

// ---- StatusBadge (bg-success/10, bg-danger/10 di atas surface putih) ----
check("Badge Hadir: text-success / bg-success 10% di atas surface", T.success, blend(T.success, 0.1, T.surface));
check("Badge Tidak Hadir: text-danger / bg-danger 10% di atas surface", T.danger, blend(T.danger, 0.1, T.surface));
// "menunggu" ditambah Fase 2 (Kelola Tamu, UW-08) — badge bg-border solid, bukan tint alpha.
check("Badge Menunggu: text-secondary / bg-border (solid)", T.textSecondary, T.border);

// ---- Kelola Tamu & QR Check-in (Fase 2/3, components/ui.tsx & app/dashboard) ----
check("Kolom Check-in: text-success (checkmark+jam) / bg-surface (baris tabel)", T.success, T.surface);
check("Link ikon (Copy link / Lihat QR): text-primary-dark / bg-surface", T.primaryDark, T.surface);
check("Ikon sekunder (Hapus, belum di-hover): text-secondary / bg-surface", T.textSecondary, T.surface);

// ---- Billing page (Fase 2) ----
check("Perk list checkmark: text-success / bg-surface (Card)", T.success, T.surface);
check("Harga premium (angka besar): text-primary(default) / bg-surface", T.textPrimary, T.surface);

// ---- Dashboard nav active link (bg-primary/10 text-primary-dark) ----
check("Nav aktif: text-primary-dark / bg-primary 10% di atas surface", T.primaryDark, blend(T.primary, 0.1, T.surface));

// ---- Template undangan publik (InvitationView.tsx) ----
const templates = {
  klasik: { bg: "#FBF8F5", text: "#2E2325", accent: "#7A5C61", muted: "#6B5D5F" },
  "modern-minimal": { bg: "#FFFFFF", text: "#171717", accent: "#171717", muted: "#525252" },
  botanical: { bg: "#F3F5EE", text: "#2F3B2A", accent: "#577446", muted: "#5B6B52" },
  monokrom: { bg: "#1C1C1C", text: "#F1EDE4", accent: "#C9A46A", muted: "#B8AFA0" },
  editorial: { bg: "#F5F1EA", text: "#2B2118", accent: "#A3441F", muted: "#6E5D4D" },
  monogram: { bg: "#FBF3F4", text: "#3A2530", accent: "#7C2D42", muted: "#7D5D65" },
  "taman-manis": { bg: "#F7F1F5", text: "#4A3244", accent: "#A83768", muted: "#795D71" },
  "burgundy-royal": { bg: "#4A0F1F", text: "#F8EFE2", accent: "#E6CBA0", muted: "#DDBFB0" },
};

for (const [name, c] of Object.entries(templates)) {
  check(`[${name}] body text / bg`, c.text, c.bg);
  check(`[${name}] accent (nama mempelai, heading besar) / bg`, c.accent, c.bg, AA_LARGE);
  check(`[${name}] accent dipakai teks kecil (link "Buka di Maps") / bg`, c.accent, c.bg, AA_NORMAL);
  check(`[${name}] muted label (AKAD/LOKASI/dll) / bg`, c.muted, c.bg);
}

// ---- Editorial: pill "Undangan Pernikahan" (teks putih di atas accent solid) ----
check("[editorial] pill eyebrow: teks putih / bg accent solid (#A3441F)", "#FFFFFF", templates.editorial.accent);

// ---- Taman Manis: ScallopHeader (teks plum solid di atas pink pastel) ----
check("[taman-manis] header eyebrow: teks #7A3049 / bg header pastel (#F3C6D3)", "#7A3049", "#F3C6D3");

// ---- Print laporan ----
let failCount = 0;
for (const c of checks) {
  const status = c.pass ? "PASS" : "FAIL";
  if (!c.pass) failCount++;
  console.log(
    `[${status}] ${c.label} — ${c.fg} vs ${c.bg} = ${c.ratio.toFixed(2)}:1 (butuh ${c.threshold}:1)`
  );
}
console.log(`\n${checks.length} pengecekan, ${failCount} gagal.`);

// ---- Cari kandidat warna pengganti yang lolos, tetap satu keluarga hue ----
function darken(hex, factor) {
  const { r, g, b } = hexToRgb(hex);
  const d = (c) => Math.round(c * factor).toString(16).padStart(2, "0");
  return `#${d(r)}${d(g)}${d(b)}`;
}

function findPassingShade(baseHex, label) {
  for (let factor = 1.0; factor >= 0.3; factor -= 0.05) {
    const candidate = darken(baseHex, factor);
    const onWhite = contrastRatio(candidate, "#FFFFFF");
    const onOwnTintBadge = contrastRatio(candidate, blend(candidate, 0.1, "#FFFFFF"));
    if (onWhite >= AA_NORMAL && onOwnTintBadge >= AA_NORMAL) {
      console.log(
        `${label}: ${baseHex} -> ${candidate} (factor ${factor.toFixed(2)}) | on white: ${onWhite.toFixed(2)}:1, on badge-tint: ${onOwnTintBadge.toFixed(2)}:1`
      );
      return candidate;
    }
  }
  console.log(`${label}: tidak ketemu kandidat yang lolos di rentang factor ini`);
  return null;
}

console.log("\n=== Kandidat warna pengganti ===");
findPassingShade(T.success, "success");
findPassingShade(T.warning, "warning");
findPassingShade(T.danger, "danger (cek badge)");
findPassingShade(templates.botanical.accent, "botanical accent");
