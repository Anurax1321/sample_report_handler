"""add_sample_pdfs_table

Revision ID: c8f2a3b5d7e9
Revises: b7e3f1a2c4d6
Create Date: 2026-03-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8f2a3b5d7e9'
down_revision: Union[str, Sequence[str], None] = 'b7e3f1a2c4d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'sample_pdfs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('sample_id', sa.Integer(), sa.ForeignKey('samples.id', ondelete='CASCADE'), nullable=True, index=True),
        sa.Column('filename', sa.String(256), nullable=False),
        sa.Column('file_path', sa.String(512), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('sample_pdfs')
