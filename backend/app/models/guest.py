import secrets
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.encrypted_types import EncryptedString

if TYPE_CHECKING:
    from app.models.event import Event
    from app.models.rsvp import RSVP


def _generate_invite_token() -> str:
    return secrets.token_urlsafe(9)  # ~12 karakter URL-safe, cukup acak utk link personal


class Guest(Base):
    """Roster tamu untuk Kelola Tamu (UW-08, Premium/Fase 2). `invite_token`
    dipakai untuk link personal per tamu — saat tamu buka link itu, form RSVP
    tahu siapa mereka (nama terkunci) dan batas `max_pax`-nya.
    """

    __tablename__ = "guests"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("events.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # Dienkripsi at-rest (OWASP A02) — data privat, cuma pemilik event yang
    # boleh baca (beda dari buku tamu, yang memang publik by design).
    name: Mapped[str] = mapped_column(EncryptedString, nullable=False)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    session_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    max_pax: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    invite_token: Mapped[str] = mapped_column(
        String(20), unique=True, index=True, nullable=False, default=_generate_invite_token
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # QR Check-in (BT-02, Fase 3) — diisi sekali saat tamu di-scan di venue.
    # Field di Guest (bukan tabel terpisah) karena relasinya 1:1, tidak perlu
    # riwayat multi-scan untuk kebutuhan sekarang.
    checked_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Selfie Check-in (BT-03, Premium). Cuma object KEY di bucket S3 privat
    # (app/core/storage.py) — bukan URL, apalagi foto mentah. Tidak
    # dienkripsi (beda dari `name`) karena string ini cuma path referensi,
    # bukan data pribadi itu sendiri; foto asli sudah privat lewat bucket +
    # signed URL berdurasi pendek.
    selfie_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # RG-05 (auto-enroll, Mode Registrasi-Saja) — True HANYA untuk baris yang
    # dibuat lewat jalur publik `submit_rsvp` (routes/rsvp.py), bukan lewat
    # `create_guest` (owner, Kelola Tamu). Murni flag tampilan (badge "Daftar
    # sendiri" di Kelola Tamu) — TIDAK ADA di `GuestCreate`/`GuestUpdate`
    # sama sekali, owner tidak pernah bisa mengubahnya, karena tidak ada
    # gunanya dipalsukan (beda dari `package`/`addons` yang OWASP-sensitive).
    self_registered: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    event: Mapped["Event"] = relationship(back_populates="guests")
    rsvps: Mapped[list["RSVP"]] = relationship(back_populates="guest")
