from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    # Supabase connection pooler (Supavisor/PgBouncer, mode Transaction, port
    # 6543) tidak mendukung prepared statement server-side — matikan di sisi
    # psycopg. Aman juga dipakai untuk koneksi langsung non-pooled (lokal).
    connect_args={"prepare_threshold": None},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
