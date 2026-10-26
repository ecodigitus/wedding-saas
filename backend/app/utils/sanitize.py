"""Sanitasi input teks bebas dari tamu (nama, ucapan) — cegah stored XSS
(OWASP A03) saat data ini dirender ulang di halaman publik & dashboard.
"""

import bleach

MAX_NAME_LENGTH = 150
MAX_MESSAGE_LENGTH = 1000


def _sanitize(value: str, max_length: int) -> str:
    cleaned = bleach.clean(value, tags=[], attributes={}, strip=True).strip()
    return cleaned[:max_length]


def sanitize_name(value: str) -> str:
    return _sanitize(value, MAX_NAME_LENGTH)


def sanitize_message(value: str) -> str:
    return _sanitize(value, MAX_MESSAGE_LENGTH)
