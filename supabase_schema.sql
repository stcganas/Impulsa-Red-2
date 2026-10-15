-- Script para crear y actualizar las tablas en Supabase

-- 1. Actualizar tabla 'users' con las columnas faltantes
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.users(id);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS push_token text;

-- 2. Crear tabla 'tasks'
CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    day text NOT NULL,
    name text NOT NULL,
    xp integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. Crear tabla 'user_tasks'
CREATE TABLE IF NOT EXISTS public.user_tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
    completed_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, task_id)
);

-- 4. Crear tabla 'referrals'
CREATE TABLE IF NOT EXISTS public.referrals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    referred_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(referred_id)
);

-- 5. Crear tabla 'transactions'
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    amount numeric NOT NULL DEFAULT 0,
    commission numeric NOT NULL DEFAULT 0,
    type text NOT NULL, -- 'plan_purchase', 'referral_commission', 'withdrawal'
    status text NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'rejected'
    referred_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    receipt_url text,
    created_at timestamp with time zone DEFAULT now()
);

-- 6. Crear tabla 'user_courses'
CREATE TABLE IF NOT EXISTS public.user_courses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    course_id text NOT NULL,
    completed_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, course_id)
);

-- 7. Crear tabla 'settings'
CREATE TABLE IF NOT EXISTS public.settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    key text NOT NULL UNIQUE,
    value jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 8. Configurar RLS (Row Level Security) para las tablas
-- Habilitar RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Políticas para 'tasks' (Todos pueden leer)
CREATE POLICY "Tasks are viewable by everyone" ON public.tasks FOR SELECT USING (true);

-- Políticas para 'user_tasks' (Usuarios ven sus propias tareas)
CREATE POLICY "Users can view their own tasks" ON public.user_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tasks" ON public.user_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas para 'referrals' (Usuarios ven sus propios referidos)
CREATE POLICY "Users can view their own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Políticas para 'transactions' (Usuarios ven sus propias transacciones)
CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);

-- Políticas para 'user_courses' (Usuarios ven sus propios cursos)
CREATE POLICY "Users can view their own courses" ON public.user_courses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own courses" ON public.user_courses FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL, -- 'info', 'success', 'warning', 'error'
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- 9. Crear tabla 'tickets'
CREATE TABLE IF NOT EXISTS public.tickets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    subject text NOT NULL,
    message text NOT NULL,
    status text NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    priority text NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high'
    admin_reply text,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- 10. Crear tabla para usuarios simulados
CREATE TABLE IF NOT EXISTS public.simulated_users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    avatar_url text NOT NULL
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own tickets" ON public.tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tickets" ON public.tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all tickets" ON public.tickets FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update all tickets" ON public.tickets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

ALTER TABLE public.simulated_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view simulated users" ON public.simulated_users FOR SELECT USING (true);
