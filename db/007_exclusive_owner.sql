-- ELO 360 GLOBAL | 007_exclusive_owner.sql
-- Exclusividade do nível proprietário: uma única linha pode existir.
BEGIN;
CREATE TABLE elo.platform_ownership (
 singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK(singleton=TRUE),
 user_id UUID NOT NULL UNIQUE REFERENCES elo.users(id) ON DELETE RESTRICT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Sem acesso concedido ao papel de API comum: propriedade configurada só
-- em procedimento administrativo protegido, com privilégios limitados.
INSERT INTO elo.schema_migrations(version) VALUES('007_exclusive_owner') ON CONFLICT DO NOTHING;
COMMIT;
