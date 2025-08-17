-- 1) Allow users without a company yet by making profiles.company_id nullable
ALTER TABLE public.profiles
  ALTER COLUMN company_id DROP NOT NULL;

-- 2) Fix helper function used by RLS to correctly reflect whether a user already has a company
CREATE OR REPLACE FUNCTION public.user_has_company(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = user_uuid
      AND company_id IS NOT NULL
  );
$function$;