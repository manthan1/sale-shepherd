
-- Add is_active column to profiles
ALTER TABLE public.profiles ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Allow admins to view all profiles in their company
CREATE OR REPLACE FUNCTION public.get_user_company_id(user_uuid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = user_uuid LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid LIMIT 1;
$$;

-- Drop old restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Admins can view all profiles in their company; employees see only their own
CREATE POLICY "Users can view profiles in their company"
ON public.profiles
FOR SELECT
USING (
  user_id = auth.uid()
  OR (
    public.get_user_role(auth.uid()) = 'admin'
    AND company_id = public.get_user_company_id(auth.uid())
  )
);

-- Drop old UPDATE policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Admins can update any profile in their company; employees can update their own
CREATE POLICY "Users can update profiles"
ON public.profiles
FOR UPDATE
USING (
  user_id = auth.uid()
  OR (
    public.get_user_role(auth.uid()) = 'admin'
    AND company_id = public.get_user_company_id(auth.uid())
  )
);

-- Admins can delete profiles in their company (except their own)
CREATE POLICY "Admins can delete company profiles"
ON public.profiles
FOR DELETE
USING (
  public.get_user_role(auth.uid()) = 'admin'
  AND company_id = public.get_user_company_id(auth.uid())
  AND user_id != auth.uid()
);
