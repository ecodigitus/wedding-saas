from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.rate_limit import RateLimiter
from app.db.session import get_db
from app.models.event import Event
from app.schemas.event import EventPublicOut

router = APIRouter(prefix="/invitations", tags=["invitations"])

_public_read_rate_limit = RateLimiter("invitation-read", max_calls=120, window_seconds=60)


@router.get("/{slug}", response_model=EventPublicOut, dependencies=[Depends(_public_read_rate_limit)])
def get_public_invitation(slug: str, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.slug == slug, Event.is_published.is_(True)).first()
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Undangan tidak ditemukan atau belum dipublish.")
    return event
