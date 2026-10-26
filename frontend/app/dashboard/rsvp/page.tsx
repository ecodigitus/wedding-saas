"use client";

import { useEffect, useState } from "react";
import { Download, Inbox } from "lucide-react";
import { useMyEvent } from "@/lib/use-my-event";
import { ApiError, downloadRsvpCsv, listGuests, listRsvps } from "@/lib/api";
import type { Guest, RSVP } from "@/lib/types";
import { Button, Card, EmptyState, StatusBadge } from "@/components/ui";

export default function RsvpDashboardPage() {
  const { event, loading: loadingEvent } = useMyEvent();
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [pendingGuests, setPendingGuests] = useState<Guest[]>([]);
  const [loadingRsvps, setLoadingRsvps] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!event) return;
    let ignore = false;
    // Ganti isPremium (tier akun) — paket sekarang melekat ke EVENT.
    const hasPackage = event.package != null;

    Promise.all([listRsvps(event.id), hasPackage ? listGuests(event.id) : Promise.resolve([])])
      .then(([rsvpData, guestData]) => {
        if (ignore) return;
        setRsvps(rsvpData);
        // Tamu roster yang belum RSVP sama sekali — biar keliatan "Menunggu"
        // di sini juga, bukan cuma di Kelola Tamu (UW-08).
        setPendingGuests(guestData.filter((g) => g.rsvp_status === "menunggu"));
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof ApiError ? err.message : "Gagal memuat RSVP.");
      })
      .finally(() => {
        if (!ignore) setLoadingRsvps(false);
      });
    return () => {
      ignore = true;
    };
  }, [event]);

  const loading = loadingEvent || (!!event && loadingRsvps);

  async function handleExport() {
    if (!event) return;
    setExporting(true);
    try {
      await downloadRsvpCsv(event.id);
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
        description="Buat undangan dulu di menu Editor sebelum bisa menerima RSVP."
      />
    );
  }

  const totalHadir = rsvps
    .filter((r) => r.status_hadir)
    .reduce((sum, r) => sum + r.jumlah_pax, 0);
  const hasAnyRows = rsvps.length > 0 || pendingGuests.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-primary-dark">RSVP</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {rsvps.length} respons &middot; {totalHadir} orang akan hadir
            {pendingGuests.length > 0 && <> &middot; {pendingGuests.length} menunggu respons</>}
          </p>
        </div>
        <Button variant="secondary" onClick={handleExport} disabled={exporting || rsvps.length === 0}>
          <Download size={16} />
          {exporting ? "Mengekspor..." : "Export CSV"}
        </Button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {!hasAnyRows ? (
        <EmptyState
          icon={<Inbox size={28} strokeWidth={1.5} />}
          title="Belum ada RSVP masuk"
          description="Yuk share link undanganmu ke tamu! Begitu ada yang RSVP, datanya akan muncul di sini."
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-[var(--color-text-secondary)]">
              <tr>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Jumlah</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {rsvps.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{r.guest_name}</td>
                  <td className="px-4 py-3 tabular-nums">{r.jumlah_pax}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status_hadir ? "hadir" : "tidak_hadir"} />
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {new Date(r.created_at).toLocaleString("id-ID")}
                  </td>
                </tr>
              ))}
              {pendingGuests.map((g) => (
                <tr key={g.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{g.name}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">—</td>
                  <td className="px-4 py-3">
                    <StatusBadge status="menunggu" />
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
