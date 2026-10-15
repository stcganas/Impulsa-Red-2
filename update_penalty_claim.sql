-- Update penalty_tasks to support the claim feature
ALTER TABLE public.penalty_tasks ADD COLUMN IF NOT EXISTS ready_to_claim boolean DEFAULT false;
ALTER TABLE public.penalty_tasks ADD COLUMN IF NOT EXISTS reward_claimed boolean DEFAULT false;
