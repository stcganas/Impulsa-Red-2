-- Redefinir is_admin() como SECURITY DEFINER para evitar recursividad
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  is_admin_user boolean;
BEGIN
  -- Usamos auth.uid() directamente
  -- Al ser SECURITY DEFINER, esta consulta no activa RLS para el selector interno
  -- siempre que el dueño de la función sea un rol superior (postgres)
  SELECT (role = 'admin') INTO is_admin_user
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN COALESCE(is_admin_user, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Asegurar que RLS esté activo
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Limpiar Políticas de Users para evitar conflictos
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Anyone can insert profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

-- Aplicar Políticas de Users NO RECURSIVAS
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all users" ON public.users FOR SELECT USING (is_admin());
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id OR is_admin());
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id OR is_admin());
CREATE POLICY "Admins can delete users" ON public.users FOR DELETE USING (is_admin());

-- Limpiar y Aplicar Políticas de TASKS
DROP POLICY IF EXISTS "Tasks viewable by everyone" ON public.tasks;
DROP POLICY IF EXISTS "Admins manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Public read tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Tasks are viewable by everyone" ON public.tasks;

CREATE POLICY "Tasks viewable by everyone" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Admins manage tasks" ON public.tasks FOR ALL USING (is_admin());

-- Limpiar y Aplicar Políticas de TASK_SUBMISSIONS
DROP POLICY IF EXISTS "Users view own submissions" ON public.task_submissions;
DROP POLICY IF EXISTS "Users create submissions" ON public.task_submissions;
DROP POLICY IF EXISTS "Admins manage submissions" ON public.task_submissions;
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.task_submissions;
DROP POLICY IF EXISTS "Users can create submissions" ON public.task_submissions;
DROP POLICY IF EXISTS "Admins can manage all submissions" ON public.task_submissions;

CREATE POLICY "Users view own submissions" ON public.task_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create submissions" ON public.task_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage submissions" ON public.task_submissions FOR ALL USING (is_admin());

-- Limpiar y Aplicar Políticas de USER_TASKS
DROP POLICY IF EXISTS "Users view own tasks" ON public.user_tasks;
DROP POLICY IF EXISTS "Users can view their own tasks or admins can view all" ON public.user_tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON public.user_tasks;
DROP POLICY IF EXISTS "Admins view all tasks" ON public.user_tasks;
DROP POLICY IF EXISTS "Users manage own tasks" ON public.user_tasks;

CREATE POLICY "Users view own tasks" ON public.user_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all user_tasks" ON public.user_tasks FOR SELECT USING (is_admin());
CREATE POLICY "Users manage own user_tasks" ON public.user_tasks FOR ALL USING (auth.uid() = user_id OR is_admin());
