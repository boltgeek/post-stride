DROP FUNCTION IF EXISTS public.get_my_community_assignments_today(uuid);

CREATE OR REPLACE FUNCTION public.get_my_community_assignments_today(_challenge_id uuid)
 RETURNS TABLE(id uuid, slot_time text, facebook_url text, owner_user_id uuid, owner_name text, completed_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
  SELECT ca.id, ca.slot_time, cp.facebook_url, ca.owner_user_id,
         COALESCE(us.display_name, 'Vendeuse'), ca.completed_at, ca.created_at
  FROM public.community_assignments ca
  JOIN public.community_posts cp ON cp.id = ca.community_post_id
  LEFT JOIN public.user_stats us ON us.user_id = ca.owner_user_id
  WHERE ca.assignee_user_id = uid AND ca.challenge_id = _challenge_id
    AND ca.assignment_date = CURRENT_DATE
  ORDER BY ca.created_at DESC;
END;
$function$;