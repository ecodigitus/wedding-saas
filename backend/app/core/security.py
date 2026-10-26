import uuid
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import settings

_hasher = PasswordHasher()


def hash_password(plain_password: str) -> str:
    return _hasher.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, plain_password)
    except VerifyMismatchError:
        return False


class TokenError(Exception):
    pass


def _create_token(subject: str, token_type: str, expires_delta: timedelta) -> tuple[str, str]:
    now = datetime.now(UTC)
    jti = str(uuid.uuid4())
    payload = {
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
        "jti": jti,
    }
    # Algorithm is pinned explicitly — never derived from the token header.
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, jti


def create_access_token(user_id: str) -> tuple[str, str]:
    return _create_token(user_id, "access", timedelta(minutes=settings.jwt_access_token_expire_minutes))


def create_refresh_token(user_id: str) -> tuple[str, str]:
    return _create_token(user_id, "refresh", timedelta(days=settings.jwt_refresh_token_expire_days))


def decode_token(token: str, expected_type: str) -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError as exc:
        raise TokenError("Token sudah expired") from exc
    except jwt.InvalidTokenError as exc:
        raise TokenError("Token tidak valid") from exc

    if payload.get("type") != expected_type:
        raise TokenError("Tipe token tidak sesuai")
    return payload
