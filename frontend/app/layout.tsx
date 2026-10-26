import type { Metadata } from "next";
import { Alex_Brush, Dancing_Script, Great_Vibes, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Self-host via next/font/google — subset Latin, font-display: swap.
// styleguide.v2.md §3: Playfair Display untuk heading dashboard/marketing,
// Inter untuk body. Bukan dipakai di halaman undangan publik (pakai font template).
const playfairDisplay = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

// Khusus nama mempelai di template "Taman Manis" (script/cursive romantis) —
// bukan token sistem, cuma dipakai di 1 elemen di 1 template (InvitationView.tsx).
const dancingScript = Dancing_Script({
  variable: "--font-script",
  subsets: ["latin"],
  display: "swap",
});

// Font script asli desain Canva acuan (terbaca dari @font-face: GreatVibes)
// untuk judul & monogram template "Burgundy Royal" (components/RoyalInvitation.tsx).
const greatVibes = Great_Vibes({
  variable: "--font-royal",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// Font monogram (huruf "A" & "B" besar) — paling mirip font monogram di desain
// Canva acuan (kapital dengan sapuan "C" di kiri). Dipakai bersama outline-nya
// untuk efek tulis (lib/alexBrushGlyphs.json).
const alexBrush = Alex_Brush({
  variable: "--font-monogram",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Undangan Digital — Wedding SaaS",
  description: "Buat undangan pernikahan digital, kelola RSVP, dan buku tamu dalam satu tempat.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${playfairDisplay.variable} ${inter.variable} ${dancingScript.variable} ${greatVibes.variable} ${alexBrush.variable} h-full`}>
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
