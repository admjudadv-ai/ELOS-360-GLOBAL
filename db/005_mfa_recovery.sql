-- ELO 360 GLOBAL | 005_mfa_recovery.sql — APENAS HOMOLOGAÇÃO
-- Após migrações 001-004; NÃO APLICADO no Render.
-- Somente hashes de códigos aleatórios são armazenados: nunca códigos em claro.
BEGIN;
CREATE TABLE IF NOT EXISTS elo.mfa_recovery_codes (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id UUID NOT NULL,
 user_id UUID NOT NULL,
 code_hash CHAR(64) NOT NULL CHECK(code_hash ~ '^[0-9a-f]{64}$'),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 consumed_at TIMESTAMPTZ,
 CONSTRAINT recovery_user_same_organization
  FOREIGN KEY(organization_id,user_id) REFERENCES elo.users(organization_id,id) ON DELETE CASCADE,
 CONSTRAINT recovery_code_unique_per_user UNIQUE(user_id,code_hash)
);
CREATE INDEX IF NOT EXISTS recovery_org_user_idx ON elo.mfa_recovery_codes(organization_id,user_id);
ALTER TABLE elo.mfa_recovery_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo.mfa_recovery_codes FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_scope_recovery_codes ON elo.mfa_recovery_codes
 FOR ALL USING (organization_id=elo.current_organization_id())
 WITH CHECK (organization_id=elo.current_organization_id());
-- A futura API deverá usar DELETE ... RETURNING numa transação com identidade já validada;
-- revogação atômica impede o reuso do mesmo código. Política RLS não autentica usuário.
INSERT INTO elo.schema_migrations(version) VALUES('005_mfa_recovery') ON CONFLICT DO NOTHING;
COMMIT;
