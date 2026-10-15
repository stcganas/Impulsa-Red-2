-- Script para actualizar las políticas RLS y permitir acceso a administradores

-- Función para verificar si el usuario actual es administrador
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar políticas para 'tasks' (Admins pueden hacer todo)
DROP POLICY IF EXISTS "Tasks are viewable by everyone" ON public.tasks;
CREATE POLICY "Tasks are viewable by everyone" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Admins can insert tasks" ON public.tasks FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update tasks" ON public.tasks FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete tasks" ON public.tasks FOR DELETE USING (is_admin());

-- Actualizar políticas para 'user_tasks'
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.user_tasks;
CREATE POLICY "Users can view their own tasks or admins can view all" ON public.user_tasks FOR SELECT USING (auth.uid() = user_id OR is_admin());

-- Actualizar políticas para 'referrals'
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
CREATE POLICY "Users can view their own referrals or admins can view all" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id OR is_admin());

-- Actualizar políticas para 'transactions'
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions or admins can view all" ON public.transactions FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Admins can update transactions" ON public.transactions FOR UPDATE USING (is_admin());

-- Actualizar políticas para 'user_courses'
DROP POLICY IF EXISTS "Users can view their own courses" ON public.user_courses;
CREATE POLICY "Users can view their own courses or admins can view all" ON public.user_courses FOR SELECT USING (auth.uid() = user_id OR is_admin());

-- Actualizar políticas para 'settings'
DROP POLICY IF EXISTS "Settings are viewable by everyone" ON public.settings;
CREATE POLICY "Settings are viewable by everyone" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Admins can insert settings" ON public.settings FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update settings" ON public.settings FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete settings" ON public.settings FOR DELETE USING (is_admin());
