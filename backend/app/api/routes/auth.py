import logging
import secrets
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.rate_limit import RateLimiter, get_redis
from app.core.security import (
    TokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    GoogleLoginRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.user import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger("app.auth")

# Rate limit di endpoint login & register — cegah brute-force & abuse pendaftaran.
_login_rate_limit = RateLimiter("auth-login", max_calls=10, window_seconds=60)
_register_rate_limit = RateLimiter("auth-register", max_calls=5, window_seconds=60)

GENERIC_LOGIN_ERROR = "Email atau password salah."

# Ditemukan saat security review (OWASP A07): tanpa ini, `login()` di bawah
# skip argon2.verify() sama sekali kalau email tidak ditemukan (short-circuit
# `or`), sementara email yang ada tapi password salah tetap panggil
# verify_password (argon2, sengaja lambat) — bedanya ~70ms, gampang terukur
# lewat network dan bisa dipakai enumerasi email walau pesan error-nya sama.
# Hash dummy ini bikin waktunya konsisten baik email ada maupun tidak.
_DUMMY_PASSWORD_HASH = hash_password(secrets.token_urlsafe(32))


def _issue_tokens(user_id: uuid.UUID) -> TokenResponse:
    access_token, _ = create_access_token(str(user_id))
    refresh_token, _ = create_refresh_token(str(user_id))
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


async def _revoke_refresh_claims(claims: dict) -> None:
    remaining = claims["exp"] - datetime.now(UTC).timestamp()
    if remaining > 0:
        await get_redis().set(f"revoked:{claims['jti']}", "1", ex=int(remaining))


@router.post("/register", response_model=TokenResponse, dependencies=[Depends(_register_rate_limit)])
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing is not None:
        # Pesan generik — tidak membocorkan apakah email ini sudah terdaftar (cegah user enumeration).
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Registrasi gagal. Coba email lain, atau login kalau sudah punya akun.",
        )

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _issue_tokens(user.id)


@router.post("/login", response_model=TokenResponse, dependencies=[Depends(_login_rate_limit)])
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    # verify_password SELALU dipanggil (lihat _DUMMY_PASSWORD_HASH di atas) —
    # jangan short-circuit sebelum ini, supaya waktu proses konsisten baik
    # email ditemukan atau tidak.
    password_hash = user.password_hash if user and user.password_hash else _DUMMY_PASSWORD_HASH
    password_ok = verify_password(payload.password, password_hash)
    if user is None or user.password_hash is None or not password_ok:
        # OWASP A09 — sengaja log email yang dicoba (bukan password), supaya
        # ada jejak buat deteksi credential-stuffing/brute-force manual dari
        # `docker logs`, tanpa perlu infra logging terpisah dulu di skala ini.
        logger.warning("login gagal untuk email=%s", payload.email)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, GENERIC_LOGIN_ERROR)
    return _issue_tokens(user.id)


@router.post("/google", response_model=TokenResponse, dependencies=[Depends(_login_rate_limit)])
def login_with_google(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    if not settings.google_client_id:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Login Google belum dikonfigurasi di server ini."
        )
    try:
        idinfo = google_id_token.verify_oauth2_token(
            payload.id_token, google_requests.Request(), settings.google_client_id
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token Google tidak valid.") from exc

    google_sub = idinfo["sub"]
    email = idinfo.get("email")
    user = db.query(User).filter(User.google_sub == google_sub).first()
    if user is None and email:
        user = db.query(User).filter(User.email == email).first()
    if user is None:
        user = User(email=email, google_sub=google_sub, full_name=idinfo.get("name"))
        db.add(user)
        db.commit()
        db.refresh(user)
    elif user.google_sub is None:
        user.google_sub = google_sub
        db.commit()

    return _issue_tokens(user.id)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token_endpoint(payload: RefreshRequest, db: Session = Depends(get_db)):
    try:
        claims = decode_token(payload.refresh_token, expected_type="refresh")
    except TokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc)) from exc

    if await get_redis().exists(f"revoked:{claims['jti']}"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token sudah tidak berlaku.")

    user = db.get(User, uuid.UUID(claims["sub"]))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User tidak ditemukan.")

    # Rotasi: refresh token lama langsung di-revoke agar tidak bisa dipakai ulang.
    await _revoke_refresh_claims(claims)
    return _issue_tokens(user.id)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(payload: RefreshRequest):
    try:
        claims = decode_token(payload.refresh_token, expected_type="refresh")
    except TokenError:
        return  # Token sudah invalid/expired — anggap saja logout berhasil.
    await _revoke_refresh_claims(claims)


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
