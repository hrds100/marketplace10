-- 20260430000080_smsv2_live_transcripts_realtime
-- PR 114 (Hugo 2026-04-28).
--
-- LiveTranscriptPane subscribes to wk_live_transcripts + wk_live_coach_events
-- but NEITHER is in supabase_realtime publication. The subs never fire.
-- Backfill SELECT on mount works (initial load), but nothing updates as the
-- call progresses — meaning the buy-time filler chip (PR 113) never triggers
-- because it hooks into the realtime caller-utterance event.
--
-- Adding both tables now so realtime works as designed.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE wk_live_transcripts;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE wk_live_coach_events;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
