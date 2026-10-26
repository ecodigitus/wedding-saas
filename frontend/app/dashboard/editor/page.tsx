"use client";

import { useState } from "react";
import Link from "next/link";
import { Gift, Music, Plus, QrCode, Trash2 } from "lucide-react";
import { useMyEvent } from "@/lib/use-my-event";
import { createEvent, updateEvent, ApiError } from "@/lib/api";
import {
  TEMPLATES,
  type Event,
  type EventInput,
  type EventMode,
  type GiftInfoInput,
  type MediaInfoInput,
} from "@/lib/types";
import { Button, buttonClasses, Card, Input, Textarea } from "@/components/ui";
import { InvitationView, resolveTemplateTheme } from "@/components/InvitationView";
import { RegistrationPreview } from "@/components/RegistrationPreview";
import { RegistrationLinkCard } from "@/components/RegistrationLinkCard";

const EMPTY_FORM: EventInput = {
  partner1_name: "",
  partner2_name: "",
  partner1_parents: "",
  partner2_parents: "",
  partner1_instagram: "",
  partner2_instagram: "",
  event_date: "",
  waktu_akad: "",
  waktu_resepsi: "",
  lokasi: "",
  maps_url: "",
  dress_code: "",
  template_id: "klasik",
};

// "2026-12-20T08:00:00+07:00" -> "08:00" (format yang dipahami <input type="time">).
// Akad/resepsi ditampilkan di undangan cuma sebagai jam, bukan tanggal
// terpisah (lihat InvitationView.formatTime) — jadi form cukup minta jam,
// tanggalnya diambil dari "Tanggal acara" (lihat combineDateTime di bawah).
function toTimeLocal(value: string | null): string {
  if (!value) return "";
  return value.slice(11, 16);
}

// Gabungkan jam (HH:mm) dari form dengan tanggal acara jadi datetime ISO
// buat dikirim ke backend (kolom `waktu_akad`/`waktu_resepsi` tetap timestamp).
function combineDateTime(date: string, time: string | null | undefined): string | null {
  if (!date || !time) return null;
  return `${date}T${time}:00`;
}

function eventToFormInput(event: Event): EventInput {
  return {
    partner1_name: event.partner1_name,
    partner2_name: event.partner2_name,
    partner1_parents: event.partner1_parents ?? "",
    partner2_parents: event.partner2_parents ?? "",
    partner1_instagram: event.partner1_instagram ?? "",
    partner2_instagram: event.partner2_instagram ?? "",
    event_date: event.event_date,
    waktu_akad: toTimeLocal(event.waktu_akad),
    waktu_resepsi: toTimeLocal(event.waktu_resepsi),
    lokasi: event.lokasi,
    maps_url: event.maps_url ?? "",
    dress_code: event.dress_code ?? "",
    template_id: event.template_id,
  };
}

const EMPTY_GIFT_FORM: GiftInfoInput = {
  bank_name: "",
  bank_account_number: "",
  bank_account_holder: "",
  ewallet_name: "",
  ewallet_number: "",
  ewallet_account_holder: "",
};

function eventToGiftForm(event: Event): GiftInfoInput {
  return {
    bank_name: event.bank_name ?? "",
    bank_account_number: event.bank_account_number ?? "",
    bank_account_holder: event.bank_account_holder ?? "",
    ewallet_name: event.ewallet_name ?? "",
    ewallet_number: event.ewallet_number ?? "",
    ewallet_account_holder: event.ewallet_account_holder ?? "",
  };
}

const EMPTY_MEDIA_FORM: MediaInfoInput = {
  music_url: "",
  gallery_urls: [],
  show_countdown: false,
};

function eventToMediaForm(event: Event): MediaInfoInput {
  return {
    music_url: event.music_url ?? "",
    gallery_urls: event.gallery_urls ?? [],
    show_countdown: event.show_countdown,
  };
}

const MAX_GALLERY_ITEMS = 12;

export default function EditorPage() {
  const { event, setEvent, loading } = useMyEvent();
  // Add-on berbayar (bukan lagi tier akun) — masing-masing dicek terpisah,
  // beli salah satu tidak otomatis membuka yang lain.
  const hasGiftAddon = event?.addons?.includes("amplop_digital") ?? false;
  const hasMediaAddon = event?.addons?.includes("musik_galeri_countdown") ?? false;
  // RG-01 (Mode Registrasi-Saja) — beda dari `hasGiftAddon`/`hasMediaAddon`
  // di atas, `mode` BUKAN add-on berbayar, jadi tidak digembok Billing.
  const isRegistrationOnly = event?.mode === "registration_only";
  const [modeSaving, setModeSaving] = useState(false);
  const [modeError, setModeError] = useState<string | null>(null);
  const [form, setForm] = useState<EventInput>(EMPTY_FORM);
  const [hydratedEventId, setHydratedEventId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"form" | "preview">("form");

  const [giftForm, setGiftForm] = useState<GiftInfoInput>(EMPTY_GIFT_FORM);
  const [giftSaving, setGiftSaving] = useState(false);
  const [giftError, setGiftError] = useState<string | null>(null);
  const [giftMessage, setGiftMessage] = useState<string | null>(null);

  const [mediaForm, setMediaForm] = useState<MediaInfoInput>(EMPTY_MEDIA_FORM);
  const [mediaSaving, setMediaSaving] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaMessage, setMediaMessage] = useState<string | null>(null);

  // Sinkronkan form saat event yang dimuat berbeda dari yang terakhir
  // di-hydrate — dihitung saat render (pola resmi React "adjust state saat
  // prop berubah"), bukan lewat useEffect. Setelah Simpan, event.id tidak
  // berubah, jadi form (yang sedang diedit) tidak tertimpa ulang.
  if (event && event.id !== hydratedEventId) {
    setHydratedEventId(event.id);
    setForm(eventToFormInput(event));
    setGiftForm(eventToGiftForm(event));
    setMediaForm(eventToMediaForm(event));
  }

  function update<K extends keyof EventInput>(key: K, value: EventInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateGift<K extends keyof GiftInfoInput>(key: K, value: GiftInfoInput[K]) {
    setGiftForm((f) => ({ ...f, [key]: value }));
  }

  // RG-01 — beda dari `handleSave` (form dasar, perlu klik "Simpan") dan
  // `handleSaveGift`/`handleSaveMedia` (kartu add-on, batch tersendiri): mode
  // langsung ter-PATCH begitu diklik, karena ini pengaturan tunggal (bukan
  // form multi-field) yang efeknya perlu segera terlihat di kartu bawahnya
  // (sembunyikan Musik&Galeri, munculkan panduan Cara Sambungkan).
  async function handleToggleMode() {
    if (!event) return;
    setModeError(null);
    setModeSaving(true);
    try {
      const nextMode: EventMode = isRegistrationOnly ? "full" : "registration_only";
      const saved = await updateEvent(event.id, { mode: nextMode });
      setEvent(saved);
    } catch (err) {
      setModeError(err instanceof ApiError ? err.message : "Gagal ubah mode. Coba lagi ya.");
    } finally {
      setModeSaving(false);
    }
  }

  async function handleSaveGift() {
    if (!event) return;
    setGiftError(null);
    setGiftMessage(null);
    setGiftSaving(true);
    try {
      const payload: GiftInfoInput = {
        bank_name: giftForm.bank_name || null,
        bank_account_number: giftForm.bank_account_number || null,
        bank_account_holder: giftForm.bank_account_holder || null,
        ewallet_name: giftForm.ewallet_name || null,
        ewallet_number: giftForm.ewallet_number || null,
        ewallet_account_holder: giftForm.ewallet_account_holder || null,
      };
      const saved = await updateEvent(event.id, payload);
      setEvent(saved);
      setGiftMessage("Info Amplop Digital tersimpan.");
    } catch (err) {
      setGiftError(err instanceof ApiError ? err.message : "Gagal simpan. Coba lagi ya.");
    } finally {
      setGiftSaving(false);
    }
  }

  function updateGalleryUrl(index: number, value: string) {
    setMediaForm((f) => ({
      ...f,
      gallery_urls: f.gallery_urls.map((url, i) => (i === index ? value : url)),
    }));
  }

  function addGalleryUrl() {
    setMediaForm((f) =>
      f.gallery_urls.length >= MAX_GALLERY_ITEMS ? f : { ...f, gallery_urls: [...f.gallery_urls, ""] }
    );
  }

  function removeGalleryUrl(index: number) {
    setMediaForm((f) => ({ ...f, gallery_urls: f.gallery_urls.filter((_, i) => i !== index) }));
  }

  async function handleSaveMedia() {
    if (!event) return;
    setMediaError(null);
    setMediaMessage(null);
    setMediaSaving(true);
    try {
      const payload: MediaInfoInput = {
        music_url: mediaForm.music_url || null,
        gallery_urls: mediaForm.gallery_urls.map((url) => url.trim()).filter(Boolean),
        show_countdown: mediaForm.show_countdown,
      };
      const saved = await updateEvent(event.id, payload);
      setEvent(saved);
      setMediaMessage("Musik & Galeri tersimpan.");
    } catch (err) {
      setMediaError(err instanceof ApiError ? err.message : "Gagal simpan. Coba lagi ya.");
    } finally {
      setMediaSaving(false);
    }
  }

  async function handleSave(publish?: boolean) {
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const basePayload: EventInput = {
        ...form,
        partner1_parents: form.partner1_parents || null,
        partner2_parents: form.partner2_parents || null,
        partner1_instagram: form.partner1_instagram || null,
        partner2_instagram: form.partner2_instagram || null,
        waktu_akad: combineDateTime(form.event_date, form.waktu_akad),
        waktu_resepsi: combineDateTime(form.event_date, form.waktu_resepsi),
        maps_url: form.maps_url || null,
        dress_code: form.dress_code || null,
      };

      // createEvent tidak menerima is_published (baru bisa diset lewat
      // updateEvent) — jadi publish langsung di percobaan simpan pertama
      // butuh 2 langkah: buat dulu, baru toggle status publish-nya.
      let saved = event ? await updateEvent(event.id, basePayload) : await createEvent(basePayload);
      if (publish !== undefined && saved.is_published !== publish) {
        saved = await updateEvent(saved.id, { is_published: publish });
      }
      setEvent(saved);
      setMessage(publish ? "Undangan berhasil dipublish!" : "Perubahan tersimpan.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal simpan. Coba lagi ya.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-[var(--color-text-secondary)]">Memuat editor...</p>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-semibold text-primary-dark">Editor Undangan</h1>
        <div className="flex gap-2 lg:hidden">
          <Button
            variant={mobileTab === "form" ? "primary" : "secondary"}
            onClick={() => setMobileTab("form")}
            aria-pressed={mobileTab === "form"}
          >
            Form
          </Button>
          <Button
            variant={mobileTab === "preview" ? "primary" : "secondary"}
            onClick={() => setMobileTab("preview")}
            aria-pressed={mobileTab === "preview"}
          >
            Preview
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Form kiri (desktop) / tab "Form" (mobile) — styleguide.v2.md §5.6 */}
        <div className={`flex-1 ${mobileTab === "form" ? "block" : "hidden"} lg:block`}>
          <Card className="flex flex-col gap-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Nama mempelai 1"
                name="partner1_name"
                required
                value={form.partner1_name}
                onChange={(e) => update("partner1_name", e.target.value)}
              />
              <Input
                label="Nama mempelai 2"
                name="partner2_name"
                required
                value={form.partner2_name}
                onChange={(e) => update("partner2_name", e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Orang tua mempelai 1 (opsional)"
                name="partner1_parents"
                placeholder="Bpk. ... & Ibu ..."
                value={form.partner1_parents ?? ""}
                onChange={(e) => update("partner1_parents", e.target.value)}
              />
              <Input
                label="Orang tua mempelai 2 (opsional)"
                name="partner2_parents"
                placeholder="Bpk. ... & Ibu ..."
                value={form.partner2_parents ?? ""}
                onChange={(e) => update("partner2_parents", e.target.value)}
              />
              <Input
                label="Instagram mempelai 1 (opsional)"
                name="partner1_instagram"
                placeholder="@username"
                value={form.partner1_instagram ?? ""}
                onChange={(e) => update("partner1_instagram", e.target.value)}
              />
              <Input
                label="Instagram mempelai 2 (opsional)"
                name="partner2_instagram"
                placeholder="@username"
                value={form.partner2_instagram ?? ""}
                onChange={(e) => update("partner2_instagram", e.target.value)}
              />
            </div>
            <Input
              label="Tanggal acara"
              name="event_date"
              type="date"
              required
              value={form.event_date}
              onChange={(e) => update("event_date", e.target.value)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Waktu akad (opsional)"
                name="waktu_akad"
                type="time"
                value={form.waktu_akad ?? ""}
                onChange={(e) => update("waktu_akad", e.target.value)}
              />
              <Input
                label="Waktu resepsi (opsional)"
                name="waktu_resepsi"
                type="time"
                value={form.waktu_resepsi ?? ""}
                onChange={(e) => update("waktu_resepsi", e.target.value)}
              />
            </div>
            <Textarea
              label="Lokasi acara"
              name="lokasi"
              required
              rows={3}
              value={form.lokasi}
              onChange={(e) => update("lokasi", e.target.value)}
            />
            <Input
              label="Link Google Maps (opsional)"
              name="maps_url"
              value={form.maps_url ?? ""}
              onChange={(e) => update("maps_url", e.target.value)}
            />
            <Input
              label="Dress code (opsional)"
              name="dress_code"
              value={form.dress_code ?? ""}
              onChange={(e) => update("dress_code", e.target.value)}
            />

            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                {isRegistrationOnly ? "Palet warna halaman registrasi" : "Pilih template"}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-3">
                {TEMPLATES.map((tpl) => {
                  const tplTheme = resolveTemplateTheme(tpl.id);
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => update("template_id", tpl.id)}
                      aria-pressed={form.template_id === tpl.id}
                      className={`overflow-hidden rounded-lg border text-left text-sm transition-colors ${
                        form.template_id === tpl.id
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div
                        className={`flex h-14 items-center justify-center ${tplTheme.bg} ${tplTheme.font}`}
                      >
                        <span className={`text-lg ${tplTheme.accent}`}>Aa</span>
                      </div>
                      <div className="p-3">
                        <p className="font-medium">{tpl.label}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {tpl.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}
            {message && <p className="text-sm text-success">{message}</p>}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={() => handleSave()} disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
              <Button
                variant={event?.is_published ? "secondary" : "primary"}
                onClick={() => handleSave(!event?.is_published)}
                disabled={saving}
              >
                {event?.is_published
                  ? "Batalkan Publish"
                  : isRegistrationOnly
                    ? "Publish halaman registrasi"
                    : "Publish"}
              </Button>
            </div>
          </Card>

          {/* Mode Registrasi-Saja (RG-01) — untuk undangan yang sudah dibuat
              di luar platform (vendor lain / undangan cetak); kita cuma
              menyediakan halaman registrasi + QR check-in. Bukan add-on
              berbayar, jadi tidak digembok Billing seperti 2 kartu di bawah. */}
          <Card className="mt-6 flex flex-col gap-3 p-6">
            <div className="flex items-center gap-2">
              <QrCode size={20} strokeWidth={1.5} className="text-primary" />
              <h2 className="font-heading text-lg font-semibold text-primary-dark">
                Mode Registrasi-Saja
              </h2>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Aktifkan kalau undangan pernikahanmu sudah ada di tempat lain (vendor
              lain atau undangan cetak) — kami cuma menyediakan halaman registrasi +
              QR check-in yang bisa disambungkan, bukan menggantikan undangan yang
              sudah ada.
            </p>

            {!event ? (
              <p className="text-sm text-[var(--color-text-secondary)]">
                Simpan dulu undangan dasarnya di atas.
              </p>
            ) : (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  aria-pressed={isRegistrationOnly}
                  onClick={handleToggleMode}
                  disabled={modeSaving}
                  className="self-start"
                >
                  {isRegistrationOnly
                    ? "Mode Registrasi-Saja: Aktif"
                    : "Mode Registrasi-Saja: Nonaktif"}
                </Button>
                {modeError && <p className="text-sm text-danger">{modeError}</p>}
              </>
            )}
          </Card>

          {/* RG-07 — panduan "Cara sambungkan": link siap-copy, snippet HTML,
              QR tingkat-acara untuk dicetak. Cuma tampil saat mode aktif. */}
          {event && isRegistrationOnly && (
            <div className="mt-6">
              <h2 className="mb-3 font-heading text-lg font-semibold text-primary-dark">
                Cara Sambungkan
              </h2>
              {!event.is_published && (
                <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
                  Link di bawah baru aktif setelah undangan di-publish (tombol di
                  atas).
                </p>
              )}
              <RegistrationLinkCard slug={event.slug} />
            </div>
          )}

          {/* Amplop Digital (UW-09, add-on berbayar) — kartu terpisah dengan
              tombol simpan sendiri karena cuma bisa disunting setelah
              undangan (event) sudah ada, dan alurnya beda dari form utama
              di atas. */}
          <Card className="mt-6 flex flex-col gap-4 p-6">
            <div className="flex items-center gap-2">
              <Gift size={20} strokeWidth={1.5} className="text-primary" />
              <h2 className="font-heading text-lg font-semibold text-primary-dark">
                Amplop Digital
              </h2>
            </div>

            {!event ? (
              <p className="text-sm text-[var(--color-text-secondary)]">
                Simpan dulu undangan dasarnya di atas sebelum mengatur info amplop digital.
              </p>
            ) : !hasGiftAddon ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Tampilkan info rekening/e-wallet di halaman undangan supaya tamu bisa kirim
                  hadiah langsung — beli add-on ini dulu di menu Billing.
                </p>
                <Link href="/dashboard/billing" className={buttonClasses("primary")}>
                  Beli Add-on
                </Link>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Input
                    label="Nama bank (opsional)"
                    name="bank_name"
                    value={giftForm.bank_name ?? ""}
                    onChange={(e) => updateGift("bank_name", e.target.value)}
                  />
                  <Input
                    label="Nomor rekening (opsional)"
                    name="bank_account_number"
                    value={giftForm.bank_account_number ?? ""}
                    onChange={(e) => updateGift("bank_account_number", e.target.value)}
                  />
                  <Input
                    label="Nama pemilik rekening (opsional)"
                    name="bank_account_holder"
                    value={giftForm.bank_account_holder ?? ""}
                    onChange={(e) => updateGift("bank_account_holder", e.target.value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Input
                    label="Nama e-wallet (mis. GoPay, opsional)"
                    name="ewallet_name"
                    value={giftForm.ewallet_name ?? ""}
                    onChange={(e) => updateGift("ewallet_name", e.target.value)}
                  />
                  <Input
                    label="Nomor e-wallet (opsional)"
                    name="ewallet_number"
                    value={giftForm.ewallet_number ?? ""}
                    onChange={(e) => updateGift("ewallet_number", e.target.value)}
                  />
                  <Input
                    label="Nama pemilik e-wallet (opsional)"
                    name="ewallet_account_holder"
                    value={giftForm.ewallet_account_holder ?? ""}
                    onChange={(e) => updateGift("ewallet_account_holder", e.target.value)}
                  />
                </div>

                {giftError && <p className="text-sm text-danger">{giftError}</p>}
                {giftMessage && <p className="text-sm text-success">{giftMessage}</p>}

                <div>
                  <Button onClick={handleSaveGift} disabled={giftSaving}>
                    {giftSaving ? "Menyimpan..." : "Simpan Amplop Digital"}
                  </Button>
                </div>
              </>
            )}
          </Card>

          {/* Musik Latar, Galeri & Countdown (UW-11, add-on berbayar) — galeri
              lewat URL eksternal (owner upload sendiri ke Drive/Imgur/dsb),
              sama seperti keputusan Amplop Digital: belum ada infrastruktur
              upload S3 di codebase ini. SENGAJA disembunyikan di Mode
              Registrasi-Saja (RG-01) — murni chrome undangan, tidak pernah
              dirender di halaman registrasi (/r/[slug], lihat styleguide.v2.md
              §5.7). Beda dari Amplop Digital yang tetap dipertahankan. */}
          {!isRegistrationOnly && (
          <Card className="mt-6 flex flex-col gap-4 p-6">
            <div className="flex items-center gap-2">
              <Music size={20} strokeWidth={1.5} className="text-primary" />
              <h2 className="font-heading text-lg font-semibold text-primary-dark">
                Musik Latar, Galeri &amp; Countdown
              </h2>
            </div>

            {!event ? (
              <p className="text-sm text-[var(--color-text-secondary)]">
                Simpan dulu undangan dasarnya di atas sebelum mengatur bagian ini.
              </p>
            ) : !hasMediaAddon ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Tambahkan musik latar, galeri foto/video, dan countdown hari-H di halaman
                  undangan — beli add-on ini dulu di menu Billing.
                </p>
                <Link href="/dashboard/billing" className={buttonClasses("primary")}>
                  Beli Add-on
                </Link>
              </div>
            ) : (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  aria-pressed={mediaForm.show_countdown}
                  onClick={() =>
                    setMediaForm((f) => ({ ...f, show_countdown: !f.show_countdown }))
                  }
                  className="self-start"
                >
                  {mediaForm.show_countdown ? "Countdown timer: Aktif" : "Countdown timer: Nonaktif"}
                </Button>

                <Input
                  label="Link musik latar (URL, opsional)"
                  name="music_url"
                  value={mediaForm.music_url ?? ""}
                  onChange={(e) => setMediaForm((f) => ({ ...f, music_url: e.target.value }))}
                />

                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    Galeri foto/video (link, maks. {MAX_GALLERY_ITEMS})
                  </p>
                  {mediaForm.gallery_urls.map((url, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        label={`Link galeri ${index + 1}`}
                        id={`gallery_url_${index}`}
                        value={url}
                        onChange={(e) => updateGalleryUrl(index, e.target.value)}
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeGalleryUrl(index)}
                        aria-label={`Hapus link galeri ${index + 1}`}
                        className="rounded-md p-2 text-danger hover:bg-danger/10"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {mediaForm.gallery_urls.length < MAX_GALLERY_ITEMS && (
                    <Button type="button" variant="secondary" onClick={addGalleryUrl} className="self-start">
                      <Plus size={16} />
                      Tambah link galeri
                    </Button>
                  )}
                </div>

                {mediaError && <p className="text-sm text-danger">{mediaError}</p>}
                {mediaMessage && <p className="text-sm text-success">{mediaMessage}</p>}

                <div>
                  <Button onClick={handleSaveMedia} disabled={mediaSaving}>
                    {mediaSaving ? "Menyimpan..." : "Simpan Musik & Galeri"}
                  </Button>
                </div>
              </>
            )}
          </Card>
          )}
        </div>

        {/* Preview kanan (desktop, sticky) / tab "Preview" (mobile) */}
        <div
          className={`flex-1 ${mobileTab === "preview" ? "block" : "hidden"} lg:block lg:sticky lg:top-6 lg:self-start`}
        >
          <p className="mb-2 text-sm font-medium text-[var(--color-text-secondary)]">Preview</p>
          <div className="overflow-hidden rounded-xl border border-border">
            {isRegistrationOnly ? (
              // Mode Registrasi-Saja: `/{slug}` dialihkan ke `/r/{slug}`, jadi
              // yang dilihat tamu adalah halaman registrasi, bukan undangan penuh.
              <RegistrationPreview
                data={{
                  ...form,
                  ...(hasGiftAddon ? giftForm : {}),
                }}
              />
            ) : (
              <InvitationView
                data={{
                  ...form,
                  waktu_akad: combineDateTime(form.event_date, form.waktu_akad),
                  waktu_resepsi: combineDateTime(form.event_date, form.waktu_resepsi),
                  maps_url: form.maps_url || null,
                  dress_code: form.dress_code || null,
                  ...giftForm,
                  ...mediaForm,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
