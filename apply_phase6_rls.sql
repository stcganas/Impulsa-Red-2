-- Fase 6: Refuerzo de Seguridad y RLS
-- Este script asegura que los usuarios solo accedan a su propia información sensible.

-- 1. Habilitar RLS en todas las tablas si no lo están
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ops ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para 'users'
-- Los usuarios pueden leer su propia fila
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Solo admins pueden ver todos los usuarios (para el dashboard)
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- 3. Políticas para 'transactions'
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all transactions" ON public.transactions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- 4. Políticas para 'referrals'
CREATE POLICY "Users can view their own referrals" ON public.referrals
    FOR SELECT USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- 5. Políticas para 'notifications'
CREATE POLICY "Users can manage own notifications" ON public.notifications
    FOR ALL USING (user_id = auth.uid());

-- 6. Políticas para 'settings'
CREATE POLICY "Anyone can view settings" ON public.settings
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify settings" ON public.settings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );
