-- Add authorized signature URL column to companies table
ALTER TABLE public.companies 
ADD COLUMN authorized_signature_url text;