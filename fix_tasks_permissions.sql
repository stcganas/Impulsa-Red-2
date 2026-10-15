-- 1. Asegurar columnas de la tabla tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS conditions jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS xp_reward integer DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Migrar datos si es necesario
UPDATE public.tasks SET title = name WHERE title IS NULL AND name IS NOT NULL;
UPDATE public.tasks SET xp_reward = xp WHERE xp_reward = 0 AND xp IS NOT NULL;

-- 2. Habilitar RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 3. Limpiar políticas antiguas para evitar duplicados o conflictos
DROP POLICY IF EXISTS "Public read tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admin full access tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Everyone can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can do everything with tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can delete tasks" ON public.tasks;

-- 4. Crear nuevas políticas
-- Lectura pública para que los usuarios vean sus tareas
CREATE POLICY "Public read tasks" ON public.tasks FOR SELECT USING (true);

-- Acceso total para administradores
-- Usamos una subconsulta directa para evitar dependencias circulares si is_admin() fallara
CREATE POLICY "Admins can manage tasks" ON public.tasks FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Asegurar políticas para tablas relacionadas
DROP POLICY IF EXISTS "Admins can manage user_tasks" ON public.user_tasks;
CREATE POLICY "Admins can manage user_tasks" ON public.user_tasks FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can manage penalty_tasks" ON public.penalty_tasks;
CREATE POLICY "Admins can manage penalty_tasks" ON public.penalty_tasks FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Asegurar que los administradores puedan ver la tabla de usuarios para las comprobaciones de RLS
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
