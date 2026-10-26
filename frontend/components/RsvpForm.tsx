"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { Check, X } from "lucide-react";
import { ApiError, getPublicGuest, submitRsvp } from "@/lib/api";
import type { PublicGuest } from "@/lib/types";
import type { TemplateTheme } from "./InvitationView";
import { GuestQrCode } from "./GuestQrCode";
import { Button, Input } from "./ui";

// `localStorage` cuma ada di client — `useSyncExternalStore` (bukan
// useEffect+setState) supaya render pertama di server & client SAMA (snapshot
// server selalu `null`), lalu otomatis "dikoreksi" ke nilai asli begitu
// hydrasi selesai, tanpa cascading setState manual di effect. Key ini tidak
// pernah berubah dari LUAR komponen (cuma kita sendiri yang menulisnya lewat
// `handleSubmit`), jadi `subscribe` no-op — tidak ada yang perlu didengarkan.
function subscribeNever() {
  return () => {};
}

function readStoredGuestToken(storageKey: string | undefined): string | null {
  if (!storageKey || typeof window === "undefined") return null;
  return window.localStorage.getItem(storageKey);
}

function readServerGuestToken(): string | null {
  return null;
}

export function RsvpForm({
  slug,
  theme,
  guestToken,
  guestInfo,
  autoEnrollStorageKey,
}: {
  slug: string;
  theme: TemplateTheme;
  /** Token link personal (`?g=...`) — kalau ada, nama terkunci & pax dibatasi (UW-08). */
  guestToken?: string;
  guestInfo?: PublicGuest;
  /**
   * RG-05 (Mode Registrasi-Saja) — cuma diisi oleh `app/r/[slug]/page.tsx`.
   * Kalau ada DAN `guestToken` (dari `?g=` URL) TIDAK ada: setelah RSVP
   * pertama, `guest_token` hasil auto-enroll disimpan ke `localStorage` key
   * ini, dan dibaca lagi di kunjungan berikutnya — supaya tamu tidak perlu
   * link personal untuk tetap melihat QR check-in miliknya. Tidak
   * memengaruhi halaman undangan penuh (`/{slug}`) sama sekali karena prop
   * ini tidak pernah dikirim dari sana.
   */
  autoEnrollStorageKey?: string;
}) {
  // Render pertama (server & client) selalu `null` (snapshot server), lalu
  // dikoreksi otomatis ke isi localStorage yang asli begitu hydrasi selesai
  // — lihat komentar di atas kenapa ini BUKAN useEffect+setState.
  const storedToken = useSyncExternalStore(
    subscribeNever,
    () => readStoredGuestToken(autoEnrollStorageKey),
    readServerGuestToken
  );

  const [resolvedToken, setResolvedToken] = useState(guestToken);
  const [resolvedGuestInfo, setResolvedGuestInfo] = useState(guestInfo);
  // Beda dari `storedToken` (selalu ada selama localStorage-nya ada) — flag
  // ini murni "sudah selesai coba resolve token yang tersimpan itu jadi info
  // tamu atau belum", supaya UI tidak flash ke form anonim sebelum sempat dicoba.
  const [storedTokenResolved, setStoredTokenResolved] = useState(false);
  // Kalau `guestToken` (dari `?g=...` URL) sudah ada, link personal itu
  // menang — tidak perlu tunggu apa pun dari localStorage.
  const checkingStoredToken = !guestToken && Boolean(storedToken) && !storedTokenResolved;

  const maxPax = resolvedGuestInfo?.max_pax ?? 20;
  const [guestName, setGuestName] = useState(guestInfo?.name ?? "");
  const [jumlahPax, setJumlahPax] = useState(1);
  const [statusHadir, setStatusHadir] = useState<boolean | null>(guestInfo?.status_hadir ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Begitu `storedToken` diketahui (lihat useSyncExternalStore di atas) DAN
  // belum ada link personal dari URL: coba resolve jadi info tamu, supaya
  // tamu yang pernah auto-enroll di kunjungan sebelumnya (browser/device yang
  // sama) langsung diperlakukan seperti tamu ber-link-personal (nama
  // terkunci, QR bisa langsung tampil) tanpa perlu submit ulang. SEMUA
  // setState di sini ada di dalam callback promise (bukan sinkron di badan
  // effect) — pola yang sama dengan `lib/use-my-event.ts`.
  useEffect(() => {
    if (!storedToken || guestToken) return;
    let ignore = false;
    getPublicGuest(slug, storedToken)
      .then((info) => {
        if (ignore) return;
        setResolvedToken(storedToken);
        setResolvedGuestInfo(info);
        setStatusHadir(info.status_hadir ?? null);
      })
      .catch(() => {
        // Token tersimpan sudah tidak valid lagi (mis. tamu dihapus owner
        // dari roster) — buang, biar form anonim normal muncul lagi.
        if (autoEnrollStorageKey) window.localStorage.removeItem(autoEnrollStorageKey);
      })
      .finally(() => {
        if (!ignore) setStoredTokenResolved(true);
      });
    return () => {
      ignore = true;
    };
  }, [storedToken, guestToken, slug, autoEnrollStorageKey]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (statusHadir === null) {
      setError("Pilih dulu, kamu bisa hadir atau tidak ya.");
      return;
    }
    if (!Number.isInteger(jumlahPax) || jumlahPax < 1 || jumlahPax > maxPax) {
      setError(`Jumlah orang harus antara 1 sampai ${maxPax} ya.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const rsvp = await submitRsvp(slug, {
        guest_name: guestName,
        jumlah_pax: jumlahPax,
        status_hadir: statusHadir,
        guest_token: resolvedToken,
      });
      if (autoEnrollStorageKey && rsvp.guest_token) {
        window.localStorage.setItem(autoEnrollStorageKey, rsvp.guest_token);
        setResolvedToken(rsvp.guest_token);
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal kirim RSVP. Coba lagi ya.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingStoredToken) {
    return (
      <div className={`rounded-xl border border-border bg-surface p-6 text-center shadow-lg ${theme.font}`}>
        <p className="text-sm text-[var(--color-text-secondary)]">Memuat...</p>
      </div>
    );
  }

  // Kartu form SELALU terang (bg-surface + teks brand default) — tidak ikut
  // theme.text/theme.bg, supaya tetap terbaca di template gelap (mis.
  // monokrom) tanpa perlu bikin varian dark-mode untuk semua komponen form.
  if (done) {
    return (
      <div className={`flex flex-col gap-4 ${theme.font}`}>
        <div className="rounded-xl border border-border bg-surface p-6 text-center shadow-lg">
          <p className="font-medium text-success">Makasih ya udah konfirmasi kehadiranmu! 🤍</p>
        </div>
        {/* QR check-in (BT-02) cuma ada buat tamu roster (link personal ATAU
        auto-enroll, RG-05) yang hadir */}
        {resolvedToken && statusHadir === true && <GuestQrCode token={resolvedToken} />}
      </div>
    );
  }

  // Sudah pernah RSVP hadir sebelumnya (buka link lagi tanpa submit ulang) —
  // tetap tunjukkan QR-nya tanpa perlu isi form lagi.
  if (resolvedToken && resolvedGuestInfo?.already_responded && resolvedGuestInfo.status_hadir === true) {
    return (
      <div className={`flex flex-col gap-4 ${theme.font}`}>
        <div className="rounded-xl border border-border bg-surface p-6 text-center shadow-lg">
          <p className="font-medium text-[var(--color-text-primary)]">
            Sampai ketemu di acaranya, {resolvedGuestInfo.name}! 🤍
          </p>
        </div>
        <GuestQrCode token={resolvedToken} />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col gap-4 rounded-xl border border-border bg-surface p-6 shadow-lg ${theme.font}`}
    >
      {resolvedGuestInfo ? (
        <div>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            Halo, {resolvedGuestInfo.name}! 👋
          </p>
          {resolvedGuestInfo.already_responded && (
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Kamu sudah konfirmasi sebelumnya — kirim ulang di bawah kalau ada yang berubah.
            </p>
          )}
        </div>
      ) : (
        <Input
          label="Nama kamu"
          name="guest_name"
          required
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
        />
      )}
      <Input
        label={`Jumlah orang (termasuk kamu, maks. ${maxPax})`}
        name="jumlah_pax"
        type="number"
        min={1}
        max={maxPax}
        required
        value={jumlahPax}
        onChange={(e) => setJumlahPax(Number(e.target.value))}
      />
      <div>
        <p className="mb-1.5 text-sm font-medium text-[var(--color-text-primary)]">
          Konfirmasi kehadiran
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStatusHadir(true)}
            aria-pressed={statusHadir === true}
            className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-colors ${
              statusHadir === true
                ? "border-success bg-success/10 text-success"
                : "border-border text-[var(--color-text-primary)]"
            }`}
          >
            <Check size={16} />
            Hadir
          </button>
          <button
            type="button"
            onClick={() => setStatusHadir(false)}
            aria-pressed={statusHadir === false}
            className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-colors ${
              statusHadir === false
                ? "border-danger bg-danger/10 text-danger"
                : "border-border text-[var(--color-text-primary)]"
            }`}
          >
            <X size={16} />
            Tidak Hadir
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Mengirim..." : "Kirim RSVP"}
      </Button>
    </form>
  );
}
