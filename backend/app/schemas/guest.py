import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class GuestCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    category: str | None = Field(default=None, max_length=50)
    session_label: str | None = Field(default=None, max_length=100)
    max_pax: int = Field(default=1, ge=1, le=20)


class GuestUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    category: str | None = Field(default=None, max_length=50)
    session_label: str | None = Field(default=None, max_length=100)
    max_pax: int | None = Field(default=None, ge=1, le=20)


class GuestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    category: str | None
    session_label: str | None
    max_pax: int
    invite_token: str
    created_at: datetime
    checked_in_at: datetime | None
    # RG-05 — True kalau baris ini terbentuk lewat auto-enroll (RSVP publik),
    # bukan diinput manual oleh owner. Read-only: TIDAK ADA di
    # `GuestCreate`/`GuestUpdate` sama sekali.
    self_registered: bool
    # Diisi manual di route (bukan dari kolom DB) — hasil rekonsiliasi vs RSVP.
    rsvp_status: str = "menunggu"  # "menunggu" | "hadir" | "tidak_hadir"
    # BT-03 — cuma boolean, BUKAN selfie_key atau URL apa pun. Owner klik
    # untuk minta signed URL terpisah (GET .../selfie-url) baru foto asli
    # bisa dilihat, dan itu pun berdurasi pendek.
    has_selfie: bool = False


class CheckInRequest(BaseModel):
    token: str = Field(min_length=1, max_length=20)


class CheckInOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    checked_in_at: datetime
    already_checked_in: bool


class SelfieUploadOut(BaseModel):
    id: uuid.UUID
    has_selfie: bool = True


class SelfieUrlOut(BaseModel):
    url: str
    expires_in: int


class PublicGuestOut(BaseModel):
    """Dilihat tamu lewat link personalnya — sengaja tidak expose category/
    session/event_id, cuma yang perlu buat ngisi form RSVP."""

    name: str
    max_pax: int
    already_responded: bool
    status_hadir: bool | None = None
