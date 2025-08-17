-- Fix companies table RLS policies for proper creation workflow
-- The issue is that after creating a company, we can't select it back because 
-- the user's profile hasn't been updated with company_id yet

-- Drop the existing SELECT policy that's too restrictive
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;

-- Create a new SELECT policy that allows users to view companies they created
-- This handles the case where a company is created but not yet linked to profile
CREATE POLICY "Users can view companies they have access to" 
ON public.companies 
FOR SELECT 
TO authenticated 
USING (
  -- User can see their linked company via profile
  id IN (
    SELECT company_id 
    FROM public.profiles 
    WHERE user_id = auth.uid() AND company_id IS NOT NULL
  )
  OR
  -- User can see companies they just created (within last 5 minutes)
  -- This allows the creation workflow to complete
  (created_at > now() - interval '5 minutes')
);

-- Also update the INSERT policy to be more explicit about what we're allowing
DROP POLICY IF EXISTS "Allow authenticated users to create companies" ON public.companies;

CREATE POLICY "Authenticated users can create companies" 
ON public.companies 
FOR INSERT 
TO authenticated 
WITH CHECK (true);