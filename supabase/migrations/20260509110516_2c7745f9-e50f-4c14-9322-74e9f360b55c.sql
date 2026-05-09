
-- ============ user_badges ============
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_type text NOT NULL CHECK (badge_type IN ('championne','finaliste','top3')),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id, badge_type)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges"
  ON public.user_badges FOR SELECT USING (true);
-- No insert/update/delete policies => only service_role can write.

-- ============ Helper: increment a participant's score for one challenge ============
CREATE OR REPLACE FUNCTION public.add_challenge_score(_user_id uuid, _kind text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  inc int;
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  FOR r IN
    SELECT cp.id AS pid, cp.score, c.scoring_rules, c.actif, c.date_debut, c.date_fin
    FROM public.challenge_participants cp
    JOIN public.challenges c ON c.id = cp.challenge_id
    WHERE cp.user_id = _user_id
      AND c.actif = true
      AND CURRENT_DATE BETWEEN c.date_debut AND c.date_fin
  LOOP
    inc := COALESCE((r.scoring_rules->>_kind)::int, 0);
    IF inc > 0 THEN
      UPDATE public.challenge_participants
        SET score = COALESCE(score,0) + inc
        WHERE id = r.pid;
    END IF;
  END LOOP;
END;
$$;

-- ============ Trigger: post published → +post points ============
CREATE OR REPLACE FUNCTION public.on_post_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'published'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    PERFORM public.add_challenge_score(NEW.user_id, 'post');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_post_published ON public.posts;
CREATE TRIGGER trg_on_post_published
AFTER INSERT OR UPDATE OF status ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.on_post_published();

-- ============ Trigger: reactions/comments increase → +interaction points ============
CREATE OR REPLACE FUNCTION public.on_post_interactions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta_r int := COALESCE(NEW.reactions,0) - COALESCE(OLD.reactions,0);
  delta_c int := COALESCE(NEW.comments,0) - COALESCE(OLD.comments,0);
  total int;
  i int;
BEGIN
  total := GREATEST(delta_r,0) + GREATEST(delta_c,0);
  FOR i IN 1..total LOOP
    PERFORM public.add_challenge_score(NEW.user_id, 'interaction');
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_post_interactions ON public.posts;
CREATE TRIGGER trg_on_post_interactions
AFTER UPDATE OF reactions, comments ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.on_post_interactions();

-- ============ Daily login bonus ============
CREATE OR REPLACE FUNCTION public.register_daily_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  last_d date;
BEGIN
  IF uid IS NULL THEN RETURN; END IF;
  SELECT last_active_date INTO last_d FROM public.user_stats WHERE user_id = uid;
  IF last_d IS DISTINCT FROM CURRENT_DATE THEN
    UPDATE public.user_stats SET last_active_date = CURRENT_DATE WHERE user_id = uid;
    PERFORM public.add_challenge_score(uid, 'daily_login');
  END IF;
END;
$$;

-- ============ Freeze scores after end date / when inactive ============
CREATE OR REPLACE FUNCTION public.prevent_score_change_when_closed()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  c record;
BEGIN
  -- Allow when score unchanged
  IF NEW.score IS NOT DISTINCT FROM OLD.score THEN
    RETURN NEW;
  END IF;
  SELECT actif, date_fin INTO c FROM public.challenges WHERE id = NEW.challenge_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF c.actif = false OR CURRENT_DATE > c.date_fin THEN
    RAISE EXCEPTION 'Challenge terminé — score figé';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_freeze_scores ON public.challenge_participants;
CREATE TRIGGER trg_freeze_scores
BEFORE UPDATE ON public.challenge_participants
FOR EACH ROW EXECUTE FUNCTION public.prevent_score_change_when_closed();

-- ============ Close expired challenges + award badges ============
CREATE OR REPLACE FUNCTION public.close_expired_challenges()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ch record;
  closed int := 0;
BEGIN
  FOR ch IN
    SELECT id FROM public.challenges
    WHERE actif = true AND date_fin < CURRENT_DATE
  LOOP
    -- Award badges to top 3 (score > 0 only)
    INSERT INTO public.user_badges (user_id, badge_type, challenge_id)
    SELECT user_id,
           CASE rnk WHEN 1 THEN 'championne' WHEN 2 THEN 'finaliste' ELSE 'top3' END,
           ch.id
    FROM (
      SELECT user_id, ROW_NUMBER() OVER (ORDER BY score DESC, joined_at ASC) AS rnk
      FROM public.challenge_participants
      WHERE challenge_id = ch.id AND user_id IS NOT NULL AND score > 0
    ) ranked
    WHERE rnk <= 3
    ON CONFLICT DO NOTHING;

    UPDATE public.challenges SET actif = false WHERE id = ch.id;
    closed := closed + 1;
  END LOOP;
  RETURN closed;
END;
$$;

-- ============ Realtime ============
ALTER TABLE public.challenge_participants REPLICA IDENTITY FULL;
ALTER TABLE public.challenges REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_participants;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ Cron: close expired challenges daily at 00:05 ============
DO $$ BEGIN
  PERFORM cron.unschedule('close-expired-challenges-daily');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'close-expired-challenges-daily',
  '5 0 * * *',
  $cron$ SELECT public.close_expired_challenges(); $cron$
);
