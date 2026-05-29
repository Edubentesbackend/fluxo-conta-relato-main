CREATE TABLE project_coordinators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE accounts
  ADD COLUMN coordinator_id UUID REFERENCES project_coordinators(id) ON DELETE SET NULL;

CREATE INDEX accounts_coordinator_id_idx ON accounts(coordinator_id);

CREATE TRIGGER update_project_coordinators_updated_at
  BEFORE UPDATE ON project_coordinators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE VIEW account_summaries AS
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
  (COALESCE(entries.count, 0) + COALESCE(exits.count, 0))::integer AS total_transactions,
  a.coordinator_id,
  pc.name AS coordinator_name
FROM accounts a
LEFT JOIN project_coordinators pc ON pc.id = a.coordinator_id
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
