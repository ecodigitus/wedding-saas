import hmac
import logging
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_event_or_404
from app.core.config import settings
from app.core.packages import ADDON_CATALOG, PACKAGE_CATALOG
from app.db.session import get_db
from app.models.event import Event
from app.models.payment import Payment
from app.models.user import User
from app.schemas.billing import (
    BillingStatusOut,
    CatalogItemOut,
    CatalogOut,
    PurchaseCreate,
    UpgradeResponseOut,
)
from app.schemas.xendit_webhook import XenditInvoiceWebhook
from app.services import xendit

# Event-scoped (paket & add-on melekat ke acara, bukan akun) — konsisten
# dengan pola nested resource yang sudah ada (guests/rsvps/guestbook).
router = APIRouter(prefix="/events/{event_id}/billing", tags=["billing"])
# Webhook TETAP global — Xendit callback tidak tahu event_id, cuma invoice id.
webhook_router = APIRouter(prefix="/billing", tags=["billing"])
logger = logging.getLogger("app.billing")


def _catalog() -> CatalogOut:
    return CatalogOut(
        packages=[
            CatalogItemOut(key=key, label=v["label"], price_idr=v["price_idr"], max_guests=v["max_guests"])
            for key, v in PACKAGE_CATALOG.items()
        ],
        addons=[
            CatalogItemOut(key=key, label=v["label"], price_idr=v["price_idr"])
            for key, v in ADDON_CATALOG.items()
        ],
    )


@router.get("/status", response_model=BillingStatusOut)
def get_billing_status(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = get_event_or_404(event_id, db, current_user)
    latest = (
        db.query(Payment)
        .filter(Payment.event_id == event_id)
        .order_by(Payment.created_at.desc())
        .first()
    )
    return BillingStatusOut(
        package=event.package, addons=event.addons or [], catalog=_catalog(), latest_payment=latest
    )


@router.post("/purchase", response_model=UpgradeResponseOut)
def create_purchase(
    event_id: uuid.UUID,
    payload: PurchaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = get_event_or_404(event_id, db, current_user)

    catalog = PACKAGE_CATALOG if payload.item_type == "package" else ADDON_CATALOG
    item = catalog.get(payload.item_key)
    if item is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Paket/add-on tidak dikenal.")

    if payload.item_type == "package":
        # Downgrade/beli-ulang paket dengan kapasitas <= paket yang sudah
        # dimiliki DITOLAK — ditemukan sebagai gap nyata (owner bisa bayar
        # lagi untuk paket lebih kecil, lalu webhook menimpa `event.package`
        # tanpa syarat apa pun, bisa bikin roster yang sudah ada "kepenuhan"
        # tanpa peringatan). Dibandingkan lewat `max_guests` dari katalog
        # (bukan daftar nama paket hardcode) supaya otomatis benar kalau
        # katalog berubah.
        if event.package is not None:
            current = PACKAGE_CATALOG[event.package]
            if item["max_guests"] <= current["max_guests"]:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    f"Undangan ini sudah punya paket {current['label']} (kapasitas "
                    f"{current['max_guests']} tamu). Pilih paket dengan kapasitas lebih "
                    "besar untuk upgrade — tidak bisa downgrade atau beli ulang paket "
                    "yang sama.",
                )
    elif payload.item_type == "addon":
        if event.package is None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Beli paket dulu sebelum menambah add-on.")
        if payload.item_key in (event.addons or []):
            raise HTTPException(status.HTTP_409_CONFLICT, f"Add-on {item['label']} sudah kamu miliki.")

    # Buat row Payment dulu (pending) supaya sudah punya id untuk external_id
    # yang unik & bisa dilacak balik — baru panggil Xendit.
    payment = Payment(
        user_id=current_user.id,
        event_id=event_id,
        item_type=payload.item_type,
        item_key=payload.item_key,
        amount_idr=item["price_idr"],
        status="pending",
        xendit_invoice_id="",
        checkout_url="",
    )
    db.add(payment)
    db.flush()

    try:
        invoice = xendit.create_invoice(
            external_id=f"{payload.item_type}-{payment.id}",
            amount=item["price_idr"],
            payer_email=current_user.email,
            description=f"{item['label']} — Wedding SaaS",
            success_redirect_url=f"{settings.frontend_base_url}/dashboard/billing?status=success",
            failure_redirect_url=f"{settings.frontend_base_url}/dashboard/billing?status=failed",
        )
    except xendit.XenditNotConfigured as exc:
        db.rollback()
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Pembayaran belum bisa diproses di server ini (Xendit belum dikonfigurasi).",
        ) from exc
    except xendit.XenditError as exc:
        db.rollback()
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, "Gagal membuat invoice pembayaran. Coba lagi ya."
        ) from exc

    payment.xendit_invoice_id = invoice["id"]
    payment.checkout_url = invoice["invoice_url"]
    db.commit()
    db.refresh(payment)

    return UpgradeResponseOut(checkout_url=payment.checkout_url, payment_id=payment.id)


@webhook_router.post("/webhook/xendit", status_code=status.HTTP_204_NO_CONTENT)
def xendit_webhook(
    payload: XenditInvoiceWebhook,
    request: Request,
    db: Session = Depends(get_db),
    x_callback_token: str | None = Header(default=None),
):
    client_ip = request.client.host if request.client else "?"

    # Verifikasi token WAJIB sebelum percaya body sama sekali — cegah orang
    # lain memanggil endpoint ini langsung untuk memalsukan status "PAID".
    if not settings.xendit_webhook_token or not x_callback_token:
        logger.warning("webhook xendit ditolak (token kosong) dari ip=%s", client_ip)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Webhook token tidak valid.")
    if not hmac.compare_digest(x_callback_token, settings.xendit_webhook_token):
        # OWASP A09 — percobaan pemalsuan webhook (token salah) wajib
        # kelihatan di log, ini vektor serangan paling langsung ke sistem
        # billing kalau ada yang coba forge status "PAID".
        logger.warning("webhook xendit ditolak (token salah) dari ip=%s", client_ip)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Webhook token tidak valid.")

    payment = db.query(Payment).filter(Payment.xendit_invoice_id == payload.id).first()
    if payment is None:
        # Invoice tidak dikenal di sistem kita — abaikan diam-diam (204), jangan
        # bocorkan info lewat status code yang beda ke pemanggil tak dikenal.
        return

    if payload.status == "PAID" and payment.status != "paid":
        payment.status = "paid"
        payment.paid_at = datetime.now(UTC)
        event = db.get(Event, payment.event_id) if payment.event_id else None
        if event is not None:
            if payment.item_type == "package":
                event.package = payment.item_key
            elif payment.item_type == "addon":
                addons = list(event.addons or [])
                if payment.item_key not in addons:
                    addons.append(payment.item_key)
                event.addons = addons
        db.commit()
    elif payload.status in {"EXPIRED", "FAILED"} and payment.status == "pending":
        payment.status = payload.status.lower()
        db.commit()
