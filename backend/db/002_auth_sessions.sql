-- ELO 360 Global: integração da PR #3 com o schema elo criado na migração 001.
-- NÃO APLICADO. Requer 001_initial previamente, credenciais seguras e revisão de RLS.
BEGIN;
CREATE TABLE IF NOT EXISTS elo.auth_sessions (
 token_hash CHAR(64) PRIMARY KEY,
 user_id UUID NOT NULL REFERENCES elo.users(id) ON DELETE CASCADE,
 expires_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON elo.auth_sessions(expires_at);
INSERT INTO elo.schema_migrations(version) VALUES ('002_auth_sessions') ON CONFLICT DO NOTHING;
COMMIT;
