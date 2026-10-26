"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import type { TemplateTheme } from "./InvitationView";

/** Peta baru dimuat saat tombolnya diklik — embed Google Maps pihak ketiga
 * terbukti jadi porsi terbesar (>70%) waktu loading halaman (lihat
 * scripts/audit-loadtime.mjs), padahal bukan konten inti (RSVP/info acara
 * tetap bisa dipakai tanpanya). Selaras NFR "< 2 detik di 4G" (PRD.v2 Bagian 6). */
export function LazyMapEmbed({ src, theme }: { src: string; theme: TemplateTheme }) {
  const [loaded, setLoaded] = useState(false);

  if (!loaded) {
    return (
      <button
        type="button"
        onClick={() => setLoaded(true)}
        className={`flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors ${
          theme.mode === "dark"
            ? "border-white/20 hover:bg-white/5"
            : "border-black/10 hover:bg-black/5"
        }`}
      >
        <MapPin size={22} className={theme.accent} />
        Tampilkan peta lokasi
      </button>
    );
  }

  return (
    <iframe
      title="Lokasi acara"
      src={src}
      className="h-56 w-full rounded-xl border-0"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
