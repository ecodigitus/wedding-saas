import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_event_or_404
from app.db.session import get_db
from app.models.event import Event
from app.models.user import User
from app.schemas.event import EventCreate, EventOut, EventUpdate
from app.utils.slug import generate_unique_slug

router = APIRouter(prefix="/events", tags=["events"])

# Amplop Digital (UW-09) — add-on berbayar, tapi lewat EventUpdate yang sama
# dengan field lain (bukan endpoint terpisah) supaya konsisten dengan pola
# PATCH parsial yang sudah ada. Gate dicek di sini via `event.addons`
# (bukan tier akun lagi — add-on ini melekat ke EVENT, dibeli terpisah dari
# paket inti lewat /events/{event_id}/billing/purchase).
_GIFT_INFO_FIELDS = {
    "bank_name",
    "bank_account_number",
    "bank_account_holder",
    "ewallet_name",
    "ewallet_number",
    "ewallet_account_holder",
}

# UW-11 (add-on berbayar) — musik latar, galeri foto/video, countdown timer.
# Gate terpisah dari _GIFT_INFO_FIELDS supaya pesan error tetap spesifik.
_UW11_FIELDS = {"music_url", "gallery_urls", "show_countdown", "theme_assets"}


@router.post("", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(Event).filter(Event.owner_id == current_user.id).first()
    if existing is not None:
        # Fase 1: 1 akun = 1 event aktif (PRD.v2 Bagian 5). Skema data sendiri
        # sudah mendukung banyak event per akun untuk kasus WO di Fase 5.
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Kamu sudah punya satu undangan aktif. Dukungan multi-event untuk WO datang di fase berikutnya.",
        )

    slug = generate_unique_slug(db, payload.partner1_name, payload.partner2_name)
    event = Event(owner_id=current_user.id, slug=slug, **payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("", response_model=list[EventOut])
def list_my_events(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Event).filter(Event.owner_id == current_user.id).all()


@router.get("/{event_id}", response_model=EventOut)
def get_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_event_or_404(event_id, db, current_user)


@router.patch("/{event_id}", response_model=EventOut)
def update_event(
    event_id: uuid.UUID,
    payload: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = get_event_or_404(event_id, db, current_user)
    updates = payload.model_dump(exclude_unset=True)
    addons = event.addons or []
    if "amplop_digital" not in addons and _GIFT_INFO_FIELDS & updates.keys():
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            "Amplop Digital khusus pemilik add-on ini. Beli add-on dulu di menu Billing ya.",
        )
    if "musik_galeri_countdown" not in addons and _UW11_FIELDS & updates.keys():
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            "Musik latar, galeri, & countdown timer khusus pemilik add-on ini. "
            "Beli add-on dulu di menu Billing ya.",
        )
    for field, value in updates.items():
        setattr(event, field, value)
    db.commit()
    db.refresh(event)
    return event
