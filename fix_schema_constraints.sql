-- Fix user_tasks schema to match init_schema.sql (ensure ID column exists)
ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
-- Make it PRIMARY KEY if it wasn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name='user_tasks' AND constraint_type='PRIMARY KEY'
    ) THEN
        ALTER TABLE public.user_tasks ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Fix the foreign key for task_submissions to be ON DELETE CASCADE
ALTER TABLE public.user_tasks DROP CONSTRAINT IF EXISTS user_tasks_submission_id_fkey;
ALTER TABLE public.user_tasks ADD CONSTRAINT user_tasks_submission_id_fkey 
    FOREIGN KEY (submission_id) REFERENCES public.task_submissions(id) ON DELETE SET NULL;
