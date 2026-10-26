from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    redis_url: str

    jwt_secret: str
    jwt_algorithm: str = "HS256"

    @field_validator("jwt_secret")
    @classmethod
    def jwt_secret_min_length(cls, value: str) -> str:
        # OWASP A02 (Cryptographic Failures) — cegah operator sengaja/tidak
        # sengaja deploy dengan secret lemah (mis. lupa ganti dari contoh
        # pendek). 32 karakter acak minimal supaya brute-force HS256 tidak
        # praktis (lihat .env.example).
        if len(value) < 32:
            raise ValueError("JWT_SECRET harus minimal 32 karakter (lihat .env.example).")
        return value

    # Enkripsi kolom PII privat (Guest.name, RSVP.guest_name — lihat
    # app/db/encrypted_types.py). WAJIB diisi key Fernet valid (generate:
    # `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`).
    # Hilang/ganti key = data lama TIDAK BISA didekripsi lagi — simpan aman,
    # jangan pernah rotate tanpa re-encrypt data existing dulu.
    pii_encryption_key: str

    @field_validator("pii_encryption_key")
    @classmethod
    def pii_encryption_key_valid(cls, value: str) -> str:
        from cryptography.fernet import Fernet

        try:
            Fernet(value.encode())
        except Exception as exc:
            raise ValueError(
                "PII_ENCRYPTION_KEY harus key Fernet valid — generate dengan "
                '`python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`'
            ) from exc
        return value

    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 14

    google_client_id: str | None = None

    cors_origins: str = "http://localhost:3000"
    # Sengaja default None — deploy sekarang lewat domain sendiri
    # (demo.ecodigitus.com), bukan Vercel. Regex wildcard broad seperti
    # *.vercel.app sempat jadi default di sini (peninggalan percobaan deploy
    # Vercel yang ditinggalkan) — itu memperluas attack surface CORS tanpa
    # alasan (siapa saja bisa deploy ke *.vercel.app), ditemukan & dihapus
    # saat security review (OWASP A05). Isi manual via env var kalau memang
    # butuh preview deployment nanti.
    cors_origin_regex: str | None = None

    s3_endpoint_url: str | None = None
    s3_access_key: str | None = None
    s3_secret_key: str | None = None
    s3_bucket_private: str | None = None
    s3_bucket_public: str | None = None
    s3_region: str = "us-east-1"

    # Xendit (Fase 2 — Payment/upgrade tier). Kosongkan untuk mematikan
    # billing (endpoint upgrade akan menolak dengan pesan jelas, bukan crash).
    xendit_secret_key: str | None = None
    xendit_webhook_token: str | None = None
    frontend_base_url: str = "http://localhost:3000"

    environment: str = "development"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
