-- ELO 360 GLOBAL | 001_initial.sql
-- Estrutura inicial SEM dados reais. Execute em transação com credencial protegida.
BEGIN;
CREATE SCHEMA IF NOT EXISTS elo;
CREATE TABLE IF NOT EXISTS elo.schema_migrations (
 version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS elo.organizations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS elo.users (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES elo.organizations(id),
 email TEXT NOT NULL, display_name TEXT NOT NULL, password_hash TEXT,
 status TEXT NOT NULL DEFAULT 'invited' CHECK(status IN ('invited','active','disabled')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(organization_id,email)
);
CREATE TABLE IF NOT EXISTS elo.roles (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code TEXT NOT NULL UNIQUE, description TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS elo.user_roles (
 user_id UUID NOT NULL REFERENCES elo.users(id) ON DELETE CASCADE,
 role_id UUID NOT NULL REFERENCES elo.roles(id), PRIMARY KEY(user_id,role_id)
);
CREATE TABLE IF NOT EXISTS elo.clients (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES elo.organizations(id),
 display_name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS elo.cases (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES elo.organizations(id),
 client_id UUID NOT NULL REFERENCES elo.clients(id), area TEXT NOT NULL,
 title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS elo.employment_periods (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES elo.organizations(id),
 case_id UUID NOT NULL REFERENCES elo.cases(id) ON DELETE CASCADE,
 employer_label TEXT NOT NULL, start_date DATE NOT NULL, end_date DATE,
 attention_note TEXT, CHECK(end_date IS NULL OR end_date >= start_date)
);
CREATE TABLE IF NOT EXISTS elo.reports (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES elo.organizations(id),
 case_id UUID NOT NULL REFERENCES elo.cases(id), report_type TEXT NOT NULL,
 content JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS elo.documents (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES elo.organizations(id),
 case_id UUID REFERENCES elo.cases(id), object_key TEXT NOT NULL,
 original_filename TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS elo.projects (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES elo.organizations(id),
 sector TEXT NOT NULL, title TEXT NOT NULL, stage TEXT NOT NULL DEFAULT 'draft',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS elo.financial_entries (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES elo.organizations(id),
 project_id UUID REFERENCES elo.projects(id), amount NUMERIC(16,2) NOT NULL,
 currency CHAR(3) NOT NULL, entry_type TEXT NOT NULL CHECK(entry_type IN ('income','expense')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS elo.assistant_sessions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES elo.organizations(id),
 client_id UUID REFERENCES elo.clients(id), needs_human_review BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS elo.audit_events (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, organization_id UUID NOT NULL REFERENCES elo.organizations(id),
 actor_id UUID REFERENCES elo.users(id), action TEXT NOT NULL, target_type TEXT NOT NULL,
 target_id UUID, occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cases_org_idx ON elo.cases(organization_id);
CREATE INDEX IF NOT EXISTS clients_org_idx ON elo.clients(organization_id);
CREATE INDEX IF NOT EXISTS projects_org_idx ON elo.projects(organization_id);
CREATE INDEX IF NOT EXISTS audits_org_time_idx ON elo.audit_events(organization_id,occurred_at DESC);
-- Defense in depth: prevent reading tenant data when RLS context is absent.
-- Policies and privileged API roles require an additional security review before real data.
ALTER TABLE elo.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo.employment_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo.financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo.assistant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo.audit_events ENABLE ROW LEVEL SECURITY;
INSERT INTO elo.schema_migrations(version) VALUES('001_initial') ON CONFLICT DO NOTHING;
COMMIT;
