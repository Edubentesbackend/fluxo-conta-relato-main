-- Fix the accounts table id default to use gen_random_uuid() instead of auth.uid()
-- This prevents the "null value in column id" error when no user is authenticated

ALTER TABLE public.accounts 
ALTER COLUMN id SET DEFAULT gen_random_uuid();