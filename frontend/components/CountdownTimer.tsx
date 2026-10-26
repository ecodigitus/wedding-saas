"use client";

import { useEffect, useState } from "react";
import type { TemplateTheme } from "./InvitationView";

type Remaining = { days: number; hours: number; minutes: number; seconds: number };

function computeRemaining(target: Date): Remaining | null {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor(diff / (1000 * 60 * 60)) % 24,
    minutes: Math.floor(diff / (1000 * 60)) % 60,
    seconds: Math.floor(diff / 1000) % 60,
  };
}

/** UW-11 (Premium). Client component (butuh interval tick tiap detik) —
 * `targetIso` dihitung server/parent-side dari waktu_akad/waktu_resepsi/
 * event_date (lihat resolveCountdownTarget di InvitationView.tsx). Mulai
 * `null` sampai hydrate (SSR tidak tahu waktu klien), pola yang sama dengan
 * LazyMapEmbed. */
export function CountdownTimer({ targetIso, theme }: { targetIso: string; theme: TemplateTheme }) {
  const [remaining, setRemaining] = useState<Remaining | null>(null);

  useEffect(() => {
    const target = new Date(targetIso);
    // Tidak ada setState sinkron di sini (cuma di dalam callback interval,
    // async) — react-hooks/set-state-in-effect. Konsekuensinya angka baru
    // muncul ~1 detik setelah mount, dianggap wajar untuk countdown.
    const interval = setInterval(() => setRemaining(computeRemaining(target)), 1000);
    return () => clearInterval(interval);
  }, [targetIso]);

  if (!remaining) return null;

  const units = [
    { label: "Hari", value: remaining.days },
    { label: "Jam", value: remaining.hours },
    { label: "Menit", value: remaining.minutes },
    { label: "Detik", value: remaining.seconds },
  ];

  return (
    <div
      className="flex justify-center gap-4"
      role="timer"
      aria-label={`${remaining.days} hari ${remaining.hours} jam ${remaining.minutes} menit lagi menuju hari bahagia`}
    >
      {units.map((u) => (
        <div key={u.label} className="flex flex-col items-center" aria-hidden="true">
          <span className={`text-2xl font-semibold tabular-nums ${theme.accent}`}>
            {String(u.value).padStart(2, "0")}
          </span>
          <span className={`text-xs uppercase tracking-widest ${theme.muted}`}>{u.label}</span>
        </div>
      ))}
    </div>
  );
}
