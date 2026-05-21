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
  slots TEXT[] := ARRAY['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];
  slot_count INT := array_length(slots, 1);
  pick RECORD;
  idx INT := 0;
  week_ago DATE := CURRENT_DATE - INTERVAL '7 days';
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

  -- Rotation: pick participants who supported this owner the least over the past 7 days
  FOR pick IN
    WITH candidates AS (
      SELECT cp.user_id,
        (SELECT COUNT(*) FROM public.community_assignments ca
          WHERE ca.owner_user_id = uid
            AND ca.assignee_user_id = cp.user_id
            AND ca.assignment_date >= week_ago) AS recent_count
      FROM public.challenge_participants cp
      WHERE cp.challenge_id = _challenge_id
        AND cp.user_id IS NOT NULL
        AND cp.user_id <> uid
        AND (cp.suspendue_jusqu_au IS NULL OR cp.suspendue_jusqu_au < now())
    )
    SELECT user_id FROM candidates ORDER BY recent_count ASC, random() LIMIT target_count
  LOOP
    INSERT INTO public.community_assignments
      (community_post_id, challenge_id, owner_user_id, assignee_user_id, slot_time)
    VALUES (post_id, _challenge_id, uid, pick.user_id, slots[(idx % slot_count) + 1]);
    idx := idx + 1;
  END LOOP;
  RETURN post_id;
END;
$function$;