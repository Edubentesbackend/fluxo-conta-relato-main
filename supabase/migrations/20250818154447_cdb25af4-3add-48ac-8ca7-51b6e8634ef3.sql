-- Create the missing generate_transaction_identifier function
CREATE OR REPLACE FUNCTION public.generate_transaction_identifier()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    new_identifier TEXT;
    counter INTEGER;
BEGIN
    -- Get current year
    SELECT EXTRACT(YEAR FROM NOW()) INTO counter;
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(unique_identifier FROM '\d+$') AS INTEGER)), 0) + 1
    INTO counter
    FROM public.transactions 
    WHERE unique_identifier ~ ('^TXN-' || EXTRACT(YEAR FROM NOW()) || '-\d+$');
    
    -- Generate format: TXN-YYYY-NNNN (e.g., TXN-2024-0001)
    new_identifier := 'TXN-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(counter::TEXT, 4, '0');
    
    RETURN new_identifier;
END;
$function$