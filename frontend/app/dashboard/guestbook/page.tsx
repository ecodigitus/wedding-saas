"use client";

import { useEffect, useState } from "react";
import { Download, MessageCircleHeart } from "lucide-react";
import { useMyEvent } from "@/lib/use-my-event";
import { ApiError, downloadGuestbookCsv, listGuestbookEntries } from "@/lib/api";
import type { GuestbookEntry } from "@/lib/types";
import { Button, Card, EmptyState } from "@/components/ui";

export default function GuestbookDashboardPage() {
  const { event, loading: loadingEvent } = useMyEvent();
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!event) return;
    let ignore = false;
    listGuestbookEntries(event.id)
      .then((data) => {
        if (!ignore) setEntries(data);
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof ApiError ? err.message : "Gagal memuat buku tamu.");
      })
      .finally(() => {
        if (!ignore) setLoadingEntries(false);
      });
    return () => {
      ignore = true;
    };
  }, [event]);

  const loading = loadingEvent || (!!event && loadingEntries);

  async function handleExport() {
    if (!event) return;
    setExporting(true);
    try {
      await downloadGuestbookCsv(event.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal export CSV.");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return <p className="text-[var(--color-text-secondary)]">Memuat...</p>;
  }

  if (!event) {
    return (
      <EmptyState
        title="Belum ada undangan"
        description="Buat undangan dulu di menu Editor sebelum bisa menerima ucapan."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-primary-dark">Buku Tamu</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">{entries.length} ucapan</p>
        </div>
        <Button
          variant="secondary"
          onClick={handleExport}
          disabled={exporting || entries.length === 0}
        >
          <Download size={16} />
          {exporting ? "Mengekspor..." : "Export CSV"}
        </Button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {entries.length === 0 ? (
        <EmptyState
          icon={<MessageCircleHeart size={28} strokeWidth={1.5} />}
          title="Belum ada ucapan masuk"
          description="Tamu bisa tulis ucapan & doa lewat halaman undanganmu. Nanti muncul di sini."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {entries.map((entry) => (
            <Card key={entry.id} className="p-4">
              <p className="font-medium text-[var(--color-text-primary)]">{entry.nama}</p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{entry.pesan}</p>
              <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                {new Date(entry.created_at).toLocaleString("id-ID")}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
