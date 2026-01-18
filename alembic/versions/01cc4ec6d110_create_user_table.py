"""create user table

Revision ID: 01cc4ec6d110
Revises: 
Create Date: 2026-01-18 18:35:46.485750

"""
from typing import Sequence, Union
from unittest.mock import Base

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '01cc4ec6d110'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'users',
        sa.Column('id', sa.Integer, primary_key=True, index=True),
        sa.Column('name', sa.String, nullable=False),
        sa.Column('email', sa.String, unique=True, nullable=False),
        sa.Column('password_hash', sa.String, nullable=False),
        sa.Column('verification_code', sa.String, nullable=True),
        sa.Column('is_verified', sa.Boolean, server_default='false'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False)
    )

def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('users')
