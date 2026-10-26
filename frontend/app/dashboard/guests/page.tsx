"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Camera, Copy, Plus, QrCode, Trash2, Users } from "lucide-react";
import { useMyEvent } from "@/lib/use-my-event";
import { copyToClipboard } from "@/lib/clipboard";
import { getSiteOrigin } from "@/lib/site";
import { ApiError, createGuest, deleteGuest, listGuests, updateGuest } from "@/lib/api";
import type { Guest, GuestInput } from "@/lib/types";
import { Button, buttonClasses, Card, EmptyState, Input, StatusBadge } from "@/components/ui";
import { GuestQrModal } from "@/components/GuestQrModal";
import { SelfieModal } from "@/components/SelfieModal";

const EMPTY_FORM: GuestInput = { name: "", category: "", session_label: "", max_pax: 1 };

// BT-05 — "Tanpa kategori" jadi grup tersendiri di ringkasan, bukan
// disembunyikan, supaya total-nya tetap kelihatan konsisten dengan total tamu.
const NO_CATEGORY_LABEL = "Tanpa kategori";

type CategoryStat = {
  category: string;
  total: number;
  hadir: number;
  checkedIn: number;
};

function computeCategoryStats(guests: Guest[]): CategoryStat[] {
  const byCategory = new Map<string, CategoryStat>();
  for (const guest of guests) {
    const key = guest.category?.trim() || NO_CATEGORY_LABEL;
    const stat = byCategory.get(key) ?? { category: key, total: 0, hadir: 0, checkedIn: 0 };
    stat.total += 1;
    if (guest.rsvp_status === "hadir") stat.hadir += 1;
    if (guest.checked_in_at) stat.checkedIn += 1;
    byCategory.set(key, stat);
  }
  // Kategori asli (bukan "Tanpa kategori") diurutkan alfabet dulu, baru
  // "Tanpa kategori" selalu di bawah — konsisten & predictable buat owner.
  return [...byCategory.values()].sort((a, b) => {
    if (a.category === NO_CATEGORY_LABEL) return 1;
    if (b.category === NO_CATEGORY_LABEL) return -1;
    return a.category.localeCompare(b.category);
  });
}

export default function GuestsPage() {
  const { event, loading: loadingEvent } = useMyEvent();
  // Ganti isPremium (tier akun) — paket sekarang melekat ke EVENT, bukan akun.
  const hasPackage = event?.package != null;
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(true);
  const [form, setForm] = useState<GuestInput>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrGuest, setQrGuest] = useState<Guest | null>(null);
  const [selfieGuest, setSelfieGuest] = useState<Guest | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const categoryStats = useMemo(() => computeCategoryStats(guests), [guests]);
  const filteredGuests = useMemo(
    () =>
      categoryFilter === null
        ? guests
        : guests.filter((g) => (g.category?.trim() || NO_CATEGORY_LABEL) === categoryFilter),
    [guests, categoryFilter]
  );

  useEffect(() => {
    // Tidak perlu setLoadingGuests(false) di sini — kalau !event || !hasPackage,
    // render sudah return lebih awal (lihat guard di bawah) sebelum sampai ke
    // JSX yang membaca loadingGuests, jadi nilainya tidak pernah teramati di
    // kasus ini (react-hooks/set-state-in-effect: hindari setState sinkron
    // yang tidak perlu di body effect).
    if (!event || !hasPackage) return;
    let ignore = false;
    listGuests(event.id)
      .then((data) => {
        if (!ignore) setGuests(data);
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof ApiError ? err.message : "Gagal memuat tamu.");
      })
      .finally(() => {
        if (!ignore) setLoadingGuests(false);
      });
    return () => {
      ignore = true;
    };
  }, [event, hasPackage]);

  async function handleAddGuest(e: FormEvent) {
    e.preventDefault();
    if (!event) return;
    setError(null);
    setSubmitting(true);
    try {
      const guest = await createGuest(event.id, {
        ...form,
        category: form.category || null,
        session_label: form.session_label || null,
      });
      setGuests((prev) => [...prev, guest]);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menambah tamu.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(guestId: string) {
    if (!event) return;
    try {
      await deleteGuest(event.id, guestId);
      setGuests((prev) => prev.filter((g) => g.id !== guestId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus tamu.");
    }
  }

  async function handleMaxPaxChange(guestId: string, maxPax: number) {
    if (!event || !Number.isInteger(maxPax) || maxPax < 1) return;
    try {
      const updated = await updateGuest(event.id, guestId, { max_pax: maxPax });
      setGuests((prev) => prev.map((g) => (g.id === guestId ? updated : g)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal update tamu.");
    }
  }

  async function handleCopyLink(guest: Guest) {
    if (!event) return;
    const url = `${getSiteOrigin()}/${event.slug}?g=${guest.invite_token}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedId(guest.id);
      setTimeout(() => setCopiedId((id) => (id === guest.id ? null : id)), 2000);
    } else {
      // Auto-copy gagal total (jarang — browser lama tanpa execCommand) —
      // minimal user masih bisa salin manual dari sini.
      window.prompt("Gagal auto-copy, salin manual link di bawah:", url);
    }
  }

  if (loadingEvent) {
    return <p className="text-[var(--color-text-secondary)]">Memuat...</p>;
  }

  if (!event) {
    return (
      <EmptyState
        title="Belum ada undangan"
        description="Buat undangan dulu di menu Editor sebelum bisa kelola tamu."
      />
    );
  }

  if (!hasPackage) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <Users size={28} strokeWidth={1.5} className="text-[var(--color-text-secondary)]" />
        <h1 className="font-heading text-2xl font-semibold text-primary-dark">
          Kelola Tamu perlu paket aktif
        </h1>
        <p className="max-w-md text-sm text-[var(--color-text-secondary)]">
          Buat roster tamu, link undangan personal per tamu, dan check-in QR — beli paket dulu
          untuk mengaktifkan fitur ini.
        </p>
        <Link href="/dashboard/billing" className={buttonClasses("primary")}>
          Lihat Paket
        </Link>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold text-primary-dark">Kelola Tamu</h1>

      <Card className="p-6">
        <form onSubmit={handleAddGuest} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            label="Nama tamu"
            name="name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Kategori (opsional)"
            name="category"
            placeholder="Keluarga, kolega, dll"
            value={form.category ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          />
          <Input
            label="Sesi (opsional)"
            name="session_label"
            placeholder="Akad, Resepsi sesi 1, dll"
            value={form.session_label ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, session_label: e.target.value }))}
          />
          <Input
            label="Maks. orang"
            name="max_pax"
            type="number"
            min={1}
            max={20}
            required
            value={form.max_pax}
            onChange={(e) => setForm((f) => ({ ...f, max_pax: Number(e.target.value) }))}
          />
          <div className="flex items-end">
            <Button type="submit" disabled={submitting} className="w-full">
              <Plus size={16} />
              {submitting ? "Menambah..." : "Tambah Tamu"}
            </Button>
          </div>
        </form>
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* BT-05 — ringkasan kategori & kehadiran real-time. Dihitung dari data
          yang sama dengan tabel di bawah (listGuests), tidak butuh endpoint
          baru — Guest.category & checked_in_at sudah ada sejak Fase 2/BT-02. */}
      {!loadingGuests && guests.length > 0 && (
        <Card className="overflow-x-auto p-4">
          <h2 className="mb-3 font-heading text-lg font-semibold text-primary-dark">
            Ringkasan per Kategori
          </h2>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-[var(--color-text-secondary)]">
              <tr>
                <th className="px-3 py-2 font-medium">Kategori</th>
                <th className="px-3 py-2 font-medium">Tamu</th>
                <th className="px-3 py-2 font-medium">RSVP Hadir</th>
                <th className="px-3 py-2 font-medium">Sudah Check-in</th>
              </tr>
            </thead>
            <tbody>
              {categoryStats.map((stat) => (
                <tr key={stat.category} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{stat.category}</td>
                  <td className="px-3 py-2 tabular-nums">{stat.total}</td>
                  <td className="px-3 py-2 tabular-nums">{stat.hadir}</td>
                  <td className="px-3 py-2 tabular-nums">{stat.checkedIn}</td>
                </tr>
              ))}
              <tr className="font-medium">
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2 tabular-nums">{guests.length}</td>
                <td className="px-3 py-2 tabular-nums">
                  {categoryStats.reduce((sum, s) => sum + s.hadir, 0)}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {categoryStats.reduce((sum, s) => sum + s.checkedIn, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}

      {!loadingGuests && guests.length > 0 && (
        <div className="flex items-center gap-2">
          <label htmlFor="category_filter" className="text-sm font-medium text-[var(--color-text-primary)]">
            Filter kategori
          </label>
          <select
            id="category_filter"
            value={categoryFilter ?? ""}
            onChange={(e) => setCategoryFilter(e.target.value || null)}
            className="min-h-11 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Semua kategori</option>
            {categoryStats.map((stat) => (
              <option key={stat.category} value={stat.category}>
                {stat.category} ({stat.total})
              </option>
            ))}
          </select>
        </div>
      )}

      {loadingGuests ? (
        <p className="text-[var(--color-text-secondary)]">Memuat tamu...</p>
      ) : guests.length === 0 ? (
        <EmptyState
          icon={<Users size={28} strokeWidth={1.5} />}
          title="Belum ada tamu di roster"
          description="Tambah tamu di form atas, nanti tiap tamu punya link undangan personal sendiri."
        />
      ) : filteredGuests.length === 0 ? (
        <EmptyState
          title="Tidak ada tamu di kategori ini"
          description="Coba pilih kategori lain, atau reset filter ke 'Semua kategori'."
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-[var(--color-text-secondary)]">
              <tr>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Kategori</th>
                <th className="px-4 py-3 font-medium">Sesi</th>
                <th className="px-4 py-3 font-medium">Maks.</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Check-in</th>
                <th className="px-4 py-3 font-medium">Link</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((guest) => (
                <tr key={guest.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{guest.name}</span>
                      {/* RG-05 — tamu ini masuk roster lewat auto-enroll (Mode
                          Registrasi-Saja), bukan diinput manual oleh owner. */}
                      {guest.self_registered && (
                        <span className="inline-flex items-center whitespace-nowrap rounded-full bg-[var(--color-border)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]">
                          Daftar sendiri
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {guest.category || "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {guest.session_label || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={1}
                      max={20}
                      defaultValue={guest.max_pax}
                      onBlur={(e) => handleMaxPaxChange(guest.id, Number(e.target.value))}
                      aria-label={`Maks. orang untuk ${guest.name}`}
                      className="w-16 rounded border border-border px-2 py-1 tabular-nums"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={guest.rsvp_status} />
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {guest.checked_in_at ? (
                      <span className="text-success">
                        ✓ {new Date(guest.checked_in_at).toLocaleTimeString("id-ID")}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(guest)}
                      className="inline-flex items-center gap-1 text-primary-dark hover:underline"
                    >
                      <Copy size={14} />
                      {copiedId === guest.id ? "Tersalin!" : "Copy link"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setQrGuest(guest)}
                        aria-label={`Lihat QR ${guest.name}`}
                        title="Lihat QR check-in"
                        className="text-[var(--color-text-secondary)] hover:text-primary-dark"
                      >
                        <QrCode size={16} />
                      </button>
                      {guest.has_selfie && (
                        <button
                          type="button"
                          onClick={() => setSelfieGuest(guest)}
                          aria-label={`Lihat foto selfie ${guest.name}`}
                          title="Lihat foto selfie check-in"
                          className="text-[var(--color-text-secondary)] hover:text-primary-dark"
                        >
                          <Camera size={16} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(guest.id)}
                        aria-label={`Hapus ${guest.name}`}
                        className="text-[var(--color-text-secondary)] hover:text-danger"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {qrGuest && (
        <GuestQrModal
          guestName={qrGuest.name}
          token={qrGuest.invite_token}
          onClose={() => setQrGuest(null)}
        />
      )}

      {selfieGuest && event && (
        <SelfieModal
          guestName={selfieGuest.name}
          eventId={event.id}
          guestId={selfieGuest.id}
          onClose={() => setSelfieGuest(null)}
        />
      )}
    </div>
  );
}
