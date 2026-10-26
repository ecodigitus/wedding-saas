"use client";

import { useEffect, useRef } from "react";

/** Pemicu animasi section template "Burgundy Royal" saat masuk viewport.
 *
 * Pola sama dengan ScrollReveal: kelas `royal-pre` (elemen `.royal-anim`
 * disembunyikan) cuma ditambah lewat JS, tidak pernah ada di HTML SSR — jadi
 * tanpa JS konten tetap tampil. Begitu section terlihat, `royal-pre` diganti
 * `royal-in` dan anak ber-kelas `royal-anim*` memutar animasinya (lihat
 * globals.css). Section yang sudah terlihat saat mount dilewati. */
export function RoyalSection({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.6) {
      el.classList.add("royal-in");
      return;
    }

    el.classList.add("royal-pre");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.remove("royal-pre");
          el.classList.add("royal-in");
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
