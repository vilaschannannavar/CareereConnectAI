"""Phase 4 scoring models, shortlists, and RLS policies

Revision ID: 0003_phase4_scoring_and_shortlists
Revises: 0002_core_models_and_rls
Create Date: 2026-10-13 17:30:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0003_phase4_scoring_and_shortlists'
down_revision: Union[str, None] = '0002_core_models_and_rls'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update contact_analyses columns
    with op.batch_alter_table('contact_analyses') as batch_op:
        batch_op.add_column(sa.Column('priority', sa.String(length=30), server_default='Medium', nullable=False))
        batch_op.add_column(sa.Column('confidence', sa.Float(), server_default='1.0', nullable=False))
        batch_op.add_column(sa.Column('categories', sa.JSON(), server_default='[]', nullable=False))
        batch_op.add_column(sa.Column('reasons', sa.JSON(), server_default='[]', nullable=False))
        batch_op.add_column(sa.Column('missing_info', sa.JSON(), server_default='[]', nullable=False))
        batch_op.add_column(sa.Column('factor_breakdown', sa.JSON(), server_default='{}', nullable=False))
        batch_op.add_column(sa.Column('weights_used', sa.JSON(), server_default='{}', nullable=False))
        batch_op.add_column(sa.Column('content_hash', sa.String(length=64), server_default='', nullable=False))
        batch_op.add_column(sa.Column('user_override', sa.Boolean(), server_default='0', nullable=False))
        batch_op.create_index(batch_op.f('ix_contact_analyses_priority'), ['priority'], unique=False)
        batch_op.create_index(batch_op.f('ix_contact_analyses_content_hash'), ['content_hash'], unique=False)

    # 2. Create shortlists table
    op.create_table(
        'shortlists',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_shortlists_id'), 'shortlists', ['id'], unique=False)
    op.create_index(op.f('ix_shortlists_user_id'), 'shortlists', ['user_id'], unique=False)

    # 3. Create shortlist_items table
    op.create_table(
        'shortlist_items',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('shortlist_id', sa.String(length=36), nullable=False),
        sa.Column('contact_id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['shortlist_id'], ['shortlists.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('shortlist_id', 'contact_id', name='uq_shortlist_contact')
    )
    op.create_index(op.f('ix_shortlist_items_id'), 'shortlist_items', ['id'], unique=False)
    op.create_index(op.f('ix_shortlist_items_shortlist_id'), 'shortlist_items', ['shortlist_id'], unique=False)
    op.create_index(op.f('ix_shortlist_items_contact_id'), 'shortlist_items', ['contact_id'], unique=False)

    # 4. PostgreSQL RLS on shortlists
    bind = op.get_bind()
    if bind and bind.dialect.name == "postgresql":
        op.execute("ALTER TABLE shortlists ENABLE ROW LEVEL SECURITY;")
        op.execute("""
            CREATE POLICY shortlists_user_isolation_policy ON shortlists
            FOR ALL
            USING (user_id = current_setting('app.current_user_id', true))
            WITH CHECK (user_id = current_setting('app.current_user_id', true));
        """)


def downgrade() -> None:
    bind = op.get_bind()
    if bind and bind.dialect.name == "postgresql":
        op.execute("DROP POLICY IF EXISTS shortlists_user_isolation_policy ON shortlists;")
        op.execute("ALTER TABLE shortlists DISABLE ROW LEVEL SECURITY;")

    op.drop_table('shortlist_items')
    op.drop_table('shortlists')

    with op.batch_alter_table('contact_analyses') as batch_op:
        batch_op.drop_index(batch_op.f('ix_contact_analyses_content_hash'))
        batch_op.drop_index(batch_op.f('ix_contact_analyses_priority'))
        batch_op.drop_column('user_override')
        batch_op.drop_column('content_hash')
        batch_op.drop_column('weights_used')
        batch_op.drop_column('factor_breakdown')
        batch_op.drop_column('missing_info')
        batch_op.drop_column('reasons')
        batch_op.drop_column('categories')
        batch_op.drop_column('confidence')
        batch_op.drop_column('priority')
