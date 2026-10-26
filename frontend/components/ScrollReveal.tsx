"use client";

import { useEffect, useRef } from "react";

/** Fade + slide-up sekali saat section pertama kali masuk viewport (pola yang
 * konsisten dipakai kompetitor Katsudoto di semua section undangan mereka).
 *
 * Toggle CLASS DOM langsung lewat ref (bukan React state) — sengaja, tiga
 * alasan: (1) konten tetap tampil kalau JS gagal load/dimatikan, karena kelas
 * "tersembunyi" (`reveal-pending`) cuma pernah ditambah lewat JS, tidak pernah
 * ada di HTML hasil SSR — jadi ini murni progressive enhancement, bukan
 * prasyarat supaya konten kelihatan; (2) tidak ada flash-of-invisible-content
 * pas hydrate; (3) tidak perlu setState sinkron di body effect
 * (react-hooks/set-state-in-effect) untuk sesuatu yang murni presentational.
 *
 * Section yang SUDAH kelihatan di viewport saat mount (mis. hero di atas
 * fold) sengaja dilewati animasinya — dicek sekali lewat getBoundingClientRect
 * sebelum observer dipasang, supaya tidak ada kedip "hilang sebentar lalu
 * muncul lagi" untuk konten yang dari awal sudah kelihatan. */
export function ScrollReveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = el.getBoundingClientRect();
    const alreadyVisible = rect.top < window.innerHeight * 0.85;
    if (alreadyVisible) return;

    el.classList.add("reveal-pending");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.remove("reveal-pending");
          el.classList.add("reveal-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal-target ${className}`}>
      {children}
    </div>
  );
}
