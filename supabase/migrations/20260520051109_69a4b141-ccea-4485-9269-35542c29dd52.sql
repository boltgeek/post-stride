
-- 1. interactions_per_post
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS interactions_per_post INT NOT NULL DEFAULT 9;

-- 2. Pods
CREATE TABLE IF NOT EXISTS public.challenge_pods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  pod_number INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, pod_number)
);
ALTER TABLE public.challenge_pods ENABLE ROW LEVEL SECURITY;

-- 3. Pod members
CREATE TABLE IF NOT EXISTS public.challenge_pod_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES public.challenge_pods(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_pod_members_pod ON public.challenge_pod_members(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_user ON public.challenge_pod_members(user_id);
ALTER TABLE public.challenge_pod_members ENABLE ROW LEVEL SECURITY;

-- 4. Community posts
CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  post_date DATE NOT NULL DEFAULT CURRENT_DATE,
  facebook_url TEXT NOT NULL,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id, post_date)
);
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- 5. Community assignments
CREATE TABLE IF NOT EXISTS public.community_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL,
  assignee_user_id UUID NOT NULL,
  assignment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  slot_time TEXT NOT NULL CHECK (slot_time IN ('12:00','15:00','20:00')),
  completed_at TIMESTAMPTZ,
  penalty_applied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_assign_assignee_date ON public.community_assignments(assignee_user_id, assignment_date);
CREATE INDEX IF NOT EXISTS idx_assign_post ON public.community_assignments(community_post_id);
ALTER TABLE public.community_assignments ENABLE ROW LEVEL SECURITY;

-- ===== Policies (after all tables exist) =====

CREATE POLICY "Pods visible to challenge participants"
ON public.challenge_pods FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.challenge_participants cp
          WHERE cp.challenge_id = challenge_pods.challenge_id AND cp.user_id = auth.uid())
);

CREATE POLICY "Pod members visible to challenge participants"
ON public.challenge_pod_members FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.challenge_participants cp
          WHERE cp.challenge_id = challenge_pod_members.challenge_id AND cp.user_id = auth.uid())
);

CREATE POLICY "Owner or assignee can view community post"
ON public.community_posts FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.community_assignments ca
             WHERE ca.community_post_id = community_posts.id
               AND ca.assignee_user_id = auth.uid())
);

CREATE POLICY "Owner can insert own community post"
ON public.community_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own community post"
ON public.community_posts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Owner or assignee can view assignment"
ON public.community_assignments FOR SELECT
USING (auth.uid() = owner_user_id OR auth.uid() = assignee_user_id);

CREATE POLICY "Assignee can mark done"
ON public.community_assignments FOR UPDATE
USING (auth.uid() = assignee_user_id);

-- ===== Functions =====

CREATE OR REPLACE FUNCTION public.assign_user_to_pod(_challenge_id UUID, _user_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  existing UUID; target_pod UUID; next_num INT;
BEGIN
  SELECT pod_id INTO existing FROM public.challenge_pod_members
  WHERE challenge_id = _challenge_id AND user_id = _user_id;
  IF existing IS NOT NULL THEN RETURN existing; END IF;

  SELECT p.id INTO target_pod
  FROM public.challenge_pods p
  LEFT JOIN public.challenge_pod_members m ON m.pod_id = p.id
  WHERE p.challenge_id = _challenge_id
  GROUP BY p.id HAVING COUNT(m.id) < 10
  ORDER BY p.pod_number ASC LIMIT 1;

  IF target_pod IS NULL THEN
    SELECT COALESCE(MAX(pod_number),0)+1 INTO next_num
    FROM public.challenge_pods WHERE challenge_id = _challenge_id;
    INSERT INTO public.challenge_pods (challenge_id, pod_number)
    VALUES (_challenge_id, next_num) RETURNING id INTO target_pod;
  END IF;

  INSERT INTO public.challenge_pod_members (pod_id, challenge_id, user_id)
  VALUES (target_pod, _challenge_id, _user_id) ON CONFLICT DO NOTHING;
  RETURN target_pod;
END;
$$;

-- Backfill
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT challenge_id, user_id FROM public.challenge_participants
           WHERE user_id IS NOT NULL ORDER BY joined_at ASC LOOP
    PERFORM public.assign_user_to_pod(r.challenge_id, r.user_id);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.submit_community_post(_challenge_id UUID, _url TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  post_id UUID;
  my_pod UUID;
  target_count INT;
  slots TEXT[] := ARRAY['12:00','15:00','20:00'];
  per_slot INT; remainder INT;
  pick RECORD;
  slot_idx INT := 1; in_slot INT := 0;
  current_slot_size INT;
  yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public.assign_user_to_pod(_challenge_id, uid);

  SELECT pod_id INTO my_pod FROM public.challenge_pod_members
  WHERE challenge_id = _challenge_id AND user_id = uid;

  SELECT COALESCE(interactions_per_post, 9) INTO target_count
  FROM public.challenges WHERE id = _challenge_id;

  INSERT INTO public.community_posts (challenge_id, user_id, facebook_url)
  VALUES (_challenge_id, uid, _url)
  ON CONFLICT (challenge_id, user_id, post_date)
  DO UPDATE SET facebook_url = EXCLUDED.facebook_url
  RETURNING id INTO post_id;

  IF EXISTS (SELECT 1 FROM public.community_assignments WHERE community_post_id = post_id) THEN
    RETURN post_id;
  END IF;

  per_slot := target_count / 3;
  remainder := target_count % 3;

  FOR pick IN
    WITH candidates AS (
      SELECT m.user_id,
        EXISTS (SELECT 1 FROM public.community_assignments ca
                WHERE ca.owner_user_id = uid AND ca.assignee_user_id = m.user_id
                  AND ca.assignment_date = yesterday) AS was_yesterday
      FROM public.challenge_pod_members m
      WHERE m.challenge_id = _challenge_id AND m.user_id <> uid AND m.pod_id <> my_pod
    )
    SELECT user_id FROM candidates ORDER BY was_yesterday ASC, random() LIMIT target_count
  LOOP
    current_slot_size := per_slot + CASE WHEN slot_idx > (3 - remainder) THEN 1 ELSE 0 END;
    IF in_slot >= current_slot_size AND slot_idx < 3 THEN
      slot_idx := slot_idx + 1; in_slot := 0;
    END IF;
    INSERT INTO public.community_assignments
      (community_post_id, challenge_id, owner_user_id, assignee_user_id, slot_time)
    VALUES (post_id, _challenge_id, uid, pick.user_id, slots[slot_idx]);
    in_slot := in_slot + 1;
  END LOOP;
  RETURN post_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_community_post_today(_challenge_id UUID)
RETURNS TABLE (post_id UUID, facebook_url TEXT, confirmed_at TIMESTAMPTZ, total INT, done INT, assignments JSONB)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID := auth.uid(); p RECORD;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO p FROM public.community_posts
  WHERE challenge_id = _challenge_id AND user_id = uid AND post_date = CURRENT_DATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ, 0, 0, '[]'::JSONB;
    RETURN;
  END IF;
  RETURN QUERY
  SELECT p.id, p.facebook_url, p.confirmed_at,
    COUNT(ca.*)::INT,
    COUNT(ca.*) FILTER (WHERE ca.completed_at IS NOT NULL)::INT,
    COALESCE(jsonb_agg(jsonb_build_object(
      'id', ca.id, 'assignee_user_id', ca.assignee_user_id,
      'display_name', COALESCE(us.display_name, 'Vendeuse'),
      'slot_time', ca.slot_time, 'completed_at', ca.completed_at
    ) ORDER BY ca.slot_time, ca.created_at) FILTER (WHERE ca.id IS NOT NULL), '[]'::JSONB)
  FROM public.community_assignments ca
  LEFT JOIN public.user_stats us ON us.user_id = ca.assignee_user_id
  WHERE ca.community_post_id = p.id
  GROUP BY p.id, p.facebook_url, p.confirmed_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_community_assignments_today(_challenge_id UUID)
RETURNS TABLE (id UUID, slot_time TEXT, facebook_url TEXT, owner_user_id UUID, owner_name TEXT, completed_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
  SELECT ca.id, ca.slot_time, cp.facebook_url, ca.owner_user_id,
         COALESCE(us.display_name, 'Vendeuse'), ca.completed_at
  FROM public.community_assignments ca
  JOIN public.community_posts cp ON cp.id = ca.community_post_id
  LEFT JOIN public.user_stats us ON us.user_id = ca.owner_user_id
  WHERE ca.assignee_user_id = uid AND ca.challenge_id = _challenge_id
    AND ca.assignment_date = CURRENT_DATE
  ORDER BY ca.slot_time ASC, ca.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_assignment_done(_assignment_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.community_assignments
  SET completed_at = now()
  WHERE id = _assignment_id AND assignee_user_id = auth.uid() AND completed_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_community_post(_post_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID := auth.uid(); p RECORD; a RECORD; pending INT;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO p FROM public.community_posts WHERE id = _post_id;
  IF NOT FOUND OR p.user_id <> uid THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  IF p.confirmed_at IS NOT NULL THEN RETURN; END IF;

  SELECT COUNT(*) INTO pending FROM public.community_assignments
  WHERE community_post_id = _post_id AND completed_at IS NULL;
  IF pending > 0 THEN RAISE EXCEPTION 'Certaines interactions sont en attente'; END IF;

  UPDATE public.community_posts SET confirmed_at = now() WHERE id = _post_id;
  FOR a IN SELECT assignee_user_id FROM public.community_assignments WHERE community_post_id = _post_id LOOP
    PERFORM public.add_challenge_score(a.assignee_user_id, 'interaction');
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_community_penalties()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; cnt INT := 0;
BEGIN
  FOR r IN
    SELECT id, challenge_id, assignee_user_id FROM public.community_assignments
    WHERE assignment_date < CURRENT_DATE AND completed_at IS NULL AND penalty_applied = false
  LOOP
    INSERT INTO public.challenge_penalties (challenge_id, user_id, points_retires, motif, applied_by)
    VALUES (r.challenge_id, r.assignee_user_id, 2, 'Soutien communautaire non effectué', r.assignee_user_id);
    UPDATE public.challenge_participants
      SET score = GREATEST(0, COALESCE(score,0) - 2)
      WHERE challenge_id = r.challenge_id AND user_id = r.assignee_user_id;
    UPDATE public.community_assignments SET penalty_applied = true WHERE id = r.id;
    cnt := cnt + 1;
  END LOOP;
  RETURN cnt;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$ BEGIN PERFORM cron.unschedule('apply-community-penalties');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('apply-community-penalties', '5 0 * * *',
  $$ SELECT public.apply_community_penalties(); $$);
