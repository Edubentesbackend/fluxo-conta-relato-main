-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_generate_transaction_identifier_trigger ON public.transactions;

-- Create the trigger that calls the auto_generate_transaction_identifier function
CREATE TRIGGER transactions_auto_identifier_trigger
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_transaction_identifier();

-- Test the trigger by attempting a test insert (will rollback)
BEGIN;
INSERT INTO public.transactions (
  source_account_id, 
  destination_account_id, 
  transaction_date, 
  amount, 
  transaction_type, 
  description,
  unique_identifier
) VALUES (
  gen_random_uuid(),
  gen_random_uuid(), 
  NOW(), 
  100.00, 
  'emprestimo', 
  'Test transaction',
  ''
);
ROLLBACK;