"""fase2: tier, payment, guest roster

Revision ID: 38230d0f6b84
Revises: 4e55280ab50e
Create Date: 2026-08-10 12:39:31.393144

"""

import secrets
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "38230d0f6b84"
down_revision: Union[str, None] = "4e55280ab50e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "payments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("tier_purchased", sa.String(length=20), nullable=False),
        sa.Column("amount_idr", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("xendit_invoice_id", sa.String(length=100), nullable=False),
        sa.Column("checkout_url", sa.String(length=500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_payments_user_id"), "payments", ["user_id"], unique=False)
    op.create_index(op.f("ix_payments_xendit_invoice_id"), "payments", ["xendit_invoice_id"], unique=True)

    op.add_column("guests", sa.Column("session_label", sa.String(length=100), nullable=True))
    # server_default aman untuk baris lama (seed Fase 1) — nilai wajar (1 pax).
    op.add_column(
        "guests", sa.Column("max_pax", sa.Integer(), nullable=False, server_default="1")
    )

    # invite_token UNIQUE+NOT NULL tidak bisa pakai satu server_default yang
    # sama untuk semua baris lama — backfill per-baris dulu pakai token acak
    # sungguhan, baru kunci jadi NOT NULL + index unique.
    op.add_column("guests", sa.Column("invite_token", sa.String(length=20), nullable=True))
    conn = op.get_bind()
    guest_ids = conn.execute(sa.text("SELECT id FROM guests")).fetchall()
    for (guest_id,) in guest_ids:
        conn.execute(
            sa.text("UPDATE guests SET invite_token = :token WHERE id = :id"),
            {"token": secrets.token_urlsafe(9), "id": guest_id},
        )
    op.alter_column("guests", "invite_token", nullable=False)
    op.create_index(op.f("ix_guests_invite_token"), "guests", ["invite_token"], unique=True)

    op.add_column("users", sa.Column("tier", sa.String(length=20), server_default="lite", nullable=False))


def downgrade() -> None:
    op.drop_column("users", "tier")
    op.drop_index(op.f("ix_guests_invite_token"), table_name="guests")
    op.drop_column("guests", "invite_token")
    op.drop_column("guests", "max_pax")
    op.drop_column("guests", "session_label")
    op.drop_index(op.f("ix_payments_xendit_invoice_id"), table_name="payments")
    op.drop_index(op.f("ix_payments_user_id"), table_name="payments")
    op.drop_table("payments")
