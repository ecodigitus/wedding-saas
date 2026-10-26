"""rg-01: tambah kolom mode (registrasi-saja) ke event

Revision ID: d1f4a9c3e8b2
Revises: 87dfdc0e390c
Create Date: 2026-08-20 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1f4a9c3e8b2'
down_revision: Union[str, None] = '87dfdc0e390c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # server_default wajib di sini — ADD COLUMN NOT NULL ke tabel yang sudah
    # ada isinya (event asli di staging) butuh nilai default di level SQL
    # untuk backfill baris lama. Dilepas lagi sesudahnya, pola yang sama
    # dengan migrasi show_countdown (ca9d40830deb) — default cuma di
    # ORM/Python, bukan skema DB, supaya konsisten dengan kolom lain.
    op.add_column(
        'events', sa.Column('mode', sa.String(length=20), nullable=False, server_default='full')
    )
    op.alter_column('events', 'mode', server_default=None)


def downgrade() -> None:
    op.drop_column('events', 'mode')
