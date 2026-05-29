CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE "UserRole" AS ENUM ('admin', 'manager', 'analyst', 'viewer');
CREATE TYPE "TransactionType" AS ENUM (
  'emprestimo',
  'devolucao',
  'ajuste',
  'rateio',
  'correcao',
  'estorno',
  'transferencia_operacional'
);
CREATE TYPE "TransactionStatus" AS ENUM (
  'pending_return',
  'partially_returned',
  'fully_returned',
  'completed'
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role "UserRole" NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  account_number TEXT UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unique_identifier TEXT NOT NULL UNIQUE,
  source_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  destination_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  transaction_date TIMESTAMPTZ NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  transaction_type "TransactionType" NOT NULL,
  description TEXT NOT NULL,
  parent_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  status "TransactionStatus" NOT NULL DEFAULT 'completed',
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT transactions_amount_positive CHECK (amount > 0),
  CONSTRAINT transactions_different_accounts CHECK (source_account_id <> destination_account_id),
  CONSTRAINT transactions_not_future CHECK (transaction_date <= now() + interval '1 minute')
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  filename TEXT,
  total_rows INTEGER NOT NULL,
  imported_rows INTEGER NOT NULL,
  skipped_rows INTEGER NOT NULL,
  errors JSONB,
  created_by_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_insight_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  filters JSONB,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens(user_id);
CREATE INDEX refresh_tokens_token_hash_idx ON refresh_tokens(token_hash);
CREATE INDEX transactions_date_type_idx ON transactions(transaction_date, transaction_type);
CREATE INDEX transactions_accounts_idx ON transactions(source_account_id, destination_account_id);
CREATE INDEX transactions_parent_id_idx ON transactions(parent_transaction_id);
CREATE INDEX transactions_status_idx ON transactions(status);
CREATE INDEX audit_logs_entity_idx ON audit_logs(entity_type, entity_id);
CREATE INDEX audit_logs_user_id_idx ON audit_logs(user_id);
CREATE INDEX ai_insight_runs_user_id_idx ON ai_insight_runs(user_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE VIEW account_summaries AS
SELECT
  a.id,
  a.name,
  a.account_number,
  a.description,
  COALESCE(entries.total, 0)::numeric(15,2) AS total_entries,
  COALESCE(exits.total, 0)::numeric(15,2) AS total_exits,
  (COALESCE(entries.total, 0) - COALESCE(exits.total, 0))::numeric(15,2) AS net_balance,
  CASE
    WHEN COALESCE(entries.total, 0) - COALESCE(exits.total, 0) > 0 THEN 'devedora'
    WHEN COALESCE(entries.total, 0) - COALESCE(exits.total, 0) < 0 THEN 'credora'
    ELSE 'equilibrada'
  END AS position,
  (COALESCE(entries.count, 0) + COALESCE(exits.count, 0))::integer AS total_transactions
FROM accounts a
LEFT JOIN (
  SELECT destination_account_id, SUM(amount) AS total, COUNT(*) AS count
  FROM transactions
  GROUP BY destination_account_id
) entries ON a.id = entries.destination_account_id
LEFT JOIN (
  SELECT source_account_id, SUM(amount) AS total, COUNT(*) AS count
  FROM transactions
  GROUP BY source_account_id
) exits ON a.id = exits.source_account_id;
