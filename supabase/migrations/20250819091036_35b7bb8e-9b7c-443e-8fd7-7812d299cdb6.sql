-- Add freight_expense column to sales_orders table
ALTER TABLE public.sales_orders 
ADD COLUMN freight_expense integer DEFAULT 0;