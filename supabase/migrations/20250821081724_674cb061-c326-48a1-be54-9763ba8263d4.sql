-- Add customer GST number column to sales_orders table
ALTER TABLE public.sales_orders 
ADD COLUMN cust_gst_number TEXT;