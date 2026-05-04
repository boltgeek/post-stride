
ALTER TABLE public.user_stats
  ADD COLUMN IF NOT EXISTS publish_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS display_name text;

-- Backfill display_name from auth.users email
UPDATE public.user_stats us
SET display_name = COALESCE(us.display_name, split_part(u.email, '@', 1))
FROM auth.users u
WHERE us.user_id = u.id AND us.display_name IS NULL;

-- Update handle_new_user to set display_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_stats (user_id, display_name)
  VALUES (NEW.id, split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$;

-- Leaderboard function: returns top 10 + caller rank
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (
  user_id uuid,
  display_name text,
  publish_count integer,
  rank integer,
  is_current_user boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT
      us.user_id,
      COALESCE(us.display_name, 'Vendeuse') AS display_name,
      us.publish_count,
      RANK() OVER (ORDER BY us.publish_count DESC, us.user_id)::int AS rank
    FROM public.user_stats us
  )
  SELECT user_id, display_name, publish_count, rank,
         (user_id = auth.uid()) AS is_current_user
  FROM ranked
  WHERE rank <= 10 OR user_id = auth.uid()
  ORDER BY rank;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated, anon;
