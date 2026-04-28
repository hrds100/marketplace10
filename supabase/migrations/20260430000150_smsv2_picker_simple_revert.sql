-- ============================================================================
-- SMSV2 / CRM — revert wk_pick_next_lead to simple form (PR 125, Hugo 2026-04-28)
--
-- Bug: PR 123 added a JOIN to wk_pipeline_columns inside wk_pick_next_lead
-- so the picker would skip contacts in terminal columns. With FOR UPDATE
-- SKIP LOCKED on a multi-table CTE, Postgres tries to lock rows in EVERY
-- joined table — and skip the row if any one is locked. Net effect:
-- wk_pick_next_lead started returning 0 rows under contention, breaking
-- the dialer entirely. Toast: "Dialing 0 line(s)". Banner empty. No
-- ringback. Hugo can't dial.
--
-- Fix: revert to the pre-PR-123 form (status='pending', attempts < 3,
-- campaign + scheduled_for filters, FOR UPDATE SKIP LOCKED on the queue
-- only). Terminal-column safety still works because wk_apply_outcome
-- (PR 124) ALWAYS marks the contact's queue rows 'done' on every
-- outcome — so terminal-column contacts can't be picked anyway.
-- Defence-in-depth was double-covering the same case at the cost of
-- breaking the picker. Drop it.
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

REVOKE ALL ON FUNCTION wk_pick_next_lead(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wk_pick_next_lead(uuid, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION wk_pick_next_lead IS
  'PR 125 (Hugo 2026-04-28): simple picker. Terminal-column protection lives in wk_apply_outcome (which marks queue rows done) — picker just walks pending rows. PR 123 attempt to JOIN wk_pipeline_columns broke FOR UPDATE SKIP LOCKED.';
