-- Update user_tasks to support the claim feature
ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS ready_to_claim boolean DEFAULT false;
ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS reward_claimed boolean DEFAULT false;
