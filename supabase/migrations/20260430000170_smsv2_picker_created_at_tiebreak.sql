-- ============================================================================
-- SMSV2 / CRM — wk_pick_next_lead: add created_at tiebreak + drop attempts cap
--
-- Two issues with the previous form (20260430000150):
--
-- 1. ORDER BY had no `created_at` tiebreak. When many queue rows share
--    priority + scheduled_for + attempts (typical of a fresh CSV
--    import) Postgres returned one of them arbitrarily, so the picker
--    disagreed with the upcoming-queue panel (which sorts ties by
--    created_at ASC). User-visible: "Skip & next" jumped to a number
--    that wasn't at the top of the panel.
--
-- 2. `attempts < 3` cap. After enough dialing, every pending row
--    accumulated attempts >= 3 and the picker silently returned null —
--    "No leads in queue" while the panel still showed 60 pending. The
--    cap was a fail-safe against looping on broken numbers, but the
--    in-session `dialed` Set on the client already prevents same-call
--    loops, and most cross-session loops are prevented by status
--    transitions in wk_apply_outcome. If we ever want a real cap it
--    should be a status transition (mark row 'lost' after N) so the
--    panel and picker can never disagree on what's pickable.
--
-- This migration also resets attempts to 0 on all currently-pending
-- rows so the existing test data becomes pickable again.
-- ============================================================================

CREATE OR REPLACE FUNCTION wk_pick_next_lead(
  p_agent_id    uuid,
  p_campaign_id uuid DEFAULT NULL
)
RETURNS TABLE (
  queue_id    uuid,
  contact_id  uuid,
  campaign_id uuid,
  attempts    integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT id
      FROM wk_dialer_queue q
     WHERE q.status = 'pending'
       AND (p_campaign_id IS NULL OR q.campaign_id = p_campaign_id)
       AND (q.scheduled_for IS NULL OR q.scheduled_for <= now())
     ORDER BY q.priority DESC NULLS LAST,
              q.scheduled_for ASC NULLS FIRST,
              q.attempts ASC,
              q.created_at ASC
     LIMIT 1
     FOR UPDATE SKIP LOCKED
  )
  UPDATE wk_dialer_queue q
     SET status   = 'dialing',
         agent_id = p_agent_id,
         attempts = q.attempts + 1
   FROM picked p
   WHERE q.id = p.id
   RETURNING q.id, q.contact_id, q.campaign_id, q.attempts;
END;
$$;

REVOKE ALL ON FUNCTION wk_pick_next_lead(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wk_pick_next_lead(uuid, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION wk_pick_next_lead IS
  'Picks the top pending row from wk_dialer_queue and atomically claims it for the agent. ORDER BY: priority DESC, scheduled_for ASC NULLS FIRST, attempts ASC, created_at ASC — matches the upcoming-queue panel exactly so Skip & Next is deterministic.';

-- One-time: reset attempts on currently-pending rows so accumulated
-- attempts from prior testing don't keep rows at the bottom of the
-- ORDER BY forever.
UPDATE wk_dialer_queue
   SET attempts = 0
 WHERE status   = 'pending'
   AND attempts > 0;
