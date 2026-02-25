
-- Add status column to sales_orders for approval workflow
ALTER TABLE public.sales_orders 
ADD COLUMN status text NOT NULL DEFAULT 'approved',
ADD COLUMN pending_approval_reason text NULL;

-- Add constraint for valid statuses
ALTER TABLE public.sales_orders
ADD CONSTRAINT sales_orders_status_check CHECK (status IN ('pending_approval', 'approved', 'rejected'));

-- Allow admins to update sales orders status (for approval)
CREATE POLICY "Admins can update company sales orders"
ON public.sales_orders
FOR UPDATE
USING (
  (get_user_role(auth.uid()) = 'admin') 
  AND (company_id = get_user_company_id(auth.uid()))
);
