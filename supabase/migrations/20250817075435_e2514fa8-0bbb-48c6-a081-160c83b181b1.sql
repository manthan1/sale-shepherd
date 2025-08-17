-- Fix companies INSERT policy to prevent RLS errors during creation
-- Drop existing restrictive policy and replace with an authenticated-only permissive policy

DROP POLICY IF EXISTS "Users can create companies during signup" ON public.companies;

CREATE POLICY "Users can create companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
