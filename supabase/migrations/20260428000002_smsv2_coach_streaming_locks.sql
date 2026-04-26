-- ============================================================================
-- SMSV2 — streaming coach: per-call lock + generation_id + status
--
-- Why:
--   Hugo's 2026-04-28 spec for the streaming PR. Three additions:
--     1. Generation version per call so later streams supersede earlier
--        ones cleanly.
--     2. Hard stop when a newer generation lands — old streamers see
--        their placeholder gone and bail.
--     3. Per-call pessimistic lock so stateless edge invocations don't
--        race two streams writing to the same call.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. wk_live_coach_locks — per-call lock holding the active generation_id
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS wk_live_coach_locks (
  call_id        uuid PRIMARY KEY REFERENCES wk_calls(id) ON DELETE CASCADE,
  generation_id  uuid NOT NULL,
  started_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL DEFAULT (now() + interval '8 seconds')
);

ALTER TABLE wk_live_coach_locks ENABLE ROW LEVEL SECURITY;

-- Service role only — clients never read/write this table directly.
DROP POLICY IF EXISTS wk_live_coach_locks_service_only ON wk_live_coach_locks;
CREATE POLICY wk_live_coach_locks_service_only ON wk_live_coach_locks
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- ----------------------------------------------------------------------------
-- 2. wk_live_coach_events.generation_id + status
--
--   - generation_id: tags the row with the streaming attempt that
--     produced it. Used to filter stale rows on UPDATE-by-id and to
--     clean up superseded placeholders.
--   - status: 'streaming' (placeholder, body filling), 'final' (post-
--     processed, kept), 'rejected' (post-processor dropped it),
--     'superseded' (a newer generation took over).
--   New rows from older edge fn versions default to 'final' so legacy
--   inserts continue to behave as before.
-- ----------------------------------------------------------------------------

ALTER TABLE wk_live_coach_events
  ADD COLUMN IF NOT EXISTS generation_id uuid,
  ADD COLUMN IF NOT EXISTS status        text NOT NULL DEFAULT 'final'
    CHECK (status IN ('streaming', 'final', 'rejected', 'superseded'));

CREATE INDEX IF NOT EXISTS wk_live_coach_events_call_status_idx
  ON wk_live_coach_events (call_id, status);

-- ----------------------------------------------------------------------------
-- 3. wk_acquire_coach_lock(call_id, gen_id, force, min_age_ms)
--
--   Returns gen_id if this caller wins the lock, NULL otherwise.
--
--   Rules:
--     - No existing lock OR existing expired → win immediately.
--     - Existing active lock + force=true   → supersede (Final=true case).
--     - Existing active lock + force=false  →
--         - if started_at within last min_age_ms ms → debounce, return NULL.
--         - else → supersede.
--
--   Default min_age_ms = 400 (Hugo's interim debounce).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION wk_acquire_coach_lock(
  p_call_id     uuid,
  p_gen_id      uuid,
  p_force       boolean,
  p_min_age_ms  integer DEFAULT 400
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing wk_live_coach_locks%ROWTYPE;
BEGIN
  SELECT * INTO v_existing FROM wk_live_coach_locks WHERE call_id = p_call_id;

  IF NOT FOUND THEN
    INSERT INTO wk_live_coach_locks (call_id, generation_id, started_at, expires_at)
    VALUES (p_call_id, p_gen_id, now(), now() + interval '8 seconds');
    RETURN p_gen_id;
  END IF;

  -- Expired lock — replace.
  IF v_existing.expires_at <= now() THEN
    UPDATE wk_live_coach_locks
       SET generation_id = p_gen_id, started_at = now(), expires_at = now() + interval '8 seconds'
     WHERE call_id = p_call_id;
    RETURN p_gen_id;
  END IF;

  -- Active lock + force → supersede.
  IF p_force THEN
    UPDATE wk_live_coach_locks
       SET generation_id = p_gen_id, started_at = now(), expires_at = now() + interval '8 seconds'
     WHERE call_id = p_call_id;
    RETURN p_gen_id;
  END IF;

  -- Active lock + interim trigger — debounce on min_age_ms.
  IF v_existing.started_at > now() - (p_min_age_ms::text || ' milliseconds')::interval THEN
    RETURN NULL;
  END IF;

  -- Active lock past debounce window — supersede.
  UPDATE wk_live_coach_locks
     SET generation_id = p_gen_id, started_at = now(), expires_at = now() + interval '8 seconds'
   WHERE call_id = p_call_id;
  RETURN p_gen_id;
END $$;

REVOKE ALL ON FUNCTION wk_acquire_coach_lock(uuid, uuid, boolean, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wk_acquire_coach_lock(uuid, uuid, boolean, integer) TO service_role;

-- ----------------------------------------------------------------------------
-- 4. Mark prior streaming rows as superseded helper
--
--   Called when a new generation wins the lock — flips any stale
--   'streaming' rows for the same call to 'superseded' so old streamers
--   notice via their UPDATE-by-id returning zero rows.
--
--   We DELETE rather than UPDATE: cleaner client-side (DELETE realtime
--   event removes the placeholder card from the UI in one step).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION wk_supersede_streaming_coach(
  p_call_id     uuid,
  p_keep_gen_id uuid
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH d AS (
    DELETE FROM wk_live_coach_events
     WHERE call_id = p_call_id
       AND status = 'streaming'
       AND (generation_id IS NULL OR generation_id <> p_keep_gen_id)
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM d;
  RETURN v_count;
END $$;

REVOKE ALL ON FUNCTION wk_supersede_streaming_coach(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wk_supersede_streaming_coach(uuid, uuid) TO service_role;
