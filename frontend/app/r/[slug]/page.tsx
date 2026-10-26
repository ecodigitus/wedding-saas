import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ApiError,
  getPublicGuest,
  getPublicGuestbookEntries,
  getPublicInvitation,
} from "@/lib/api";
import type { PublicGuest } from "@/lib/types";
import { buildGiftAccounts, formatDate, resolveTemplateTheme } from "@/components/InvitationView";
import { GiftInfoSection } from "@/components/GiftInfoSection";
import { RsvpForm } from "@/components/RsvpForm";
import { GuestbookSection } from "@/components/GuestbookSection";

// RG-02 (Mode Registrasi-Saja, task.v2.md Bagian 11): halaman ini BUKAN
// undangan — dipakai tamu yang datang dari undangan vendor lain / undangan
// cetak, cuma untuk konfirmasi kehadiran + lihat QR check-in miliknya.
// SENGAJA tidak merender `InvitationView` sama sekali (nol hero beranimasi,
// SparkleParticles, ScrollReveal, galeri, musik, countdown, dekorasi khas
// template) — lihat styleguide.v2.md §5.7 untuk daftar lengkap yang sengaja
// ditinggalkan & alasannya.

type Params = { slug: string };
type SearchParams = { g?: string };

async function fetchInvitation(slug: string) {
  try {
    return await getPublicInvitation(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const invitation = await fetchInvitation(slug);
  if (!invitation) {
    return { title: "Halaman registrasi tidak ditemukan" };
  }

  // Framing beda dari halaman undangan penuh (/{slug}) — link ini di-share
  // sebagai PELENGKAP undangan vendor, bukan sebagai undangan itu sendiri
  // (styleguide.v2.md §5.7, §6).
  const title = `Konfirmasi Kehadiran — ${invitation.partner1_name} & ${invitation.partner2_name}`;
  const description = `Yuk konfirmasi kehadiranmu di pernikahan ${invitation.partner1_name} & ${invitation.partner2_name}.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
  };
}

export default async function RegistrationOnlyPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const { g: guestToken } = await searchParams;
  const invitation = await fetchInvitation(slug);
  if (!invitation) notFound();

  const guestbookEntries = await getPublicGuestbookEntries(slug).catch(() => []);
  // Link personal (`?g=...`) tetap berfungsi di mode ini — owner bisa saja
  // tetap kirim link personal per tamu lewat WA walau undangan utamanya
  // dibuat di luar platform (task.v2.md §11.4).
  const guestInfo: PublicGuest | undefined = guestToken
    ? await getPublicGuest(slug, guestToken).catch(() => undefined)
    : undefined;
  const theme = resolveTemplateTheme(invitation.template_id);
  const giftAccounts = buildGiftAccounts(invitation);

  return (
    <main className={theme.bg}>
      <div className={`mx-auto flex max-w-[560px] flex-col px-6 py-12 ${theme.text} ${theme.font}`}>
        <header className="mb-8 text-center">
          <p className={`text-xs uppercase tracking-widest ${theme.muted}`}>Konfirmasi Kehadiran</p>
          <h1 className={`mt-2 text-2xl font-medium ${theme.accent}`}>
            {invitation.partner1_name} &amp; {invitation.partner2_name}
          </h1>
          <p className="mt-2 text-sm">{formatDate(invitation.event_date)}</p>
          <p className="mt-1 text-sm">{invitation.lokasi}</p>
        </header>

        <h2 className={`mb-4 text-center text-2xl ${theme.accent}`}>RSVP</h2>
        <RsvpForm
          slug={slug}
          theme={theme}
          guestToken={guestInfo ? guestToken : undefined}
          guestInfo={guestInfo}
          autoEnrollStorageKey={`wedding-saas:registration-guest-token:${slug}`}
        />

        {giftAccounts.length > 0 && (
          <div className="mt-10 flex flex-col items-center gap-3">
            <h2 className={`text-center text-2xl ${theme.accent}`}>Kirim Hadiah</h2>
            <GiftInfoSection accounts={giftAccounts} theme={theme} />
          </div>
        )}

        <h2 className={`mb-4 mt-12 text-center text-2xl ${theme.accent}`}>Buku Tamu</h2>
        <GuestbookSection slug={slug} initialEntries={guestbookEntries} theme={theme} />
      </div>
    </main>
  );
}
