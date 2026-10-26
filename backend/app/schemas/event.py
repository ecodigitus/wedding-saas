import re
import uuid
from datetime import date, datetime
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator

# RG-01: dibatasi Literal (bukan free-string seperti template_id) karena
# nilainya menentukan percabangan logika (redirect /{slug} -> /r/{slug},
# auto-enroll di RSVP), bukan cuma lookup palet dengan fallback aman.
EventMode = Literal["full", "registration_only"]


def _assert_safe_http_scheme(value: str, field_label: str) -> None:
    """Dipakai untuk semua URL yang owner isi & dirender apa adanya ke tamu
    (`<a href>`, `<img src>`, `<audio src>`) — skema selain http/https bisa
    jadi stored XSS (`javascript:...`), OWASP A03."""
    scheme = urlparse(value).scheme.lower()
    if scheme not in ("http", "https"):
        raise ValueError(f"{field_label} harus dimulai dengan http:// atau https:// ya.")


def _validate_maps_url_scheme(value: str | None) -> str | None:
    if not value:
        return value
    _assert_safe_http_scheme(value, "Link Google Maps")
    return value


def _validate_music_url_scheme(value: str | None) -> str | None:
    if not value:
        return value
    _assert_safe_http_scheme(value, "Link musik latar")
    return value


_INSTAGRAM_HANDLE_RE = re.compile(r"^[A-Za-z0-9._]{1,30}$")


def _normalize_instagram(value: str | None) -> str | None:
    """Simpan handle tanpa "@" — dirender sebagai teks (bukan link) di template,
    tapi tetap dibatasi karakter Instagram yang valid (OWASP A03: input bebas
    tidak dibiarkan membawa markup/URL)."""
    if value is None:
        return value
    handle = value.strip().lstrip("@")
    if not handle:
        return None
    if not _INSTAGRAM_HANDLE_RE.match(handle):
        raise ValueError("Akun Instagram hanya boleh huruf, angka, titik, dan underscore (maks 30 karakter) ya.")
    return handle


# Slot gambar desain template "Burgundy Royal" — whitelist supaya key bebas
# dari user tidak ikut tersimpan (OWASP A04/A05); nilai wajib http(s).
THEME_ASSET_KEYS = frozenset(
    {
        "hero_bg", "satin_bg", "envelope", "cards_bg", "closeup_bg", "couple_bg", "groom_bg",
        "bride_bg", "couple2_bg", "acara_bg", "info_collage", "lily_wallpaper", "lily_left",
        "lily_right", "frame_empty", "bride_frame_1", "bride_frame_2", "bride_frame_3",
        "groom_frame_1", "groom_frame_2", "groom_frame_3",
        # bingkai galeri bentuk-bentuk berbeda (mosaik)
        "gal_heart", "gal_oval", "gal_rect_a", "gal_rect_b", "gal_square", "gal_rect_big",
        "gal_arch", "gal_wide", "gal_square_b",
        # logo bank di panel hadiah
        "bank_logo",
    }
)
MAX_THEME_ASSET_URL_LENGTH = 500


def _validate_theme_assets(value: dict[str, str] | None) -> dict[str, str] | None:
    if not value:
        return value
    unknown = set(value) - THEME_ASSET_KEYS
    if unknown:
        raise ValueError(f"Slot gambar desain tidak dikenal: {', '.join(sorted(unknown))}.")
    for key, url in value.items():
        if len(url) > MAX_THEME_ASSET_URL_LENGTH:
            raise ValueError(f"Link gambar '{key}' maksimal {MAX_THEME_ASSET_URL_LENGTH} karakter ya.")
        _assert_safe_http_scheme(url, f"Link gambar '{key}'")
    return value


MAX_GALLERY_ITEMS = 12
MAX_GALLERY_URL_LENGTH = 500


def _validate_gallery_urls(value: list[str] | None) -> list[str] | None:
    if not value:
        return value
    if len(value) > MAX_GALLERY_ITEMS:
        raise ValueError(f"Maksimal {MAX_GALLERY_ITEMS} item galeri ya.")
    for url in value:
        if len(url) > MAX_GALLERY_URL_LENGTH:
            raise ValueError(f"Link galeri maksimal {MAX_GALLERY_URL_LENGTH} karakter ya.")
        _assert_safe_http_scheme(url, "Link galeri")
    return value


class EventCreate(BaseModel):
    partner1_name: str = Field(min_length=1, max_length=150)
    partner2_name: str = Field(min_length=1, max_length=150)
    partner1_parents: str | None = Field(default=None, max_length=255)
    partner2_parents: str | None = Field(default=None, max_length=255)
    partner1_instagram: str | None = Field(default=None, max_length=31)
    partner2_instagram: str | None = Field(default=None, max_length=31)
    event_date: date
    waktu_akad: datetime | None = None
    waktu_resepsi: datetime | None = None
    lokasi: str = Field(min_length=1, max_length=2000)
    maps_url: str | None = Field(default=None, max_length=500)
    dress_code: str | None = Field(default=None, max_length=255)
    template_id: str = Field(default="klasik", max_length=50)

    @field_validator("event_date")
    @classmethod
    def event_date_not_in_past(cls, value: date) -> date:
        if value < date.today():
            raise ValueError("Tanggal acara nggak boleh di masa lalu ya.")
        return value

    @field_validator("maps_url")
    @classmethod
    def maps_url_safe_scheme(cls, value: str | None) -> str | None:
        return _validate_maps_url_scheme(value)

    @field_validator("partner1_instagram", "partner2_instagram")
    @classmethod
    def instagram_handle_valid(cls, value: str | None) -> str | None:
        return _normalize_instagram(value)


class EventUpdate(BaseModel):
    # RG-01: BEDA dari `package`/`addons` (lihat catatan di bawah) — field
    # ini SENGAJA ADA di sini dan boleh diubah owner langsung. Memilih mode
    # tidak membuka kapabilitas berbayar apa pun, cuma menentukan halaman
    # publik mana yang disajikan (undangan penuh vs registrasi-saja).
    mode: EventMode | None = None
    partner1_name: str | None = Field(default=None, min_length=1, max_length=150)
    partner2_name: str | None = Field(default=None, min_length=1, max_length=150)
    partner1_parents: str | None = Field(default=None, max_length=255)
    partner2_parents: str | None = Field(default=None, max_length=255)
    partner1_instagram: str | None = Field(default=None, max_length=31)
    partner2_instagram: str | None = Field(default=None, max_length=31)
    event_date: date | None = None
    waktu_akad: datetime | None = None
    waktu_resepsi: datetime | None = None
    lokasi: str | None = Field(default=None, min_length=1, max_length=2000)
    maps_url: str | None = Field(default=None, max_length=500)
    dress_code: str | None = Field(default=None, max_length=255)
    template_id: str | None = Field(default=None, max_length=50)
    is_published: bool | None = None

    # Amplop Digital (UW-09, add-on berbayar) — lihat _GIFT_INFO_FIELDS di
    # routes/events.py untuk gating add-on-nya. Nullable di sini juga jadi
    # cara "hapus" field (kirim null eksplisit untuk kosongkan info yang
    # sudah tersimpan).
    bank_name: str | None = Field(default=None, max_length=50)
    bank_account_number: str | None = Field(default=None, max_length=50)
    bank_account_holder: str | None = Field(default=None, max_length=150)
    ewallet_name: str | None = Field(default=None, max_length=50)
    ewallet_number: str | None = Field(default=None, max_length=50)
    ewallet_account_holder: str | None = Field(default=None, max_length=150)

    # UW-11 (add-on berbayar) — lihat _UW11_FIELDS di routes/events.py untuk gating.
    music_url: str | None = Field(default=None, max_length=500)
    gallery_urls: list[str] | None = Field(default=None)
    show_countdown: bool | None = None
    theme_assets: dict[str, str] | None = Field(default=None)

    # SENGAJA TIDAK ADA field `package`/`addons` di sini (OWASP A01) — kedua
    # field itu cuma boleh berubah lewat webhook Xendit setelah pembayaran
    # terverifikasi (routes/billing.py), tidak pernah dari request user
    # langsung. Kalau ditambah ke sini, user bisa PATCH event-nya sendiri
    # jadi package="grand" gratis tanpa bayar.

    @field_validator("event_date")
    @classmethod
    def event_date_not_in_past(cls, value: date | None) -> date | None:
        if value is not None and value < date.today():
            raise ValueError("Tanggal acara nggak boleh di masa lalu ya.")
        return value

    @field_validator("maps_url")
    @classmethod
    def maps_url_safe_scheme(cls, value: str | None) -> str | None:
        return _validate_maps_url_scheme(value)

    @field_validator("partner1_instagram", "partner2_instagram")
    @classmethod
    def instagram_handle_valid(cls, value: str | None) -> str | None:
        return _normalize_instagram(value)

    @field_validator("music_url")
    @classmethod
    def music_url_safe_scheme(cls, value: str | None) -> str | None:
        return _validate_music_url_scheme(value)

    @field_validator("gallery_urls")
    @classmethod
    def gallery_urls_valid(cls, value: list[str] | None) -> list[str] | None:
        return _validate_gallery_urls(value)

    @field_validator("theme_assets")
    @classmethod
    def theme_assets_valid(cls, value: dict[str, str] | None) -> dict[str, str] | None:
        return _validate_theme_assets(value)


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    partner1_name: str
    partner2_name: str
    partner1_parents: str | None
    partner2_parents: str | None
    partner1_instagram: str | None
    partner2_instagram: str | None
    event_date: date
    waktu_akad: datetime | None
    waktu_resepsi: datetime | None
    lokasi: str
    maps_url: str | None
    dress_code: str | None
    template_id: str
    slug: str
    is_published: bool
    mode: EventMode
    created_at: datetime
    updated_at: datetime
    # Read-only dari endpoint ini — aman karena EventUpdate TIDAK punya field
    # ini sama sekali (lihat catatan keamanan di EventUpdate).
    package: str | None
    addons: list[str] | None
    bank_name: str | None
    bank_account_number: str | None
    bank_account_holder: str | None
    ewallet_name: str | None
    ewallet_number: str | None
    ewallet_account_holder: str | None
    music_url: str | None
    gallery_urls: list[str] | None
    show_countdown: bool
    theme_assets: dict[str, str] | None


class EventPublicOut(BaseModel):
    """Subset yang aman ditampilkan ke publik — tidak ada owner_id/internal id lain."""

    model_config = ConfigDict(from_attributes=True)

    partner1_name: str
    partner2_name: str
    partner1_parents: str | None
    partner2_parents: str | None
    partner1_instagram: str | None
    partner2_instagram: str | None
    event_date: date
    waktu_akad: datetime | None
    waktu_resepsi: datetime | None
    lokasi: str
    maps_url: str | None
    dress_code: str | None
    template_id: str
    slug: str
    # RG-03: frontend butuh ini untuk redirect server-side /{slug} -> /r/{slug}
    # saat mode registrasi-saja aktif, sebelum template undangan sempat
    # ter-render (menghindari flash konten yang salah).
    mode: EventMode
    # Amplop Digital (UW-09) — SENGAJA publik: satu-satunya tujuan field ini
    # adalah supaya tamu bisa transfer hadiah, jadi ditampilkan apa adanya
    # kalau owner sudah mengisinya (tidak perlu re-check tier premium di sini
    # — kalau field-nya terisi berarti sudah lolos gate saat disimpan).
    bank_name: str | None
    bank_account_number: str | None
    bank_account_holder: str | None
    ewallet_name: str | None
    ewallet_number: str | None
    ewallet_account_holder: str | None
    # UW-11 (Premium) — sama alasannya: SENGAJA publik, tidak re-check tier
    # di sini (sudah lolos gate saat disimpan).
    music_url: str | None
    gallery_urls: list[str] | None
    show_countdown: bool
    theme_assets: dict[str, str] | None
