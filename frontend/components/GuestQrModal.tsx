"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, X } from "lucide-react";
import { Button } from "./ui";

/**
 * Preview QR dari sisi owner (Kelola Tamu) — beda dari GuestQrCode yang
 * tampil ke tamu sendiri di halaman publik setelah konfirmasi hadir. Modal
 * ini dipakai supaya mempelai/WO bisa siapin/cetak QR tiap tamu dari awal,
 * tanpa nunggu tamu itu buka link personalnya dan pilih Hadir dulu.
 */
export function GuestQrModal({
  guestName,
  token,
  onClose,
}: {
  guestName: string;
  token: string;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, token, { width: 240, margin: 1 }).then(() => {
      setDataUrl(canvasRef.current?.toDataURL("image/png") ?? null);
    });
  }, [token]);

  // Dialog custom (bukan elemen <dialog> native) — wajib tangani Escape
  // sendiri, dan pindahkan fokus ke dalam modal saat terbuka supaya
  // pengguna keyboard/screen reader tidak "kehilangan" posisi di halaman.
  useEffect(() => {
    closeButtonRef.current?.focus();
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`QR ${guestName}`}
        className="flex flex-col items-center gap-4 rounded-xl bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex w-full items-center justify-between gap-4">
          <p className="font-medium text-[var(--color-text-primary)]">QR {guestName}</p>
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
        <canvas ref={canvasRef} className="rounded-lg" />
        <p className="max-w-[240px] text-center text-sm text-[var(--color-text-secondary)]">
          Siapkan/cetak QR ini buat tamu — dipakai buat check-in di venue nanti.
        </p>
        {dataUrl && (
          <a href={dataUrl} download={`qr-${guestName.toLowerCase().replace(/\s+/g, "-")}.png`}>
            <Button variant="secondary">
              <Download size={16} />
              Download PNG
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
