"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { TemplateTheme } from "./InvitationView";

/** UW-11 (Premium). Browser blokir autoplay bersuara sebelum ada interaksi
 * user — jadi ini tombol play/jeda manual, bukan autoplay. State `playing`
 * disinkron lewat event `onPlay`/`onPause` di elemen <audio>, bukan
 * diasumsikan langsung dari pemanggilan play() (yang async & bisa gagal
 * diam-diam kalau browser tetap menolak). */
export function MusicPlayer({ src, theme }: { src: string; theme: TemplateTheme }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {
        // Tetap diblokir browser — tombol tidak berubah status, user bisa coba lagi.
      });
    } else {
      audio.pause();
    }
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={src}
        loop
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Jeda musik latar" : "Putar musik latar"}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
          theme.mode === "dark"
            ? "border-white/20 hover:bg-white/5"
            : "border-black/10 hover:bg-black/5"
        }`}
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
        {playing ? "Jeda musik" : "Putar musik"}
      </button>
    </>
  );
}
