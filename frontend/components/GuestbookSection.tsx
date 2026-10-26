"use client";

import { useState, type FormEvent } from "react";
import { ApiError, submitGuestbookEntry } from "@/lib/api";
import type { GuestbookEntry } from "@/lib/types";
import type { TemplateTheme } from "./InvitationView";
import { Button, Input, Textarea } from "./ui";

export function GuestbookSection({
  slug,
  initialEntries,
  theme,
}: {
  slug: string;
  initialEntries: GuestbookEntry[];
  theme: TemplateTheme;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [nama, setNama] = useState("");
  const [pesan, setPesan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const entry = await submitGuestbookEntry(slug, { nama, pesan });
      setEntries((prev) => [entry, ...prev]);
      setNama("");
      setPesan("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal kirim ucapan. Coba lagi ya.");
    } finally {
      setSubmitting(false);
    }
  }

  // Kartu SELALU terang (lihat catatan di RsvpForm.tsx) — tidak ikut warna
  // ambient template, supaya aman dipakai di template gelap juga.
  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={handleSubmit}
        className={`flex flex-col gap-4 rounded-xl border border-border bg-surface p-6 shadow-lg ${theme.font}`}
      >
        <Input
          label="Nama kamu"
          name="nama"
          required
          value={nama}
          onChange={(e) => setNama(e.target.value)}
        />
        <Textarea
          label="Ucapan & doa"
          name="pesan"
          required
          rows={3}
          value={pesan}
          onChange={(e) => setPesan(e.target.value)}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Mengirim..." : "Kirim Ucapan"}
        </Button>
      </form>

      {entries.length > 0 && (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`rounded-xl border border-border bg-surface p-4 shadow-lg ${theme.font}`}
            >
              <p className="font-medium text-[var(--color-text-primary)]">{entry.nama}</p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{entry.pesan}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
