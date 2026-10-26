import { ExternalLink } from "lucide-react";
import { GiftInfoSection, type GiftAccount } from "./GiftInfoSection";
import { CountdownTimer } from "./CountdownTimer";
import { MusicPlayer } from "./MusicPlayer";
import { RoyalSection } from "./RoyalSection";
import { CREAM_THEME, Write, dateParts, initialOf, isVideoUrl } from "./RoyalInvitation";
import type { TemplateTheme } from "./InvitationView";

// Template "Burgundy Royal" versi BERGAMBAR — dipakai kalau event punya
// `theme_assets` (gambar desain hasil ekspor Canva: foto berlapis marun,
// amplop, kartu, bingkai emas, lili, satin). Susunan panel meniru situs Canva
// acuan; teks script (judul, monogram, tanggal) tetap hidup & ditulis dengan
// efek yang sama. Tanpa theme_assets, InvitationView memakai RoyalInvitation
// (elemen SVG buatan sendiri). Semua URL gambar divalidasi http(s) di backend.
//
// Ukuran teks di panel berkomposisi memakai satuan `cqw` (container query):
// tata letak persen + font ikut membesar/mengecil mengikuti lebar panel.

type Assets = Record<string, string>;

type Props = {
  assets: Assets;
  partner1: string;
  partner2: string;
  parents1: string | null;
  parents2: string | null;
  instagram1: string | null;
  instagram2: string | null;
  eventDate: string;
  mapsUrl: string | null;
  galleryUrls: string[];
  musicUrl: string | null;
  countdownTarget: string | null;
  giftAccounts: GiftAccount[];
  theme: TemplateTheme;
  /** Form RSVP (dari halaman publik) — ditempatkan tepat sebelum panel "Terima Kasih", seperti di Canva. */
  rsvpSlot?: React.ReactNode;
};

// Bukaan oval pada frame_empty (persen dari ukuran gambar bingkai) — dipakai
// kalau bingkai galeri bentuk-bentuk (gal_*) tidak tersedia.
const FRAME_OPENING = { left: "23.1%", top: "16.8%", width: "55.6%", height: "54.8%" };

const CQ: React.CSSProperties = { containerType: "inline-size" };

/** "Arsy Rahmawati, S.Pd" -> "Arsy" (nama lengkap + gelar terlalu panjang untuk salam penutup). */
const firstName = (name: string) => name.split(/[\s,]+/)[0] || name;

/** <img> dari URL eksternal owner (tidak bisa lewat next/image remotePatterns). */
function Img({
  src,
  className = "",
  alt = "",
  eager = false,
  style,
}: {
  src: string;
  className?: string;
  alt?: string;
  eager?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- URL dinamis dari owner (link eksternal).
    <img
      src={src}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      loading={eager ? "eager" : "lazy"}
      className={className}
      style={style}
    />
  );
}

function InstagramLine({ handle, className = "" }: { handle: string; className?: string }) {
  return (
    <p className={`flex items-center justify-center gap-[1.2cqw] ${className}`}>
      <svg viewBox="0 0 24 24" className="h-[4.4cqw] w-[4.4cqw]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
      </svg>
      <span className="underline">@{handle}</span>
    </p>
  );
}

/** Panel foto penuh dengan judul script, monogram besar, dan tanggal ditulis berurutan. */
function PhotoInterlude({
  bg,
  title,
  partner1,
  partner2,
  dateShort,
}: {
  bg: string;
  title: string;
  partner1: string;
  partner2: string;
  dateShort: string | null;
}) {
  return (
    <RoyalSection className="relative">
      <Img src={bg} className="block h-auto w-full" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-[#F8EFE2]">
        <Write as="p" dur="0.7s" className="font-royal text-3xl">
          {title}
        </Write>
        <p className="my-1 font-royal text-[6.5rem] leading-none" aria-hidden="true">
          <Write font="monogram" dur="1s" delay="0.5s">
            {initialOf(partner1)}
          </Write>
          <Write font="monogram" dur="1.1s" delay="1.4s" className="-ml-3 translate-y-8">
            {initialOf(partner2)}
          </Write>
        </p>
        {dateShort && (
          <Write as="p" dur="0.7s" delay="2.5s" className="font-royal text-3xl">
            {dateShort}
          </Write>
        )}
      </div>
    </RoyalSection>
  );
}

/** Posisi absolut berbasis persen (kiri/atas/lebar dari kotak panel). */
function Abs({ src, l, t, w, z = 10, shadow = true }: { src: string; l: number; t: number; w: number; z?: number; shadow?: boolean }) {
  return (
    <Img
      src={src}
      className={`absolute block h-auto ${shadow ? "drop-shadow-[0_1.2cqw_1.6cqw_rgba(0,0,0,0.5)]" : ""}`}
      style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, zIndex: z }}
    />
  );
}

/** Panel mempelai: tiga bingkai bertumpuk (besar di tengah, dua kecil menimpa di bawah),
 * buket lili di kiri-kanan atas, nama tebal, orang tua, dan Instagram. */
function PersonPanel({
  label,
  role,
  name,
  parents,
  instagram,
  frames,
  bg,
  lilyLeft,
  lilyRight,
}: {
  label: string;
  role: string;
  name: string;
  parents: string | null;
  instagram: string | null;
  frames: string[];
  bg: string;
  lilyLeft?: string;
  lilyRight?: string;
}) {
  const [main, left, right] = frames;
  return (
    <RoyalSection className="relative w-full overflow-hidden text-[#F8EFE2]">
      <div className="relative w-full" style={{ ...CQ, aspectRatio: "683 / 767" }}>
        <Img src={bg} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-x-0 top-[3%] text-center">
          <Write as="h2" dur="0.9s" className="block font-royal text-[6cqw] leading-none text-[#F8EFE2]">
            {label}
          </Write>
        </div>
        {lilyLeft && <Abs src={lilyLeft} l={13.5} t={17} w={21} z={5} shadow={false} />}
        {lilyRight && <Abs src={lilyRight} l={65.5} t={17} w={21} z={5} shadow={false} />}
        {main && <Abs src={main} l={30.3} t={11.5} w={39.5} z={10} />}
        {left && <Abs src={left} l={7.5} t={37.5} w={29.5} z={20} />}
        {right && <Abs src={right} l={63.2} t={37.5} w={29.5} z={20} />}
        <div className="absolute inset-x-0 top-[77%] px-[6%] text-center">
          <p className="text-[4.6cqw] font-bold leading-tight">{name}</p>
          {parents && (
            <p className="mt-[1.2cqw] text-[2.9cqw] leading-snug">
              {role}
              <br />
              {parents}
            </p>
          )}
        </div>
        {instagram && <InstagramLine handle={instagram} className="absolute inset-x-0 top-[92%] text-[3.4cqw]" />}
      </div>
    </RoyalSection>
  );
}

// Semua panel berukuran 683 x 767 px (rasio dari desain Canva).
const PANEL_BOX = { containerType: "inline-size", aspectRatio: "683 / 767" } as React.CSSProperties;

/** Galeri: dua panel persis susunan situs Canva acuan (posisi dalam persen panel):
 *  A — strip satin dengan monogram AB di kiri, bingkai oval/hati/persegi/tegak di atas marun;
 *  B — panel marun di tengah satin krem, bingkai persegi/besar/lengkung/lebar + judul "Galeri". */
function GalleryMosaics({ assets, partner1, partner2 }: { assets: Assets; partner1: string; partner2: string }) {
  // l, t, w semuanya persen kotak panel
  const P = (k: string, l: number, t: number, w: number, z = 10) =>
    assets[k] ? <Abs key={`${k}-${l}-${t}`} src={assets[k]} l={l} t={t} w={w} z={z} /> : null;
  const satin = assets.satin_bg ? `url("${assets.satin_bg}")` : undefined;
  return (
    <>
      <RoyalSection className="relative w-full overflow-hidden bg-[#4f0508]">
        <div className="relative w-full" style={PANEL_BOX}>
          <div
            className="absolute inset-y-0 left-0 w-[29.2%]"
            style={{ backgroundImage: satin, backgroundSize: "cover", backgroundPosition: "18% center" }}
          />
          <p className="absolute left-[3.5%] top-[36%] z-10 font-royal text-[15cqw] leading-none text-[#F8EFE2]" aria-hidden="true">
            <Write font="monogram" dur="1s" delay="0.3s">
              {initialOf(partner1)}
            </Write>
            <Write font="monogram" dur="1.1s" delay="1.2s" className="-ml-[3cqw] translate-y-[7cqw]">
              {initialOf(partner2)}
            </Write>
          </p>
          {P("gal_oval", 31.3, 2.3, 40.6)}
          {P("gal_heart", 70.3, 3, 26.1)}
          {P(assets.gal_square_b ? "gal_square_b" : "gal_square", 72.6, 27.5, 23.7)}
          {P("gal_rect_b", 32.8, 57.2, 26.1)}
          {P("gal_rect_a", 62.6, 53, 35.8)}
        </div>
      </RoyalSection>
      <RoyalSection className="relative w-full overflow-hidden">
        <div
          className="relative w-full"
          style={{ ...PANEL_BOX, backgroundImage: satin, backgroundSize: "cover", backgroundPosition: "center" }}
        >
          <div className="absolute inset-y-0 left-[23.7%] w-[51.8%] rounded-b-2xl bg-[#4f0508]" />
          {P("gal_square", 7.4, 5.3, 37.2)}
          {P("gal_rect_big", 46.6, 5.3, 49.7)}
          {P("gal_arch", 8.9, 40.5, 32.3)}
          {P("gal_wide", 45.9, 70, 51.2)}
          <div className="absolute left-[14.7%] top-[85%] z-20 text-[#F8EFE2]">
            <Write as="h2" dur="0.9s" className="block font-royal text-[10.5cqw] leading-none">
              Galeri
            </Write>
          </div>
        </div>
      </RoyalSection>
    </>
  );
}

/** Foto di dalam bingkai emas kosong (bukaan oval) — cadangan bila bingkai bentuk-bentuk tidak ada. */
function FramedPhoto({ frame, url, alt }: { frame: string; url: string; alt: string }) {
  return (
    <div className="relative">
      {isVideoUrl(url) ? (
        <video src={url} controls className="absolute rounded-[50%] object-cover" style={FRAME_OPENING}>
          <track kind="captions" />
        </video>
      ) : (
        <Img src={url} alt={alt} className="absolute rounded-[50%] object-cover" style={FRAME_OPENING} />
      )}
      <Img src={frame} className="pointer-events-none relative z-10 block h-auto w-full" />
    </div>
  );
}

export function RoyalAssetInvitation({
  assets,
  partner1,
  partner2,
  parents1,
  parents2,
  instagram1,
  instagram2,
  eventDate,
  mapsUrl,
  galleryUrls,
  musicUrl,
  countdownTarget,
  giftAccounts,
  theme,
  rsvpSlot,
}: Props) {
  const parts = dateParts(eventDate);
  const dateShort = parts?.short ?? null;
  const pick = (keys: string[]) => keys.map((k) => assets[k]).filter((u): u is string => Boolean(u));
  const photos = galleryUrls.slice(0, 12);
  const hasMosaic = Boolean(assets.gal_oval);

  return (
    <div className={`relative mx-auto max-w-[480px] overflow-hidden ${theme.bg} ${theme.text} font-[family-name:var(--font-heading)]`}>
      {musicUrl && (
        <div className="absolute right-4 top-4 z-30">
          <MusicPlayer src={musicUrl} theme={theme} />
        </div>
      )}

      {/* 1. Hero — foto berlapis marun; judul & monogram ditulis berurutan saat dimuat. */}
      {assets.hero_bg && (
        <section className="relative">
          <Img src={assets.hero_bg} eager className="block h-auto w-full" />
          <div className="absolute inset-0 flex flex-col items-center justify-center pb-[6%] text-center text-[#F8EFE2]">
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
              {dateShort ?? "Tanggal belum diisi"}
            </Write>
          </div>
        </section>
      )}

      {/* 2. Amplop di atas satin. */}
      {assets.envelope && (
        <section
          className="royal-satin relative overflow-hidden py-6"
          style={assets.satin_bg ? { backgroundImage: `url("${assets.satin_bg}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        >
          <Img src={assets.envelope} className="mx-auto block h-auto w-[98%]" />
        </section>
      )}

      {/* 3. Kartu undangan berumbai. */}
      {assets.cards_bg && (
        <section>
          <Img src={assets.cards_bg} className="block h-auto w-full" />
        </section>
      )}

      {/* 4. Kedua Mempelai (pembuka) → 5–6. panel mempelai wanita & pria. */}
      {assets.closeup_bg && (
        <PhotoInterlude bg={assets.closeup_bg} title="Kedua Mempelai" partner1={partner1} partner2={partner2} dateShort={dateShort} />
      )}
      {assets.lily_wallpaper && (
        <>
          <PersonPanel
            label="Mempelai Wanita"
            role="Putri dari"
            name={partner1}
            parents={parents1}
            instagram={instagram1}
            frames={pick(["bride_frame_1", "bride_frame_2", "bride_frame_3"])}
            bg={assets.lily_wallpaper}
            lilyLeft={assets.lily_left}
            lilyRight={assets.lily_right}
          />
          <PersonPanel
            label="Mempelai Pria"
            role="Putra dari"
            name={partner2}
            parents={parents2}
            instagram={instagram2}
            frames={pick(["groom_frame_1", "groom_frame_2", "groom_frame_3"])}
            bg={assets.lily_wallpaper}
            lilyLeft={assets.lily_left}
            lilyRight={assets.lily_right}
          />
        </>
      )}

      {/* 7–8. Galeri — pembuka + mosaik bingkai emas. */}
      {assets.couple_bg && (
        <PhotoInterlude bg={assets.couple_bg} title="Galeri" partner1={partner1} partner2={partner2} dateShort={dateShort} />
      )}
      {hasMosaic ? (
        <GalleryMosaics assets={assets} partner1={partner1} partner2={partner2} />
      ) : (
        photos.length > 0 &&
        assets.frame_empty && (
          <RoyalSection className="royal-satin relative px-4 py-12">
            <div className="grid grid-cols-2 items-center gap-x-2 gap-y-1">
              {photos.map((url, i) => (
                <div key={url} className={i % 5 === 0 ? "col-span-2 mx-auto w-3/5" : ""}>
                  <FramedPhoto frame={assets.frame_empty} url={url} alt={`Galeri foto ${i + 1}`} />
                </div>
              ))}
            </div>
          </RoyalSection>
        )
      )}

      {/* 9–10. Acara Pernikahan — pembuka + panel sketsa. */}
      {assets.groom_bg && (
        <PhotoInterlude bg={assets.groom_bg} title="Acara Pernikahan" partner1={partner1} partner2={partner2} dateShort={dateShort} />
      )}
      {assets.acara_bg && (
        <RoyalSection className="relative">
          <div className="relative w-full" style={CQ}>
            <Img src={assets.acara_bg} className="block h-auto w-full" />
            <div className="absolute inset-x-0 top-[3.5%] px-[7%] text-center text-[#8a1220]">
              <Write as="h2" dur="0.9s" className="block font-royal text-[6.2cqw] leading-none">
                Acara Pernikahan
              </Write>
              <p className="mt-[2.4cqw] text-[3cqw] italic leading-snug">
                Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir untuk
                memberikan doa restu kepada kedua mempelai.
              </p>
            </div>
          </div>
        </RoyalSection>
      )}

      {/* 11. Tempat dan Jam Acara — pembuka + kolase info + hitung mundur. */}
      {assets.bride_bg && (
        <PhotoInterlude bg={assets.bride_bg} title="Tempat dan Jam Acara" partner1={partner1} partner2={partner2} dateShort={dateShort} />
      )}
      {assets.info_collage && (
        <section className={`relative px-3 pb-6 pt-4 ${CREAM_THEME.bg}`}>
          <div className="relative" style={CQ}>
            <Img src={assets.info_collage} className="block h-auto w-full" />
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Buka lokasi di Google Maps"
                className="absolute bottom-[5.5%] left-[22%] flex h-[8%] w-[26%] items-center justify-center gap-[0.8cqw] text-[1.9cqw] font-semibold uppercase leading-tight tracking-wider text-[#7A1F33]"
              >
                Klik Google Maps
                <ExternalLink size={9} aria-hidden="true" />
              </a>
            )}
            {countdownTarget && (
              <div className="absolute bottom-[4.5%] right-[20%] flex h-[9.5%] w-[33%] items-center justify-end">
                <div className="origin-right scale-[0.5]">
                  <CountdownTimer targetIso={countdownTarget} theme={CREAM_THEME} />
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 12. Wedding Gift — satin dengan kolom marun tembus pandang. */}
      {giftAccounts.length > 0 && (
        <RoyalSection className="royal-satin relative overflow-hidden px-[8%] py-12">
          {assets.satin_bg && <Img src={assets.satin_bg} className="absolute inset-0 h-full w-full object-cover" />}
          <div className="relative mx-auto flex w-[74%] max-w-full flex-col items-center gap-5 bg-[#5a0a1a]/70 px-5 py-10 text-center text-[#F8EFE2]">
            <Write as="h2" dur="0.9s" className="block font-royal text-4xl">
              Wedding Gift
            </Write>
            <p className="leading-snug">Doa restu dan kehadiran Anda merupakan hadiah terindah bagi kami.</p>
            <p className="leading-snug">
              Namun, apabila Anda ingin berbagi kebahagiaan melalui tanda kasih, kami telah menyediakan pilihan Wedding
              Gift di bawah ini.
            </p>
            <p className="leading-snug">
              Setiap doa dan kebaikan yang diberikan menjadi kenangan berharga bagi perjalanan baru kami. Dengan penuh
              rasa syukur dan terima kasih,
            </p>
            <GiftInfoSection accounts={giftAccounts} theme={theme} variant="canva" logoUrl={assets.bank_logo} />
            <p className="font-royal text-3xl text-[#E6CBA0]">
              {firstName(partner1)} &amp; {firstName(partner2)}
            </p>
          </div>
        </RoyalSection>
      )}

      {/* 13. RSVP (sebelah kiri panel penutup di desktop Canva) -> 14. Terima Kasih. */}
      {rsvpSlot && (
        <section className="royal-satin relative overflow-hidden px-[6%] py-12">
          {assets.satin_bg && <Img src={assets.satin_bg} className="absolute inset-0 h-full w-full object-cover" />}
          <div className="relative mx-auto w-full bg-[#5a0a1a]/70 px-5 py-8 text-[#F8EFE2]">{rsvpSlot}</div>
        </section>
      )}
      {assets.couple2_bg && (
        <RoyalSection className="relative">
          <div className="relative w-full" style={CQ}>
            <Img src={assets.couple2_bg} className="block h-auto w-full" />
            <div className="absolute inset-0 text-center text-[#F8EFE2]">
              <div className="absolute inset-x-0 top-[4%]">
                <Write as="p" dur="0.9s" className="font-royal text-[5.6cqw] leading-none">
                  Kami yang berbahagia,
                </Write>
              </div>
              <div className="absolute left-[22%] top-[24%] font-royal leading-none">
                <Write as="p" font="monogram" dur="1.2s" delay="0.5s" className="block text-[13.5cqw]">
                  {firstName(partner1)}
                </Write>
              </div>
              <p className="absolute left-[56%] top-[40%] font-royal text-[4.6cqw] leading-none" aria-hidden="true">
                &amp;
              </p>
              <div className="absolute left-[44%] top-[43.5%] font-royal leading-none">
                <Write as="p" font="monogram" dur="1.2s" delay="1.6s" className="block text-[13.5cqw]">
                  {firstName(partner2)}
                </Write>
              </div>
              <p className="absolute inset-x-0 top-[71%] px-[10%] text-[2.9cqw] leading-snug">
                Atas kehadiran dan do&rsquo;a restu dari Bapak/Ibu/Saudara/i sekalian, kami mengucapkan Terima Kasih
              </p>
              <p className="absolute inset-x-0 top-[89%] px-[6%] text-[2.9cqw] font-bold leading-snug">
                Wassalamualaikum Warrahmatullahi Wabarakatuh
              </p>
            </div>
          </div>
        </RoyalSection>
      )}
    </div>
  );
}
