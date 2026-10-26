export type User = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
};

// Paket per-acara (ganti model Lite/Premium per-akun lama) — sesuai pitch
// deck "Sistem QR Wedding". Fitur inti (Kelola Tamu, QR Check-in) sama di
// semua paket, pembedanya cuma kapasitas tamu & harga.
export type PackageKey = "intimate" | "celebration" | "grand";
// Add-on berbayar terpisah — tidak termasuk paket inti manapun.
export type AddonKey = "amplop_digital" | "musik_galeri_countdown" | "selfie_checkin";

export type CatalogItem = {
  key: string;
  label: string;
  price_idr: number;
  max_guests: number | null;
};

export type Payment = {
  id: string;
  item_type: "package" | "addon" | null;
  item_key: string | null;
  status: "pending" | "paid" | "expired" | "failed";
  amount_idr: number;
  checkout_url: string;
  created_at: string;
  paid_at: string | null;
};

export type BillingStatus = {
  package: PackageKey | null;
  addons: string[];
  catalog: { packages: CatalogItem[]; addons: CatalogItem[] };
  latest_payment: Payment | null;
};

// RG-01 (Mode Registrasi-Saja, masih rencana saat ditulis, task.v2.md
// Bagian 11): "full" — undangan lengkap (default, perilaku sejak Fase 1).
// "registration_only" — undangan dibuat DI LUAR platform, kita cuma
// menyediakan halaman registrasi `/r/{slug}`.
export type EventMode = "full" | "registration_only";

export type GuestRsvpStatus = "menunggu" | "hadir" | "tidak_hadir";

export type Guest = {
  id: string;
  name: string;
  category: string | null;
  session_label: string | null;
  max_pax: number;
  invite_token: string;
  created_at: string;
  checked_in_at: string | null;
  rsvp_status: GuestRsvpStatus;
  has_selfie: boolean;
  // RG-05 — True kalau tamu ini masuk roster lewat auto-enroll (Mode
  // Registrasi-Saja), bukan diinput manual oleh owner.
  self_registered: boolean;
};

export type CheckInResult = {
  id: string;
  name: string;
  checked_in_at: string;
  already_checked_in: boolean;
};

// BT-03 (Selfie Check-in, add-on berbayar)
export type SelfieUploadResult = {
  id: string;
  has_selfie: boolean;
};

export type SelfieUrl = {
  url: string;
  expires_in: number;
};

export type GuestInput = {
  name: string;
  category?: string | null;
  session_label?: string | null;
  max_pax: number;
};

export type PublicGuest = {
  name: string;
  max_pax: number;
  already_responded: boolean;
  status_hadir: boolean | null;
};

export type Event = {
  id: string;
  partner1_name: string;
  partner2_name: string;
  partner1_parents: string | null;
  partner2_parents: string | null;
  partner1_instagram: string | null;
  partner2_instagram: string | null;
  event_date: string;
  waktu_akad: string | null;
  waktu_resepsi: string | null;
  lokasi: string;
  maps_url: string | null;
  dress_code: string | null;
  template_id: string;
  slug: string;
  is_published: boolean;
  mode: EventMode;
  created_at: string;
  updated_at: string;
  package: PackageKey | null;
  addons: string[];
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  ewallet_name: string | null;
  ewallet_number: string | null;
  ewallet_account_holder: string | null;
  music_url: string | null;
  gallery_urls: string[] | null;
  show_countdown: boolean;
  theme_assets: Record<string, string> | null;
};

export type EventPublic = Omit<
  Event,
  "id" | "is_published" | "created_at" | "updated_at"
>;

export type EventInput = {
  partner1_name: string;
  partner2_name: string;
  // Opsional — dipakai template Burgundy Royal ("Putra/Putri dari ..." & Instagram).
  partner1_parents?: string | null;
  partner2_parents?: string | null;
  partner1_instagram?: string | null;
  partner2_instagram?: string | null;
  event_date: string;
  waktu_akad?: string | null;
  waktu_resepsi?: string | null;
  lokasi: string;
  maps_url?: string | null;
  dress_code?: string | null;
  template_id: string;
};

// Amplop Digital (UW-09, add-on berbayar) — disimpan lewat PATCH /events/{id}
// yang sama (lihat EventInput), tapi dipisah jadi tipe & form sendiri di
// dashboard karena cuma editable setelah event sudah ada dan digembok add-on.
export type GiftInfoInput = {
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  ewallet_name: string | null;
  ewallet_number: string | null;
  ewallet_account_holder: string | null;
};

// UW-11 (add-on berbayar) — musik latar, galeri foto/video (via URL
// eksternal, tanpa upload), countdown timer. Sama pola dengan GiftInfoInput:
// cuma editable setelah event ada, disimpan lewat PATCH /events/{id} yang sama.
export type MediaInfoInput = {
  music_url: string | null;
  gallery_urls: string[];
  show_countdown: boolean;
};

export type RSVP = {
  id: string;
  guest_name: string;
  jumlah_pax: number;
  status_hadir: boolean;
  created_at: string;
  // RG-05 (auto-enroll): terisi HANYA saat request ini baru membuat Guest.
  // Selalu null untuk guest existing (upsert / lookup via token) — lihat
  // catatan keamanan di backend `schemas/rsvp.py`.
  guest_token: string | null;
};

export type GuestbookEntry = {
  id: string;
  nama: string;
  pesan: string;
  created_at: string;
};

export type TemplateOption = {
  id: string;
  label: string;
  description: string;
};

export const TEMPLATES: TemplateOption[] = [
  { id: "klasik", label: "Klasik", description: "Bingkai ornamental, serif, dusty rose — formal & tradisional" },
  { id: "modern-minimal", label: "Modern Minimal", description: "Rata kiri, tipografi tebal, banyak white space" },
  { id: "botanical", label: "Botanical", description: "Sage green, bentuk organik, hangat & natural" },
  { id: "monokrom", label: "Elegan Monokrom", description: "Latar gelap, aksen gold — mewah & dramatis" },
  { id: "editorial", label: "Editorial Modern", description: "Rata kiri, tipografi besar bold, info tersusun grid — gaya majalah" },
  { id: "monogram", label: "Monogram Elegan", description: "Lambang inisial mempelai, bingkai sudut ornamental, burgundy lembut" },
  { id: "taman-manis", label: "Taman Manis", description: "Pastel playful, nama gaya tulisan tangan, kartu & countdown bentuk bulat" },
  { id: "burgundy-royal", label: "Burgundy Royal", description: "Marun pekat, krem & emas, monogram tulisan tangan, bingkai ganda — mewah & hangat" },
];
