import logging
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_event_with_package
from app.core.packages import PACKAGE_CATALOG
from app.core.rate_limit import RateLimiter
from app.core.storage import (
    StorageNotConfiguredError,
    generate_signed_url,
    make_selfie_key,
    upload_private_object,
)
from app.db.session import get_db
from app.models.event import Event
from app.models.guest import Guest
from app.models.rsvp import RSVP
from app.models.user import User
from app.schemas.guest import (
    CheckInOut,
    CheckInRequest,
    GuestCreate,
    GuestOut,
    GuestUpdate,
    PublicGuestOut,
    SelfieUploadOut,
    SelfieUrlOut,
)
from app.services.guest_capacity import guest_capacity_remaining
from app.utils.image import InvalidImageError, validate_and_normalize_image
from app.utils.sanitize import sanitize_name

logger = logging.getLogger("app.guests")

public_router = APIRouter(prefix="/invitations", tags=["guests"])
owner_router = APIRouter(prefix="/events/{event_id}/guests", tags=["guests"])
# Prefix beda dari owner_router: scan QR cuma punya invite_token di tangan,
# belum tahu event_id-nya sampai token itu dicocokkan di database.
checkin_router = APIRouter(prefix="/guests", tags=["guests"])

# Ditemukan saat security review (OWASP A04) — endpoint publik ini sempat
# tidak punya rate limit sama sekali, beda dari endpoint publik lain
# (invitation-read, guestbook-public-read) yang sudah konsisten dilindungi.
# invite_token sendiri (72-bit random) tidak praktis di-brute-force, tapi
# absennya rate limit tetap membuka penyalahgunaan lain (resource exhaustion).
_public_guest_lookup_rate_limit = RateLimiter("guest-lookup", max_calls=120, window_seconds=60)


def _to_guest_out(guest: Guest, rsvp_by_guest_id: dict[uuid.UUID, RSVP]) -> GuestOut:
    out = GuestOut.model_validate(guest)
    rsvp = rsvp_by_guest_id.get(guest.id)
    if rsvp is not None:
        out.rsvp_status = "hadir" if rsvp.status_hadir else "tidak_hadir"
    else:
        out.rsvp_status = "menunggu"
    out.has_selfie = guest.selfie_key is not None
    return out


@owner_router.post("", response_model=GuestOut, status_code=status.HTTP_201_CREATED)
def create_guest(
    event_id: uuid.UUID,
    payload: GuestCreate,
    db: Session = Depends(get_db),
    event: Event = Depends(require_event_with_package),
):
    # Kapasitas tamu ditegakkan sesuai paket (Intimate 200 / Celebration 600 /
    # Grand 1.200) — bagian dari model bisnis "bayar sesuai kapasitas". Fungsi
    # bersama (bukan query count() lokal) karena jalur publik auto-enroll
    # (RG-05, `routes/rsvp.py`) wajib pakai pengecekan yang sama persis.
    if not guest_capacity_remaining(db, event):
        max_guests = PACKAGE_CATALOG[event.package]["max_guests"]
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Sudah mencapai batas {max_guests} tamu untuk paket "
            f"{PACKAGE_CATALOG[event.package]['label']}. Upgrade paket untuk tambah kapasitas.",
        )

    guest = Guest(
        event_id=event_id,
        name=sanitize_name(payload.name),
        category=payload.category,
        session_label=payload.session_label,
        max_pax=payload.max_pax,
    )
    db.add(guest)
    db.commit()
    db.refresh(guest)
    return _to_guest_out(guest, {})


@owner_router.get("", response_model=list[GuestOut])
def list_guests(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    event: Event = Depends(require_event_with_package),
):
    guests = db.query(Guest).filter(Guest.event_id == event_id).order_by(Guest.created_at.asc()).all()
    rsvps = db.query(RSVP).filter(RSVP.event_id == event_id, RSVP.guest_id.isnot(None)).all()
    rsvp_by_guest_id = {r.guest_id: r for r in rsvps}
    return [_to_guest_out(g, rsvp_by_guest_id) for g in guests]


@owner_router.patch("/{guest_id}", response_model=GuestOut)
def update_guest(
    event_id: uuid.UUID,
    guest_id: uuid.UUID,
    payload: GuestUpdate,
    db: Session = Depends(get_db),
    event: Event = Depends(require_event_with_package),
):
    guest = db.get(Guest, guest_id)
    if guest is None or guest.event_id != event_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tamu tidak ditemukan.")

    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates:
        updates["name"] = sanitize_name(updates["name"])
    for field, value in updates.items():
        setattr(guest, field, value)
    db.commit()
    db.refresh(guest)

    rsvp = db.query(RSVP).filter(RSVP.guest_id == guest.id).first()
    return _to_guest_out(guest, {guest.id: rsvp} if rsvp else {})


@owner_router.get("/{guest_id}/selfie-url", response_model=SelfieUrlOut)
def get_guest_selfie_url(
    event_id: uuid.UUID,
    guest_id: uuid.UUID,
    db: Session = Depends(get_db),
    event: Event = Depends(require_event_with_package),
):
    """BT-03 — signed URL berdurasi pendek, dibuat on-demand tiap owner klik
    lihat foto (bukan disimpan/di-cache), supaya link yang bocor/dibagikan
    otomatis kedaluwarsa cepat. Bucket S3-nya sendiri privat total."""
    # Cek kepemilikan tamu DULU, baru status add-on — supaya owner event lain
    # yang coba probe guest_id acak tidak dapat info "add-on ini belum
    # dibeli" (bocoran status billing) sebelum lolos cek 404 kepemilikan.
    guest = db.get(Guest, guest_id)
    if guest is None or guest.event_id != event_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tamu tidak ditemukan.")
    if "selfie_checkin" not in (event.addons or []):
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            "Selfie Check-in khusus pemilik add-on ini. Beli add-on dulu di menu Billing ya.",
        )
    if guest.selfie_key is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tamu ini belum punya foto selfie check-in.")

    expires_in = 300
    try:
        url = generate_signed_url(guest.selfie_key, expires_in=expires_in)
    except StorageNotConfiguredError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc
    return SelfieUrlOut(url=url, expires_in=expires_in)


@owner_router.delete("/{guest_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_guest(
    event_id: uuid.UUID,
    guest_id: uuid.UUID,
    db: Session = Depends(get_db),
    event: Event = Depends(require_event_with_package),
):
    guest = db.get(Guest, guest_id)
    if guest is None or guest.event_id != event_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tamu tidak ditemukan.")
    db.delete(guest)
    db.commit()


@public_router.get(
    "/{slug}/guest/{token}",
    response_model=PublicGuestOut,
    dependencies=[Depends(_public_guest_lookup_rate_limit)],
)
def get_public_guest(slug: str, token: str, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.slug == slug, Event.is_published.is_(True)).first()
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Undangan tidak ditemukan atau belum dipublish.")

    guest = db.query(Guest).filter(Guest.invite_token == token, Guest.event_id == event.id).first()
    if guest is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Link undangan personal tidak valid.")

    rsvp = db.query(RSVP).filter(RSVP.guest_id == guest.id).first()
    return PublicGuestOut(
        name=guest.name,
        max_pax=guest.max_pax,
        already_responded=rsvp is not None,
        status_hadir=rsvp.status_hadir if rsvp else None,
    )


@checkin_router.post("/check-in", response_model=CheckInOut)
def check_in_guest(
    payload: CheckInRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Dipanggil dari halaman scan dashboard (BT-02) setelah QR tamu ter-decode
    di browser. Idempotent — scan ulang tamu yang sudah check-in bukan error,
    cuma dikembalikan `already_checked_in=True` + waktu check-in aslinya.

    Tidak pakai `require_event_with_package` (butuh event_id di path) — di
    sini cuma ada `token`, event baru diketahui setelah resolve guest, jadi
    gating paket dicek inline sesudahnya."""
    guest = db.query(Guest).filter(Guest.invite_token == payload.token).first()
    event = db.get(Event, guest.event_id) if guest else None
    if guest is None or event is None or event.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "QR tidak valid atau bukan tamu undanganmu.")
    if event.package is None:
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, "Undangan ini belum punya paket.")

    already = guest.checked_in_at is not None
    if not already:
        guest.checked_in_at = datetime.now(UTC)
        db.commit()
        db.refresh(guest)

    return CheckInOut(
        id=guest.id, name=guest.name, checked_in_at=guest.checked_in_at, already_checked_in=already
    )


@checkin_router.post("/check-in/selfie", response_model=SelfieUploadOut)
def upload_checkin_selfie(
    token: str = Form(...),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Selfie Check-in (BT-03, add-on berbayar) — dipanggil TERPISAH setelah
    check-in QR (BT-02) sukses, dari tombol "Ambil Foto" di halaman scan
    dashboard yang me-reuse kamera yang sudah aktif. Bukan bagian dari
    /check-in supaya alurnya tetap 2 langkah yang jelas (scan dulu, baru
    opsional foto)."""
    guest = db.query(Guest).filter(Guest.invite_token == token).first()
    event = db.get(Event, guest.event_id) if guest else None
    if guest is None or event is None or event.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "QR tidak valid atau bukan tamu undanganmu.")
    if "selfie_checkin" not in (event.addons or []):
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            "Selfie Check-in khusus pemilik add-on ini. Beli add-on dulu di menu Billing ya.",
        )

    raw = photo.file.read()
    try:
        normalized = validate_and_normalize_image(raw)
    except InvalidImageError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc

    key = make_selfie_key(guest.id)
    try:
        upload_private_object(key, normalized, content_type="image/jpeg")
    except StorageNotConfiguredError as exc:
        logger.error("upload selfie gagal — storage S3 belum dikonfigurasi")
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc

    guest.selfie_key = key
    db.commit()

    return SelfieUploadOut(id=guest.id, has_selfie=True)
