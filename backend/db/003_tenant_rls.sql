-- ELO 360 GLOBAL | 003_tenant_rls.sql
-- POLITICAS DE HOMOLOGACAO — NAO EXECUTADAS NO RENDER.
-- Defesa em profundidade: conexão sem contexto de organização não vê registros.
-- Aplicação deve usar função set_config(..., true) em transação controlada,
-- sem aceitar SQL arbitrário dos usuários. Não substitui autorização de objetos.
BEGIN;

CREATE OR REPLACE FUNCTION elo.current_organization_id()
RETURNS UUID LANGUAGE SQL STABLE AS $$
  SELECT NULLIF(current_setting('elo.organization_id', true), '')::uuid
$$;

-- Em tabelas multi-organização, negar por padrão quando contexto está ausente.
-- RLS não se aplica a superusuários nem a funções/roles com BYPASSRLS.
-- O proprietário pode ignorar RLS se FORCE não for ativado.
ALTER TABLE elo.clients FORCE ROW LEVEL SECURITY;
ALTER TABLE elo.cases FORCE ROW LEVEL SECURITY;
ALTER TABLE elo.employment_periods FORCE ROW LEVEL SECURITY;
ALTER TABLE elo.reports FORCE ROW LEVEL SECURITY;
ALTER TABLE elo.documents FORCE ROW LEVEL SECURITY;
ALTER TABLE elo.projects FORCE ROW LEVEL SECURITY;
ALTER TABLE elo.financial_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE elo.assistant_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE elo.audit_events FORCE ROW LEVEL SECURITY;

CREATE POLICY organization_scope_clients ON elo.clients
  FOR ALL USING (organization_id = elo.current_organization_id())
  WITH CHECK (organization_id = elo.current_organization_id());
CREATE POLICY organization_scope_cases ON elo.cases
  FOR ALL USING (organization_id = elo.current_organization_id())
  WITH CHECK (organization_id = elo.current_organization_id());
CREATE POLICY organization_scope_employment_periods ON elo.employment_periods
  FOR ALL USING (organization_id = elo.current_organization_id())
  WITH CHECK (organization_id = elo.current_organization_id());
CREATE POLICY organization_scope_reports ON elo.reports
  FOR ALL USING (organization_id = elo.current_organization_id())
  WITH CHECK (organization_id = elo.current_organization_id());
CREATE POLICY organization_scope_documents ON elo.documents
  FOR ALL USING (organization_id = elo.current_organization_id())
  WITH CHECK (organization_id = elo.current_organization_id());
CREATE POLICY organization_scope_projects ON elo.projects
  FOR ALL USING (organization_id = elo.current_organization_id())
  WITH CHECK (organization_id = elo.current_organization_id());
CREATE POLICY organization_scope_financial_entries ON elo.financial_entries
  FOR ALL USING (organization_id = elo.current_organization_id())
  WITH CHECK (organization_id = elo.current_organization_id());
CREATE POLICY organization_scope_assistant_sessions ON elo.assistant_sessions
  FOR ALL USING (organization_id = elo.current_organization_id())
  WITH CHECK (organization_id = elo.current_organization_id());
CREATE POLICY organization_scope_audit_events ON elo.audit_events
  FOR ALL USING (organization_id = elo.current_organization_id())
  WITH CHECK (organization_id = elo.current_organization_id());

INSERT INTO elo.schema_migrations(version) VALUES('003_tenant_rls')
ON CONFLICT DO NOTHING;
COMMIT;
