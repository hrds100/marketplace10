-- ============================================================================
-- SMSV2 — Stale call sweeper (PR 38, Hugo 2026-04-27)
--
-- Why:
--   Calls stuck in 'queued' / 'ringing' / 'in_progress' clutter the
--   dashboard's Live activity feed forever. PR 31 hides them in the
--   UI by filtering started_at >= now() - 60min, but the underlying
--   rows stay wrong and break the "Calls today" count + reports +
--   spend math.
--
--   Real cause: Twilio's status callback didn't land (signature
--   mismatch, function downtime, network blip, agent closed browser
--   mid-call). This migration:
--     1. Adds wk_sweep_stale_calls() that flips abandoned rows to
--        'failed' with ended_at = now() if started_at < now() - 1h.
--     2. Schedules it every 5 minutes via pg_cron.
--
--   Conservative cutoff (1 hour). Real calls rarely exceed that;
--   anything older is stuck.
-- ============================================================================

CREATE OR REPLACE FUNCTION wk_sweep_stale_calls()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  swept integer;
BEGIN
  WITH updated AS (
    UPDATE wk_calls
       SET status   = 'failed',
           ended_at = COALESCE(ended_at, now())
     WHERE status IN ('queued', 'ringing', 'in_progress')
       AND started_at < now() - interval '1 hour'
     RETURNING id
  )
  SELECT count(*) INTO swept FROM updated;
  RETURN swept;
END;
$$;

REVOKE ALL ON FUNCTION wk_sweep_stale_calls() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wk_sweep_stale_calls() TO service_role;

COMMENT ON FUNCTION wk_sweep_stale_calls IS
  'PR 38: flip wk_calls rows abandoned in queued/ringing/in_progress >1h to failed. Runs every 5 min via pg_cron.';

-- Schedule the sweeper.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('wk-sweep-stale-calls')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'wk-sweep-stale-calls');
    PERFORM cron.schedule(
      'wk-sweep-stale-calls',
      '*/5 * * * *',
      $cron$ SELECT wk_sweep_stale_calls(); $cron$
    );
  END IF;
END $$;

-- One-shot sweep on migration apply so existing stuck rows clear
-- without waiting 5 minutes for the first cron tick.
SELECT wk_sweep_stale_calls();
