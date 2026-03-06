"""add_report_samples_junction_table

Revision ID: b7e3f1a2c4d6
Revises: 381a58feed00
Create Date: 2026-03-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7e3f1a2c4d6'
down_revision: Union[str, Sequence[str], None] = '381a58feed00'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'report_samples',
        sa.Column('report_id', sa.Integer(), sa.ForeignKey('reports.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('sample_id', sa.Integer(), sa.ForeignKey('samples.id', ondelete='CASCADE'), primary_key=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('report_samples')
