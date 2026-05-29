-- Create materialized view for account summaries
CREATE MATERIALIZED VIEW account_summaries AS
SELECT 
  a.id,
  a.name,
  a.account_number,
  a.description,
  COALESCE(entries.total, 0) as total_entries,
  COALESCE(exits.total, 0) as total_exits,
  COALESCE(entries.total, 0) - COALESCE(exits.total, 0) as net_balance,
  CASE 
    WHEN COALESCE(entries.total, 0) - COALESCE(exits.total, 0) > 0 THEN 'devedora'
    WHEN COALESCE(entries.total, 0) - COALESCE(exits.total, 0) < 0 THEN 'credora'
    ELSE 'equilibrada'
  END as position,
  COALESCE(entries.count, 0) + COALESCE(exits.count, 0) as total_transactions
FROM accounts a
LEFT JOIN (
  SELECT 
    destination_account_id,
    SUM(amount) as total,
    COUNT(*) as count
  FROM transactions 
  GROUP BY destination_account_id
) entries ON a.id = entries.destination_account_id
LEFT JOIN (
  SELECT 
    source_account_id,
    SUM(amount) as total,
    COUNT(*) as count
  FROM transactions 
  GROUP BY source_account_id
) exits ON a.id = exits.source_account_id;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_date_type ON transactions(transaction_date, transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_accounts ON transactions(source_account_id, destination_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_amount ON transactions(amount);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_account_summaries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW account_summaries;
END;
$$;

-- Function to get transaction insights
CREATE OR REPLACE FUNCTION get_transaction_insights(
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL
)
RETURNS TABLE(
  total_volume numeric,
  transaction_count bigint,
  avg_transaction_amount numeric,
  most_active_account_name text,
  most_active_account_transactions bigint,
  highest_value_transaction_amount numeric,
  most_common_transaction_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_transactions AS (
    SELECT *
    FROM transactions t
    WHERE (start_date IS NULL OR t.transaction_date >= start_date)
      AND (end_date IS NULL OR t.transaction_date <= end_date)
  ),
  account_activity AS (
    SELECT 
      a.name,
      COUNT(*) as transaction_count
    FROM filtered_transactions t
    JOIN accounts a ON (a.id = t.source_account_id OR a.id = t.destination_account_id)
    GROUP BY a.id, a.name
    ORDER BY transaction_count DESC
    LIMIT 1
  ),
  transaction_stats AS (
    SELECT 
      SUM(amount) as total_vol,
      COUNT(*) as trans_count,
      AVG(amount) as avg_amount,
      MAX(amount) as max_amount
    FROM filtered_transactions
  ),
  type_stats AS (
    SELECT 
      transaction_type,
      COUNT(*) as type_count
    FROM filtered_transactions
    GROUP BY transaction_type
    ORDER BY type_count DESC
    LIMIT 1
  )
  SELECT 
    ts.total_vol,
    ts.trans_count,
    ts.avg_amount,
    aa.name,
    aa.transaction_count,
    ts.max_amount,
    tys.transaction_type::text
  FROM transaction_stats ts
  CROSS JOIN account_activity aa
  CROSS JOIN type_stats tys;
END;
$$;

-- Function to get monthly transaction volumes
CREATE OR REPLACE FUNCTION get_monthly_volumes(
  months_back integer DEFAULT 12
)
RETURNS TABLE(
  month_year text,
  total_volume numeric,
  transaction_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(DATE_TRUNC('month', t.transaction_date), 'YYYY-MM') as month_year,
    SUM(t.amount) as total_volume,
    COUNT(*) as transaction_count
  FROM transactions t
  WHERE t.transaction_date >= CURRENT_DATE - INTERVAL '1 month' * months_back
  GROUP BY DATE_TRUNC('month', t.transaction_date)
  ORDER BY DATE_TRUNC('month', t.transaction_date);
END;
$$;

-- Trigger to refresh materialized view on transaction changes
CREATE OR REPLACE FUNCTION refresh_summaries_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Refresh in background to avoid blocking
  PERFORM refresh_account_summaries();
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS refresh_summaries_on_transaction_change ON transactions;
CREATE TRIGGER refresh_summaries_on_transaction_change
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_summaries_trigger();