-- Esquema inicial de autenticação, somente para homologação.
CREATE TABLE IF NOT EXISTS auth_organizations (id uuid PRIMARY KEY, name text NOT NULL);
CREATE TABLE IF NOT EXISTS auth_users (
 id uuid PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES auth_organizations(id),
 email text NOT NULL,
 password_hash text NOT NULL,
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled')),
 UNIQUE (organization_id,email)
);
CREATE TABLE IF NOT EXISTS auth_roles (
 user_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
 role text NOT NULL CHECK(role IN ('admin','previdencia','juridico','saude','educacao','financeiro','parceiro','cliente')),
 PRIMARY KEY(user_id,role)
);
CREATE TABLE IF NOT EXISTS auth_sessions (
 token_hash text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry ON auth_sessions(expires_at);
