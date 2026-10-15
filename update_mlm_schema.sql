-- SCRIPT DE ACTUALIZACIÓN PARA IMPULSARED
-- Ejecuta este código en el Editor SQL de Supabase

-- 1. Actualizar tabla de Usuarios con campos de Liderazgo y Confianza
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS trust_score integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS leader_level text DEFAULT 'Usuario',
ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- 2. Generar códigos de referido para usuarios existentes que no tengan uno
UPDATE public.users 
SET referral_code = LOWER(SUBSTRING(id::text, 1, 8))
WHERE referral_code IS NULL;

-- 3. Actualizar tabla de Transacciones para soportar niveles de red
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS nivel_red integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS referred_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

-- 4. Asegurar que la tabla de Referidos tenga los índices correctos para velocidad
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_id);

-- 5. Crear tabla de Notificaciones si no existe (necesaria para el sistema viral)
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- 6. Habilitar RLS para notificaciones
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 7. Políticas para Notificaciones
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own notifications') THEN
        CREATE POLICY "Users can view their own notifications" ON public.notifications 
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System can insert notifications') THEN
        CREATE POLICY "System can insert notifications" ON public.notifications 
        FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- 8. Función para ejecutar SQL desde el servidor (RPC) - Úsala con precaución
-- Esto permite que el servidor cree columnas automáticamente si es necesario
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
