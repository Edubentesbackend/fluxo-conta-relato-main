-- Create the missing trigger for transaction identifier generation
CREATE TRIGGER auto_generate_transaction_identifier_trigger
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_transaction_identifier();