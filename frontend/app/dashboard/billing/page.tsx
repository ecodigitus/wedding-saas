"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Gift, Music, Sparkles } from "lucide-react";
import { useMyEvent } from "@/lib/use-my-event";
import { ApiError, createPurchase, getBillingStatus } from "@/lib/api";
import type { BillingStatus } from "@/lib/types";
import { Button, Card, EmptyState } from "@/components/ui";

const CORE_PERKS = [
  "Undangan web & RSVP QR",
  "Buku tamu digital (kesan & pesan)",
  "Check-in QR via ponsel tim",
  "Dashboard real-time & ekspor Excel",
];

const ADDON_ICON: Record<string, typeof Gift> = {
  amplop_digital: Gift,
  musik_galeri_countdown: Music,
  selfie_checkin: Sparkles,
};

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    amount
  );
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const redirectStatus = searchParams.get("status"); // "success" | "failed" | null
  const { event, loading: loadingEvent } = useMyEvent();

  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [purchasingKey, setPurchasingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Tidak ada setState sinkron di body effect ini sama sekali (cuma di
    // dalam .then()/.catch(), async) — react-hooks/set-state-in-effect.
    // "Masih loading billing" diturunkan dari `billing === null` di render,
    // bukan state boolean terpisah yang perlu disinkronkan manual.
    if (!event) return;
    let ignore = false;
    getBillingStatus(event.id)
      .then((data) => {
        if (!ignore) setBilling(data);
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof ApiError ? err.message : "Gagal memuat status billing.");
      });
    return () => {
      ignore = true;
    };
    // Muat ulang kalau baru balik dari redirect Xendit — webhook biasanya
    // sudah kelar duluan (async), tapi cek ulang jaga-jaga.
  }, [event, redirectStatus]);

  async function handlePurchase(itemType: "package" | "addon", itemKey: string) {
    if (!event) return;
    setError(null);
    setPurchasingKey(itemKey);
    try {
      const { checkout_url } = await createPurchase(event.id, { item_type: itemType, item_key: itemKey });
      // .assign() (bukan `location.href = ...`) — react-hooks/immutability
      // menandai penugasan property sebagai "memodifikasi variabel di luar
      // komponen", padahal ini navigasi browser standar. Method call dengan
      // efek yang identik, tidak kena flag itu.
      window.location.assign(checkout_url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal membuat invoice pembayaran.");
      setPurchasingKey(null);
    }
  }

  if (loadingEvent || (event && !billing && !error)) {
    return <p className="text-[var(--color-text-secondary)]">Memuat...</p>;
  }

  if (!event) {
    return (
      <EmptyState
        title="Belum ada undangan"
        description="Buat undangan dulu di menu Editor sebelum bisa beli paket."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold text-primary-dark">Billing</h1>

      {redirectStatus === "success" && (
        <Card className="border-warning bg-warning/5 p-4 text-sm">
          Pembayaran kamu sedang diproses. Halaman ini otomatis update begitu konfirmasi masuk —
          coba refresh sebentar lagi kalau belum berubah.
        </Card>
      )}
      {redirectStatus === "failed" && (
        <Card className="border-danger bg-danger/5 p-4 text-sm text-danger">
          Pembayaran belum berhasil. Coba lagi ya.
        </Card>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Fitur inti — sama di semua paket, cuma kapasitas tamu yang beda */}
      <Card className="p-6">
        <h2 className="mb-3 font-heading text-lg font-semibold text-primary-dark">Fitur di semua paket</h2>
        <ul className="flex flex-col gap-2 text-sm text-[var(--color-text-primary)]">
          {CORE_PERKS.map((perk) => (
            <li key={perk} className="flex items-start gap-2">
              <Check size={16} className="mt-0.5 flex-shrink-0 text-success" />
              {perk}
            </li>
          ))}
        </ul>
      </Card>

      {/* Grid 3 paket — pola sama dengan template picker di Editor */}
      <div>
        <h2 className="mb-3 font-heading text-lg font-semibold text-primary-dark">Pilih Paket</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {billing?.catalog.packages.map((pkg) => {
            const isActive = billing.package === pkg.key;
            const activePkg = billing.catalog.packages.find((p) => p.key === billing.package);
            // Downgrade/beli-ulang paket dengan kapasitas <= yang sudah
            // dimiliki tidak masuk akal buat customer (bayar lagi untuk
            // kapasitas lebih kecil/sama) — backend juga menolak ini (409),
            // disable di sini supaya tidak ada tombol yang pasti gagal diklik.
            // `max_guests` bertipe nullable di `CatalogItem` (dishare dengan
            // add-on yang memang tidak punya kapasitas) — untuk item paket
            // di sini selalu terisi, `?? 0` cuma jaga-jaga tipe.
            const isDowngrade =
              !isActive && !!activePkg && (pkg.max_guests ?? 0) <= (activePkg.max_guests ?? 0);
            const disabled = isActive || isDowngrade || purchasingKey === pkg.key;
            return (
              <button
                key={pkg.key}
                type="button"
                onClick={() => !disabled && handlePurchase("package", pkg.key)}
                disabled={disabled}
                aria-pressed={isActive}
                className={`flex flex-col items-start gap-2 rounded-xl border p-5 text-left transition-colors disabled:cursor-not-allowed ${
                  isActive
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                    : isDowngrade
                      ? "border-border bg-surface opacity-60"
                      : "border-border bg-surface hover:border-primary/40"
                }`}
              >
                <p className="font-heading text-lg font-semibold text-primary-dark">{pkg.label}</p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  s.d. {pkg.max_guests} tamu
                </p>
                <p className="text-xl font-semibold text-[var(--color-text-primary)]">
                  {formatRupiah(pkg.price_idr)}
                  <span className="text-sm font-normal text-[var(--color-text-secondary)]"> / acara</span>
                </p>
                {isActive ? (
                  <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    <Check size={16} /> Paket aktif
                  </span>
                ) : isDowngrade ? (
                  <span className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    Kapasitas lebih kecil/sama
                  </span>
                ) : (
                  <span className="mt-1 text-sm font-medium text-primary">
                    {purchasingKey === pkg.key ? "Menyiapkan pembayaran..." : "Pilih paket"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid 3 add-on — beli terpisah dari paket inti */}
      <div>
        <h2 className="mb-3 font-heading text-lg font-semibold text-primary-dark">Add-on (opsional)</h2>
        {!billing?.package && (
          <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
            Beli paket dulu di atas sebelum menambah add-on.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          {billing?.catalog.addons.map((addon) => {
            const owned = billing.addons.includes(addon.key);
            const Icon = ADDON_ICON[addon.key] ?? Gift;
            return (
              <Card key={addon.key} className="flex flex-col items-start gap-2 p-5">
                <Icon size={20} className="text-primary" />
                <p className="font-medium text-[var(--color-text-primary)]">{addon.label}</p>
                <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {formatRupiah(addon.price_idr)}
                </p>
                {owned ? (
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
                    <Check size={16} /> Sudah aktif
                  </span>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => handlePurchase("addon", addon.key)}
                    disabled={!billing?.package || purchasingKey === addon.key}
                  >
                    {purchasingKey === addon.key ? "Menyiapkan..." : "Tambah add-on"}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {billing?.latest_payment && (
        <p className="text-xs text-[var(--color-text-secondary)]">
          Transaksi terakhir: {formatRupiah(billing.latest_payment.amount_idr)} —{" "}
          {billing.latest_payment.status === "paid"
            ? "Berhasil"
            : billing.latest_payment.status === "pending"
              ? "Menunggu pembayaran"
              : "Gagal/kedaluwarsa"}
        </p>
      )}
    </div>
  );
}
