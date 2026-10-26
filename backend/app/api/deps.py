import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.rate_limit import get_redis
from app.core.security import TokenError, decode_token
from app.db.session import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Belum login.")
    try:
        payload = decode_token(token, expected_type="access")
    except TokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc)) from exc

    jti = payload.get("jti")
    redis_client = get_redis()
    if jti and await redis_client.exists(f"revoked:{jti}"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token sudah tidak berlaku, silakan login lagi.")

    user = db.get(User, uuid.UUID(payload["sub"]))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User tidak ditemukan.")
    return user


def get_event_or_404(event_id: uuid.UUID, db: Session, owner: User):
    from app.models.event import Event

    event = db.get(Event, event_id)
    if event is None or event.owner_id != owner.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Undangan tidak ditemukan.")
    return event


def require_event_with_package(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Dependency untuk fitur yang butuh paket per-acara aktif (Kelola Tamu,
    QR Check-in) — ganti `require_premium` lama yang gating akun-wide.
    Sekalian return `Event`-nya (route body tidak perlu `get_event_or_404` lagi).
    """
    event = get_event_or_404(event_id, db, current_user)
    if event.package is None:
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            "Undangan ini belum punya paket. Beli paket dulu di menu Billing ya.",
        )
    return event
