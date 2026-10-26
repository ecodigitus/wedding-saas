import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.event import Event
    from app.models.user import User


class Payment(Base):
    """Satu percobaan pembayaran (paket ATAU add-on) lewat Xendit, per-acara.
    Status di sini HANYA berubah lewat webhook Xendit yang terverifikasi
    (app/api/routes/billing.py) — bukan lewat redirect UI, supaya tidak bisa
    dipalsukan dengan cara mengarahkan browser ke success_redirect_url begitu
    saja.
    """

    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # Nullable di DB (baris lama dari model tier/akun lama tidak punya nilai
    # ini) — SELALU diisi untuk baris baru yang dibuat lewat routes/billing.py.
    event_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("events.id", ondelete="CASCADE"), index=True, nullable=True
    )
    # "package" | "addon" — item_key merujuk ke key di PACKAGE_CATALOG atau
    # ADDON_CATALOG (app/core/packages.py), mis. "intimate"/"amplop_digital".
    item_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    item_key: Mapped[str | None] = mapped_column(String(50), nullable=True)
    amount_idr: Mapped[int] = mapped_column(Integer, nullable=False)
    # pending -> paid | expired | failed
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    xendit_invoice_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    checkout_url: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="payments")
    event: Mapped["Event | None"] = relationship()
