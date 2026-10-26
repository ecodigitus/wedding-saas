"""Klien tipis ke Xendit Invoice API — sengaja tanpa SDK terpisah, cuma
`requests` (sudah jadi dependency) karena cuma butuh 1 endpoint (create
invoice). Dokumentasi: https://developers.xendit.co/api-reference/#create-invoice
"""

import requests

from app.core.config import settings

XENDIT_API_BASE = "https://api.xendit.co"


class XenditError(Exception):
    pass


class XenditNotConfigured(XenditError):
    pass


def create_invoice(
    *,
    external_id: str,
    amount: int,
    payer_email: str,
    description: str,
    success_redirect_url: str,
    failure_redirect_url: str,
) -> dict:
    if not settings.xendit_secret_key:
        raise XenditNotConfigured("XENDIT_SECRET_KEY belum diisi di .env")

    res = requests.post(
        f"{XENDIT_API_BASE}/v2/invoices",
        auth=(settings.xendit_secret_key, ""),
        json={
            "external_id": external_id,
            "amount": amount,
            "payer_email": payer_email,
            "description": description,
            "currency": "IDR",
            "success_redirect_url": success_redirect_url,
            "failure_redirect_url": failure_redirect_url,
        },
        timeout=15,
    )
    if res.status_code >= 400:
        raise XenditError(f"Xendit create invoice gagal ({res.status_code}): {res.text}")
    return res.json()
