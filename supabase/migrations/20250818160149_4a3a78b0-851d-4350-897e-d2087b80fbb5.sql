-- Create the trigger for transaction identifier generation
DROP TRIGGER IF EXISTS transactions_auto_identifier_trigger ON public.transactions;

CREATE TRIGGER transactions_auto_identifier_trigger
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_transaction_identifier();