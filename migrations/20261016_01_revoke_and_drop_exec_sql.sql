-- ==============================================================================
-- IMPULSARED — MIGRATION 20261016_01
-- OBJECTIVE: Revoke privileges and safely drop the vulnerable exec_sql(text) function.
-- STATUS: Pending review. DO NOT EXECUTE AUTOMATICALLY.
-- ==============================================================================

-- 1. Revoke all execution privileges from PUBLIC, anon, and authenticated roles
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

-- 2. Drop the function if it exists
-- Using RESTRICT prevents unintended cascade drops if any unexpected view depends on it.
DROP FUNCTION IF EXISTS public.exec_sql(text) RESTRICT;

-- ==============================================================================
-- VERIFICATION QUERIES (READ-ONLY) FOR OPERATOR AUDIT
-- Run these queries after applying the migration to confirm complete remediation:
-- ==============================================================================
/*
-- Verification 1: Confirm exec_sql no longer exists in public schema
SELECT 
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  r.rolname AS owner,
  p.prosecdef AS is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_roles r ON r.oid = p.proowner
WHERE p.proname = 'exec_sql';
-- Expected result: 0 rows returned.

-- Verification 2: Confirm no routine privileges remain for exec_sql
SELECT 
  routine_schema,
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'exec_sql';
-- Expected result: 0 rows returned.
*/
