"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";
import { getSiteOrigin } from "@/lib/site";
import { Button, Card } from "./ui";

/**
 * RG-07 (Mode Registrasi-Saja, task.v2.md Bagian 11) — panduan "Cara
 * sambungkan": link siap-copy, snippet tombol HTML untuk ditempel ke
 * undangan vendor, dan QR TINGKAT-ACARA (RG-06) untuk dicetak di undangan
 * kertas. Beda dari `GuestQrModal`/`GuestQrCode` — payload QR di sini
 * adalah URL PENUH `/r/{slug}` (satu QR generik untuk semua tamu), bukan
 * `invite_token` milik satu tamu tertentu.
 */
export function RegistrationLinkCard({ slug }: { slug: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // `getSiteOrigin()` — domain kanonik (`NEXT_PUBLIC_SITE_URL`) kalau ada,
  // bukan `window.location.origin` — supaya link/QR yang dicetak selalu
  // benar terlepas dari host mana dashboard diakses (lihat lib/site.ts).
  // Inisialisasi lazy (bukan effect+setState) supaya nol cascading render;
  // aman karena komponen ini HANYA pernah dipasang dari editor/page.tsx
  // setelah `useMyEvent()` selesai fetch client-side — tidak ada HTML server
  // yang perlu dicocokkan buat subtree ini, jadi nol risiko hydration mismatch.
  const [origin] = useState(() => getSiteOrigin());
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<"link" | "snippet" | null>(null);

  const url = `${origin}/r/${slug}`;
  const snippet = `<a href="${url}">Konfirmasi Kehadiran</a>`;

  useEffect(() => {
    if (!url || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, { width: 200, margin: 1 }).then(() => {
      setQrDataUrl(canvasRef.current?.toDataURL("image/png") ?? null);
    });
  }, [url]);

  async function handleCopy(field: "link" | "snippet", text: string) {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedField(field);
      setTimeout(() => setCopiedField((f) => (f === field ? null : f)), 2000);
    } else {
      window.prompt("Gagal auto-copy, salin manual:", text);
    }
  }

  return (
    <Card className="flex flex-col gap-5 p-6">
      <div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">Link registrasi</p>
        <p className="mb-2 text-sm text-[var(--color-text-secondary)]">
          Sambungkan dari undangan yang sudah ada — tempel sebagai tombol/link
          &quot;Konfirmasi Kehadiran&quot;.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-md border border-border bg-background px-3 py-2 text-sm">
            {url}
          </code>
          <Button type="button" variant="secondary" onClick={() => handleCopy("link", url)}>
            <Copy size={16} />
            {copiedField === "link" ? "Tersalin!" : "Salin"}
          </Button>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          Snippet tombol HTML (opsional, kalau undangan vendor mengizinkan edit HTML)
        </p>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-md border border-border bg-background px-3 py-2 text-sm">
            {snippet}
          </code>
          <Button type="button" variant="secondary" onClick={() => handleCopy("snippet", snippet)}>
            <Copy size={16} />
            {copiedField === "snippet" ? "Tersalin!" : "Salin"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-start gap-2">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          QR untuk dicetak di undangan kertas
        </p>
        <canvas ref={canvasRef} className="rounded-lg border border-border" />
        {qrDataUrl && (
          <a href={qrDataUrl} download={`qr-registrasi-${slug}.png`}>
            <Button type="button" variant="secondary">
              <Download size={16} />
              Download PNG
            </Button>
          </a>
        )}
      </div>
    </Card>
  );
}
