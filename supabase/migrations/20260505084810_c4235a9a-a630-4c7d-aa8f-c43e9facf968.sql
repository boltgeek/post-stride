
DROP FUNCTION IF EXISTS public.get_leaderboard();

CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE(user_id uuid, display_name text, copy_count integer, publish_count integer, total_score integer, rank integer, is_current_user boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT
      us.user_id,
      COALESCE(us.display_name, 'Vendeuse') AS display_name,
      us.copy_count,
      us.publish_count,
      (us.copy_count + us.publish_count) AS total_score,
      RANK() OVER (ORDER BY (us.copy_count + us.publish_count) DESC, us.user_id)::int AS rank
    FROM public.user_stats us
  )
  SELECT user_id, display_name, copy_count, publish_count, total_score, rank,
         (user_id = auth.uid()) AS is_current_user
  FROM ranked
  WHERE rank <= 10 OR user_id = auth.uid()
  ORDER BY rank;
$$;
REVOKE ALL ON FUNCTION public.get_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;

CREATE OR REPLACE FUNCTION public.increment_copy_count()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.user_stats
  SET copy_count = copy_count + 1, updated_at = now()
  WHERE user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.increment_copy_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_copy_count() TO authenticated;
