-- 1. Asegurar que los administradores puedan ver su propio rol sin recursividad infinita
-- Eliminamos primero para limpiar
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT 
USING (auth.uid() = id);

-- 2. Permitir que los admins vean a todos los usuarios (para gestión)
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users FOR SELECT
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- 3. Corregir RLS de la tabla TASKS para evitar recursividad
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can manage tasks" ON public.tasks;

-- Lectura pública (siempre permitida para lectura)
CREATE POLICY "Public read tasks" ON public.tasks FOR SELECT USING (true);

-- Gestión total para Admins (Uso de subconsulta directa simple)
CREATE POLICY "Admins can manage tasks" ON public.tasks FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- 4. Asegurar que las tareas tengan valores por defecto correctos
ALTER TABLE public.tasks ALTER COLUMN xp_reward SET DEFAULT 0;
ALTER TABLE public.tasks ALTER COLUMN is_active SET DEFAULT true;
ALTER TABLE public.tasks ALTER COLUMN conditions SET DEFAULT '{}'::jsonb;
