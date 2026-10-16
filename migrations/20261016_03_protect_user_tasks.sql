-- ==============================================================================
-- IMPULSARED — MIGRATION 20261016_03
-- OBJECTIVE: Eliminate permissive RLS on public.user_tasks and enforce review validation.
-- STATUS: Pending review. DO NOT EXECUTE AUTOMATICALLY.
-- ==============================================================================

-- 1. Enable Row Level Security on public.user_tasks
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;

-- 2. Clean up all previous permissive or conflicting policies on user_tasks
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

-- 3. Define hardened RLS policies
-- READ: Users can strictly view only their own user_tasks
CREATE POLICY "Users can view own user_tasks" ON public.user_tasks
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ADMIN: Administrators have full access
CREATE POLICY "Admins full access to user_tasks" ON public.user_tasks
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Defense-in-depth trigger to prevent unauthorized status or claim manipulation
CREATE OR REPLACE FUNCTION public.protect_user_tasks_fields()
RETURNS TRIGGER AS $$
DECLARE
  claim_role text;
BEGIN
  claim_role := current_setting('request.jwt.claim.role', true);

  -- Internal DB operations or backend service_role key bypass checks
  IF claim_role IS NULL OR claim_role = '' OR claim_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Platform administrators bypass checks
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Any non-admin, non-service_role attempt to manipulate claim status is strictly rejected
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke execute from public/anon, grant to authenticated and service_role
REVOKE ALL ON FUNCTION public.protect_user_tasks_fields() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_user_tasks_fields() FROM anon;
GRANT EXECUTE ON FUNCTION public.protect_user_tasks_fields() TO authenticated;
GRANT EXECUTE ON FUNCTION public.protect_user_tasks_fields() TO service_role;

-- 5. Attach trigger
DROP TRIGGER IF EXISTS tr_protect_user_tasks ON public.user_tasks;
CREATE TRIGGER tr_protect_user_tasks
BEFORE INSERT OR UPDATE ON public.user_tasks
FOR EACH ROW EXECUTE FUNCTION public.protect_user_tasks_fields();

-- ==============================================================================
-- VERIFICATION QUERIES (READ-ONLY) FOR OPERATOR AUDIT
-- ==============================================================================
/*
-- Verification 1: Verify policies on public.user_tasks
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_tasks';

-- Verification 2: Verify trigger exists on public.user_tasks
SELECT trigger_name, event_manipulation, action_statement, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'user_tasks' AND trigger_name = 'tr_protect_user_tasks';
*/
