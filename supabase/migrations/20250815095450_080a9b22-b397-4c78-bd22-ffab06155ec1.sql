-- Phase 1: Critical Security Fixes

-- Enable RLS on companies table (CRITICAL - currently disabled)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Enable RLS on profiles table (CRITICAL - currently disabled) 
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add missing INSERT policy for companies table
CREATE POLICY "Users can create companies during signup" 
ON public.companies 
FOR INSERT 
WITH CHECK (true); -- Temporary during signup, will be restricted by profile creation

-- Add missing INSERT policy for profiles table
CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Create security definer function to check if user has a company
CREATE OR REPLACE FUNCTION public.user_has_company(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = user_uuid
  );
$$;

-- Update companies policies to be more restrictive
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
DROP POLICY IF EXISTS "Users can update their own company" ON public.companies;

CREATE POLICY "Users can view their own company" 
ON public.companies 
FOR SELECT 
USING (id IN (
  SELECT company_id FROM public.profiles 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update their own company" 
ON public.companies 
FOR UPDATE 
USING (id IN (
  SELECT company_id FROM public.profiles 
  WHERE user_id = auth.uid()
));

-- Restrict company creation to only during signup process
DROP POLICY IF EXISTS "Users can create companies during signup" ON public.companies;
CREATE POLICY "Users can create companies during signup" 
ON public.companies 
FOR INSERT 
WITH CHECK (NOT public.user_has_company(auth.uid()));

-- Add DELETE policy for cleanup if needed
CREATE POLICY "Users can delete their own company" 
ON public.companies 
FOR DELETE 
USING (id IN (
  SELECT company_id FROM public.profiles 
  WHERE user_id = auth.uid()
));