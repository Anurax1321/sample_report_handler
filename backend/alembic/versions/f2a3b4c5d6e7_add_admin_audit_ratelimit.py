"""add admin roles, audit logging, and tracking fields

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-03-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2a3b4c5d6e7'
down_revision: Union[str, None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_admin to users
    op.add_column('users', sa.Column('is_admin', sa.Boolean(), nullable=False, server_default=sa.text('false')))

    # Update existing admin user to is_admin=true
    op.execute("UPDATE users SET is_admin = true WHERE username = 'admin'")

    # Add audit fields to samples
    op.add_column('samples', sa.Column('created_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True))
    op.add_column('samples', sa.Column('updated_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True))

    # Add uploaded_by_id to reports
    op.add_column('reports', sa.Column('uploaded_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True))

    # Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('action', sa.String(64), nullable=False),
        sa.Column('entity_type', sa.String(64), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_column('reports', 'uploaded_by_id')
    op.drop_column('samples', 'updated_by_id')
    op.drop_column('samples', 'created_by_id')
    op.drop_column('users', 'is_admin')
