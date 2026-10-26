import csv
import io
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_event_or_404
from app.core.rate_limit import RateLimiter
from app.db.session import get_db
from app.models.event import Event
from app.models.guestbook import GuestbookEntry
from app.models.user import User
from app.schemas.guestbook import GuestbookCreate, GuestbookOut
from app.utils.sanitize import sanitize_message, sanitize_name

public_router = APIRouter(prefix="/invitations", tags=["guestbook"])
owner_router = APIRouter(prefix="/events/{event_id}/guestbook", tags=["guestbook"])

_guestbook_submit_rate_limit = RateLimiter("guestbook-submit", max_calls=5, window_seconds=60)
_guestbook_public_read_rate_limit = RateLimiter("guestbook-public-read", max_calls=120, window_seconds=60)


@public_router.get(
    "/{slug}/guestbook",
    response_model=list[GuestbookOut],
    dependencies=[Depends(_guestbook_public_read_rate_limit)],
)
def list_public_guestbook_entries(slug: str, db: Session = Depends(get_db)):
    # UW-01 pilar buku tamu: ucapan boleh tampil di halaman publik (opsional,
    # bisa di-toggle mempelai di Fase berikutnya) — hanya untuk event published.
    event = db.query(Event).filter(Event.slug == slug, Event.is_published.is_(True)).first()
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Undangan tidak ditemukan atau belum dipublish.")
    return (
        db.query(GuestbookEntry)
        .filter(GuestbookEntry.event_id == event.id)
        .order_by(GuestbookEntry.created_at.desc())
        .all()
    )


@public_router.post(
    "/{slug}/guestbook",
    response_model=GuestbookOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(_guestbook_submit_rate_limit)],
)
def submit_guestbook_entry(slug: str, payload: GuestbookCreate, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.slug == slug, Event.is_published.is_(True)).first()
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Undangan tidak ditemukan atau belum dipublish.")

    # nama & pesan disanitasi (strip semua tag HTML) sebelum disimpan — cegah
    # stored XSS saat ucapan ini dirender ulang di halaman publik/dashboard.
    entry = GuestbookEntry(
        event_id=event.id,
        nama=sanitize_name(payload.nama),
        pesan=sanitize_message(payload.pesan),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@owner_router.get("", response_model=list[GuestbookOut])
def list_guestbook_entries(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_event_or_404(event_id, db, current_user)
    return (
        db.query(GuestbookEntry)
        .filter(GuestbookEntry.event_id == event_id)
        .order_by(GuestbookEntry.created_at.desc())
        .all()
    )


@owner_router.get("/export")
def export_guestbook_entries(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Nilai tambah turunan BT-01 — BUKAN pemenuhan BT-06 (lihat rsvp.py).
    get_event_or_404(event_id, db, current_user)
    entries = (
        db.query(GuestbookEntry)
        .filter(GuestbookEntry.event_id == event_id)
        .order_by(GuestbookEntry.created_at.asc())
        .all()
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["nama", "pesan", "waktu_submit"])
    for e in entries:
        writer.writerow([e.nama, e.pesan, e.created_at.isoformat()])
    buffer.seek(0)

    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=buku-tamu.csv"},
    )
