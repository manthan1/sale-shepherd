
-- Add created_by column to track which user created each sales order
ALTER TABLE public.sales_orders
ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
