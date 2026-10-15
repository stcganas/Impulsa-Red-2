-- Añadir soporte para tokens push
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS push_token text;

-- Asegurar que el usuario pueda actualizar su propio token push
DROP POLICY IF EXISTS "Users can update own push token" ON public.users;
CREATE POLICY "Users can update own push token" ON public.users FOR UPDATE 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);
