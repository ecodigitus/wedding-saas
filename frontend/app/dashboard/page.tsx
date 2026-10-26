"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useMyEvent } from "@/lib/use-my-event";
import { buttonClasses, Card } from "@/components/ui";

export default function DashboardHomePage() {
  const { event, loading } = useMyEvent();

  if (loading) {
    return <p className="text-[var(--color-text-secondary)]">Memuat undanganmu...</p>;
  }

  if (!event) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <h1 className="font-heading text-2xl font-semibold text-primary-dark">
          Belum ada undangan
        </h1>
        <p className="max-w-md text-sm text-[var(--color-text-secondary)]">
          Yuk mulai buat undangan digitalmu — isi data mempelai & acara, publish dalam kurang
          dari 5 menit.
        </p>
        <Link href="/dashboard/editor" className={buttonClasses("primary")}>
          Buat Undangan
        </Link>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-semibold text-primary-dark">
              {event.partner1_name} &amp; {event.partner2_name}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {new Date(event.event_date).toLocaleDateString("id-ID", { dateStyle: "full" })}
            </p>
            <p className="mt-2 text-sm">
              Status:{" "}
              <span
                className={
                  event.is_published ? "font-medium text-success" : "font-medium text-warning"
                }
              >
                {event.is_published ? "Sudah dipublish" : "Draft"}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/editor" className={buttonClasses("secondary")}>
              Edit Undangan
            </Link>
            {event.is_published && (
              <a
                href={`/${event.slug}`}
                target="_blank"
                rel="noreferrer"
                className={buttonClasses("ghost")}
              >
                Lihat Halaman Publik
                <ExternalLink size={16} />
              </a>
            )}
          </div>
        </div>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/dashboard/rsvp">
          <Card className="p-6 transition-shadow hover:shadow-md">
            <h2 className="font-heading text-lg font-semibold text-primary-dark">RSVP</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Lihat &amp; export data tamu yang sudah konfirmasi.
            </p>
          </Card>
        </Link>
        <Link href="/dashboard/guestbook">
          <Card className="p-6 transition-shadow hover:shadow-md">
            <h2 className="font-heading text-lg font-semibold text-primary-dark">Buku Tamu</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Baca ucapan &amp; doa dari tamu undanganmu.
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
