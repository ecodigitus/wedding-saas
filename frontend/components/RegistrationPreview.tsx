import { Check, X } from "lucide-react";
import { buildGiftAccounts, formatDate, resolveTemplateTheme } from "./InvitationView";
import { GiftInfoSection } from "./GiftInfoSection";
import { Button, Input } from "./ui";

// Preview editor untuk Mode Registrasi-Saja (RG-01/RG-02) — meniru tampilan
// halaman publik `/r/{slug}` (app/r/[slug]/page.tsx) dari data form editor
// yang BELUM disimpan, supaya owner melihat yang akan dilihat tamu, bukan
// undangan lengkap (`InvitationView`) yang dialihkan di mode ini.
//
// SENGAJA statis, bukan memakai `RsvpForm`/`GuestbookSection` asli: dua
// komponen itu memanggil API publik (submit RSVP, auto-enroll tamu ke roster,
// tulis `localStorage`, kirim ucapan) — kalau dirender di editor, owner yang
// mencoba-coba preview malah membuat tamu/RSVP/ucapan sungguhan di event-nya
// sendiri. Wrapper `inert` mematikan seluruh interaksi (fokus, klik, ketik)
// sekaligus menyembunyikannya dari teknologi bantu — ini gambar, bukan form.
// Kalau tampilan `/r/{slug}` berubah, ubah di sini juga.

type RegistrationPreviewData = {
  partner1_name: string;
  partner2_name: string;
  event_date: string;
  lokasi: string;
  template_id: string;
} & Parameters<typeof buildGiftAccounts>[0];

export function RegistrationPreview({ data }: { data: RegistrationPreviewData }) {
  const theme = resolveTemplateTheme(data.template_id);
  const giftAccounts = buildGiftAccounts(data);

  return (
    <main className={theme.bg}>
      <div
        inert
        className={`mx-auto flex max-w-[560px] flex-col px-6 py-12 ${theme.text} ${theme.font}`}
      >
        <header className="mb-8 text-center">
          <p className={`text-xs uppercase tracking-widest ${theme.muted}`}>Konfirmasi Kehadiran</p>
          <h1 className={`mt-2 text-2xl font-medium ${theme.accent}`}>
            {data.partner1_name} &amp; {data.partner2_name}
          </h1>
          {data.event_date && <p className="mt-2 text-sm">{formatDate(data.event_date)}</p>}
          {data.lokasi && <p className="mt-1 text-sm">{data.lokasi}</p>}
        </header>

        <h2 className={`mb-4 text-center text-2xl ${theme.accent}`}>RSVP</h2>
        <div
          className={`flex flex-col gap-4 rounded-xl border border-border bg-surface p-6 shadow-lg ${theme.font}`}
        >
          <Input label="Nama kamu" name="preview_guest_name" disabled readOnly value="" />
          <Input
            label="Jumlah orang (termasuk kamu, maks. 20)"
            name="preview_jumlah_pax"
            type="number"
            disabled
            readOnly
            value={1}
          />
          <div>
            <p className="mb-1.5 text-sm font-medium text-[var(--color-text-primary)]">
              Konfirmasi kehadiran
            </p>
            <div className="flex gap-2">
              <span className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border text-sm font-medium text-[var(--color-text-primary)]">
                <Check size={16} />
                Hadir
              </span>
              <span className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border text-sm font-medium text-[var(--color-text-primary)]">
                <X size={16} />
                Tidak Hadir
              </span>
            </div>
          </div>
          <Button type="button" disabled>
            Kirim RSVP
          </Button>
        </div>

        {giftAccounts.length > 0 && (
          <div className="mt-10 flex flex-col items-center gap-3">
            <h2 className={`text-center text-2xl ${theme.accent}`}>Kirim Hadiah</h2>
            <GiftInfoSection accounts={giftAccounts} theme={theme} />
          </div>
        )}

        <h2 className={`mb-4 mt-12 text-center text-2xl ${theme.accent}`}>Buku Tamu</h2>
        <div
          className={`rounded-xl border border-border bg-surface p-6 text-center text-sm text-[var(--color-text-secondary)] shadow-lg ${theme.font}`}
        >
          Ucapan dari tamu akan tampil di sini.
        </div>
      </div>
    </main>
  );
}
