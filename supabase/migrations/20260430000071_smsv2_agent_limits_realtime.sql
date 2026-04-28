-- 20260430000071_smsv2_agent_limits_realtime
-- PR 110 follow-on (Hugo 2026-04-28).
--
-- PR 109 added wk_voice_agent_limits.show_on_leaderboard but did not put
-- the table itself into the supabase_realtime publication. Result: toggling
-- the flag in Settings → Agents takes up to 60s to reflect on the mini
-- leaderboard widget + /crm/leaderboard (the next useReports poll).
--
-- Fix: add the table so the toggle propagates within seconds.
-- Idempotent — wraps in DO/EXCEPTION so re-applies are safe.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE wk_voice_agent_limits;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
