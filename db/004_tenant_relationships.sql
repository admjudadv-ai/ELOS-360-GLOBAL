-- ELO 360 GLOBAL | 004_tenant_relationships.sql
-- Somente homologação. Não executar no banco Render sem auditoria e backup.
-- FKs compostas impedem relacionar registros de organizações distintas,
-- inclusive se o usuário do SQL ignorar as políticas de RLS.
BEGIN;

-- Chaves candidatas compostas necessárias para referências por organização.
ALTER TABLE elo.users ADD CONSTRAINT users_org_id_unique UNIQUE(organization_id,id);
ALTER TABLE elo.clients ADD CONSTRAINT clients_org_id_unique UNIQUE(organization_id,id);
ALTER TABLE elo.cases ADD CONSTRAINT cases_org_id_unique UNIQUE(organization_id,id);
ALTER TABLE elo.projects ADD CONSTRAINT projects_org_id_unique UNIQUE(organization_id,id);

ALTER TABLE elo.cases
 ADD CONSTRAINT cases_client_same_organization
 FOREIGN KEY(organization_id,client_id) REFERENCES elo.clients(organization_id,id);
ALTER TABLE elo.employment_periods
 ADD CONSTRAINT employment_case_same_organization
 FOREIGN KEY(organization_id,case_id) REFERENCES elo.cases(organization_id,id) ON DELETE CASCADE;
ALTER TABLE elo.reports
 ADD CONSTRAINT reports_case_same_organization
 FOREIGN KEY(organization_id,case_id) REFERENCES elo.cases(organization_id,id);
ALTER TABLE elo.documents
 ADD CONSTRAINT documents_case_same_organization
 FOREIGN KEY(organization_id,case_id) REFERENCES elo.cases(organization_id,id);
ALTER TABLE elo.financial_entries
 ADD CONSTRAINT financial_project_same_organization
 FOREIGN KEY(organization_id,project_id) REFERENCES elo.projects(organization_id,id);
ALTER TABLE elo.assistant_sessions
 ADD CONSTRAINT assistant_client_same_organization
 FOREIGN KEY(organization_id,client_id) REFERENCES elo.clients(organization_id,id);
ALTER TABLE elo.audit_events
 ADD CONSTRAINT audit_actor_same_organization
 FOREIGN KEY(organization_id,actor_id) REFERENCES elo.users(organization_id,id);

-- Desempenho para consultas dos relacionamentos com múltiplos locatários.
CREATE INDEX IF NOT EXISTS employment_org_case_idx ON elo.employment_periods(organization_id,case_id);
CREATE INDEX IF NOT EXISTS reports_org_case_idx ON elo.reports(organization_id,case_id);
CREATE INDEX IF NOT EXISTS documents_org_case_idx ON elo.documents(organization_id,case_id);
CREATE INDEX IF NOT EXISTS financial_org_project_idx ON elo.financial_entries(organization_id,project_id);
CREATE INDEX IF NOT EXISTS sessions_org_client_idx ON elo.assistant_sessions(organization_id,client_id);
CREATE INDEX IF NOT EXISTS audit_org_actor_idx ON elo.audit_events(organization_id,actor_id);

INSERT INTO elo.schema_migrations(version) VALUES('004_tenant_relationships')
 ON CONFLICT DO NOTHING;
COMMIT;
