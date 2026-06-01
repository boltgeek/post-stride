CREATE TABLE public.user_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  period text NOT NULL CHECK (period IN ('day','week','month','year')),
  target_amount numeric NOT NULL CHECK (target_amount > 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, period)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_goals TO authenticated;
GRANT ALL ON public.user_goals TO service_role;

ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own goals" ON public.user_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own goals" ON public.user_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own goals" ON public.user_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own goals" ON public.user_goals FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_user_goals_updated_at
  BEFORE UPDATE ON public.user_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();