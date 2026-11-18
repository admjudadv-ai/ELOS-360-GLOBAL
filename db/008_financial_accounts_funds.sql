-- ELO 360 GLOBAL | 008_financial_accounts_funds.sql
-- Estrutura de dados financeiros para homologação, sem números bancários em claro.
-- NÃO movimenta dinheiro, não conecta a bancos nem cria credenciais bancárias.
BEGIN;

CREATE TABLE elo.financial_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES elo.organizations(id),
  display_name TEXT NOT NULL CHECK(length(trim(display_name)) BETWEEN 2 AND 120),
  bank_name TEXT NOT NULL CHECK(length(trim(bank_name)) BETWEEN 2 AND 160),
  country_code CHAR(2) NOT NULL CHECK(country_code ~ '^[A-Z]{2}$'),
  currency CHAR(3) NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
  account_kind TEXT NOT NULL CHECK(account_kind IN ('checking','savings','payment','investment','other')),
  identifier_last4 CHAR(4) CHECK(identifier_last4 ~ '^[0-9A-Za-z]{4}$'),
  encrypted_account_identifier TEXT CHECK(
    encrypted_account_identifier IS NULL OR
    (length(encrypted_account_identifier) BETWEEN 35 AND 4096 AND encrypted_account_identifier LIKE 'v1:%')
  ),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','verified','disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id,id)
);
CREATE TABLE elo.financial_funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES elo.organizations(id),
  name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 2 AND 160),
  purpose TEXT NOT NULL CHECK(purpose IN ('operating','project','donation','investment','reserve','other')),
  currency CHAR(3) NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
  receiving_account_id UUID,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id,id),
  FOREIGN KEY(organization_id,receiving_account_id)
    REFERENCES elo.financial_accounts(organization_id,id)
);
CREATE TABLE elo.financial_fund_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES elo.organizations(id),
  fund_id UUID NOT NULL,
  movement_kind TEXT NOT NULL CHECK(movement_kind IN ('contribution','allocation','expense','withdrawal','adjustment')),
  amount NUMERIC(18,2) NOT NULL CHECK(amount>0),
  currency CHAR(3) NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
  reference_label TEXT NOT NULL CHECK(length(trim(reference_label)) BETWEEN 1 AND 180),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY(organization_id,fund_id) REFERENCES elo.financial_funds(organization_id,id)
);
CREATE TABLE elo.financial_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES elo.organizations(id),
  fund_id UUID,
  label TEXT NOT NULL CHECK(length(trim(label)) BETWEEN 2 AND 180),
  investment_kind TEXT NOT NULL CHECK(investment_kind IN ('fixed_income','equity','fund','deposit','other')),
  currency CHAR(3) NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
  principal_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK(principal_amount>=0),
  reported_value NUMERIC(18,2) CHECK(reported_value>=0),
  valuation_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY(organization_id,fund_id) REFERENCES elo.financial_funds(organization_id,id)
);

CREATE INDEX financial_accounts_org_idx ON elo.financial_accounts(organization_id);
CREATE INDEX financial_funds_org_idx ON elo.financial_funds(organization_id);
CREATE INDEX financial_movements_org_fund_idx ON elo.financial_fund_movements(organization_id,fund_id,occurred_at DESC);
CREATE INDEX financial_investments_org_idx ON elo.financial_investments(organization_id);

ALTER TABLE elo.financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo.financial_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE elo.financial_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo.financial_funds FORCE ROW LEVEL SECURITY;
ALTER TABLE elo.financial_fund_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo.financial_fund_movements FORCE ROW LEVEL SECURITY;
ALTER TABLE elo.financial_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo.financial_investments FORCE ROW LEVEL SECURITY;

CREATE POLICY financial_accounts_org_only ON elo.financial_accounts
  FOR ALL USING (organization_id=elo.current_organization_id())
  WITH CHECK (organization_id=elo.current_organization_id());
CREATE POLICY financial_funds_org_only ON elo.financial_funds
  FOR ALL USING (organization_id=elo.current_organization_id())
  WITH CHECK (organization_id=elo.current_organization_id());
CREATE POLICY financial_movements_org_only ON elo.financial_fund_movements
  FOR ALL USING (organization_id=elo.current_organization_id())
  WITH CHECK (organization_id=elo.current_organization_id());
CREATE POLICY financial_investments_org_only ON elo.financial_investments
  FOR ALL USING (organization_id=elo.current_organization_id())
  WITH CHECK (organization_id=elo.current_organization_id());

INSERT INTO elo.schema_migrations(version) VALUES('008_financial_accounts_funds')
ON CONFLICT DO NOTHING;
COMMIT;
