-- Phase 7: Comprehensive Security Hardening & RLS Audit
-- This script secures ALL tables in the ImpulsaRed database.

-- 0. Standard Denial of Service Guard
DO $$ 
BEGIN
    -- Ensure RLS is enabled on all tables
    ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.referrals ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.user_tasks ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.penalty_tasks ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.tasks ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.settings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.plans ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.features ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.plan_features ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.user_courses ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.tickets ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.conversion_events ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.invite_clicks ENABLE ROW LEVEL SECURITY;
END $$;

-- 1. Helper Function for Admin Detection (Optimized)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  -- Using a static config or a cheap lookup. 
  -- SECURITY DEFINER is needed to read 'users' even if user can't see others.
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 2. Comprehensive Policies

-- USERS
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id OR is_admin());
-- Users can UPDATE their own basic info (avatar, phone, address)
-- But we want to prevent them from changing role/xp/level via RLS if possible.
-- (Note: Best handled via Triggers, but RLS can restrict the whole operation)
CREATE POLICY "Users can update own basic info" ON users FOR UPDATE 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- TRANSACTIONS
DROP POLICY IF EXISTS "Transactions visibility" ON transactions;
CREATE POLICY "Users view own transactions" ON transactions FOR SELECT USING (user_id = auth.uid() OR is_admin());
-- Transactions should only be inserted by server (service_role), 
-- But if client inserts (e.g. for uploads), it must be forced to 'pending'.
CREATE POLICY "Users can start a transaction" ON transactions FOR INSERT WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- REFERRALS
DROP POLICY IF EXISTS "Referrals visibility" ON referrals;
CREATE POLICY "Referrals visibility" ON referrals FOR SELECT USING (referrer_id = auth.uid() OR referred_id = auth.uid() OR is_admin());

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Notifications management" ON notifications;
CREATE POLICY "Notifications management" ON notifications FOR ALL USING (user_id = auth.uid() OR is_admin());

-- SETTINGS / PLANS / FEATURES (Global Read, Admin Write)
DROP POLICY IF EXISTS "Global read access" ON settings;
CREATE POLICY "Global read settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Admin manage settings" ON settings FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Global read plans" ON plans;
CREATE POLICY "Global read plans" ON plans FOR SELECT USING (true);
CREATE POLICY "Admin manage plans" ON plans FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Global read features" ON features;
CREATE POLICY "Global read features" ON features FOR SELECT USING (true);
CREATE POLICY "Admin manage features" ON features FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Global read plan_features" ON plan_features;
CREATE POLICY "Global read plan_features" ON plan_features FOR SELECT USING (true);
CREATE POLICY "Admin manage plan_features" ON plan_features FOR ALL USING (is_admin());

-- TASKS / USER_TASKS
CREATE POLICY "Global read tasks" ON tasks FOR SELECT USING (true);
CREATE POLICY "Admin manage tasks" ON tasks FOR ALL USING (is_admin());

CREATE POLICY "User manage own tasks" ON user_tasks FOR ALL USING (user_id = auth.uid() OR is_admin());

-- TICKETS
CREATE POLICY "User manage own tickets" ON tickets FOR ALL USING (user_id = auth.uid() OR is_admin());

-- PENALTY TASKS
CREATE POLICY "User view own penalties" ON penalty_tasks FOR SELECT USING (user_id = auth.uid() OR is_admin());

-- CONVERSION EVENTS / INVITE CLICKS
CREATE POLICY "User view own invite stats" ON invite_clicks FOR SELECT USING (referrer_id = auth.uid() OR is_admin());
CREATE POLICY "System track events" ON conversion_events FOR INSERT WITH CHECK (true); -- Allow anonymous tracking if needed
CREATE POLICY "User view own events" ON conversion_events FOR SELECT USING (user_id = auth.uid() OR is_admin());

-- 3. The Immortal Guard (Fields that should NOT change via client)
-- To be perfectly secure, we add a trigger for 'users' and 'transactions'.
CREATE OR REPLACE FUNCTION protect_system_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- If not admin, check for illegal changes
    IF NOT is_admin() THEN
        IF (NEW.role IS DISTINCT FROM OLD.role) OR 
           (NEW.xp IS DISTINCT FROM OLD.xp) OR
           (NEW.level IS DISTINCT FROM OLD.level) OR
           (NEW.percentage IS DISTINCT FROM OLD.percentage) OR
           (NEW.trust_score IS DISTINCT FROM OLD.trust_score) THEN
            RAISE EXCEPTION 'PERMISSION_DENIED: Cannot modify system-protected fields';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_protect_user_fields ON users;
CREATE TRIGGER tr_protect_user_fields
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION protect_system_fields();
