-- ============================================================================
-- SMSV2 / CRM — Dialer three-strikes-and-out + loser-leg ordering (PR 54)
-- Hugo 2026-04-27 evening on /crm/dialer.
--
-- Today: when a parallel-dial winner picks up, the losing legs are
-- rolled back to wk_dialer_queue.status='pending' with NO change to
-- attempts or priority. Result: wk_pick_next_lead picks the SAME
-- contact again on the next burst because nothing changed in the
-- ordering.
--
-- Hugo's rule: 3 strikes per number, then mark LOST.
--
-- This migration ships:
--
--   1. Patch wk_pick_next_lead to SKIP rows with attempts >= 3 so
--      a contact who's failed 3 times is permanently out of the
--      pool until an admin manually requeues them.
--
--   2. New RPC wk_dialer_strike_losers(p_campaign_id, p_contact_ids[])
--      that wk-voice-status calls when the winner orchestration
--      fires. For each loser contact it:
--        - if attempts >= 3 → status='lost' + writes a wk_activities
--          row of kind='note' titled "Auto-lost after 3 attempts"
--        - else            → status='pending', priority decremented
--          (push to BACK of the queue — wk_pick_next_lead orders
--          by priority DESC).
-- ============================================================================

-- ─── Part 1: skip lost rows in the picker ─────────────────────────────────
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
       -- PR 54: three-strikes rule.
       AND q.attempts < 3
       AND (p_campaign_id IS NULL OR q.campaign_id = p_campaign_id)
       AND (q.scheduled_for IS NULL OR q.scheduled_for <= now())
     ORDER BY q.priority DESC NULLS LAST, q.scheduled_for ASC NULLS FIRST, q.attempts ASC
     LIMIT 1
     FOR UPDATE SKIP LOCKED
  )
  UPDATE wk_dialer_queue q
     SET status = 'dialing',
         agent_id = p_agent_id,
         attempts = q.attempts + 1
   FROM picked p
   WHERE q.id = p.id
   RETURNING q.id, q.contact_id, q.campaign_id, q.attempts;
END;
$$;

-- ─── Part 2: strike losers RPC ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION wk_dialer_strike_losers(
  p_campaign_id uuid,
  p_contact_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lost_count integer := 0;
  v_row RECORD;
BEGIN
  -- We expect attempts to ALREADY be incremented because the row went
  -- through wk_pick_next_lead before the loser was hung up. So if
  -- attempts is already 3, this loss takes the contact OUT.
  FOR v_row IN
    SELECT id, contact_id, attempts, priority
      FROM wk_dialer_queue
     WHERE campaign_id = p_campaign_id
       AND contact_id = ANY(p_contact_ids)
       AND status = 'dialing'
  LOOP
    IF v_row.attempts >= 3 THEN
      UPDATE wk_dialer_queue
         SET status   = 'lost',
             agent_id = NULL
       WHERE id = v_row.id;

      -- Audit + activity feed.
      INSERT INTO wk_activities (contact_id, agent_id, kind, title, body, ts)
      VALUES (
        v_row.contact_id,
        NULL,
        'note',
        'Auto-lost after 3 attempts',
        'Three parallel-dial losses in a row. Number marked lost; manually requeue from /crm/contacts if needed.',
        now()
      );

      v_lost_count := v_lost_count + 1;
    ELSE
      -- Push to BACK of queue: lower priority = later pick (order is
      -- priority DESC). Using -attempts as the decrement so 2nd-try
      -- contacts get bumped behind 1st-try ones.
      UPDATE wk_dialer_queue
         SET status   = 'pending',
             agent_id = NULL,
             priority = COALESCE(priority, 0) - v_row.attempts
       WHERE id = v_row.id;
    END IF;
  END LOOP;

  RETURN v_lost_count;
END;
$$;

REVOKE ALL ON FUNCTION wk_dialer_strike_losers(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wk_dialer_strike_losers(uuid, uuid[]) TO authenticated, service_role;

COMMENT ON FUNCTION wk_dialer_strike_losers IS
  'PR 54 (Hugo 2026-04-27): called by wk-voice-status winner orchestration. For each loser contact in a parallel dial, either marks LOST (3 strikes) or pushes to back of queue. Returns count of contacts marked lost.';
