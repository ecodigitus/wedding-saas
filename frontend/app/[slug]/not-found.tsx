import Link from "next/link";

export default function InvitationNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
      <h1 className="font-heading text-2xl font-semibold text-primary-dark">
        Undangan tidak ditemukan
      </h1>
      <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">
        Link ini mungkin salah ketik, atau undangannya belum dipublish oleh mempelai.
      </p>
      <Link href="/" className="text-sm font-medium text-primary-dark underline">
        Kembali ke halaman utama
      </Link>
    </div>
  );
}
