"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

/**
 * QR check-in (BT-02) — payload-nya invite_token tamu itu sendiri (bukan
 * URL), karena cuma dipakai internal oleh scanner dashboard mempelai/WO,
 * bukan untuk dibuka langsung sebagai link.
 */
export function GuestQrCode({ token }: { token: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, token, { width: 200, margin: 1 }).catch(() => setError(true));
  }, [token]);

  if (error) return null;

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-6 text-center shadow-lg">
      <p className="text-sm font-medium text-[var(--color-text-primary)]">
        Tunjukkan QR ini saat kedatangan ya
      </p>
      <canvas ref={canvasRef} className="rounded-lg" />
    </div>
  );
}
