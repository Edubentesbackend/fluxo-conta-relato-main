-- Add account number field to accounts table
ALTER TABLE public.accounts 
ADD COLUMN account_number TEXT;

-- Create a function to generate account numbers automatically
CREATE OR REPLACE FUNCTION generate_account_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    -- Get the next available account number (starting from 3000)
    SELECT COALESCE(MAX(CAST(SUBSTRING(account_number FROM '^(\d+)') AS INTEGER)), 2999) + 1
    INTO counter
    FROM public.accounts 
    WHERE account_number ~ '^\d+-\d$';
    
    -- Generate format: XXXX-Y (e.g., 3000-1, 3001-2, etc.)
    new_number := counter || '-' || (counter % 10);
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Create a function to generate transaction identifiers automatically
CREATE OR REPLACE FUNCTION generate_transaction_identifier()
RETURNS TEXT AS $$
DECLARE
    new_identifier TEXT;
    counter INTEGER;
    date_prefix TEXT;
BEGIN
    -- Get current date in YYYYMMDD format
    date_prefix := TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Get the next sequential number for today
    SELECT COALESCE(MAX(CAST(SUBSTRING(unique_identifier FROM '\d{8}-(\d+)$') AS INTEGER)), 0) + 1
    INTO counter
    FROM public.transactions 
    WHERE unique_identifier LIKE date_prefix || '-%';
    
    -- Generate format: YYYYMMDD-XXX (e.g., 20241214-001, 20241214-002)
    new_identifier := date_prefix || '-' || LPAD(counter::TEXT, 3, '0');
    
    RETURN new_identifier;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate transaction identifier
CREATE OR REPLACE FUNCTION auto_generate_transaction_identifier()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.unique_identifier IS NULL OR NEW.unique_identifier = '' THEN
        NEW.unique_identifier := generate_transaction_identifier();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_transaction_identifier
    BEFORE INSERT ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_transaction_identifier();