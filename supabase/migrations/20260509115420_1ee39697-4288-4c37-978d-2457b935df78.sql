
-- Suspension column
ALTER TABLE public.challenge_participants
  ADD COLUMN IF NOT EXISTS suspendue_jusqu_au timestamptz;

-- Penalties table
CREATE TABLE IF NOT EXISTS public.challenge_penalties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL,
  user_id uuid NOT NULL,
  points_retires int NOT NULL DEFAULT 0,
  motif text NOT NULL,
  suspendue_jusqu_au timestamptz,
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_by uuid NOT NULL
);
ALTER TABLE public.challenge_penalties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizer can view penalties"
  ON public.challenge_penalties FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.created_by = auth.uid())
  );

CREATE POLICY "Organizer can insert penalties"
  ON public.challenge_penalties FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.created_by = auth.uid())
    AND applied_by = auth.uid()
  );

-- Bans table to prevent rejoin
CREATE TABLE IF NOT EXISTS public.challenge_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL,
  user_id uuid NOT NULL,
  banned_at timestamptz NOT NULL DEFAULT now(),
  banned_by uuid NOT NULL,
  UNIQUE (challenge_id, user_id)
);
ALTER TABLE public.challenge_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizer or banned user can view"
  ON public.challenge_bans FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.created_by = auth.uid())
  );

CREATE POLICY "Organizer can ban"
  ON public.challenge_bans FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.created_by = auth.uid())
    AND banned_by = auth.uid()
  );

-- Allow organizer to delete participants
CREATE POLICY "Organizer can remove participants"
  ON public.challenge_participants FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.created_by = auth.uid())
  );

-- Allow organizer to update participants (penalty score, suspension)
CREATE POLICY "Organizer can update participants"
  ON public.challenge_participants FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.created_by = auth.uid())
  );

-- Block joining if banned
DROP POLICY IF EXISTS "Users can join challenges" ON public.challenge_participants;
CREATE POLICY "Users can join challenges"
  ON public.challenge_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.challenge_bans b
      WHERE b.challenge_id = challenge_participants.challenge_id
        AND b.user_id = auth.uid()
    )
  );

-- Update score function to skip suspended participants
CREATE OR REPLACE FUNCTION public.add_challenge_score(_user_id uuid, _kind text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  inc int;
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  FOR r IN
    SELECT cp.id AS pid, cp.score, c.scoring_rules
    FROM public.challenge_participants cp
    JOIN public.challenges c ON c.id = cp.challenge_id
    WHERE cp.user_id = _user_id
      AND c.actif = true
      AND CURRENT_DATE BETWEEN c.date_debut AND c.date_fin
      AND (cp.suspendue_jusqu_au IS NULL OR cp.suspendue_jusqu_au < now())
  LOOP
    inc := COALESCE((r.scoring_rules->>_kind)::int, 0);
    IF inc > 0 THEN
      UPDATE public.challenge_participants
        SET score = COALESCE(score,0) + inc
        WHERE id = r.pid;
    END IF;
  END LOOP;
END;
$function$;

-- Allow score-freeze trigger to permit organizer-driven UPDATEs that lower the score (penalties)
-- Recreate to allow score change while challenge is active OR when date_fin not yet exceeded.
-- (Existing function already allows any change while actif AND date_fin >= today, fine for penalties.)

-- Close challenge now (organizer)
CREATE OR REPLACE FUNCTION public.close_challenge_now(_challenge_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_creator uuid;
BEGIN
  SELECT created_by INTO v_creator FROM public.challenges WHERE id = _challenge_id;
  IF v_creator IS NULL THEN RAISE EXCEPTION 'Challenge introuvable'; END IF;
  IF v_creator <> auth.uid() THEN RAISE EXCEPTION 'Non autorisé'; END IF;

  INSERT INTO public.user_badges (user_id, badge_type, challenge_id)
  SELECT user_id,
         CASE rnk WHEN 1 THEN 'championne' WHEN 2 THEN 'finaliste' ELSE 'top3' END,
         _challenge_id
  FROM (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY score DESC, joined_at ASC) AS rnk
    FROM public.challenge_participants
    WHERE challenge_id = _challenge_id AND user_id IS NOT NULL AND score > 0
  ) ranked
  WHERE rnk <= 3
  ON CONFLICT DO NOTHING;

  UPDATE public.challenges
    SET actif = false, date_fin = CURRENT_DATE
    WHERE id = _challenge_id;
END;
$function$;

-- Delete challenge cascade (organizer)
CREATE OR REPLACE FUNCTION public.delete_challenge_cascade(_challenge_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_creator uuid;
BEGIN
  SELECT created_by INTO v_creator FROM public.challenges WHERE id = _challenge_id;
  IF v_creator IS NULL THEN RAISE EXCEPTION 'Challenge introuvable'; END IF;
  IF v_creator <> auth.uid() THEN RAISE EXCEPTION 'Non autorisé'; END IF;

  DELETE FROM public.challenge_penalties WHERE challenge_id = _challenge_id;
  DELETE FROM public.challenge_bans WHERE challenge_id = _challenge_id;
  DELETE FROM public.user_badges WHERE challenge_id = _challenge_id;
  DELETE FROM public.challenge_participants WHERE challenge_id = _challenge_id;
  DELETE FROM public.challenges WHERE id = _challenge_id;

  UPDATE public.user_stats
    SET challenges_created_this_month = GREATEST(0, challenges_created_this_month - 1)
    WHERE user_id = v_creator;
END;
$function$;

-- Apply penalty (organizer) — bypasses score-freeze trigger via SECURITY DEFINER + direct update
CREATE OR REPLACE FUNCTION public.apply_challenge_penalty(
  _challenge_id uuid,
  _user_id uuid,
  _points int,
  _motif text,
  _suspend_until timestamptz
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_creator uuid;
BEGIN
  SELECT created_by INTO v_creator FROM public.challenges WHERE id = _challenge_id;
  IF v_creator IS NULL THEN RAISE EXCEPTION 'Challenge introuvable'; END IF;
  IF v_creator <> auth.uid() THEN RAISE EXCEPTION 'Non autorisé'; END IF;

  INSERT INTO public.challenge_penalties (challenge_id, user_id, points_retires, motif, suspendue_jusqu_au, applied_by)
  VALUES (_challenge_id, _user_id, COALESCE(_points,0), _motif, _suspend_until, auth.uid());

  UPDATE public.challenge_participants
    SET score = GREATEST(0, COALESCE(score,0) - COALESCE(_points,0)),
        suspendue_jusqu_au = COALESCE(_suspend_until, suspendue_jusqu_au)
    WHERE challenge_id = _challenge_id AND user_id = _user_id;
END;
$function$;

-- Remove participant + ban (organizer)
CREATE OR REPLACE FUNCTION public.remove_challenge_participant(_challenge_id uuid, _user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_creator uuid;
BEGIN
  SELECT created_by INTO v_creator FROM public.challenges WHERE id = _challenge_id;
  IF v_creator IS NULL THEN RAISE EXCEPTION 'Challenge introuvable'; END IF;
  IF v_creator <> auth.uid() THEN RAISE EXCEPTION 'Non autorisé'; END IF;

  DELETE FROM public.challenge_participants
    WHERE challenge_id = _challenge_id AND user_id = _user_id;

  INSERT INTO public.challenge_bans (challenge_id, user_id, banned_by)
  VALUES (_challenge_id, _user_id, auth.uid())
  ON CONFLICT DO NOTHING;
END;
$function$;
