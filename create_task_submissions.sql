-- Tabla para envíos de tareas (Pruebas/Reclamos)
CREATE TABLE IF NOT EXISTS public.task_submissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
    evidence_url text, -- URL de la imagen/captura de pantalla
    notes text, -- Notas adicionales del usuario
    status text DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    admin_feedback text, -- Respuesta del admin si es rechazada
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.task_submissions;
CREATE POLICY "Users can view their own submissions" 
ON public.task_submissions FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create submissions" ON public.task_submissions;
CREATE POLICY "Users can create submissions" 
ON public.task_submissions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all submissions" ON public.task_submissions;
CREATE POLICY "Admins can manage all submissions" 
ON public.task_submissions FOR ALL 
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Notificar a user_tasks que hay una solicitud pendiente si es necesario
ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS submission_id uuid REFERENCES public.task_submissions(id);
ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'; -- 'active', 'pending_review', 'completed'
