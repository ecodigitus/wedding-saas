"""Validasi & normalisasi gambar upload (BT-03, Selfie Check-in).

OWASP "Unrestricted File Upload" — jangan pernah percaya header `Content-Type`
dari klien begitu saja (gampang dipalsukan), dan jangan simpan bytes mentah
yang diupload apa adanya. Foto selalu didekode ulang lewat Pillow (bukti
benar-benar gambar valid, bukan file lain yang disamarkan pakai ekstensi
.jpg) lalu di-encode ulang jadi JPEG bersih — otomatis membuang payload
tersembunyi/metadata (termasuk GPS EXIF, privasi tamu) yang ada di file asli.
"""

import io

from PIL import Image, UnidentifiedImageError

MAX_UPLOAD_BYTES = 8 * 1024 * 1024  # 8MB — longgar untuk foto kamera HP modern
MAX_DIMENSION = 1600  # px sisi terpanjang, selfie tidak butuh lebih dari ini
JPEG_QUALITY = 85


class InvalidImageError(ValueError):
    pass


def validate_and_normalize_image(raw: bytes) -> bytes:
    if len(raw) > MAX_UPLOAD_BYTES:
        raise InvalidImageError(f"Ukuran foto maksimal {MAX_UPLOAD_BYTES // (1024 * 1024)}MB.")
    if len(raw) == 0:
        raise InvalidImageError("File foto kosong.")

    try:
        Image.open(io.BytesIO(raw)).verify()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise InvalidImageError("File yang diupload bukan gambar yang valid.") from exc

    # verify() bikin objek Image sebelumnya tidak bisa dipakai lagi untuk
    # decode data sesungguhnya — buka ulang dari bytes yang sama.
    image = Image.open(io.BytesIO(raw))
    image = image.convert("RGB")  # buang alpha channel/mode aneh, hasil konsisten sebagai JPEG
    image.thumbnail((MAX_DIMENSION, MAX_DIMENSION))

    out = io.BytesIO()
    image.save(out, format="JPEG", quality=JPEG_QUALITY)
    return out.getvalue()
