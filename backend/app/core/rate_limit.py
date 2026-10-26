import redis.asyncio as redis
from fastapi import HTTPException, Request, status

from app.core.config import settings

_redis_client: redis.Redis | None = None


def get_redis() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(settings.redis_url, decode_responses=True)
    return _redis_client


class RateLimiter:
    """Fixed-window rate limiter backed by Redis, keyed by client IP.

    Guards public write endpoints (RSVP, guestbook, login/register) — these are
    the actual abuse vectors, not the read-only public GET.
    """

    def __init__(self, key_prefix: str, max_calls: int, window_seconds: int):
        self.key_prefix = key_prefix
        self.max_calls = max_calls
        self.window_seconds = window_seconds

    async def __call__(self, request: Request) -> None:
        client_ip = request.client.host if request.client else "unknown"
        key = f"ratelimit:{self.key_prefix}:{client_ip}"
        r = get_redis()
        count = await r.incr(key)
        if count == 1:
            await r.expire(key, self.window_seconds)
        if count > self.max_calls:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Terlalu banyak permintaan dari kamu barusan. Coba lagi beberapa menit lagi ya.",
            )
