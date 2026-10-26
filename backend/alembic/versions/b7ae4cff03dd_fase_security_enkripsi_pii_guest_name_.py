"""fase security: enkripsi PII guest name & rsvp guest_name

Revision ID: b7ae4cff03dd
Revises: c8746e536ca4
Create Date: 2026-08-13 10:23:58.956459

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from cryptography.fernet import Fernet

from app.core.config import settings


# revision identifiers, used by Alembic.
revision: str = 'b7ae4cff03dd'
down_revision: Union[str, None] = 'c8746e536ca4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Perluas kolom dulu (VARCHAR(150) -> TEXT) — ciphertext Fernet lebih
    #    panjang dari plaintext-nya, harus muat sebelum data lama dienkripsi.
    op.alter_column(
        "guests", "name", existing_type=sa.VARCHAR(length=150), type_=sa.Text(), existing_nullable=False
    )
    op.alter_column(
        "rsvps",
        "guest_name",
        existing_type=sa.VARCHAR(length=150),
        type_=sa.Text(),
        existing_nullable=False,
    )

    # 2. Enkripsi data existing di tempat — baris lama masih plaintext; kalau
    #    tidak dienkripsi di sini, app langsung gagal baca lewat ORM setelah
    #    migrasi ini (EncryptedString SELALU coba dekripsi apa pun yang dibaca).
    fernet = Fernet(settings.pii_encryption_key.encode())
    conn = op.get_bind()

    guests = conn.execute(sa.text("SELECT id, name FROM guests")).fetchall()
    for guest_id, name in guests:
        encrypted = fernet.encrypt(name.encode()).decode()
        conn.execute(
            sa.text("UPDATE guests SET name = :name WHERE id = :id"),
            {"name": encrypted, "id": guest_id},
        )

    rsvps = conn.execute(sa.text("SELECT id, guest_name FROM rsvps")).fetchall()
    for rsvp_id, guest_name in rsvps:
        encrypted = fernet.encrypt(guest_name.encode()).decode()
        conn.execute(
            sa.text("UPDATE rsvps SET guest_name = :guest_name WHERE id = :id"),
            {"guest_name": encrypted, "id": rsvp_id},
        )


def downgrade() -> None:
    # Dekripsi balik data existing dulu sebelum kolom dikecilkan lagi.
    fernet = Fernet(settings.pii_encryption_key.encode())
    conn = op.get_bind()

    guests = conn.execute(sa.text("SELECT id, name FROM guests")).fetchall()
    for guest_id, name in guests:
        decrypted = fernet.decrypt(name.encode()).decode()
        conn.execute(
            sa.text("UPDATE guests SET name = :name WHERE id = :id"),
            {"name": decrypted, "id": guest_id},
        )

    rsvps = conn.execute(sa.text("SELECT id, guest_name FROM rsvps")).fetchall()
    for rsvp_id, guest_name in rsvps:
        decrypted = fernet.decrypt(guest_name.encode()).decode()
        conn.execute(
            sa.text("UPDATE rsvps SET guest_name = :guest_name WHERE id = :id"),
            {"guest_name": decrypted, "id": rsvp_id},
        )

    op.alter_column(
        "rsvps",
        "guest_name",
        existing_type=sa.Text(),
        type_=sa.VARCHAR(length=150),
        existing_nullable=False,
    )
    op.alter_column(
        "guests", "name", existing_type=sa.Text(), type_=sa.VARCHAR(length=150), existing_nullable=False
    )
