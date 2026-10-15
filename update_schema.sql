-- Update tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS start_date timestamp with time zone;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS end_date timestamp with time zone;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_penalty boolean DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;

-- Create penalized_tasks table
CREATE TABLE IF NOT EXISTS public.penalized_tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
    xp_deducted integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, task_id)
);

ALTER TABLE public.penalized_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own penalized tasks" ON public.penalized_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own penalized tasks" ON public.penalized_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update existing tasks to be templates
UPDATE public.tasks SET is_template = true WHERE start_date IS NULL AND end_date IS NULL;
