
-- 1. Remove publicly readable email column from challenge_participants
ALTER TABLE public.challenge_participants DROP COLUMN IF EXISTS email;

-- 2. Restrict self-update on challenge_participants (prevent score / type_compte / suspendue_jusqu_au escalation)
DROP POLICY IF EXISTS "Users can update their own participation" ON public.challenge_participants;
-- Users no longer update their own row directly; score/suspension are managed by SECURITY DEFINER functions.

-- 3. Restrict user_badges read to authenticated users only
DROP POLICY IF EXISTS "Anyone can view badges" ON public.user_badges;
CREATE POLICY "Authenticated users can view badges"
  ON public.user_badges FOR SELECT TO authenticated
  USING (true);

-- 4. Revoke EXECUTE from anon on SECURITY DEFINER functions (require authenticated)
REVOKE EXECUTE ON FUNCTION public.get_leaderboard() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_copy_count() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.close_expired_challenges() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.register_daily_login() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.remove_challenge_participant(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.on_post_interactions() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.on_post_published() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_display_names(uuid[]) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.toggle_daily_mission(uuid, boolean) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_community_assignments_today(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reset_monthly_challenge_counter() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_challenge_cascade(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_challenge_penalty(uuid, uuid, integer, text, timestamptz) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_community_penalties() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.close_challenge_now(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_assignment_done(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_challenge_score(uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_mission_history_stats() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_or_create_daily_missions() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_user_to_pod(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_community_post(uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.confirm_community_post(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard_period(text, integer, integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_community_post_today(uuid) FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_copy_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_daily_login() TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_challenge_participant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_display_names(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_daily_mission(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_community_assignments_today(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_challenge_cascade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_challenge_penalty(uuid, uuid, integer, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_challenge_now(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_assignment_done(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_mission_history_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_daily_missions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_user_to_pod(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_community_post(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_community_post(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_period(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_community_post_today(uuid) TO authenticated;

-- 5. Add RLS on realtime.messages: only authenticated users can subscribe
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can receive realtime" ON realtime.messages;
CREATE POLICY "Authenticated can receive realtime"
  ON realtime.messages FOR SELECT TO authenticated
  USING (true);
