
REVOKE EXECUTE ON FUNCTION public.add_challenge_score(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_post_published() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_post_interactions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_score_change_when_closed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.close_expired_challenges() FROM PUBLIC, anon, authenticated;
-- register_daily_login MUST stay callable by signed-in users
GRANT EXECUTE ON FUNCTION public.register_daily_login() TO authenticated;
