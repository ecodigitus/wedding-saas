import type {
  BillingStatus,
  CheckInResult,
  Event,
  EventInput,
  EventMode,
  EventPublic,
  GiftInfoInput,
  Guest,
  GuestInput,
  GuestbookEntry,
  MediaInfoInput,
  PublicGuest,
  RSVP,
  SelfieUploadResult,
  SelfieUrl,
  User,
} from "./types";

// Fase 1: JWT disimpan di localStorage untuk simplicity development.
// Tradeoff yang disadari: rentan XSS dibanding httpOnly cookie. Risiko
// residual sudah dikurangi lewat sanitasi input (backend, cegah stored XSS)
// + React default escaping. Migrasi ke httpOnly cookie + CSRF token
// direkomendasikan sebelum scale-up ke Fase 2+.
// `||` (bukan `??`) sengaja — kalau build-arg NEXT_PUBLIC_API_URL diteruskan
// tapi nilainya string kosong (mis. ARG Docker tidak diisi saat build), fetch
// akan diam-diam jalan ke path relatif (origin frontend sendiri) alih-alih ke
// backend, dan gagal dengan pesan generik yang membingungkan saat debug.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ACCESS_TOKEN_KEY = "wedding_access_token";
const REFRESH_TOKEN_KEY = "wedding_refresh_token";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return getRefreshToken() !== null;
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail) && body.detail[0]?.msg) {
      const raw = body.detail[0].msg as string;
      // Custom validator kita (mis. tanggal masa lalu) sudah berbahasa
      // Indonesia, tapi Pydantic selalu menempelkan prefix "Value error, "
      // di depannya — buang prefix itu. Kalau TIDAK ada prefix ini, berarti
      // pesannya murni bawaan Pydantic (Inggris teknis, mis. "String should
      // have at least 1 character") — jangan ditampilkan mentah ke user.
      const withoutPrefix = raw.replace(/^Value error,\s*/, "");
      if (withoutPrefix !== raw) return withoutPrefix;
      return "Ada data yang belum sesuai, coba cek lagi ya.";
    }
  } catch {
    // response bukan JSON, biarkan pesan generik
  }
  return "Terjadi kesalahan. Coba lagi ya.";
}

/** Fetch tanpa auth — aman dipakai di Server Component maupun Client Component. */
export async function publicFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new ApiError("Belum login.", 401);

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    clearTokens();
    throw new ApiError("Sesi kamu sudah habis, silakan login lagi.", 401);
  }
  const data = await res.json();
  setTokens(data.access_token, data.refresh_token);
  return data.access_token;
}

/** Fetch dengan Bearer token — auto-refresh sekali kalau access token expired. */
export async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let accessToken = getAccessToken();

  const doFetch = (token: string | null) =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });

  let res = await doFetch(accessToken);
  if (res.status === 401 && getRefreshToken()) {
    accessToken = await refreshAccessToken();
    res = await doFetch(accessToken);
  }
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
  if (res.status === 204) return undefined as T;
  return res.json();
}

/** Untuk endpoint export CSV — perlu Bearer header, jadi tidak bisa link <a href> langsung. */
export async function downloadWithAuth(path: string, filename: string): Promise<void> {
  let accessToken = getAccessToken();
  const doFetch = (token: string | null) =>
    fetch(`${API_BASE}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

  let res = await doFetch(accessToken);
  if (res.status === 401 && getRefreshToken()) {
    accessToken = await refreshAccessToken();
    res = await doFetch(accessToken);
  }
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ---- Auth ----

export async function registerAccount(payload: {
  email: string;
  password: string;
  full_name?: string;
}) {
  const data = await publicFetch<{ access_token: string; refresh_token: string }>(
    "/auth/register",
    { method: "POST", body: JSON.stringify(payload) }
  );
  setTokens(data.access_token, data.refresh_token);
}

export async function login(email: string, password: string) {
  const data = await publicFetch<{ access_token: string; refresh_token: string }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) }
  );
  setTokens(data.access_token, data.refresh_token);
}

export async function logout() {
  const refreshToken = getRefreshToken();
  clearTokens();
  if (refreshToken) {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }).catch(() => {
      // Sudah dihapus di sisi client, kegagalan revoke di server bukan blocker.
    });
  }
}

export async function getMe(): Promise<User> {
  return authFetch<User>("/auth/me");
}

// ---- Events (editor) ----

export async function listMyEvents(): Promise<Event[]> {
  return authFetch<Event[]>("/events");
}

export async function createEvent(payload: EventInput): Promise<Event> {
  return authFetch<Event>("/events", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateEvent(
  eventId: string,
  payload: Partial<EventInput> &
    { is_published?: boolean; mode?: EventMode } &
    Partial<GiftInfoInput> &
    Partial<MediaInfoInput>
): Promise<Event> {
  return authFetch<Event>(`/events/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// ---- Public invitation ----

export async function getPublicInvitation(slug: string): Promise<EventPublic> {
  return publicFetch<EventPublic>(`/invitations/${slug}`, { cache: "no-store" });
}

export async function submitRsvp(
  slug: string,
  payload: {
    guest_name: string;
    jumlah_pax: number;
    status_hadir: boolean;
    guest_token?: string;
  }
): Promise<RSVP> {
  return publicFetch<RSVP>(`/invitations/${slug}/rsvp`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Lookup tamu lewat link personalnya (Kelola Tamu, UW-08) — 404 kalau token salah. */
export async function getPublicGuest(slug: string, token: string): Promise<PublicGuest> {
  return publicFetch<PublicGuest>(`/invitations/${slug}/guest/${token}`, { cache: "no-store" });
}

export async function getPublicGuestbookEntries(slug: string): Promise<GuestbookEntry[]> {
  return publicFetch<GuestbookEntry[]>(`/invitations/${slug}/guestbook`, { cache: "no-store" });
}

export async function submitGuestbookEntry(
  slug: string,
  payload: { nama: string; pesan: string }
): Promise<GuestbookEntry> {
  return publicFetch<GuestbookEntry>(`/invitations/${slug}/guestbook`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ---- Dashboard: RSVP & guestbook milik owner ----

export async function listRsvps(eventId: string): Promise<RSVP[]> {
  return authFetch<RSVP[]>(`/events/${eventId}/rsvps`);
}

export async function downloadRsvpCsv(eventId: string): Promise<void> {
  await downloadWithAuth(`/events/${eventId}/rsvps/export`, "rsvp.csv");
}

export async function listGuestbookEntries(eventId: string): Promise<GuestbookEntry[]> {
  return authFetch<GuestbookEntry[]>(`/events/${eventId}/guestbook`);
}

export async function downloadGuestbookCsv(eventId: string): Promise<void> {
  await downloadWithAuth(`/events/${eventId}/guestbook/export`, "buku-tamu.csv");
}

// ---- Billing (paket per-acara + add-on via Xendit) ----
// Event-scoped — paket & add-on melekat ke ACARA, bukan akun (beda dari
// model Lite/Premium lama).

export async function getBillingStatus(eventId: string): Promise<BillingStatus> {
  return authFetch<BillingStatus>(`/events/${eventId}/billing/status`);
}

export async function createPurchase(
  eventId: string,
  payload: { item_type: "package" | "addon"; item_key: string }
): Promise<{ checkout_url: string; payment_id: string }> {
  return authFetch(`/events/${eventId}/billing/purchase`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ---- Kelola Tamu (paket per-acara — UW-08) ----

export async function listGuests(eventId: string): Promise<Guest[]> {
  return authFetch<Guest[]>(`/events/${eventId}/guests`);
}

export async function createGuest(eventId: string, payload: GuestInput): Promise<Guest> {
  return authFetch<Guest>(`/events/${eventId}/guests`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateGuest(
  eventId: string,
  guestId: string,
  payload: Partial<GuestInput>
): Promise<Guest> {
  return authFetch<Guest>(`/events/${eventId}/guests/${guestId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteGuest(eventId: string, guestId: string): Promise<void> {
  await authFetch<void>(`/events/${eventId}/guests/${guestId}`, { method: "DELETE" });
}

/** QR Check-in (BT-02, Fase 3) — `token` hasil decode QR yang di-scan di venue. */
export async function checkInGuest(token: string): Promise<CheckInResult> {
  return authFetch<CheckInResult>("/guests/check-in", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

/** Selfie Check-in (BT-03, Premium) — multipart, jadi TIDAK lewat authFetch
 * (yang selalu paksa Content-Type: application/json). Browser otomatis set
 * header multipart + boundary yang benar asal Content-Type tidak disentuh
 * manual sama sekali. Pola refresh-token sama seperti authFetch. */
export async function uploadCheckInSelfie(token: string, photo: Blob): Promise<SelfieUploadResult> {
  const formData = new FormData();
  formData.append("token", token);
  formData.append("photo", photo, "selfie.jpg");

  let accessToken = getAccessToken();
  const doFetch = (t: string | null) =>
    fetch(`${API_BASE}/guests/check-in/selfie`, {
      method: "POST",
      headers: t ? { Authorization: `Bearer ${t}` } : {},
      body: formData,
    });

  let res = await doFetch(accessToken);
  if (res.status === 401 && getRefreshToken()) {
    accessToken = await refreshAccessToken();
    res = await doFetch(accessToken);
  }
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
  return res.json();
}

/** BT-03 — signed URL dibuat on-demand, berdurasi pendek (5 menit dari
 * backend), jangan disimpan/dipakai ulang lama. */
export async function getGuestSelfieUrl(eventId: string, guestId: string): Promise<SelfieUrl> {
  return authFetch<SelfieUrl>(`/events/${eventId}/guests/${guestId}/selfie-url`);
}
