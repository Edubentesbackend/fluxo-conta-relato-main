-- Fix the auto_generate_transaction_identifier function
CREATE OR REPLACE FUNCTION public.auto_generate_transaction_identifier()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    IF NEW.unique_identifier IS NULL OR NEW.unique_identifier = '' THEN
        NEW.unique_identifier := public.generate_transaction_identifier();
    END IF;
    RETURN NEW;
END;
$function$

-- Now create the trigger
DROP TRIGGER IF EXISTS transactions_auto_identifier_trigger ON public.transactions;

CREATE TRIGGER transactions_auto_identifier_trigger
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_transaction_identifier();