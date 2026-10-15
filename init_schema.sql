-- Script completo para inicializar la base de datos de ImpulsaRed

-- 1. Crear tabla 'users'
CREATE TABLE IF NOT EXISTS public.users (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name text,
    email text,
    role text DEFAULT 'user',
    plan text DEFAULT 'free',
    level integer DEFAULT 1,
    xp integer DEFAULT 0,
    percentage numeric DEFAULT 0,
    status text DEFAULT 'active',
    phone text,
    address text,
    avatar_url text,
    photo_url text,
    username text UNIQUE,
    referred_by uuid REFERENCES public.users(id),
    referral_code text UNIQUE,
    referrer_id uuid REFERENCES public.users(id),
    invite_title text,
    invite_message text,
    invite_banner text,
    invite_whatsapp_message text,
    is_tasks_active boolean DEFAULT false,
    task_start_date timestamp with time zone,
    task_end_date timestamp with time zone,
    wallet_balance numeric DEFAULT 0,
    inventory_status text DEFAULT 'Inactivo',
    compliance_score integer DEFAULT 100,
    trust_score integer DEFAULT 100,
    leader_level text DEFAULT 'Promotor',
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Crear tabla 'tasks'
CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    day text NOT NULL,
    name text NOT NULL,
    xp integer NOT NULL DEFAULT 0,
    type text DEFAULT 'daily',
    is_template boolean DEFAULT false,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    is_penalty boolean DEFAULT false,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
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

-- 4. Crear tabla 'penalty_tasks'
CREATE TABLE IF NOT EXISTS public.penalty_tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    xp integer DEFAULT 0,
    is_completed boolean DEFAULT false,
    original_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 5. Crear tabla 'penalized_tasks'
CREATE TABLE IF NOT EXISTS public.penalized_tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
    xp_deducted integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, task_id)
);

-- 6. Crear tabla 'referrals'
CREATE TABLE IF NOT EXISTS public.referrals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    referred_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(referred_id)
);

-- 7. Crear tabla 'transactions'
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    amount numeric NOT NULL DEFAULT 0,
    commission numeric NOT NULL DEFAULT 0,
    type text NOT NULL, -- 'plan_purchase', 'referral_commission', 'withdrawal'
    status text NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'rejected'
    referred_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    nivel_red integer,
    receipt_url text,
    created_at timestamp with time zone DEFAULT now()
);

-- 8. Crear tabla 'user_courses'
CREATE TABLE IF NOT EXISTS public.user_courses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    course_id text NOT NULL,
    completed_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, course_id)
);

-- 9. Crear tabla 'settings'
CREATE TABLE IF NOT EXISTS public.settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    key text NOT NULL UNIQUE,
    value jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 10. Crear tabla 'notifications'
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL, -- 'info', 'success', 'warning', 'error'
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- 11. Crear tabla 'tickets'
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

-- 12. Crear tabla 'invite_clicks'
CREATE TABLE IF NOT EXISTS public.invite_clicks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    referral_code text NOT NULL,
    ip text,
    device text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);

-- 12. Habilitar RLS (Row Level Security)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalty_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalized_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_clicks ENABLE ROW LEVEL SECURITY;

-- 13. Función para verificar si el usuario es administrador
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Políticas RLS
-- Users
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id OR is_admin());
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id OR is_admin());

-- Tasks
CREATE POLICY "Tasks are viewable by everyone" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Admins can insert tasks" ON public.tasks FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update tasks" ON public.tasks FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete tasks" ON public.tasks FOR DELETE USING (is_admin());

-- User Tasks
CREATE POLICY "Users can view their own tasks or admins can view all" ON public.user_tasks FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can insert their own tasks" ON public.user_tasks FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());

-- Penalty Tasks
CREATE POLICY "Users can view their own penalty tasks" ON public.penalty_tasks FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can insert their own penalty tasks" ON public.penalty_tasks FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can update their own penalty tasks" ON public.penalty_tasks FOR UPDATE USING (auth.uid() = user_id OR is_admin());

-- Penalized Tasks
CREATE POLICY "Users can view their own penalized tasks" ON public.penalized_tasks FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can insert their own penalized tasks" ON public.penalized_tasks FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());

-- Referrals
CREATE POLICY "Users can view their own referrals or admins can view all" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id OR is_admin());

-- Transactions
CREATE POLICY "Users can view their own transactions or admins can view all" ON public.transactions FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can insert their own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());
CREATE POLICY "Admins can update transactions" ON public.transactions FOR UPDATE USING (is_admin());

-- User Courses
CREATE POLICY "Users can view their own courses or admins can view all" ON public.user_courses FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can insert their own courses" ON public.user_courses FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());

-- Settings
CREATE POLICY "Settings are viewable by everyone" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Admins can insert settings" ON public.settings FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update settings" ON public.settings FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete settings" ON public.settings FOR DELETE USING (is_admin());

-- Notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can insert notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());

-- Tickets
CREATE POLICY "Users can view their own tickets" ON public.tickets FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can insert their own tickets" ON public.tickets FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());
CREATE POLICY "Admins can update all tickets" ON public.tickets FOR UPDATE USING (is_admin());

-- Invite Clicks
CREATE POLICY "Invite clicks are viewable by admins" ON public.invite_clicks FOR SELECT USING (is_admin());
CREATE POLICY "Anyone can insert invite clicks" ON public.invite_clicks FOR INSERT WITH CHECK (true);
