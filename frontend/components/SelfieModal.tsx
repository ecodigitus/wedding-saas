"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { ApiError, getGuestSelfieUrl } from "@/lib/api";

/**
 * Preview foto Selfie Check-in (BT-03) dari sisi owner. Signed URL diminta
 * on-demand tiap modal dibuka (bukan disimpan/di-cache) — berdurasi pendek
 * dari backend, jadi kalau modal dibiarkan terbuka lama link-nya kedaluwarsa
 * sendiri, bukan masalah karena cuma dipakai sekali render <img>.
 */
export function SelfieModal({
  guestName,
  eventId,
  guestId,
  onClose,
}: {
  guestName: string;
  eventId: string;
  guestId: string;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getGuestSelfieUrl(eventId, guestId)
      .then((data) => {
        if (!ignore) setUrl(data.url);
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof ApiError ? err.message : "Gagal memuat foto.");
      });
    return () => {
      ignore = true;
    };
  }, [eventId, guestId]);

  useEffect(() => {
    closeButtonRef.current?.focus();
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Foto selfie check-in ${guestName}`}
        className="flex flex-col items-center gap-4 rounded-xl bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex w-full items-center justify-between gap-4">
          <p className="font-medium text-[var(--color-text-primary)]">Selfie {guestName}</p>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            <X size={18} />
          </button>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {!url && !error && <p className="text-sm text-[var(--color-text-secondary)]">Memuat foto...</p>}
        {url && (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL S3 sementara, bukan aset yang bisa dikonfigurasi next/image remotePatterns.
          <img src={url} alt={`Foto selfie check-in ${guestName}`} className="max-h-[60vh] rounded-lg" />
        )}
      </div>
    </div>
  );
}
