-- ELO 360 GLOBAL: esboço de modelo de dados, não aplicado
-- Executar apenas após escolher banco, definir migrações e revisar privacidade/permissões.
-- PostgreSQL de referência. NÃO colocar dados reais no repositório.
CREATE TABLE organizations (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE users (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  email text NOT NULL,
  password_hash text, -- criado no servidor via Argon2id, nunca senha em claro
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,email)
);
CREATE TABLE roles (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  code text NOT NULL,
  UNIQUE (organization_id,code)
);
CREATE TABLE user_roles (
  user_id uuid NOT NULL REFERENCES users(id),
  role_id uuid NOT NULL REFERENCES roles(id),
  PRIMARY KEY(user_id,role_id)
);
CREATE TABLE client_records (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  domain text NOT NULL CHECK(domain IN ('previdencia','juridico','saude','educacao','empresarial','financeiro','network','investidores','cooperacao')),
  external_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX client_records_org_domain_idx ON client_records(organization_id, domain);
CREATE TABLE document_metadata (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  client_record_id uuid NOT NULL REFERENCES client_records(id),
  storage_key text NOT NULL, -- somente caminho do armazenamento privado, nunca URL pública
  kind text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE audit_events (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  actor_user_id uuid REFERENCES users(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
-- CRÍTICO: adicionar políticas RLS e validação de autorização no backend antes de usar.
-- Não executar este esquema diretamente em produção.
