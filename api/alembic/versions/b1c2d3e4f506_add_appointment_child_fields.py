"""add appointment child fields

Revision ID: b1c2d3e4f506
Revises: 9204a7ab6aa2
Create Date: 2026-08-27 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f506'
down_revision: Union[str, None] = '9204a7ab6aa2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('appointments', sa.Column('child_name', sa.String(length=50), nullable=False, server_default='', comment='孩子姓名（匿名提交时填写）'))
    op.add_column('appointments', sa.Column('child_age', sa.Integer(), nullable=True, comment='孩子年龄（岁，匿名填写）'))
    op.add_column('appointments', sa.Column('child_gender', sa.Integer(), nullable=True, comment='孩子性别 1=男 2=女（匿名填写）'))
    op.add_column('appointments', sa.Column('first_visit', sa.Integer(), nullable=False, server_default=sa.text('0'), comment='是否首次就诊 1=首诊 0=否'))


def downgrade() -> None:
    op.drop_column('appointments', 'first_visit')
    op.drop_column('appointments', 'child_gender')
    op.drop_column('appointments', 'child_age')
    op.drop_column('appointments', 'child_name')
