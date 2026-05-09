
-- 1. Add column to user_stats
ALTER TABLE public.user_stats
ADD COLUMN IF NOT EXISTS challenges_created_this_month integer NOT NULL DEFAULT 0;

-- 2. challenges table
CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  type text NOT NULL DEFAULT 'communautaire' CHECK (type IN ('officiel','communautaire')),
  prive boolean NOT NULL DEFAULT false,
  slug text NOT NULL UNIQUE,
  date_debut date NOT NULL DEFAULT CURRENT_DATE,
  date_fin date NOT NULL,
  actif boolean NOT NULL DEFAULT true,
  message_bienvenue text,
  scoring_rules jsonb NOT NULL DEFAULT '{"post":10,"daily_login":5,"interaction":2}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public challenges"
  ON public.challenges FOR SELECT
  USING (prive = false OR created_by = auth.uid());

CREATE POLICY "Authenticated can create challenges"
  ON public.challenges FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their challenges"
  ON public.challenges FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their challenges"
  ON public.challenges FOR DELETE
  USING (auth.uid() = created_by);

-- 3. challenge_participants table
CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid,
  email text,
  prenom text,
  type_compte text NOT NULL DEFAULT 'member' CHECK (type_compte IN ('member','free')),
  score integer NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cp_challenge ON public.challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_cp_user ON public.challenge_participants(user_id);

ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view participants of visible challenges"
  ON public.challenge_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id
        AND (c.prive = false OR c.created_by = auth.uid() OR challenge_participants.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can join challenges"
  ON public.challenge_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation"
  ON public.challenge_participants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can leave challenges"
  ON public.challenge_participants FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_participants;

-- 5. Leaderboard with period filter (week / month / all)
CREATE OR REPLACE FUNCTION public.get_leaderboard_period(_period text DEFAULT 'all', _limit int DEFAULT 10, _offset int DEFAULT 0)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  copy_count integer,
  publish_count integer,
  total_score integer,
  rank integer,
  is_current_user boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _start timestamptz;
BEGIN
  IF _period = 'week' THEN
    _start := date_trunc('week', now());
  ELSIF _period = 'month' THEN
    _start := date_trunc('month', now());
  ELSE
    _start := NULL;
  END IF;

  IF _start IS NULL THEN
    RETURN QUERY
    WITH ranked AS (
      SELECT
        us.user_id,
        COALESCE(us.display_name, 'Vendeuse') AS display_name,
        us.copy_count,
        us.publish_count,
        (us.copy_count + us.publish_count) AS total_score,
        RANK() OVER (ORDER BY (us.copy_count + us.publish_count) DESC, us.user_id)::int AS rank
      FROM public.user_stats us
      WHERE (us.copy_count + us.publish_count) > 0
    )
    SELECT r.user_id, r.display_name, r.copy_count, r.publish_count, r.total_score, r.rank,
           (r.user_id = auth.uid()) AS is_current_user
    FROM ranked r
    WHERE r.rank > _offset AND r.rank <= (_offset + _limit) OR r.user_id = auth.uid()
    ORDER BY r.rank;
  ELSE
    RETURN QUERY
    WITH agg AS (
      SELECT
        p.user_id,
        COUNT(*) FILTER (WHERE p.status = 'published')::int AS publish_count,
        0::int AS copy_count,
        COUNT(*) FILTER (WHERE p.status = 'published')::int AS total_score
      FROM public.posts p
      WHERE p.published_at >= _start
      GROUP BY p.user_id
      HAVING COUNT(*) FILTER (WHERE p.status = 'published') > 0
    ),
    ranked AS (
      SELECT
        a.user_id,
        COALESCE(us.display_name, 'Vendeuse') AS display_name,
        a.copy_count,
        a.publish_count,
        a.total_score,
        RANK() OVER (ORDER BY a.total_score DESC, a.user_id)::int AS rank
      FROM agg a
      LEFT JOIN public.user_stats us ON us.user_id = a.user_id
    )
    SELECT r.user_id, r.display_name, r.copy_count, r.publish_count, r.total_score, r.rank,
           (r.user_id = auth.uid()) AS is_current_user
    FROM ranked r
    WHERE r.rank > _offset AND r.rank <= (_offset + _limit) OR r.user_id = auth.uid()
    ORDER BY r.rank;
  END IF;
END;
$$;

-- 6. Reset monthly counter (called by cron)
CREATE OR REPLACE FUNCTION public.reset_monthly_challenge_counter()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.user_stats SET challenges_created_this_month = 0;
$$;

-- 7. Schedule via pg_cron (1st of month at 00:05)
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('reset-monthly-challenges');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'reset-monthly-challenges',
  '5 0 1 * *',
  $$ SELECT public.reset_monthly_challenge_counter(); $$
);
