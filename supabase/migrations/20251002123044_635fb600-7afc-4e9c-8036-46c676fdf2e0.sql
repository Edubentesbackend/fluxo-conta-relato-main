-- Create enum for transaction status FIRST
CREATE TYPE public.transaction_status AS ENUM (
  'pending_return',
  'partially_returned', 
  'fully_returned',
  'completed'
);

-- Add return tracking fields to transactions table with proper types
ALTER TABLE public.transactions 
ADD COLUMN parent_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
ADD COLUMN status transaction_status NOT NULL DEFAULT 'completed'::transaction_status;

-- Create indexes for better query performance
CREATE INDEX idx_transactions_parent_id ON public.transactions(parent_transaction_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);

-- Add comments for documentation
COMMENT ON COLUMN public.transactions.parent_transaction_id IS 'References the original loan transaction for return tracking';
COMMENT ON COLUMN public.transactions.status IS 'Transaction status: completed (default), pending_return (loan waiting return), partially_returned, fully_returned';