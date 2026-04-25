-- ============================================================================
-- /smsv2 — Recording retention cleanup (pg_cron)
-- ============================================================================
-- The Phase 1 schema (20260425_smsv2_phase1_schema.sql) sets
-- wk_recordings.retention_until = now() + 90 days but never enforces it.
-- This migration:
--   1. Adds a SECURITY DEFINER helper that deletes the storage object AND
--      the wk_recordings row for every record past retention.
--   2. Schedules the helper to run daily at 02:30 UTC via pg_cron.
--
-- Calls themselves (wk_calls) keep their metadata. Only the WAV blob and
-- the recording row are removed. AI summary in wk_call_intelligence is
-- text-only and stays.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- wk_purge_expired_recordings() — sweep + delete.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION wk_purge_expired_recordings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  removed integer := 0;
BEGIN
  FOR rec IN
    SELECT id, storage_path
      FROM wk_recordings
     WHERE retention_until IS NOT NULL
       AND retention_until < now()
       AND status = 'ready'
     LIMIT 500
  LOOP
    -- Best-effort: drop the storage object first, then the row. If the
    -- storage call fails (file already missing, etc.) we still remove the
    -- DB row so the sweep makes progress.
    BEGIN
      IF rec.storage_path IS NOT NULL THEN
        DELETE FROM storage.objects
         WHERE bucket_id = 'call-recordings'
           AND name = rec.storage_path;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- swallow and continue
      NULL;
    END;

    DELETE FROM wk_recordings WHERE id = rec.id;
    removed := removed + 1;
  END LOOP;

  RETURN removed;
END;
$$;

REVOKE ALL ON FUNCTION wk_purge_expired_recordings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wk_purge_expired_recordings() TO service_role;

-- ----------------------------------------------------------------------------
-- pg_cron schedule: daily at 02:30 UTC (low-traffic window for UK ops).
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('wk-recordings-retention')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'wk-recordings-retention');
    PERFORM cron.schedule(
      'wk-recordings-retention',
      '30 2 * * *',
      $cron$ SELECT wk_purge_expired_recordings(); $cron$
    );
  END IF;
END $$;
