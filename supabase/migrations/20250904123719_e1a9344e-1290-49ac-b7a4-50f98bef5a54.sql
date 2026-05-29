-- Fix security issues by setting proper search_path and securing materialized view

-- Update functions to set proper search_path
CREATE OR REPLACE FUNCTION refresh_account_summaries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW account_summaries;
END;
$$;

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
SET search_path = public
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
SET search_path = public
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

CREATE OR REPLACE FUNCTION refresh_summaries_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Refresh in background to avoid blocking
  PERFORM refresh_account_summaries();
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Revoke public access to materialized view
REVOKE ALL ON account_summaries FROM PUBLIC;
REVOKE ALL ON account_summaries FROM anon;
REVOKE ALL ON account_summaries FROM authenticated;

-- Grant access only to specific roles that need it
-- For now, we'll make it accessible via a function instead