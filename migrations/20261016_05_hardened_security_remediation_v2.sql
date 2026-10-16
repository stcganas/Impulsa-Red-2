-- ==============================================================================
-- IMPULSARED — HARDENED SECURITY REMEDIATION MIGRATION V2 (PHASE 2A.1)
-- MIGRATION: 20261016_05_hardened_security_remediation_v2.sql
-- OBJECTIVE:
--   1. Replace Fail-Open trigger logic with strict Fail-Secure (Default Deny).
--   2. Disallow bypass when request.jwt.claim.role is NULL or empty string.
--   3. Restrict bypass strictly to direct DB superusers (postgres, supabase_admin)
--      and verified backend service_role key connections.
--   4. Harden public.is_admin() with search_path = pg_catalog, public and fully qualified tables.
--   5. Drop all legacy permissive policies across all prior migrations.
--   6. Enforce strict registration checks (INSERT) preventing role, balance, or XP injection.
-- STATUS: Pending review. DO NOT EXECUTE AUTOMATICALLY AGAINST PRODUCTION.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- PART 1: ENSURE exec_sql IS COMPLETELY REMOVED & REVOKED
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'exec_sql'
  ) THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON FUNCTION public.exec_sql(text) FROM anon';
    EXECUTE 'REVOKE ALL ON FUNCTION public.exec_sql(text) FROM authenticated';
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.exec_sql(text) RESTRICT;


-- ------------------------------------------------------------------------------
-- PART 2: HARDEN is_admin() FUNCTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  is_admin_user boolean;
BEGIN
  -- An unauthenticated context cannot be admin
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Verify admin status from the users table using qualified references
  SELECT (u.role = 'admin') INTO is_admin_user
  FROM public.users u
  WHERE u.id = auth.uid();
  
  RETURN COALESCE(is_admin_user, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;


-- ------------------------------------------------------------------------------
-- PART 3: FAIL-SECURE TRIGGER ON public.users (protect_system_fields)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_system_fields()
RETURNS TRIGGER AS $$
DECLARE
  claim_role text;
BEGIN
  -- 1. Explicit internal PostgreSQL maintenance/superuser bypass (psql, DDL, internal migrations)
  -- Note: We check session_user because in a SECURITY DEFINER function, current_user
  -- is always the function owner (postgres), which would inadvertently bypass checks for all users.
  IF session_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- 2. Explicit backend service_role key bypass
  BEGIN
    claim_role := current_setting('request.jwt.claim.role', true);
  EXCEPTION WHEN OTHERS THEN
    claim_role := NULL;
  END;

  IF claim_role = 'service_role' OR session_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- 3. Platform administrator bypass
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- ----------------------------------------------------------------------------
  -- FAIL-SECURE ZONE:
  -- Any other execution context (authenticated user, anonymous user,
  -- missing claim, NULL claim, empty string claim, or unexpected role)
  -- MUST be strictly checked and denied for system/financial mutations.
  -- ----------------------------------------------------------------------------

  -- ON UPDATE: Block client modifications to financial, administrative, and progression fields
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

  -- ON INSERT: Enforce strict baseline values during user registration
  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS NOT NULL AND NEW.role != 'user' THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: Newly registered users must have role ''user''.'
        USING ERRCODE = '42501';
    END IF;

    IF COALESCE(NEW.wallet_balance, 0) != 0 THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: Initial wallet balance must be exactly 0.'
        USING ERRCODE = '42501';
    END IF;

    IF COALESCE(NEW.xp, 0) != 0 THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: Initial XP must be exactly 0.'
        USING ERRCODE = '42501';
    END IF;

    IF COALESCE(NEW.level, 1) != 1 THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: Initial level must be exactly 1.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.plan IS NOT NULL AND LOWER(NEW.plan) NOT IN ('básico', 'basico') THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: Initial plan must be Básico.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.plan_id IS NOT NULL THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: Initial plan_id must be NULL on registration.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.is_tasks_active IS TRUE THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: Tasks activation cannot be set directly on registration.'
        USING ERRCODE = '42501';
    END IF;

    IF COALESCE(NEW.trust_score, 100) > 100 THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: Initial trust_score cannot exceed 100.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.protect_system_fields() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_system_fields() FROM anon;
GRANT EXECUTE ON FUNCTION public.protect_system_fields() TO authenticated;
GRANT EXECUTE ON FUNCTION public.protect_system_fields() TO service_role;

DROP TRIGGER IF EXISTS tr_protect_user_fields ON public.users;
CREATE TRIGGER tr_protect_user_fields
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.protect_system_fields();


-- ------------------------------------------------------------------------------
-- PART 4: CLEAN UP ALL LEGACY POLICIES & CONFIGURE RLS ON public.users
-- ------------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Clean up all permutations of legacy policies across past migrations
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own push token" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Anyone can insert profile" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

-- Read policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Insert policy (strictly constrained by trigger)
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- Update policy (user updates own row, protected fields strictly constrained by trigger)
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- Delete policy (admin only)
CREATE POLICY "Admins can delete users" ON public.users
  FOR DELETE TO authenticated
  USING (public.is_admin());


-- ------------------------------------------------------------------------------
-- PART 5: FAIL-SECURE TRIGGER ON public.user_tasks (protect_user_tasks_fields)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_user_tasks_fields()
RETURNS TRIGGER AS $$
DECLARE
  claim_role text;
BEGIN
  -- 1. Direct DB maintenance/superuser bypass (session_user connects directly as postgres)
  IF session_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- 2. Explicit service_role key bypass
  BEGIN
    claim_role := current_setting('request.jwt.claim.role', true);
  EXCEPTION WHEN OTHERS THEN
    claim_role := NULL;
  END;

  IF claim_role = 'service_role' OR session_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- 3. Platform administrator bypass
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- FAIL-SECURE: Any other context (authenticated, anon, NULL/empty claim)
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.ready_to_claim IS DISTINCT FROM OLD.ready_to_claim) OR
       (NEW.reward_claimed IS DISTINCT FROM OLD.reward_claimed) OR
       (NEW.status IN ('completed', 'approved') AND OLD.status NOT IN ('completed', 'approved')) THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: Cannot modify task completion, review status, or reward claims directly.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.ready_to_claim IS TRUE OR NEW.reward_claimed IS TRUE OR NEW.status IN ('completed', 'approved') THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: Cannot create pre-approved or pre-completed user tasks.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.protect_user_tasks_fields() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_user_tasks_fields() FROM anon;
GRANT EXECUTE ON FUNCTION public.protect_user_tasks_fields() TO authenticated;
GRANT EXECUTE ON FUNCTION public.protect_user_tasks_fields() TO service_role;

DROP TRIGGER IF EXISTS tr_protect_user_tasks ON public.user_tasks;
CREATE TRIGGER tr_protect_user_tasks
BEFORE INSERT OR UPDATE ON public.user_tasks
FOR EACH ROW EXECUTE FUNCTION public.protect_user_tasks_fields();


-- ------------------------------------------------------------------------------
-- PART 6: CLEAN UP ALL LEGACY POLICIES & CONFIGURE RLS ON public.user_tasks
-- ------------------------------------------------------------------------------
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for user_tasks" ON public.user_tasks;
DROP POLICY IF EXISTS "Users view own tasks" ON public.user_tasks;
DROP POLICY IF EXISTS "Users can view their own tasks or admins can view all" ON public.user_tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON public.user_tasks;
DROP POLICY IF EXISTS "Users manage own tasks" ON public.user_tasks;
DROP POLICY IF EXISTS "Users manage own user_tasks" ON public.user_tasks;
DROP POLICY IF EXISTS "Admins view all tasks" ON public.user_tasks;
DROP POLICY IF EXISTS "Admins view all user_tasks" ON public.user_tasks;
DROP POLICY IF EXISTS "Admins can manage user_tasks" ON public.user_tasks;
DROP POLICY IF EXISTS "Users can view own user_tasks" ON public.user_tasks;
DROP POLICY IF EXISTS "Admins full access to user_tasks" ON public.user_tasks;

-- Hardened RLS policies
CREATE POLICY "Users can view own user_tasks" ON public.user_tasks
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins full access to user_tasks" ON public.user_tasks
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMIT;
