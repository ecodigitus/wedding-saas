"""Column-level encryption untuk PII (OWASP A02, Cryptographic Failures).

Dipakai di `Guest.name` & `RSVP.guest_name` — data privat tamu yang cuma
boleh dibaca pemilik event lewat dashboard, bukan data yang memang untuk
publik (beda dari buku tamu, yang sengaja tampil publik di halaman
undangan — enkripsi di situ tidak menambah kerahasiaan apa pun).

Pakai Fernet (`cryptography` package, PyCA — bukan crypto buatan sendiri):
AES-128-CBC + HMAC-SHA256, authenticated encryption jadi ciphertext yang
diubah/dipalsukan otomatis gagal didekripsi. Encrypt/decrypt transparan di
level SQLAlchemy TypeDecorator — kode lain (routes, schemas) tetap baca/tulis
string biasa, tidak perlu tahu ada enkripsi di baliknya.
"""

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator

from app.core.config import settings

_fernet = Fernet(settings.pii_encryption_key.encode())


class EncryptedString(TypeDecorator):
    """String yang dienkripsi saat disimpan, didekripsi otomatis saat dibaca.

    Disimpan sebagai `Text` (bukan `String(n)`) karena ciphertext Fernet
    jauh lebih panjang dari plaintext-nya (base64 + IV + HMAC + overhead
    tetap ~100 byte, di luar panjang string aslinya).
    """

    impl = Text
    cache_ok = True

    def process_bind_param(self, value: str | None, dialect) -> str | None:
        if value is None:
            return None
        return _fernet.encrypt(value.encode()).decode()

    def process_result_value(self, value: str | None, dialect) -> str | None:
        if value is None:
            return None
        try:
            return _fernet.decrypt(value.encode()).decode()
        except InvalidToken:
            # Data lama yang belum sempat dienkripsi (mis. race migrasi) atau
            # PII_ENCRYPTION_KEY yang salah — jangan pernah tampilkan
            # ciphertext mentah ke user, lebih baik gagal jelas.
            raise ValueError(
                "Gagal dekripsi data — PII_ENCRYPTION_KEY salah atau data belum dienkripsi."
            ) from None
