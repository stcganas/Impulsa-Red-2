-- Add document columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS document_url text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS document_back_url text;
