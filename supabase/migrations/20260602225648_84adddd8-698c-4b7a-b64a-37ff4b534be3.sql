ALTER TABLE public.user_stats
ADD COLUMN IF NOT EXISTS suivi_onboarding_completed boolean NOT NULL DEFAULT false;