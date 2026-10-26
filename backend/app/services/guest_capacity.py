"""Cek kapasitas tamu terhadap paket event — dipakai dari DUA jalur:
`create_guest` (owner, `routes/guests.py`) DAN auto-enroll RSVP (publik,
`routes/rsvp.py`, RG-05). Diekstrak ke sini (bukan dibiarkan cuma di
`create_guest`) supaya kapasitas berbayar tidak bisa dilewati lewat jalur
publik (OWASP A01) — kedua pemanggil WAJIB pakai fungsi yang sama, bukan
menyalin ulang query count-nya.
"""

from sqlalchemy.orm import Session

from app.core.packages import PACKAGE_CATALOG
from app.models.event import Event
from app.models.guest import Guest


def guest_capacity_remaining(db: Session, event: Event) -> bool:
    """True kalau `event.package` masih punya slot kapasitas tersisa.

    Asumsi: `event.package is not None` — pemanggil wajib pastikan itu dulu
    (lewat `require_event_with_package` atau cek manual), karena
    `PACKAGE_CATALOG[None]` akan `KeyError`.
    """
    current_count = db.query(Guest).filter(Guest.event_id == event.id).count()
    max_guests = PACKAGE_CATALOG[event.package]["max_guests"]
    return current_count < max_guests
