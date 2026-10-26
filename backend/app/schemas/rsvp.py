import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RSVPCreate(BaseModel):
    guest_name: str = Field(min_length=1, max_length=150)
    jumlah_pax: int = Field(ge=1, le=20)
    status_hadir: bool
    # Kalau diisi (dari link personal tamu, Kelola Tamu/UW-08): guest_name di
    # atas DIABAIKAN — nama diambil dari roster (guest_token) agar tidak bisa
    # dipalsukan, dan jumlah_pax divalidasi vs max_pax milik tamu itu.
    guest_token: str | None = Field(default=None, max_length=20)


class RSVPOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    guest_name: str
    jumlah_pax: int
    status_hadir: bool
    created_at: datetime
    # RG-05 (auto-enroll): terisi HANYA untuk guest yang baru dibuat di
    # request ini — TIDAK PERNAH untuk guest existing (upsert atau lookup via
    # token). Kalau aturan ini dilanggar, tebak-nama jadi jalur pengambilalihan
    # RSVP + QR tamu lain (OWASP A01). Selalu diisi manual lewat `_to_rsvp_out`
    # di routes/rsvp.py, bukan dibaca dari atribut ORM (RSVP tidak punya
    # kolom ini sama sekali).
    guest_token: str | None = None
