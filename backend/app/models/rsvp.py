import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.encrypted_types import EncryptedString

if TYPE_CHECKING:
    from app.models.event import Event
    from app.models.guest import Guest


class RSVP(Base):
    __tablename__ = "rsvps"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("events.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # Nullable & tanpa FK wajib — Fase 1 RSVP bersifat self-submit tanpa
    # roster. guest_id opsional disiapkan untuk rekonsiliasi vs tabel guests
    # setelah Kelola Tamu (UW-08, Fase 2) aktif.
    guest_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("guests.id", ondelete="SET NULL"), nullable=True
    )
    # Dienkripsi at-rest (OWASP A02) — data privat, tidak ditampilkan publik
    # di mana pun (beda dari buku tamu).
    guest_name: Mapped[str] = mapped_column(EncryptedString, nullable=False)
    jumlah_pax: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status_hadir: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    event: Mapped["Event"] = relationship(back_populates="rsvps")
    guest: Mapped["Guest | None"] = relationship(back_populates="rsvps")
