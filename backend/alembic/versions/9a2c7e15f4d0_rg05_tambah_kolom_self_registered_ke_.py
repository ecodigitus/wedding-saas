"""rg-05: tambah kolom self_registered ke guest

Revision ID: 9a2c7e15f4d0
Revises: d1f4a9c3e8b2
Create Date: 2026-08-20 09:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a2c7e15f4d0'
down_revision: Union[str, None] = 'd1f4a9c3e8b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'guests', sa.Column('self_registered', sa.Boolean(), nullable=False, server_default=sa.false())
    )
    op.alter_column('guests', 'self_registered', server_default=None)


def downgrade() -> None:
    op.drop_column('guests', 'self_registered')
