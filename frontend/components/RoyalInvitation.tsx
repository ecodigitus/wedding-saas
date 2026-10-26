import { ExternalLink } from "lucide-react";
import { LazyMapEmbed } from "./LazyMapEmbed";
import { GiftInfoSection, type GiftAccount } from "./GiftInfoSection";
import { CountdownTimer } from "./CountdownTimer";
import { MusicPlayer } from "./MusicPlayer";
import { RoyalSection } from "./RoyalSection";
import { CreamPlaque, Lily, LaceStrip, OrnateFrame, Polaroid, ScallopCard, Tassel, WaxSeal } from "./RoyalElements";
import type { TemplateTheme } from "./InvitationView";
import glyphData from "@/lib/greatVibesGlyphs.json";
import monogramData from "@/lib/alexBrushGlyphs.json";

// Template "Burgundy Royal" — dibangun meniru desain Canva "Cream Photographic
// Wedding Event Website": rangkaian panel penuh (hero foto berlapis marun →
// amplop bersegel → pasangan dalam bingkai emas → galeri bingkai emas → acara
// di atas krem → wedding gift). Foto/ilustrasi bawaan desain Canva TIDAK ikut
// (aset pihak lain/data klien); foto pasangan diambil dari gallery_urls milik
// owner, sedangkan elemen dekoratifnya (amplop, lili, bingkai emas, rumbai,
// kartu bertepi lengkung) digambar ulang di RoyalElements.tsx. Semua data
// murni dari field event yang sudah ada. Font mengikuti desain Canva (dibaca dari @font-face): Great Vibes
// untuk judul/monogram, Playfair Display untuk isi.

type Props = {
  partner1: string;
  partner2: string;
  parents1: string | null;
  parents2: string | null;
  instagram1: string | null;
  instagram2: string | null;
  eventDate: string;
  akadLabel: string | null;
  resepsiLabel: string | null;
  lokasi: string;
  mapsUrl: string | null;
  mapsEmbedSrc: string | null;
  dressCode: string | null;
  galleryUrls: string[];
  musicUrl: string | null;
  countdownTarget: string | null;
  giftAccounts: GiftAccount[];
  theme: TemplateTheme;
};

// Panel krem (bagian "Acara") butuh palet terang sendiri — komponen anak
// (countdown, peta) menerima TemplateTheme, jadi dibuat satu objek di sini.
export const CREAM_THEME: TemplateTheme = {
  bg: "bg-[#F4E9DA]",
  text: "text-[#4A0F1F]",
  accent: "text-[#7A1F33]",
  muted: "text-[#6B3A44]",
  font: "font-serif",
  align: "center",
  mode: "light",
};


function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dateParts(dateStr: string) {
  const d = parseDate(dateStr);
  if (!d) return null;
  // Tanggal-saja ("YYYY-MM-DD") di-parse sebagai UTC — format juga di UTC
  // supaya hari tidak bergeser di zona waktu lain.
  const tz = dateStr.length === 10 ? "UTC" : undefined;
  const fmt = (o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("id-ID", { ...o, timeZone: tz });
  const dd = fmt({ day: "2-digit" });
  const mm = fmt({ month: "2-digit" });
  const yy = fmt({ year: "2-digit" });
  return {
    short: `${dd}.${mm}.${yy}`,
    long: `${dd}.${mm}.${fmt({ year: "numeric" })}`,
    weekday: fmt({ weekday: "long" }),
    day: fmt({ day: "numeric" }),
    month: fmt({ month: "long" }),
    year: fmt({ year: "numeric" }),
  };
}

export function isVideoUrl(url: string): boolean {
  try {
    return /\.(mp4|webm|mov|m4v)$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

export function initialOf(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function Photo({ url, alt }: { url: string; alt: string }) {
  return isVideoUrl(url) ? (
    <video src={url} controls className="h-full w-full object-cover">
      <track kind="captions" />
    </video>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- URL dinamis dari owner (link eksternal), tidak bisa dikonfigurasi next/image remotePatterns.
    <img src={url} alt={alt} loading="lazy" className="h-full w-full object-cover" />
  );
}

/** Isi bingkai/polaroid saat belum ada foto: satin marun + inisial. */
function InitialPlate({ text }: { text: string }) {
  return (
    <div className="royal-satin flex h-full w-full items-center justify-center font-royal text-6xl text-[#E6CBA0]">
      {text}
    </div>
  );
}

export function InstagramHandle({ handle }: { handle: string }) {
  return (
    <p className="flex items-center justify-center gap-2 text-sm text-[#F8EFE2]">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
      </svg>
      <span>@{handle}</span>
    </p>
  );
}

type GlyphData = { upm: number; asc: number; desc: number; glyphs: Record<string, { a: number; d: string }> };
const GV = glyphData as GlyphData;
const AB = monogramData as GlyphData;
const PAD = 40; // ruang tambahan kiri-kanan (unit font) untuk ujung huruf miring/lengkung

/** Efek "tulis" (handwriting) seperti di situs Canva acuan: judul, huruf monogram
 * (A lalu B), dan tanggal ditulis berurutan — satu-satunya animasi di desain itu.
 *
 * Teks digambar dari outline asli font Great Vibes (lib/greatVibesGlyphs.json,
 * diekstrak dengan fonttools): garis tepi tiap huruf "ditulis" mengikuti
 * kontur lewat stroke-dashoffset, lalu isinya muncul — huruf demi huruf
 * berurutan seperti pena. Font tidak menyimpan garis tengah goresan, jadi
 * yang diikuti adalah kontur huruf. Teks asli tetap ada untuk pembaca layar. */
export function Write({
  as: Tag = "span",
  dur = "0.8s",
  delay = "0s",
  className = "",
  font = "title",
  children,
}: {
  as?: "span" | "p" | "h1" | "h2";
  dur?: string;
  delay?: string;
  className?: string;
  /** "title": Great Vibes (judul); "monogram": Alex Brush (huruf AB & nama penutup, mirip font monogram Canva). */
  font?: "title" | "monogram";
  children: React.ReactNode;
}) {
  const F = font === "monogram" ? AB : GV;
  const text = typeof children === "string" ? children : null;
  if (text === null) {
    return (
      <Tag className={`write-on ${className}`} style={{ "--dur": dur, "--delay": delay } as React.CSSProperties}>
        {children}
      </Tag>
    );
  }
  const durS = parseFloat(dur) || 0.8;
  const delayS = parseFloat(delay) || 0;
  const chars = Array.from(text);
  const drawn = chars.filter((c) => c !== " ");
  const n = Math.max(drawn.length, 1);
  // satu huruf: seluruh durasi; banyak huruf: tiap huruf 55% durasi, dimulai berurutan.
  const per = n === 1 ? durS : durS * 0.55;
  const step = n === 1 ? 0 : (durS - per) / (n - 1);
  let x = 0;
  let k = 0;
  const paths: { d: string; x: number; gd: number; gdelay: number }[] = [];
  for (const ch of chars) {
    const g = F.glyphs[ch] ?? F.glyphs["?"];
    if (ch !== " " && g?.d) {
      paths.push({ d: g.d, x, gd: per, gdelay: delayS + k * step });
      k += 1;
    }
    x += g?.a ?? F.upm * 0.25;
  }
  const w = x + PAD * 2;
  const h = F.asc - F.desc;
  return (
    <Tag
      className={`hw ${className}`}
      style={{ width: `${w / F.upm}em`, height: `${h / F.upm}em`, verticalAlign: `${F.desc / F.upm}em` }}
    >
      <span className="sr-only">{text}</span>
      <svg viewBox={`${-PAD} ${-F.asc} ${w} ${h}`} className="block h-full w-full overflow-visible" aria-hidden="true">
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            transform={`translate(${p.x} 0)`}
            pathLength={1}
            className="hw-glyph"
            style={{ "--gd": `${p.gd}s`, "--gdelay": `${p.gdelay}s` } as React.CSSProperties}
          />
        ))}
      </svg>
    </Tag>
  );
}

/** Panel pembuka antar-bagian ala desain Canva: judul script kecil, monogram
 * besar, tanggal ringkas — di atas foto berlapis marun (atau satin kalau belum
 * ada foto). Ditulis berurutan saat panel masuk layar. */
function Interlude({
  title,
  partner1,
  partner2,
  dateShort,
  photo,
}: {
  title: string;
  partner1: string;
  partner2: string;
  dateShort: string | null;
  photo?: string;
}) {
  return (
    <RoyalSection className="royal-satin relative flex min-h-[380px] items-center justify-center overflow-hidden">
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element -- URL dinamis dari owner (link eksternal).
        <img src={photo} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-[#6b1423]/70" aria-hidden="true" />
      <div className="relative flex flex-col items-center text-center text-[#F8EFE2]">
        <Write as="p" dur="0.7s" className="font-royal text-2xl">
          {title}
        </Write>
        <p className="my-1 font-royal text-[5.5rem] leading-none" aria-hidden="true">
          <Write font="monogram" dur="1s" delay="0.5s">
            {initialOf(partner1)}
          </Write>
          <Write font="monogram" dur="1.1s" delay="1.4s" className="-ml-2 translate-y-5">
            {initialOf(partner2)}
          </Write>
        </p>
        {dateShort && (
          <Write as="p" dur="0.7s" delay="2.5s" className="font-royal text-2xl">
            {dateShort}
          </Write>
        )}
      </div>
    </RoyalSection>
  );
}

/** Adegan amplop: polaroid, amplop marun terbuka dengan plakat krem yang naik,
 * segel lilin, renda, rumbai, dan bunga lili — di atas satin marun + krem. */
function EnvelopeScene({
  partner1,
  partner2,
  dateLong,
  photo,
}: {
  partner1: string;
  partner2: string;
  dateLong: string | null;
  photo?: string;
}) {
  return (
    <div className="relative mx-auto h-[440px] w-full max-w-[360px]" aria-hidden="true">
      <Polaroid className="absolute left-0 top-0 z-30 w-[46%] -rotate-6" >
        {photo ? <Photo url={photo} alt="" /> : <InitialPlate text={`${initialOf(partner1)}${initialOf(partner2)}`} />}
      </Polaroid>

      <div className="absolute inset-x-0 bottom-0 h-[250px]">
        <svg viewBox="0 0 320 250" className="absolute inset-0 z-0 h-full w-full overflow-visible">
          <polygon points="0,50 160,-40 320,50 320,250 0,250" fill="#4e0b19" />
        </svg>

        <CreamPlaque className="absolute left-[14%] right-[14%] top-[34px] z-10 h-[104px]">
          <span className="font-royal text-3xl">
            {partner1} &amp; {partner2}
          </span>
          {dateLong && (
            <span className="mt-1 text-base tracking-[0.2em]">
              {dateLong}
            </span>
          )}
        </CreamPlaque>

        <svg viewBox="0 0 320 250" className="absolute inset-0 z-20 h-full w-full drop-shadow-[0_10px_18px_rgba(0,0,0,0.55)]">
          <defs>
            <linearGradient id="royal-pocket" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#8a1c35" />
              <stop offset="1" stopColor="#5e0f20" />
            </linearGradient>
          </defs>
          <polygon points="0,80 160,172 320,80 320,250 0,250" fill="url(#royal-pocket)" />
          <polyline points="0,80 160,172 320,80" fill="none" stroke="#b9344f" strokeWidth="1.5" />
          <polyline points="0,250 120,150 M320,250 200,150" fill="none" stroke="#6e1427" strokeWidth="1" opacity="0.7" />
        </svg>
        <LaceStrip className="absolute inset-x-0 bottom-0 z-30 h-4" />
        {/* Seperti di Canva: segel di sudut kiri atas plakat, monogram script di depan amplop. */}
        <WaxSeal className="absolute left-[6%] top-[22px] z-30 h-14 w-14 text-lg">
          {initialOf(partner1)}
          {initialOf(partner2)}
        </WaxSeal>
        <p
          className="absolute left-1/2 top-[168px] z-30 -translate-x-1/2 font-royal text-4xl text-[#ecd2d2]"
          aria-hidden="true"
        >
          {initialOf(partner1)}
          {initialOf(partner2)}
        </p>
      </div>

      <Lily className="absolute -left-6 bottom-0 z-40 h-44 w-44 -rotate-6" />
      <Lily leaves={false} className="absolute -right-2 top-[120px] z-40 h-24 w-24 rotate-12" />
      <Tassel className="absolute bottom-[-24px] right-10 z-30 h-28 w-8" />
    </div>
  );
}

/** Dua kartu undangan bertepi lengkung dengan rumbai, saling tumpuk. */
function CardsScene({
  partner1,
  partner2,
  dateShort,
}: {
  partner1: string;
  partner2: string;
  dateShort: string | null;
}) {
  return (
    <div className="relative mx-auto h-[420px] w-full max-w-[360px]">
      <div className="absolute left-0 top-0 z-10 w-[58%] -rotate-3">
        <ScallopCard>
          <p className="text-[0.65rem] uppercase tracking-[0.25em]">Undangan</p>
          <p className="mt-2 font-royal text-4xl leading-none">{initialOf(partner1)}&amp;{initialOf(partner2)}</p>
          <p className="mt-3 text-xs leading-snug">
            Kepada Yth.
            <br />
            Bapak/Ibu/Saudara/i
          </p>
        </ScallopCard>
        <Tassel className="absolute -bottom-10 left-3 h-24 w-7" />
      </div>
      <div className="absolute bottom-0 right-0 z-20 w-[58%] rotate-3">
        <ScallopCard>
          <p className="font-royal text-3xl leading-tight">
            {partner1}
            <br />&amp; {partner2}
          </p>
          {dateShort && <p className="mt-3 text-sm tracking-[0.25em]">{dateShort}</p>}
        </ScallopCard>
        <Tassel className="absolute -top-8 right-4 h-24 w-7 rotate-180" />
      </div>
      <Lily className="pointer-events-none absolute bottom-6 left-0 z-30 h-28 w-28" />
    </div>
  );
}

function PersonCard({
  name,
  photo,
  parents,
  instagram,
}: {
  name: string;
  photo?: string;
  parents: string | null;
  instagram: string | null;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <OrnateFrame className="w-44">
        {photo ? <Photo url={photo} alt={name} /> : <InitialPlate text={initialOf(name)} />}
      </OrnateFrame>
      <p className="font-royal text-3xl text-[#F8EFE2]">{name}</p>
      {parents && (
        <p className="text-sm leading-snug text-[#DDBFB0]">
          Putra/Putri dari
          <br />
          <span className="text-[#F8EFE2]">{parents}</span>
        </p>
      )}
      {instagram && <InstagramHandle handle={instagram} />}
    </div>
  );
}

export function RoyalInvitation({
  partner1,
  partner2,
  parents1,
  parents2,
  instagram1,
  instagram2,
  eventDate,
  akadLabel,
  resepsiLabel,
  lokasi,
  mapsUrl,
  mapsEmbedSrc,
  dressCode,
  galleryUrls,
  musicUrl,
  countdownTarget,
  giftAccounts,
  theme,
}: Props) {
  const parts = dateParts(eventDate);
  const heroPhoto = galleryUrls.find((u) => !isVideoUrl(u));
  const couplePhotos = galleryUrls.filter((u) => !isVideoUrl(u));

  return (
    <div className={`relative mx-auto max-w-[480px] overflow-hidden ${theme.bg} ${theme.text} font-[family-name:var(--font-heading)]`}>
      {musicUrl && (
        <div className="absolute right-4 top-4 z-30">
          <MusicPlayer src={musicUrl} theme={theme} />
        </div>
      )}

      {/* 1. Hero — foto berlapis marun; judul & monogram ditulis berurutan saat dimuat. */}
      <section
        className="royal-satin relative flex min-h-[600px] items-center justify-center overflow-hidden"
      >
        {heroPhoto && (
          // eslint-disable-next-line @next/next/no-img-element -- URL dinamis dari owner (link eksternal).
          <img
            src={heroPhoto}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-[#6b1423]/70" aria-hidden="true" />
        <div className={`relative flex flex-col items-center text-center ${theme.text}`}>
          <Write as="p" dur="0.7s" className="font-royal text-3xl">
            The Wedding
          </Write>
          <h1 className="my-2 font-royal text-[6.5rem] leading-none" aria-label={`${partner1} & ${partner2}`}>
            <span aria-hidden="true">
              <Write font="monogram" dur="1s" delay="0.5s">
                {initialOf(partner1)}
              </Write>
              <Write font="monogram" dur="1.1s" delay="1.4s" className="-ml-3 translate-y-8">
                {initialOf(partner2)}
              </Write>
            </span>
          </h1>
          <Write as="p" dur="0.7s" delay="2.5s" className="font-royal text-3xl">
            {parts?.short ?? "Tanggal belum diisi"}
          </Write>
        </div>
      </section>

      {/* 2. Amplop bersegel di atas satin marun + krem. */}
      <div className="royal-satin relative overflow-hidden px-4 py-14">
        <div
          className="royal-satin-cream pointer-events-none absolute right-0 top-0 h-3/5 w-3/5"
          style={{ clipPath: "polygon(38% 0, 100% 0, 100% 100%, 0 62%)" }}
          aria-hidden="true"
        />
        <EnvelopeScene partner1={partner1} partner2={partner2} dateLong={parts?.long ?? null} photo={couplePhotos[0]} />
      </div>

      {/* 3. Kartu undangan bertepi lengkung dengan rumbai. */}
      <div className="royal-satin relative overflow-hidden px-4 py-16">
        <CardsScene partner1={partner1} partner2={partner2} dateShort={parts?.short ?? null} />
      </div>

      <Interlude title="Kedua Mempelai" partner1={partner1} partner2={partner2} dateShort={parts?.short ?? null} photo={couplePhotos[2]} />

      {/* 4. Kedua Mempelai — bingkai emas berukir. */}
      <div className="royal-satin relative px-6 py-14 text-center">
        <Lily className="pointer-events-none absolute -left-8 top-2 h-28 w-28 opacity-95" />
        <Lily className="pointer-events-none absolute -right-8 bottom-4 h-28 w-28 rotate-45 opacity-95" />
        <RoyalSection className="w-full"><Write as="h2" dur="0.9s" className="mb-8 block font-royal text-4xl text-[#E6CBA0]">Kedua Mempelai</Write></RoyalSection>
        <div className="flex flex-col items-center gap-10">
          <PersonCard name={partner1} photo={couplePhotos[0]} parents={parents1} instagram={instagram1} />
          <span className="font-royal text-4xl text-[#E6CBA0]">
            &amp;
          </span>
          <PersonCard name={partner2} photo={couplePhotos[1]} parents={parents2} instagram={instagram2} />
        </div>
      </div>

      {/* 5. Galeri — mosaik bingkai emas, bentuk bergantian oval/persegi. */}
      {galleryUrls.length > 0 && (
        <Interlude title="Galeri" partner1={partner1} partner2={partner2} dateShort={parts?.short ?? null} photo={couplePhotos[3]} />
      )}
      {galleryUrls.length > 0 && (
        <div className="royal-satin px-5 py-14">
          <RoyalSection className="w-full"><Write as="h2" dur="0.9s" className="mb-6 block text-center font-royal text-4xl text-[#E6CBA0]">Galeri</Write></RoyalSection>
          <div className="grid grid-cols-2 items-center gap-4">
            {galleryUrls.map((url, i) => (
              <div
                key={url}
                className={`${i % 3 === 0 ? "col-span-2 mx-auto w-3/5" : ""}`}
              >
                <OrnateFrame shape={i % 3 === 1 ? "oval" : "rect"}>
                  <Photo url={url} alt={`Galeri foto ${i + 1}`} />
                </OrnateFrame>
              </div>
            ))}
          </div>
        </div>
      )}

      <Interlude title="Acara Pernikahan" partner1={partner1} partner2={partner2} dateShort={parts?.short ?? null} photo={couplePhotos[4]} />

      {/* 6. Acara Pernikahan — panel krem. */}
      <div className={`flex flex-col items-center gap-7 px-7 py-14 text-center ${CREAM_THEME.bg} ${CREAM_THEME.text}`}>
        <RoyalSection className="w-full"><Write as="h2" dur="0.9s" className="block font-royal text-4xl text-[#7A1F33]">Acara Pernikahan</Write></RoyalSection>
        <p className="italic leading-relaxed">
          Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir untuk
          memberikan doa restu kepada kedua mempelai.
        </p>

        {parts && (
          <div className="flex items-center gap-4">
            <span className="text-lg uppercase tracking-widest">{parts.weekday}</span>
            <span className="border-x border-[#7A1F33]/40 px-4 font-royal text-6xl text-[#7A1F33]">{parts.day}</span>
            <span className="text-lg uppercase tracking-widest">
              {parts.month}
              <br />
              {parts.year}
            </span>
          </div>
        )}

        {(akadLabel || resepsiLabel) && (
          <div className="grid w-full grid-cols-2 gap-3">
            {akadLabel && (
              <div className="rounded-2xl border border-[#7A1F33]/30 px-3 py-4">
                <p className={`font-royal text-2xl ${CREAM_THEME.accent}`}>Akad Nikah</p>
                <p className="mt-1 text-lg">{akadLabel}</p>
              </div>
            )}
            {resepsiLabel && (
              <div className="rounded-2xl border border-[#7A1F33]/30 px-3 py-4">
                <p className={`font-royal text-2xl ${CREAM_THEME.accent}`}>Resepsi</p>
                <p className="mt-1 text-lg">{resepsiLabel}</p>
              </div>
            )}
          </div>
        )}

        <div className="w-full">
          <p className={`text-xs uppercase tracking-widest ${CREAM_THEME.muted}`}>Tempat Acara</p>
          <p className="mt-1 whitespace-pre-line text-lg">{lokasi || "Lokasi belum diisi"}</p>
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#7A1F33] px-6 py-2.5 text-sm font-semibold uppercase tracking-widest text-[#F8EFE2]"
            >
              Klik Google Maps
              <ExternalLink size={14} />
            </a>
          )}
        </div>

        {dressCode && (
          <div className="">
            <p className={`text-xs uppercase tracking-widest ${CREAM_THEME.muted}`}>Dress Code</p>
            <p className="text-lg">{dressCode}</p>
          </div>
        )}

        {countdownTarget && (
          <div className="w-full">
            <CountdownTimer targetIso={countdownTarget} theme={CREAM_THEME} />
          </div>
        )}

        {mapsEmbedSrc && (
          <div className="w-full">
            <LazyMapEmbed src={mapsEmbedSrc} theme={CREAM_THEME} />
          </div>
        )}
      </div>

      {/* 7. Wedding Gift. */}
      {giftAccounts.length > 0 && (
        <div className="royal-satin flex flex-col items-center gap-5 px-7 py-14 text-center">
          <RoyalSection className="w-full"><Write as="h2" dur="0.9s" className="block font-royal text-4xl text-[#E6CBA0]">Wedding Gift</Write></RoyalSection>
          <p className="leading-relaxed">
            Doa restu dan kehadiran Anda merupakan hadiah terindah bagi kami. Namun, apabila Anda ingin berbagi
            kebahagiaan melalui tanda kasih, kami telah menyediakan pilihan Wedding Gift di bawah ini.
          </p>
          <div className="w-full">
            <GiftInfoSection accounts={giftAccounts} theme={theme} />
          </div>
          <p className="font-royal text-3xl text-[#E6CBA0]">
            {partner1} &amp; {partner2}
          </p>
        </div>
      )}
    </div>
  );
}
