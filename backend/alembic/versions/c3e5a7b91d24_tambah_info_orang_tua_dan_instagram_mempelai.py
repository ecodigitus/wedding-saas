"""tambah info orang tua & instagram mempelai ke event

Revision ID: c3e5a7b91d24
Revises: 9a2c7e15f4d0
Create Date: 2026-10-26 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3e5a7b91d24'
down_revision: Union[str, None] = '9a2c7e15f4d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('events', sa.Column('partner1_parents', sa.String(length=255), nullable=True))
    op.add_column('events', sa.Column('partner2_parents', sa.String(length=255), nullable=True))
    op.add_column('events', sa.Column('partner1_instagram', sa.String(length=30), nullable=True))
    op.add_column('events', sa.Column('partner2_instagram', sa.String(length=30), nullable=True))


def downgrade() -> None:
    op.drop_column('events', 'partner2_instagram')
    op.drop_column('events', 'partner1_instagram')
    op.drop_column('events', 'partner2_parents')
    op.drop_column('events', 'partner1_parents')
