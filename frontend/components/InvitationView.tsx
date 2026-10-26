import { ExternalLink, Flower2 } from "lucide-react";
import { LazyMapEmbed } from "./LazyMapEmbed";
import { GiftInfoSection, type GiftAccount } from "./GiftInfoSection";
import { CountdownTimer } from "./CountdownTimer";
import { MusicPlayer } from "./MusicPlayer";
import { ScrollReveal } from "./ScrollReveal";
import { RoyalInvitation } from "./RoyalInvitation";
import { RoyalAssetInvitation } from "./RoyalAssetInvitation";

// Presentational — dipakai di preview editor (client) DAN halaman publik
// /[slug] (server), agar keduanya konsisten persis. Warna/font/dekorasi di
// sini mengikuti TEMPLATE yang dipilih user, bukan token sistem (styleguide.v2 §5.6).

type InvitationData = {
  partner1_name: string;
  partner2_name: string;
  partner1_parents?: string | null;
  partner2_parents?: string | null;
  partner1_instagram?: string | null;
  partner2_instagram?: string | null;
  event_date: string;
  waktu_akad: string | null;
  waktu_resepsi: string | null;
  lokasi: string;
  maps_url: string | null;
  dress_code: string | null;
  template_id: string;
  // Amplop Digital (UW-09, Premium) — opsional, section "Kirim Hadiah" cuma
  // tampil kalau minimal satu field terisi (lihat hasGiftInfo di bawah).
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_holder?: string | null;
  ewallet_name?: string | null;
  ewallet_number?: string | null;
  ewallet_account_holder?: string | null;
  // UW-11 (Premium) — sama pola: opsional, section cuma tampil kalau terisi.
  music_url?: string | null;
  gallery_urls?: string[] | null;
  show_countdown?: boolean;
  // Gambar desain khusus (template Burgundy Royal bergambar) — peta slot -> URL.
  theme_assets?: Record<string, string> | null;
};

export type TemplateTheme = {
  bg: string;
  text: string;
  accent: string;
  /** Label kecil (AKAD, LOKASI, dll) — warna solid, bukan opacity, supaya kontrasnya terjamin di semua background. */
  muted: string;
  font: string;
  align: "center" | "left";
  mode: "light" | "dark";
};

export const TEMPLATE_THEME: Record<string, TemplateTheme> = {
  klasik: {
    bg: "bg-[#FBF8F5]",
    text: "text-[#2E2325]",
    accent: "text-[#7A5C61]",
    muted: "text-[#6B5D5F]",
    font: "font-serif",
    align: "center",
    mode: "light",
  },
  "modern-minimal": {
    bg: "bg-white",
    text: "text-[#171717]",
    accent: "text-[#171717]",
    muted: "text-[#525252]",
    font: "font-sans",
    align: "left",
    mode: "light",
  },
  botanical: {
    bg: "bg-[#F3F5EE]",
    text: "text-[#2F3B2A]",
    accent: "text-[#577446]",
    muted: "text-[#5B6B52]",
    font: "font-serif",
    align: "center",
    mode: "light",
  },
  monokrom: {
    bg: "bg-[#1C1C1C]",
    text: "text-[#F1EDE4]",
    accent: "text-[#C9A46A]",
    muted: "text-[#B8AFA0]",
    font: "font-serif",
    align: "center",
    mode: "dark",
  },
  editorial: {
    bg: "bg-[#F5F1EA]",
    text: "text-[#2B2118]",
    accent: "text-[#A3441F]",
    muted: "text-[#6E5D4D]",
    font: "font-sans",
    align: "left",
    mode: "light",
  },
  monogram: {
    bg: "bg-[#FBF3F4]",
    text: "text-[#3A2530]",
    accent: "text-[#7C2D42]",
    muted: "text-[#7D5D65]",
    font: "font-serif",
    align: "center",
    mode: "light",
  },
  "taman-manis": {
    bg: "bg-[#F7F1F5]",
    text: "text-[#4A3244]",
    accent: "text-[#A83768]",
    muted: "text-[#795D71]",
    font: "font-serif",
    align: "center",
    mode: "light",
  },
  // Terinspirasi desain Canva "Cream Photographic Wedding" — marun pekat,
  // krem & emas, tulisan script. Foto di desain asli tidak ikut (aset klien).
  "burgundy-royal": {
    bg: "bg-[#4A0F1F]",
    text: "text-[#F8EFE2]",
    accent: "text-[#E6CBA0]",
    muted: "text-[#DDBFB0]",
    font: "font-serif",
    align: "center",
    mode: "dark",
  },
};

export function resolveTemplateTheme(templateId: string): TemplateTheme {
  return TEMPLATE_THEME[templateId] ?? TEMPLATE_THEME.klasik;
}

// Diexport untuk dipakai ulang di header ringkas halaman registrasi-saja
// (app/r/[slug]/page.tsx, RG-02) — sama-sama butuh format tanggal Indonesia
// tanpa perlu duplikasi logic.
export function formatDate(dateStr: string) {
  if (!dateStr) return "Tanggal belum diisi";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return "Tanggal belum diisi";
  return parsed.toLocaleDateString("id-ID", { dateStyle: "full" });
}

// Defense-in-depth (OWASP A03) — backend sudah menolak skema selain
// http/https saat simpan (schemas/event.py), tapi jangan andalkan itu saja
// buat data yang mungkin tersimpan sebelum validasi itu ada.
function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${parsed.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`;
}

function isVideoUrl(url: string): boolean {
  try {
    return /\.(mp4|webm|mov|m4v)$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

/** Target countdown (UW-11) — waktu akad/resepsi paling awal kalau ada
 * salah satunya diisi, kalau tidak jatuh ke tengah malam tanggal acara. */
function resolveCountdownTarget(
  eventDate: string,
  waktuAkad: string | null,
  waktuResepsi: string | null
): string | null {
  const candidates = [waktuAkad, waktuResepsi].filter((v): v is string => Boolean(v)).sort();
  if (candidates.length > 0) return candidates[0];
  return eventDate ? `${eventDate}T00:00:00` : null;
}

/** Divider dekoratif antar-section — beda gaya per template, bukan sekadar garis generik. */
function SectionDivider({ templateId, theme }: { templateId: string; theme: TemplateTheme }) {
  if (templateId === "klasik") {
    return (
      <div className="flex items-center justify-center gap-3" aria-hidden="true">
        <span className={`h-px w-12 bg-current opacity-40 ${theme.accent}`} />
        <span className={`h-2 w-2 rotate-45 border border-current ${theme.accent}`} />
        <span className={`h-px w-12 bg-current opacity-40 ${theme.accent}`} />
      </div>
    );
  }
  if (templateId === "modern-minimal") {
    return <div className="h-px w-10 bg-current" aria-hidden="true" />;
  }
  if (templateId === "monokrom") {
    return <div className={`mx-auto h-px w-16 bg-current ${theme.accent}`} aria-hidden="true" />;
  }
  if (templateId === "editorial") {
    return <span className={`block h-1.5 w-16 bg-current ${theme.accent}`} aria-hidden="true" />;
  }
  if (templateId === "monogram") {
    return (
      <div className="flex items-center justify-center gap-3" aria-hidden="true">
        <span className={`h-px w-10 bg-current opacity-40 ${theme.accent}`} />
        <span className={`h-2.5 w-2.5 rounded-full border-2 border-current ${theme.accent}`} />
        <span className={`h-px w-10 bg-current opacity-40 ${theme.accent}`} />
      </div>
    );
  }
  if (templateId === "taman-manis") {
    return (
      <div className="flex items-center justify-center gap-2" aria-hidden="true">
        <span className={`h-px w-10 rounded-full bg-current opacity-40 ${theme.accent}`} />
        <span className={`text-base ${theme.accent}`}>❀</span>
        <span className={`h-px w-10 rounded-full bg-current opacity-40 ${theme.accent}`} />
      </div>
    );
  }
  // botanical
  return (
    <div className="flex items-center justify-center gap-2" aria-hidden="true">
      <span className={`text-lg ${theme.accent}`}>﹒</span>
      <span className={`h-px w-16 bg-current opacity-50 ${theme.accent}`} />
      <span className={`text-lg ${theme.accent}`}>﹒</span>
    </div>
  );
}

/** Bingkai sudut ornamental (4 siku terpisah) — khusus template monogram,
 * beda tekstur dari bingkai garis utuh klasik/monokrom. */
function CornerBrackets({ theme }: { theme: TemplateTheme }) {
  const base = `pointer-events-none absolute h-6 w-6 border-current opacity-60 ${theme.accent}`;
  return (
    <div className="pointer-events-none absolute inset-3" aria-hidden="true">
      <div className={`${base} left-0 top-0 border-l-2 border-t-2`} />
      <div className={`${base} right-0 top-0 border-r-2 border-t-2`} />
      <div className={`${base} bottom-0 left-0 border-b-2 border-l-2`} />
      <div className={`${base} bottom-0 right-0 border-b-2 border-r-2`} />
    </div>
  );
}

/** Lambang inisial mempelai — khusus template monogram. */
function MonogramBadge({ name1, name2, theme }: { name1: string; name2: string; theme: TemplateTheme }) {
  const initial1 = name1.trim().charAt(0).toUpperCase() || "?";
  const initial2 = name2.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className={`mb-5 flex h-16 w-16 items-center justify-center rounded-full border-2 border-current font-serif text-lg ${theme.accent}`}
      aria-hidden="true"
    >
      {initial1}&amp;{initial2}
    </div>
  );
}

/** Header dekoratif pastel dengan tepi bergerigi (scallop) — pengganti foto
 * hero pasangan (belum ada fitur upload foto cover di produk ini), khusus
 * template taman-manis. Tepi bergerigi dibuat lewat baris lingkaran warna
 * background halaman yang "memotong" tepi bawah blok warna solid — bukan
 * mask-image CSS (kompatibilitas browser lebih luas). */
function ScallopHeader() {
  const dots = Array.from({ length: 14 });
  return (
    <div className="relative w-full" aria-hidden="true">
      <div className="flex h-32 w-full flex-col items-center justify-center gap-2 bg-[#F3C6D3]">
        <Flower2 size={26} className="text-[#7A3049]" />
        <span className="text-xs font-semibold uppercase tracking-widest text-[#7A3049]">
          Undangan Pernikahan
        </span>
      </div>
      <div className="flex">
        {dots.map((_, i) => (
          <span
            key={i}
            className="-mt-2 h-4 w-4 flex-shrink-0 rounded-full bg-[#F7F1F5]"
            style={{ marginLeft: i === 0 ? 0 : "-4px" }}
          />
        ))}
      </div>
    </div>
  );
}

/** Bentuk organik dekoratif di belakang hero — cuma untuk template botanical. */
function BotanicalBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -left-10 -top-10 h-40 w-40 rounded-[40%] bg-[#5C7A4A]/10" />
      <div className="absolute -right-12 top-24 h-32 w-32 rounded-[45%] bg-[#5C7A4A]/10" />
    </div>
  );
}

/** Partikel kerlip mengambang di sekitar hero — terinspirasi cover Katsudoto
 * (lihat task.v2.md Log Perubahan v19→v20). CSS murni (`@keyframes` di
 * globals.css, kelas `.sparkle-particle`), bukan JS — jadi tidak butuh
 * hydration/effect apa pun, dan `prefers-reduced-motion` dihormati langsung
 * lewat media query CSS (animasi dimatikan, tetap terlihat diam). Berlaku di
 * semua template — posisi tetap disesuaikan tipis (kiri sedikit, bukan
 * bertumpuk pas di atas nama) supaya tidak menabrak bingkai/badge tiap
 * template (corner brackets, scallop header, dst). */
function SparkleParticles({ theme }: { theme: TemplateTheme }) {
  const sparkles = [
    { top: "6%", left: "8%", delay: "0s", size: "0.75rem" },
    { top: "14%", right: "10%", delay: "0.7s", size: "1rem" },
    { top: "34%", left: "4%", delay: "1.4s", size: "0.6rem" },
    { top: "40%", right: "6%", delay: "0.3s", size: "0.7rem" },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {sparkles.map((s, i) => (
        <span
          key={i}
          className={`sparkle-particle absolute ${theme.accent}`}
          style={{ top: s.top, left: s.left, right: s.right, fontSize: s.size, animationDelay: s.delay }}
        >
          ✦
        </span>
      ))}
    </div>
  );
}

// Amplop Digital (UW-09) — cuma tampil kalau minimal satu akun benar-benar
// terisi (owner boleh isi salah satu saja, bank ATAU e-wallet). Diexport
// (bukan cuma inline di InvitationView) supaya halaman registrasi-saja
// (app/r/[slug]/page.tsx, RG-02) bisa menampilkan section yang sama tanpa
// duplikasi logic — Amplop Digital tetap relevan di mode itu.
export function buildGiftAccounts(data: {
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_holder?: string | null;
  ewallet_name?: string | null;
  ewallet_number?: string | null;
  ewallet_account_holder?: string | null;
}): GiftAccount[] {
  return [
    data.bank_name || data.bank_account_number
      ? {
          label: data.bank_name || "Rekening Bank",
          accountName: data.bank_name,
          accountNumber: data.bank_account_number,
          accountHolder: data.bank_account_holder,
        }
      : null,
    data.ewallet_name || data.ewallet_number
      ? {
          label: data.ewallet_name || "E-Wallet",
          accountName: data.ewallet_name,
          accountNumber: data.ewallet_number,
          accountHolder: data.ewallet_account_holder,
        }
      : null,
  ].filter((a): a is NonNullable<typeof a> => a !== null);
}

export function InvitationView({ data, rsvpSlot }: { data: InvitationData; rsvpSlot?: React.ReactNode }) {
  const theme = resolveTemplateTheme(data.template_id);
  const mapsEmbedSrc = data.lokasi
    ? `https://www.google.com/maps?q=${encodeURIComponent(data.lokasi)}&output=embed`
    : null;
  const akadLabel = formatTime(data.waktu_akad);
  const resepsiLabel = formatTime(data.waktu_resepsi);
  const isLeft = theme.align === "left";
  const alignClass = isLeft ? "text-left items-start" : "text-center items-center";

  const giftAccounts = buildGiftAccounts(data);

  // UW-11 (Premium) — galeri & musik lewat URL eksternal (defense-in-depth,
  // sama seperti maps_url: backend sudah validasi skema saat simpan, tapi
  // jangan andalkan itu saja untuk data yang mungkin tersimpan sebelumnya).
  const galleryUrls = (data.gallery_urls ?? []).filter(isSafeHttpUrl);
  const musicUrl = data.music_url && isSafeHttpUrl(data.music_url) ? data.music_url : null;
  const countdownTarget = data.show_countdown
    ? resolveCountdownTarget(data.event_date, data.waktu_akad, data.waktu_resepsi)
    : null;

  const displayName1 = data.partner1_name || "Nama Mempelai 1";
  const displayName2 = data.partner2_name || "Nama Mempelai 2";
  // Burgundy Royal punya struktur panel penuh sendiri (meniru desain Canva),
  // jadi dirender komponen terpisah — bukan cabang di dalam layout bersama ini.
  if (data.template_id === "burgundy-royal" && data.theme_assets?.hero_bg) {
    const safeAssets = Object.fromEntries(
      Object.entries(data.theme_assets).filter(([, url]) => isSafeHttpUrl(url))
    );
    return (
      <RoyalAssetInvitation
        assets={safeAssets}
        partner1={displayName1}
        partner2={displayName2}
        parents1={data.partner1_parents || null}
        parents2={data.partner2_parents || null}
        instagram1={data.partner1_instagram?.replace(/^@/, "") || null}
        instagram2={data.partner2_instagram?.replace(/^@/, "") || null}
        eventDate={data.event_date}
        mapsUrl={data.maps_url && isSafeHttpUrl(data.maps_url) ? data.maps_url : null}
        galleryUrls={galleryUrls}
        musicUrl={musicUrl}
        countdownTarget={countdownTarget}
        giftAccounts={giftAccounts}
        theme={theme}
        rsvpSlot={rsvpSlot}
      />
    );
  }
  if (data.template_id === "burgundy-royal") {
    return (
      <RoyalInvitation
        partner1={displayName1}
        partner2={displayName2}
        parents1={data.partner1_parents || null}
        parents2={data.partner2_parents || null}
        instagram1={data.partner1_instagram?.replace(/^@/, "") || null}
        instagram2={data.partner2_instagram?.replace(/^@/, "") || null}
        eventDate={data.event_date}
        akadLabel={akadLabel}
        resepsiLabel={resepsiLabel}
        lokasi={data.lokasi}
        mapsUrl={data.maps_url && isSafeHttpUrl(data.maps_url) ? data.maps_url : null}
        mapsEmbedSrc={mapsEmbedSrc}
        dressCode={data.dress_code}
        galleryUrls={galleryUrls}
        musicUrl={musicUrl}
        countdownTarget={countdownTarget}
        giftAccounts={giftAccounts}
        theme={theme}
      />
    );
  }

  const isEditorial = data.template_id === "editorial";
  const isTamanManis = data.template_id === "taman-manis";
  const isBigStackedName = data.template_id === "modern-minimal" || isEditorial;

  const infoRow = (label: string, value: string) =>
    isTamanManis ? (
      <div className="w-full rounded-2xl border border-current/10 px-4 py-3 text-center">
        <p className={`text-xs uppercase tracking-widest ${theme.muted}`}>{label}</p>
        <p className="mt-1 text-lg">{value}</p>
      </div>
    ) : (
      <div>
        <p className={`text-xs uppercase tracking-widest ${theme.muted}`}>{label}</p>
        <p className="text-lg">{value}</p>
      </div>
    );

  return (
    <div className={`relative mx-auto max-w-[480px] ${theme.bg} ${theme.text} ${theme.font}`}>
      {data.template_id === "botanical" && <BotanicalBlobs />}

      {/* Klasik: bingkai ornamental ganda mengelilingi seluruh kartu. */}
      {data.template_id === "klasik" && (
        <div className={`pointer-events-none absolute inset-3 border ${theme.accent} opacity-50`} />
      )}
      {data.template_id === "monokrom" && (
        <div className={`pointer-events-none absolute inset-4 border ${theme.accent} opacity-40`} />
      )}
      {data.template_id === "monogram" && <CornerBrackets theme={theme} />}
      {isTamanManis && <ScallopHeader />}
      <SparkleParticles theme={theme} />

      {musicUrl && (
        <div className="absolute right-4 top-4 z-10">
          <MusicPlayer src={musicUrl} theme={theme} />
        </div>
      )}

      <div className={`relative flex flex-col gap-10 px-7 py-16 ${alignClass}`}>
        <section className={`flex flex-col ${isLeft ? "items-start" : "items-center"}`}>
          {data.template_id === "monogram" && (
            <div className="hero-stage hero-stage-1">
              <MonogramBadge name1={displayName1} name2={displayName2} theme={theme} />
            </div>
          )}
          {isEditorial ? (
            <span className="hero-stage hero-stage-2 inline-block rounded-full bg-[#A3441F] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white">
              Undangan Pernikahan
            </span>
          ) : !isTamanManis ? (
            <p className={`hero-stage hero-stage-2 text-xs uppercase tracking-widest ${theme.muted}`}>
              Kami mengundang kamu ke pernikahan
            </p>
          ) : null}
          <h1
            className={`hero-stage hero-stage-3 mt-4 ${isBigStackedName ? "text-5xl font-extrabold tracking-tight" : isTamanManis ? "font-script text-6xl" : "text-4xl"} ${theme.accent}`}
          >
            {displayName1}
            {isBigStackedName ? (
              <span className="block">&amp; {displayName2}</span>
            ) : (
              <> &amp; {displayName2}</>
            )}
          </h1>
          <p className="hero-stage hero-stage-4 mt-4 text-base">{formatDate(data.event_date)}</p>
          <div className="hero-stage hero-stage-5 mt-6 w-full">
            <SectionDivider templateId={data.template_id} theme={theme} />
          </div>
          {countdownTarget && (
            <div
              className={`hero-stage hero-stage-6 mt-6 w-full ${isTamanManis ? "rounded-[2rem] bg-[#F3C6D3]/40 px-4 py-6" : ""}`}
            >
              <CountdownTimer targetIso={countdownTarget} theme={theme} />
            </div>
          )}
        </section>

        <ScrollReveal
          className={
            isEditorial
              ? "grid w-full grid-cols-2 gap-x-4 gap-y-5"
              : isTamanManis
                ? "flex w-full flex-col gap-3"
                : "flex w-full flex-col gap-4"
          }
        >
          {akadLabel && infoRow("Akad", akadLabel)}
          {resepsiLabel && infoRow("Resepsi", resepsiLabel)}
          <div
            className={
              isEditorial
                ? "col-span-2"
                : isTamanManis
                  ? "w-full rounded-2xl border border-current/10 px-4 py-3 text-center"
                  : undefined
            }
          >
            <p className={`text-xs uppercase tracking-widest ${theme.muted}`}>Lokasi</p>
            <p className="whitespace-pre-line text-lg">{data.lokasi || "Lokasi belum diisi"}</p>
            {data.maps_url && isSafeHttpUrl(data.maps_url) && (
              <a
                href={data.maps_url}
                target="_blank"
                rel="noreferrer"
                className={`mt-1 inline-flex items-center gap-1 text-sm underline ${theme.accent}`}
              >
                Buka di Google Maps
                <ExternalLink size={14} />
              </a>
            )}
          </div>
          {data.dress_code && infoRow("Dress Code", data.dress_code)}
        </ScrollReveal>

        {mapsEmbedSrc && (
          <ScrollReveal className="w-full">
            <LazyMapEmbed src={mapsEmbedSrc} theme={theme} />
          </ScrollReveal>
        )}

        {galleryUrls.length > 0 && (
          <ScrollReveal className="w-full">
            <h2 className={`mb-4 text-center text-lg ${theme.accent}`}>Galeri</h2>
            <div
              className={
                isTamanManis
                  ? "flex flex-wrap justify-center gap-4 px-2 py-2"
                  : "grid grid-cols-2 gap-2 sm:grid-cols-3"
              }
            >
              {galleryUrls.map((url, i) =>
                isVideoUrl(url) ? (
                  <video
                    key={url}
                    src={url}
                    controls
                    className={
                      isTamanManis
                        ? `aspect-square w-[45%] rounded-xl border-4 border-white object-cover shadow-md ${i % 2 === 0 ? "-rotate-2" : "rotate-2"}`
                        : "aspect-square w-full rounded-lg border border-current/10 object-cover"
                    }
                  >
                    <track kind="captions" />
                  </video>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- URL galeri dinamis dari owner (link eksternal), tidak bisa dikonfigurasi next/image remotePatterns.
                  <img
                    key={url}
                    src={url}
                    alt={`Galeri foto ${i + 1}`}
                    loading="lazy"
                    className={
                      isTamanManis
                        ? `aspect-square w-[45%] rounded-xl border-4 border-white object-cover shadow-md ${i % 2 === 0 ? "-rotate-2" : "rotate-2"}`
                        : "aspect-square w-full rounded-lg border border-current/10 object-cover"
                    }
                  />
                )
              )}
            </div>
          </ScrollReveal>
        )}

        {giftAccounts.length > 0 && (
          <ScrollReveal className={`flex w-full flex-col gap-4 ${isLeft ? "items-start" : "items-center"}`}>
            <h2 className={`text-lg ${theme.accent}`}>Kirim Hadiah</h2>
            <GiftInfoSection accounts={giftAccounts} theme={theme} />
          </ScrollReveal>
        )}
      </div>
    </div>
  );
}
