import Link from "next/link";
import { buttonClasses } from "@/components/ui";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <div className="max-w-md">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">Wedding SaaS</p>
        <h1 className="mt-3 font-heading text-4xl font-semibold text-primary-dark">
          Satu platform untuk merencanakan, mengundang, dan menyambut tamu di hari pernikahanmu
        </h1>
        <p className="mt-4 text-[var(--color-text-secondary)]">
          Buat undangan digital, kelola RSVP, dan baca ucapan tamu — semuanya dalam satu
          dashboard, publish dalam hitungan menit.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/register" className={buttonClasses("primary")}>
            Buat Undangan Gratis
          </Link>
          <Link href="/login" className={buttonClasses("secondary")}>
            Masuk
          </Link>
        </div>
      </div>
    </main>
  );
}
