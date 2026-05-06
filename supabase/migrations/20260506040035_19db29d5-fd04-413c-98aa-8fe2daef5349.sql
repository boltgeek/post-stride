
-- Fix 1: Don't leak email prefix as display_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_stats (user_id, display_name)
  VALUES (NEW.id, 'Vendeuse');
  RETURN NEW;
END;
$function$;

-- Backfill existing display_names that look like email prefixes (anything not 'Vendeuse')
UPDATE public.user_stats SET display_name = 'Vendeuse' WHERE display_name IS NULL OR display_name <> 'Vendeuse';

-- Fix 2: Lock down SECURITY DEFINER functions — revoke from anon, allow only authenticated
REVOKE EXECUTE ON FUNCTION public.get_leaderboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.increment_copy_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_copy_count() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Fix 3: Remove user_stats from realtime publication to prevent cross-user channel leakage.
-- Analytics page already polls every 15s, so realtime isn't required.
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_stats;
