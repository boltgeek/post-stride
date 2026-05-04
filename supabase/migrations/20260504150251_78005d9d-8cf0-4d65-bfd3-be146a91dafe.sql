
REVOKE EXECUTE ON FUNCTION public.get_leaderboard() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_stats;
