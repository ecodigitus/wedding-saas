import io

import pytest
from PIL import Image

from app.utils.image import MAX_DIMENSION, MAX_UPLOAD_BYTES, InvalidImageError, validate_and_normalize_image


def _make_test_image(size=(10, 10), fmt="PNG") -> bytes:
    img = Image.new("RGB", size, color=(200, 50, 50))
    out = io.BytesIO()
    img.save(out, format=fmt)
    return out.getvalue()


def test_valid_png_is_normalized_to_jpeg():
    raw = _make_test_image(fmt="PNG")
    normalized = validate_and_normalize_image(raw)

    result = Image.open(io.BytesIO(normalized))
    assert result.format == "JPEG"
    assert result.mode == "RGB"


def test_valid_jpeg_passes_through_as_jpeg():
    raw = _make_test_image(fmt="JPEG")
    normalized = validate_and_normalize_image(raw)
    result = Image.open(io.BytesIO(normalized))
    assert result.format == "JPEG"


def test_garbage_bytes_rejected():
    with pytest.raises(InvalidImageError):
        validate_and_normalize_image(b"not an image at all, just plain text pretending to be one")


def test_empty_bytes_rejected():
    with pytest.raises(InvalidImageError):
        validate_and_normalize_image(b"")


def test_oversized_file_rejected():
    oversized = b"\x00" * (MAX_UPLOAD_BYTES + 1)
    with pytest.raises(InvalidImageError):
        validate_and_normalize_image(oversized)


def test_large_dimensions_get_resized_down():
    raw = _make_test_image(size=(3000, 2000), fmt="PNG")
    normalized = validate_and_normalize_image(raw)
    result = Image.open(io.BytesIO(normalized))
    assert max(result.size) <= MAX_DIMENSION


def test_fake_extension_disguised_file_rejected():
    # File teks biasa yang "disamarkan" — validasi harus benar-benar
    # mendekode isi file, bukan cuma percaya nama/ekstensi/Content-Type.
    disguised = b"<script>alert(1)</script>" * 100
    with pytest.raises(InvalidImageError):
        validate_and_normalize_image(disguised)
