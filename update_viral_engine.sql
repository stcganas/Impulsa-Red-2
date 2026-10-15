-- Tabla para tracking de eventos de conversión
CREATE TABLE IF NOT EXISTS public.conversion_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code text NOT NULL,
  event_type text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert conversion events" ON public.conversion_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view conversion events" ON public.conversion_events FOR SELECT USING (is_admin());

-- Insertar configuraciones de bonus si no existen
INSERT INTO public.settings (key, value) VALUES 
('bonus_active', 'true'::jsonb),
('bonus_multiplier', '2'::jsonb),
('bonus_expiration', '"2026-12-31T23:59:59Z"'::jsonb)
ON CONFLICT (key) DO NOTHING;
