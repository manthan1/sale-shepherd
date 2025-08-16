-- Create sales orders table to store generated orders
CREATE TABLE public.sales_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  customer_name TEXT NOT NULL,
  shipping_address TEXT,
  state TEXT,
  contact_number TEXT,
  order_details TEXT NOT NULL,
  pdf_url TEXT,
  is_trial BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for sales orders
CREATE POLICY "Users can view their company's sales orders" 
ON public.sales_orders 
FOR SELECT 
USING (
  (company_id IN ( 
    SELECT profiles.company_id
    FROM profiles
    WHERE (profiles.user_id = auth.uid())
  )) OR 
  (is_trial = true AND created_at > now() - interval '1 hour')
);

CREATE POLICY "Users can create sales orders for their company" 
ON public.sales_orders 
FOR INSERT 
WITH CHECK (
  (company_id IN ( 
    SELECT profiles.company_id
    FROM profiles
    WHERE (profiles.user_id = auth.uid())
  )) OR 
  (is_trial = true AND company_id IS NULL)
);

CREATE POLICY "Users can update their company's sales orders" 
ON public.sales_orders 
FOR UPDATE 
USING (
  company_id IN ( 
    SELECT profiles.company_id
    FROM profiles
    WHERE (profiles.user_id = auth.uid())
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sales_orders_updated_at
BEFORE UPDATE ON public.sales_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();