import csv
import io
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_event_or_404
from app.core.rate_limit import RateLimiter
from app.db.session import get_db
from app.models.event import Event
from app.models.guest import Guest
from app.models.rsvp import RSVP
from app.models.user import User
from app.schemas.rsvp import RSVPCreate, RSVPOut
from app.services.guest_capacity import guest_capacity_remaining
from app.utils.sanitize import sanitize_name

public_router = APIRouter(prefix="/invitations", tags=["rsvp"])
owner_router = APIRouter(prefix="/events/{event_id}/rsvps", tags=["rsvp"])

# Rate limit di endpoint TULIS ini sendiri — bukan hanya di GET halaman publik,
# karena submit RSVP inilah vektor spam yang sebenarnya (PRD.v2 Bagian 5).
_rsvp_submit_rate_limit = RateLimiter("rsvp-submit", max_calls=5, window_seconds=60)

# RG-05: limit KHUSUS untuk jalur auto-enroll, sengaja lebih longgar dari yang
# di atas. Diterapkan manual di dalam handler (bukan `Depends()` di dekorator
# route) karena mode auto-enroll baru diketahui SETELAH event di-lookup dari
# slug — dua limiter ini tidak pernah dipakai bersamaan untuk request yang
# sama. Alasan lebih longgar: mode ini mengarahkan SEMUA tamu ke satu endpoint
# yang sama (tidak ada link personal yang menyebar beban), dan tamu di venue
# (WiFi bersama) / pengguna seluler Indonesia (NAT operator) banyak berbagi
# satu IP — guard sebenarnya adalah kapasitas paket (`guest_capacity_remaining`),
# bukan throttle IP.
_rsvp_autoenroll_rate_limit = RateLimiter("rsvp-autoenroll", max_calls=15, window_seconds=60)


@public_router.post(
    "/{slug}/rsvp",
    response_model=RSVPOut,
    status_code=status.HTTP_201_CREATED,
)
async def submit_rsvp(slug: str, payload: RSVPCreate, request: Request, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.slug == slug, Event.is_published.is_(True)).first()
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Undangan tidak ditemukan atau belum dipublish.")

    guest: Guest | None = None
    newly_enrolled_token: str | None = None

    if payload.guest_token:
        guest = (
            db.query(Guest)
            .filter(Guest.invite_token == payload.guest_token, Guest.event_id == event.id)
            .first()
        )
        if guest is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Link undangan personal tidak valid.")
        if payload.jumlah_pax > guest.max_pax:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"Undanganmu maksimal untuk {guest.max_pax} orang ya.",
            )
        await _rsvp_submit_rate_limit(request)
    elif event.mode == "registration_only" and event.package is not None:
        # RG-05 auto-enroll — tanpa link personal, tapi mode registrasi-saja
        # aktif & event punya paket. Tamu langsung masuk roster supaya QR
        # check-in-nya bisa terbentuk (lihat PRD.v2.md Bagian 19: tanpa ini,
        # mode registrasi-saja menjual "Sistem QR Wedding" yang nol QR).
        await _rsvp_autoenroll_rate_limit(request)
        # Kapasitas WAJIB dicek di jalur publik ini juga (OWASP A01) — tanpa
        # ini, kapasitas berbayar (yang selama ini hanya ditegakkan di
        # `create_guest` milik owner) bisa dilewati lewat endpoint publik.
        if not guest_capacity_remaining(db, event):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Kuota tamu acara ini sudah penuh, hubungi mempelai ya.",
            )
        guest = Guest(
            event_id=event.id,
            name=sanitize_name(payload.guest_name),
            max_pax=payload.jumlah_pax,
            self_registered=True,
        )
        db.add(guest)
        db.flush()  # butuh guest.id & guest.invite_token (default) sebelum RSVP dibuat
        newly_enrolled_token = guest.invite_token
    else:
        await _rsvp_submit_rate_limit(request)

    # Kalau tamu ini (via link personal, atau baru saja auto-enroll) sudah
    # pernah RSVP, timpa jawabannya (upsert) — biar bisa ganti pikiran (mis.
    # dari "tidak hadir" jadi "hadir") tanpa numpuk baris duplikat.
    existing = db.query(RSVP).filter(RSVP.guest_id == guest.id).first() if guest else None
    if existing:
        existing.jumlah_pax = payload.jumlah_pax
        existing.status_hadir = payload.status_hadir
        db.commit()
        db.refresh(existing)
        return _to_rsvp_out(existing, guest_token=None)

    rsvp = RSVP(
        event_id=event.id,
        guest_id=guest.id if guest else None,
        # Nama diambil dari roster (tidak bisa dipalsukan) kalau lewat link personal.
        guest_name=guest.name if guest else sanitize_name(payload.guest_name),
        jumlah_pax=payload.jumlah_pax,
        status_hadir=payload.status_hadir,
    )
    db.add(rsvp)
    db.commit()
    db.refresh(rsvp)
    return _to_rsvp_out(rsvp, guest_token=newly_enrolled_token)


def _to_rsvp_out(rsvp: RSVP, guest_token: str | None) -> RSVPOut:
    out = RSVPOut.model_validate(rsvp)
    # `guest_token` SELALU diisi manual di sini (tidak pernah lewat atribut
    # ORM, RSVP tidak punya kolom ini) — dan HANYA dipanggil dengan nilai
    # non-None dari cabang yang benar-benar baru membuat Guest di request ini.
    out.guest_token = guest_token
    return out


@owner_router.get("", response_model=list[RSVPOut])
def list_rsvps(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_event_or_404(event_id, db, current_user)
    return db.query(RSVP).filter(RSVP.event_id == event_id).order_by(RSVP.created_at.desc()).all()


@owner_router.get("/export")
def export_rsvps(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Endpoint ini memenuhi UW-05 (dashboard RSVP + export) DAN BT-06 (export
    # data tamu & kehadiran) — export buku tamu (Bagian guestbook) tidak
    # memenuhi BT-06 karena tidak punya kolom kehadiran. Lihat task.v2.md.
    get_event_or_404(event_id, db, current_user)
    rsvps = db.query(RSVP).filter(RSVP.event_id == event_id).order_by(RSVP.created_at.asc()).all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["nama_tamu", "jumlah_pax", "status_hadir", "waktu_submit"])
    for r in rsvps:
        writer.writerow(
            [
                r.guest_name,
                r.jumlah_pax,
                "Hadir" if r.status_hadir else "Tidak Hadir",
                r.created_at.isoformat(),
            ]
        )
    buffer.seek(0)

    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=rsvp.csv"},
    )
