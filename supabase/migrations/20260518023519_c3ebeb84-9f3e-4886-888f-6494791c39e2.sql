
CREATE OR REPLACE FUNCTION public.get_display_names(_user_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT us.user_id, us.display_name
  FROM public.user_stats us
  WHERE us.user_id = ANY(_user_ids);
$$;

UPDATE public.challenge_participants cp
SET prenom = us.display_name
FROM public.user_stats us
WHERE cp.user_id = us.user_id
  AND (cp.prenom IS NULL OR cp.prenom = '')
  AND us.display_name IS NOT NULL;
