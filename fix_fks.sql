-- Fix foreign keys for user deletion
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_referred_by_fkey;
ALTER TABLE public.users ADD CONSTRAINT users_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_referrer_id_fkey;
ALTER TABLE public.users ADD CONSTRAINT users_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.users(id) ON DELETE SET NULL;
