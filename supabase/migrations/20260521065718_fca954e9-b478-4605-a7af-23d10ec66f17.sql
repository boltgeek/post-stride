CREATE OR REPLACE FUNCTION public.submit_community_post(_challenge_id uuid, _url text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid UUID := auth.uid();
  post_id UUID;
  target_count INT;
  slots TEXT[] := ARRAY['12:00','15:00','20:00'];
  pick RECORD;
  idx INT := 0;
  yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public.assign_user_to_pod(_challenge_id, uid);

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

  -- Pick from ALL other participants in the challenge (not restricted to other pods).
  -- Prefer participants who weren't assigned to this user yesterday (rotation).
  FOR pick IN
    WITH candidates AS (
      SELECT cp.user_id,
        EXISTS (SELECT 1 FROM public.community_assignments ca
                WHERE ca.owner_user_id = uid AND ca.assignee_user_id = cp.user_id
                  AND ca.assignment_date = yesterday) AS was_yesterday
      FROM public.challenge_participants cp
      WHERE cp.challenge_id = _challenge_id
        AND cp.user_id IS NOT NULL
        AND cp.user_id <> uid
        AND (cp.suspendue_jusqu_au IS NULL OR cp.suspendue_jusqu_au < now())
    )
    SELECT user_id FROM candidates ORDER BY was_yesterday ASC, random() LIMIT target_count
  LOOP
    INSERT INTO public.community_assignments
      (community_post_id, challenge_id, owner_user_id, assignee_user_id, slot_time)
    VALUES (post_id, _challenge_id, uid, pick.user_id, slots[(idx % 3) + 1]);
    idx := idx + 1;
  END LOOP;
  RETURN post_id;
END;
$function$;

-- Re-assign today's existing posts that got too few assignees due to the old bug
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT cp.id, cp.challenge_id, cp.user_id, c.interactions_per_post
    FROM public.community_posts cp
    JOIN public.challenges c ON c.id = cp.challenge_id
    WHERE cp.post_date = CURRENT_DATE
  LOOP
    IF (SELECT COUNT(*) FROM public.community_assignments WHERE community_post_id = p.id)
       < LEAST(p.interactions_per_post,
               (SELECT COUNT(*)-1 FROM public.challenge_participants
                WHERE challenge_id = p.challenge_id AND user_id IS NOT NULL)) THEN
      DELETE FROM public.community_assignments
      WHERE community_post_id = p.id AND completed_at IS NULL;
      -- Re-run assignment inline
      INSERT INTO public.community_assignments
        (community_post_id, challenge_id, owner_user_id, assignee_user_id, slot_time)
      SELECT p.id, p.challenge_id, p.user_id, sub.user_id,
             (ARRAY['12:00','15:00','20:00'])[((row_number() OVER () - 1)::int % 3) + 1]
      FROM (
        SELECT cp.user_id
        FROM public.challenge_participants cp
        WHERE cp.challenge_id = p.challenge_id
          AND cp.user_id IS NOT NULL
          AND cp.user_id <> p.user_id
        ORDER BY random()
        LIMIT p.interactions_per_post
      ) sub;
    END IF;
  END LOOP;
END $$;