-- Add tax_rate column to products table
ALTER TABLE public.products 
ADD COLUMN tax_rate numeric DEFAULT 0;