import { useId } from "react";

// Elemen dekoratif template "Burgundy Royal" — digambar ulang sebagai SVG/CSS
// dari elemen yang terlihat di desain Canva acuan (amplop bersegel, plakat
// krem, renda, rumbai, bunga lili, bingkai emas berukir, kartu bertepi
// lengkung, polaroid, satin). Semua murni dekoratif (aria-hidden) dan tanpa
// aset gambar pihak lain.

const GOLD_STOPS = [
  ["0", "#fbe9a6"],
  ["0.3", "#c8962f"],
  ["0.55", "#f4dc8e"],
  ["0.78", "#9a6a1c"],
  ["1", "#e8c566"],
] as const;

function GoldGradient({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      {GOLD_STOPS.map(([o, c]) => (
        <stop key={o} offset={o} stopColor={c} />
      ))}
    </linearGradient>
  );
}

/** Titik-titik di sepanjang elips — dipakai untuk manik-manik bingkai. */
function ellipsePoints(cx: number, cy: number, rx: number, ry: number, n: number) {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return { x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) };
  });
}

/** Bingkai emas berukir. `oval` atau persegi; isi (foto / placeholder)
 * di-clip ke dalam bukaan bingkai. */
export function OrnateFrame({
  shape = "oval",
  className = "",
  children,
}: {
  shape?: "oval" | "rect";
  className?: string;
  children: React.ReactNode;
}) {
  const gid = useId().replace(/:/g, "");
  if (shape === "rect") {
    const beads = [
      ...Array.from({ length: 5 }, (_, i) => ({ x: 28 + i * 36, y: 6 })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: 28 + i * 36, y: 234 })),
      ...Array.from({ length: 6 }, (_, i) => ({ x: 6, y: 30 + i * 36 })),
      ...Array.from({ length: 6 }, (_, i) => ({ x: 194, y: 30 + i * 36 })),
    ];
    return (
      <div className={`relative aspect-[200/240] drop-shadow-[0_8px_14px_rgba(0,0,0,0.55)] ${className}`}>
        <div className="absolute overflow-hidden bg-[#2e0711]" style={{ left: "10%", top: "8.5%", width: "80%", height: "83%" }}>
          {children}
        </div>
        <svg viewBox="0 0 200 240" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <GoldGradient id={gid} />
          </defs>
          <rect x="4" y="4" width="192" height="232" rx="6" fill="none" stroke={`url(#${gid})`} strokeWidth="9" />
          <rect x="14" y="14" width="172" height="212" rx="3" fill="none" stroke={`url(#${gid})`} strokeWidth="5" />
          <rect x="19.5" y="19.5" width="161" height="201" fill="none" stroke="#5e3f0e" strokeWidth="1.6" />
          {beads.map((b, i) => (
            <circle key={i} cx={b.x} cy={b.y} r="3.6" fill={`url(#${gid})`} stroke="#6b4a12" strokeWidth="0.5" />
          ))}
          {[
            [10, 10],
            [190, 10],
            [10, 230],
            [190, 230],
          ].map(([x, y]) => (
            <g key={`${x}-${y}`}>
              <circle cx={x} cy={y} r="10" fill={`url(#${gid})`} stroke="#6b4a12" strokeWidth="0.8" />
              <circle cx={x} cy={y} r="4" fill="#7a1f33" />
            </g>
          ))}
        </svg>
      </div>
    );
  }

  const beads = ellipsePoints(100, 125, 91, 116, 30);
  return (
    <div className={`relative aspect-[200/262] drop-shadow-[0_8px_14px_rgba(0,0,0,0.55)] ${className}`}>
      <div
        className="absolute overflow-hidden rounded-[50%] bg-[#2e0711]"
        style={{ left: "12%", top: "13.7%", width: "76%", height: "77.1%" }}
      >
        {children}
      </div>
      <svg viewBox="0 -12 200 262" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <GoldGradient id={gid} />
        </defs>
        <ellipse cx="100" cy="125" rx="96" ry="121" fill="none" stroke={`url(#${gid})`} strokeWidth="6" />
        {beads.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y} r="5" fill={`url(#${gid})`} stroke="#6b4a12" strokeWidth="0.6" />
        ))}
        <ellipse cx="100" cy="125" rx="82" ry="107" fill="none" stroke={`url(#${gid})`} strokeWidth="5" />
        <ellipse cx="100" cy="125" rx="76.5" ry="101.5" fill="none" stroke="#5e3f0e" strokeWidth="1.6" />
        {/* mahkota ukir di puncak */}
        <path
          d="M100 -10 C90 -12 82 -2 90 6 C94 10 98 8 100 4 C102 8 106 10 110 6 C118 -2 110 -12 100 -10 Z"
          fill={`url(#${gid})`}
          stroke="#6b4a12"
          strokeWidth="0.7"
        />
        <path d="M70 12 C80 2 90 8 94 14 M130 12 C120 2 110 8 106 14" fill="none" stroke={`url(#${gid})`} strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="100" cy="2" r="3.2" fill="#7a1f33" />
        {/* daun ukir di dasar */}
        <path d="M100 246 C86 248 76 240 72 232 C84 232 94 236 100 244 C106 236 116 232 128 232 C124 240 114 248 100 246 Z" fill={`url(#${gid})`} stroke="#6b4a12" strokeWidth="0.7" />
      </svg>
    </div>
  );
}

/** Bunga lili krem bertotol marun, benang sari beranter, dengan daun hijau tua. */
export function Lily({ className = "", leaves = true }: { className?: string; leaves?: boolean }) {
  const gid = useId().replace(/:/g, "");
  const petal = "M100 100 C70 76 62 34 100 2 C138 34 130 76 100 100 Z";
  const innerPetal = "M100 100 C78 78 74 44 100 14 C126 44 122 78 100 100 Z";
  const speckles = [
    [94, 70],
    [106, 66],
    [98, 56],
    [90, 80],
    [108, 80],
    [100, 44],
  ];
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={gid} cx="0.5" cy="1" r="1">
          <stop offset="0" stopColor="#e9a9ad" />
          <stop offset="0.45" stopColor="#f6dcd0" />
          <stop offset="1" stopColor="#fdf4e6" />
        </radialGradient>
      </defs>
      {leaves && (
        <g fill="#2f4a2a" stroke="#1e3319" strokeWidth="0.8">
          <path d="M100 110 C60 150 30 150 8 138 C34 112 70 104 100 110 Z" />
          <path d="M100 110 C140 150 170 150 192 138 C166 112 130 104 100 110 Z" />
        </g>
      )}
      {[0, 120, 240].map((deg) => (
        <g key={`o${deg}`} transform={`rotate(${deg} 100 100)`}>
          <path d={petal} fill={`url(#${gid})`} stroke="#c98f8a" strokeWidth="0.9" />
          <path d="M100 96 C99 60 100 30 100 10" stroke="#9b2c45" strokeWidth="1.3" fill="none" opacity="0.65" />
          {speckles.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.6" fill="#8a1f3a" opacity="0.8" />
          ))}
        </g>
      ))}
      {[60, 180, 300].map((deg) => (
        <g key={`i${deg}`} transform={`rotate(${deg} 100 100)`}>
          <path d={innerPetal} fill={`url(#${gid})`} stroke="#c98f8a" strokeWidth="0.9" />
          <path d="M100 96 C99 64 100 38 100 20" stroke="#9b2c45" strokeWidth="1.1" fill="none" opacity="0.6" />
          {speckles.slice(0, 4).map(([x, y], i) => (
            <circle key={i} cx={x} cy={y + 8} r="1.4" fill="#8a1f3a" opacity="0.75" />
          ))}
        </g>
      ))}
      {[10, 70, 130, 190, 250, 310].map((deg) => (
        <g key={`s${deg}`} transform={`rotate(${deg} 100 100)`}>
          <path d="M100 100 C101 84 99 70 100 56" stroke="#8c6a3a" strokeWidth="1.3" fill="none" />
          <ellipse cx="100" cy="54" rx="2.6" ry="6.5" fill="#a1471f" />
        </g>
      ))}
      <path d="M100 100 L100 40" stroke="#6f8a4a" strokeWidth="2" />
      <circle cx="100" cy="38" r="3.4" fill="#c9d37a" />
      <circle cx="100" cy="100" r="5" fill="#cfd89a" />
    </svg>
  );
}

/** Rumbai (tassel) marun dengan cincin leher emas. */
export function Tassel({ className = "" }: { className?: string }) {
  const gid = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 40 130" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4e0b19" />
          <stop offset="0.5" stopColor="#a1233b" />
          <stop offset="1" stopColor="#4e0b19" />
        </linearGradient>
      </defs>
      <path d="M20 1 C7 7 7 24 20 28 C33 24 33 7 20 1" fill="none" stroke="#7a1f33" strokeWidth="2.6" />
      <circle cx="20" cy="34" r="7.5" fill={`url(#${gid})`} />
      <rect x="12" y="43" width="16" height="6" rx="2" fill="#d4a640" />
      <path d="M9 50 Q20 44 31 50 L37 122 Q20 129 3 122 Z" fill={`url(#${gid})`} />
      {Array.from({ length: 9 }, (_, i) => (
        <path key={i} d={`M${9 + i * 2.8} 52 L${5 + i * 3.8} 124`} stroke="#3a0711" strokeWidth="0.7" opacity="0.7" />
      ))}
    </svg>
  );
}

/** Segel lilin merah dengan cincin timbul dan huruf (inisial) di tengah. */
export function WaxSeal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const gid = useId().replace(/:/g, "");
  return (
    <div className={className} aria-hidden="true">
      <div className="relative h-full w-full">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full drop-shadow-[0_3px_5px_rgba(0,0,0,0.55)]">
        <defs>
          <radialGradient id={gid} cx="0.35" cy="0.3" r="0.9">
            <stop offset="0" stopColor="#d2354f" />
            <stop offset="0.6" stopColor="#a3182f" />
            <stop offset="1" stopColor="#5c0a1a" />
          </radialGradient>
        </defs>
        <path
          d="M50 4 C62 2 72 10 80 14 C92 20 98 34 94 48 C98 62 92 78 80 84 C70 92 60 98 48 96 C34 98 22 90 14 80 C4 70 2 56 6 44 C2 30 10 18 22 12 C32 6 40 6 50 4 Z"
          fill={`url(#${gid})`}
        />
        <circle cx="50" cy="50" r="31" fill="none" stroke="#5c0a1a" strokeWidth="2" opacity="0.7" />
        <circle cx="50" cy="50" r="28" fill="none" stroke="#e8707f" strokeWidth="0.8" opacity="0.6" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-royal text-[#f6c9cf]">{children}</div>
      </div>
    </div>
  );
}

/** Renda krem bertepi lengkung (pita di tepi bawah amplop). */
export function LaceStrip({ className = "" }: { className?: string }) {
  const pid = useId().replace(/:/g, "");
  return (
    <svg className={className} aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 320 16">
      <defs>
        <pattern id={pid} width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="9" fill="#f3e4c8" />
          <circle cx="8" cy="9" r="7" fill="#f3e4c8" />
          <circle cx="8" cy="9" r="3.4" fill="none" stroke="#b98a8f" strokeWidth="0.9" />
          <circle cx="8" cy="3.6" r="1.1" fill="#b98a8f" />
        </pattern>
      </defs>
      <rect width="320" height="16" fill={`url(#${pid})`} />
    </svg>
  );
}

/** Foto polaroid miring dengan bingkai putih; `children` = foto/placeholder. */
export function Polaroid({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`bg-[#fbf7ef] p-2 pb-6 shadow-[0_6px_14px_rgba(0,0,0,0.5)] ${className}`}>
      <div className="aspect-square overflow-hidden bg-[#3a0a15]">{children}</div>
    </div>
  );
}

/** Path persegi bertepi lengkung (scallop) untuk kartu die-cut. */
function scallopPath(w: number, h: number, nx: number, ny: number): string {
  // Margin = radius busur supaya lengkungan tidak keluar dari viewBox:
  // w = 2*margin + nx*seg, margin = seg/2  =>  seg = w / (nx + 1).
  const segX = w / (nx + 1);
  const rx = segX / 2;
  const mx = rx;
  const segY = h / (ny + 1);
  const ry = segY / 2;
  const my = ry;
  let d = `M${mx} ${my}`;
  for (let i = 1; i <= nx; i++) d += ` A${rx} ${rx} 0 0 1 ${mx + i * segX} ${my}`;
  for (let j = 1; j <= ny; j++) d += ` A${ry} ${ry} 0 0 1 ${w - mx} ${my + j * segY}`;
  for (let i = 1; i <= nx; i++) d += ` A${rx} ${rx} 0 0 1 ${w - mx - i * segX} ${h - my}`;
  for (let j = 1; j <= ny; j++) d += ` A${ry} ${ry} 0 0 1 ${mx} ${h - my - j * segY}`;
  return d + " Z";
}

/** Kartu undangan krem bertepi lengkung dengan ukiran marun & rumbai. */
export function ScallopCard({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const gid = useId().replace(/:/g, "");
  const outer = scallopPath(220, 300, 8, 11);
  return (
    <div className={`relative aspect-[220/300] drop-shadow-[0_8px_14px_rgba(0,0,0,0.5)] ${className}`}>
      <svg viewBox="0 0 220 300" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f8ecd6" />
            <stop offset="1" stopColor="#e7cfae" />
          </linearGradient>
        </defs>
        <path d={outer} fill={`url(#${gid})`} stroke="#8a2338" strokeWidth="1.6" />
        <g transform="translate(14 14) scale(0.873 0.9467)">
          <path d={outer} fill="none" stroke="#8a2338" strokeWidth="1" opacity="0.8" />
        </g>
        <rect x="30" y="30" width="160" height="240" rx="14" fill="none" stroke="#8a2338" strokeWidth="0.8" strokeDasharray="1.6 3" opacity="0.7" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 py-10 text-center text-[#7A1F33]">
        {children}
      </div>
    </div>
  );
}

/** Plakat krem berbingkai ukir (label di atas amplop). */
export function CreamPlaque({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <div className="relative h-full w-full">
      <svg viewBox="0 0 240 110" preserveAspectRatio="none" className="absolute inset-0 h-full w-full drop-shadow-[0_3px_5px_rgba(0,0,0,0.4)]" aria-hidden="true">
        <path
          d="M30 4 H210 C214 14 224 18 236 20 V90 C224 92 214 96 210 106 H30 C26 96 16 92 4 90 V20 C16 18 26 14 30 4 Z"
          fill="#f3e4c8"
          stroke="#9a6a2c"
          strokeWidth="2"
        />
        <path
          d="M34 11 H206 C210 20 218 25 228 27 V83 C218 85 210 90 206 99 H34 C30 90 22 85 12 83 V27 C22 25 30 20 34 11 Z"
          fill="none"
          stroke="#b98a5a"
          strokeWidth="1"
        />
      </svg>
      <div className="relative flex h-full flex-col items-center justify-center text-[#7A1F33]">{children}</div>
      </div>
    </div>
  );
}
