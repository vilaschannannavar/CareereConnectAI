"""Core models and PostgreSQL Row-Level Security (RLS) migration

Revision ID: 0002_core_models_and_rls
Revises: 0001_initial
Create Date: 2026-10-13 14:00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0002_core_models_and_rls'
down_revision: Union[str, None] = '0001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

RLS_TABLES = [
    "candidate_profiles",
    "resumes",
    "integrations",
    "contacts",
    "contact_analyses",
    "message_drafts",
    "outreach_events",
]


def upgrade() -> None:
    # 1. candidate_profiles
    op.create_table(
        'candidate_profiles',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('target_roles', sa.JSON(), nullable=False),
        sa.Column('target_companies', sa.JSON(), nullable=False),
        sa.Column('target_locations', sa.JSON(), nullable=False),
        sa.Column('skills', sa.JSON(), nullable=False),
        sa.Column('education', sa.JSON(), nullable=False),
        sa.Column('experience_years', sa.Float(), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_candidate_profile_user_id')
    )
    op.create_index(op.f('ix_candidate_profiles_id'), 'candidate_profiles', ['id'], unique=False)
    op.create_index(op.f('ix_candidate_profiles_user_id'), 'candidate_profiles', ['user_id'], unique=True)

    # 2. resumes
    op.create_table(
        'resumes',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=512), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('raw_text', sa.Text(), nullable=True),
        sa.Column('parsed_data', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_resumes_id'), 'resumes', ['id'], unique=False)
    op.create_index(op.f('ix_resumes_user_id'), 'resumes', ['user_id'], unique=False)

    # 3. integrations
    op.create_table(
        'integrations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('access_token_enc', sa.Text(), nullable=False),
        sa.Column('refresh_token_enc', sa.Text(), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('scopes', sa.String(length=255), nullable=False),
        sa.Column('account_id', sa.String(length=255), nullable=True),
        sa.Column('account_email', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_integrations_id'), 'integrations', ['id'], unique=False)
    op.create_index(op.f('ix_integrations_user_id'), 'integrations', ['user_id'], unique=False)

    # 4. contacts
    op.create_table(
        'contacts',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=False),
        sa.Column('profile_url', sa.String(length=500), nullable=False),
        sa.Column('profile_url_normalized', sa.String(length=500), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('company', sa.String(length=255), nullable=False),
        sa.Column('position', sa.String(length=255), nullable=False),
        sa.Column('connected_on', sa.String(length=50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_archived', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'profile_url_normalized', name='uq_user_profile_url')
    )
    op.create_index(op.f('ix_contacts_id'), 'contacts', ['id'], unique=False)
    op.create_index(op.f('ix_contacts_user_id'), 'contacts', ['user_id'], unique=False)
    op.create_index(op.f('ix_contacts_profile_url_normalized'), 'contacts', ['profile_url_normalized'], unique=False)

    # 5. contact_analyses
    op.create_table(
        'contact_analyses',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('contact_id', sa.String(length=36), nullable=False),
        sa.Column('score', sa.Float(), nullable=False),
        sa.Column('score_breakdown', sa.JSON(), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('reasoning', sa.Text(), nullable=False),
        sa.Column('target_role_matched', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_contact_analyses_id'), 'contact_analyses', ['id'], unique=False)
    op.create_index(op.f('ix_contact_analyses_user_id'), 'contact_analyses', ['user_id'], unique=False)
    op.create_index(op.f('ix_contact_analyses_contact_id'), 'contact_analyses', ['contact_id'], unique=False)
    op.create_index(op.f('ix_contact_analyses_score'), 'contact_analyses', ['score'], unique=False)

    # 6. message_drafts
    op.create_table(
        'message_drafts',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('contact_id', sa.String(length=36), nullable=False),
        sa.Column('template_type', sa.String(length=50), nullable=False),
        sa.Column('tone', sa.String(length=50), nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('variables', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_message_drafts_id'), 'message_drafts', ['id'], unique=False)
    op.create_index(op.f('ix_message_drafts_user_id'), 'message_drafts', ['user_id'], unique=False)
    op.create_index(op.f('ix_message_drafts_contact_id'), 'message_drafts', ['contact_id'], unique=False)

    # 7. outreach_events
    op.create_table(
        'outreach_events',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('contact_id', sa.String(length=36), nullable=False),
        sa.Column('draft_id', sa.String(length=36), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('occurred_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['draft_id'], ['message_drafts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_outreach_events_id'), 'outreach_events', ['id'], unique=False)
    op.create_index(op.f('ix_outreach_events_user_id'), 'outreach_events', ['user_id'], unique=False)
    op.create_index(op.f('ix_outreach_events_contact_id'), 'outreach_events', ['contact_id'], unique=False)
    op.create_index(op.f('ix_outreach_events_status'), 'outreach_events', ['status'], unique=False)

    # 8. audit_log
    op.create_table(
        'audit_log',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.String(length=36), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('details', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_log_id'), 'audit_log', ['id'], unique=False)
    op.create_index(op.f('ix_audit_log_user_id'), 'audit_log', ['user_id'], unique=False)
    op.create_index(op.f('ix_audit_log_action'), 'audit_log', ['action'], unique=False)

    # 9. PostgreSQL Row-Level Security (RLS) activation
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        for table in RLS_TABLES:
            op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
            op.execute(
                f"CREATE POLICY user_isolation_policy ON {table} "
                f"USING (user_id = current_setting('app.current_user_id', true));"
            )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        for table in RLS_TABLES:
            op.execute(f"DROP POLICY IF EXISTS user_isolation_policy ON {table};")
            op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;")

    op.drop_table('audit_log')
    op.drop_table('outreach_events')
    op.drop_table('message_drafts')
    op.drop_table('contact_analyses')
    op.drop_table('contacts')
    op.drop_table('integrations')
    op.drop_table('resumes')
    op.drop_table('candidate_profiles')
