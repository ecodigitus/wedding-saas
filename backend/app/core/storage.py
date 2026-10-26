"""Storage privat untuk aset PII (BT-03, Selfie Check-in). Bucket S3-compatible
SELALU privat — foto wajah tamu tidak pernah punya URL publik, akses baca
cuma lewat signed URL berdurasi pendek (`generate_signed_url`).

Client di-buat lazy (bukan module-level singleton) supaya import module ini
tidak pernah gagal kalau storage belum dikonfigurasi (Fase 1/2 tidak butuh
ini sama sekali) — baru meledak saat benar-benar dipakai, dengan pesan jelas.
"""

import uuid

import boto3
from botocore.client import Config as BotoConfig

from app.core.config import settings


class StorageNotConfiguredError(Exception):
    """S3_BUCKET_PRIVATE/S3_ACCESS_KEY/S3_SECRET_KEY belum diisi — endpoint
    yang butuh storage privat harus menolak dengan pesan jelas, bukan
    crash 500 yang membingungkan."""


def _get_client():
    if not settings.s3_bucket_private or not settings.s3_access_key or not settings.s3_secret_key:
        raise StorageNotConfiguredError(
            "Storage S3 belum dikonfigurasi (S3_BUCKET_PRIVATE/S3_ACCESS_KEY/S3_SECRET_KEY)."
        )
    # Path-style addressing wajib untuk endpoint custom (MinIO/R2/dst) —
    # AWS S3 asli (tanpa S3_ENDPOINT_URL) biarkan boto3 pilih otomatis
    # (virtual-hosted-style, default-nya).
    addressing_style = "path" if settings.s3_endpoint_url else "auto"
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url or None,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        config=BotoConfig(signature_version="s3v4", s3={"addressing_style": addressing_style}),
    )


def make_selfie_key(guest_id: uuid.UUID) -> str:
    """Nama object acak (bukan cuma guest_id polos) — cegah tebak-tebakan key
    lewat ID yang predictable. UUID baru tiap upload juga otomatis
    menggantikan referensi lama kalau guest di-check-in ulang."""
    return f"selfies/{guest_id}/{uuid.uuid4().hex}.jpg"


def upload_private_object(key: str, data: bytes, content_type: str) -> None:
    client = _get_client()
    client.put_object(Bucket=settings.s3_bucket_private, Key=key, Body=data, ContentType=content_type)


def generate_signed_url(key: str, expires_in: int = 300) -> str:
    client = _get_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket_private, "Key": key},
        ExpiresIn=expires_in,
    )
