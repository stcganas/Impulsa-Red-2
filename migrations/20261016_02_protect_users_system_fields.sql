-- ==============================================================================
-- IMPULSARED — MIGRATION 20261016_02
-- OBJECTIVE: Enforce strict column-level protection on public.users via triggers and RLS.
-- STATUS: Pending review. DO NOT EXECUTE AUTOMATICALLY.
-- ==============================================================================

-- 1. Ensure helper is_admin() is defined as SECURITY DEFINER with safe search_path
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  is_admin_user boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT (role = 'admin') INTO is_admin_user
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN COALESCE(is_admin_user, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke execute from public/anon, grant to authenticated and service_role
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;


-- 2. Define the robust protect_system_fields() trigger function
CREATE OR REPLACE FUNCTION public.protect_system_fields()
RETURNS TRIGGER AS $$
DECLARE
  claim_role text;
BEGIN
  -- Obtain JWT claim role safely
  claim_role := current_setting('request.jwt.claim.role', true);

  -- Internal DB operations (psql, migrations, direct triggers) or backend service_role key bypass checks
  IF claim_role IS NULL OR claim_role = '' OR claim_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Platform administrators bypass checks
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- ON UPDATE: Prohibit changes to system, financial, progression, and privileged columns
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.role IS DISTINCT FROM OLD.role) OR
       (NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance) OR
       (NEW.plan IS DISTINCT FROM OLD.plan) OR
       (NEW.plan_id IS DISTINCT FROM OLD.plan_id) OR
       (NEW.xp IS DISTINCT FROM OLD.xp) OR
       (NEW.level IS DISTINCT FROM OLD.level) OR
       (NEW.percentage IS DISTINCT FROM OLD.percentage) OR
       (NEW.trust_score IS DISTINCT FROM OLD.trust_score) OR
       (NEW.is_tasks_active IS DISTINCT FROM OLD.is_tasks_active) OR
       (NEW.task_start_date IS DISTINCT FROM OLD.task_start_date) OR
       (NEW.task_end_date IS DISTINCT FROM OLD.task_end_date) OR
       (NEW.current_streak IS DISTINCT FROM OLD.current_streak) OR
       (NEW.longest_streak IS DISTINCT FROM OLD.longest_streak) OR
       (NEW.last_task_date IS DISTINCT FROM OLD.last_task_date) OR
       (NEW.badges IS DISTINCT FROM OLD.badges) OR
       (NEW.leader_level IS DISTINCT FROM OLD.leader_level) OR
       (NEW.compliance_score IS DISTINCT FROM OLD.compliance_score) OR
       (NEW.last_reset_at IS DISTINCT FROM OLD.last_reset_at) THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: Attempt to modify system-protected fields on users table.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- ON INSERT: Prohibit regular users from creating accounts with elevated status, balance, or XP
  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS NOT NULL AND NEW.role != 'user' THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: Newly registered users must have role ''user''.'
        USING ERRCODE = '42501';
    END IF;

    IF COALESCE(NEW.wallet_balance, 0) > 0 THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: Initial wallet balance must be 0.'
        USING ERRCODE = '42501';
    END IF;

    IF COALESCE(NEW.xp, 0) > 0 THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: Initial XP must be 0.'
        USING ERRCODE = '42501';
    END IF;

    IF COALESCE(NEW.level, 1) > 1 THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: Initial level must be 1.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.plan IS NOT NULL AND LOWER(NEW.plan) NOT IN ('básico', 'basico') THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: Initial plan must be Básico.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.is_tasks_active IS TRUE THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: Tasks activation cannot be set directly on registration.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke execute from public/anon, grant to authenticated and service_role
REVOKE ALL ON FUNCTION public.protect_system_fields() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_system_fields() FROM anon;
GRANT EXECUTE ON FUNCTION public.protect_system_fields() TO authenticated;
GRANT EXECUTE ON FUNCTION public.protect_system_fields() TO service_role;

-- 3. Attach trigger to public.users for both INSERT and UPDATE
DROP TRIGGER IF EXISTS tr_protect_user_fields ON public.users;
CREATE TRIGGER tr_protect_user_fields
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.protect_system_fields();

-- 4. Clean up and establish hardened RLS policies on public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Anyone can insert profile" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

-- SELECT: Users see their own row, admins see all rows
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- INSERT: Authenticated users can insert their own initial row (validated by trigger)
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- UPDATE: Users can update their own row (protected fields strictly enforced by trigger)
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- DELETE: Only admins can delete profiles
CREATE POLICY "Admins can delete users" ON public.users
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ==============================================================================
-- VERIFICATION QUERIES (READ-ONLY) FOR OPERATOR AUDIT
-- ==============================================================================
/*
-- Verification 1: Verify trigger exists on public.users
SELECT trigger_name, event_manipulation, action_statement, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users' AND trigger_name = 'tr_protect_user_fields';

-- Verification 2: Verify policies on public.users
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users';
*/
