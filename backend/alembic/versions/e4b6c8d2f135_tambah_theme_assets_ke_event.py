"""tambah theme_assets (gambar desain template) ke event

Revision ID: e4b6c8d2f135
Revises: c3e5a7b91d24
Create Date: 2026-10-26 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e4b6c8d2f135'
down_revision: Union[str, None] = 'c3e5a7b91d24'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('events', sa.Column('theme_assets', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('events', 'theme_assets')
