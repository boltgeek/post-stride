
ALTER TABLE public.user_goals
  ADD COLUMN IF NOT EXISTS product_targets jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS period_start_date date;
