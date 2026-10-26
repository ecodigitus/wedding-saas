import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  ApiError,
  getPublicGuest,
  getPublicGuestbookEntries,
  getPublicInvitation,
} from "@/lib/api";
import type { PublicGuest } from "@/lib/types";
import { InvitationView, resolveTemplateTheme } from "@/components/InvitationView";
import { RsvpForm } from "@/components/RsvpForm";
import { GuestbookSection } from "@/components/GuestbookSection";

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
    return { title: "Undangan tidak ditemukan" };
  }

  const title = `Undangan Pernikahan ${invitation.partner1_name} & ${invitation.partner2_name}`;
  const description = `Yuk konfirmasi kehadiranmu di pernikahan ${invitation.partner1_name} & ${invitation.partner2_name}. Tulis ucapan & doa untuk mereka.`;

  return {
    title,
    description,
    // Open Graph agar preview WhatsApp muncul rapi saat link di-share (UW-06).
    openGraph: { title, description, type: "website" },
  };
}

export default async function PublicInvitationPage({
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

  // RG-03: undangan utamanya dibuat DI LUAR platform — jangan sajikan
  // template undangan yang setengah terisi (bakal terlihat rusak).
  // Server-side (sebelum render apa pun) supaya tidak ada flash konten
  // salah. `?g=` (link personal) diteruskan — owner bisa saja tetap kirim
  // link personal per tamu walau mode ini aktif (task.v2.md §11.4).
  if (invitation.mode === "registration_only") {
    redirect(guestToken ? `/r/${slug}?g=${encodeURIComponent(guestToken)}` : `/r/${slug}`);
  }

  const guestbookEntries = await getPublicGuestbookEntries(slug).catch(() => []);
  const guestInfo: PublicGuest | undefined = guestToken
    ? await getPublicGuest(slug, guestToken).catch(() => undefined)
    : undefined;
  const theme = resolveTemplateTheme(invitation.template_id);

  const rsvpBlock = (
    <>
      <h2 className={`mb-4 text-center text-2xl ${theme.accent} ${theme.font}`}>RSVP</h2>
      <RsvpForm
        slug={slug}
        theme={theme}
        guestToken={guestInfo ? guestToken : undefined}
        guestInfo={guestInfo}
      />
    </>
  );
  // Template Burgundy Royal bergambar: RSVP duduk di dalam undangan (sebelum panel
  // "Terima Kasih"), seperti di situs Canva acuan — bukan lagi di bawahnya.
  const rsvpInside = invitation.template_id === "burgundy-royal" && Boolean(invitation.theme_assets?.hero_bg);

  return (
    <main className={theme.bg}>
      <InvitationView data={invitation} rsvpSlot={rsvpInside ? rsvpBlock : undefined} />
      <div className={`mx-auto max-w-[480px] px-6 pb-16 ${theme.text}`}>
        {!rsvpInside && rsvpBlock}

        <h2 className={`mb-4 ${rsvpInside ? "mt-8" : "mt-12"} text-center text-2xl ${theme.accent} ${theme.font}`}>
          Buku Tamu
        </h2>
        <GuestbookSection slug={slug} initialEntries={guestbookEntries} theme={theme} />
      </div>
    </main>
  );
}
