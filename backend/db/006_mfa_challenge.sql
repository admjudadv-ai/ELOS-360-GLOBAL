-- ELO 360 | 006_mfa_challenge.sql -- somente homologação. Não aplicar no Render.
BEGIN;
CREATE TABLE elo.user_mfa (
 user_id UUID PRIMARY KEY REFERENCES elo.users(id) ON DELETE CASCADE,
 secret_encrypted TEXT NOT NULL,
 enabled BOOLEAN NOT NULL DEFAULT FALSE,
 last_accepted_counter BIGINT NOT NULL DEFAULT -1 CHECK(last_accepted_counter >= -1),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE elo.mfa_challenges (
 challenge_hash CHAR(64) PRIMARY KEY CHECK(challenge_hash ~ '^[0-9a-f]{64}$'),
 user_id UUID NOT NULL REFERENCES elo.users(id) ON DELETE CASCADE,
 expires_at TIMESTAMPTZ NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX mfa_challenge_expiry_idx ON elo.mfa_challenges(expires_at);
INSERT INTO elo.schema_migrations(version) VALUES('006_mfa_challenge') ON CONFLICT DO NOTHING;
COMMIT;
