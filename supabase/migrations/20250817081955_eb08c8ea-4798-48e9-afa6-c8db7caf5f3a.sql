-- Fix companies INSERT policy to allow authenticated users to create companies
-- The current policy is still causing violations, so we need a more permissive approach

DROP POLICY IF EXISTS "Users can create companies" ON public.companies;

-- Create a simple, permissive INSERT policy for authenticated users
CREATE POLICY "Allow authenticated users to create companies" 
ON public.companies 
FOR INSERT 
TO authenticated 
WITH CHECK (true);