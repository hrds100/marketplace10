-- ============================================================================
-- SMSV2 / CRM — wk_pick_next_lead: filter by agent_id (match panel exactly)
--
-- Bug: the picker RPC had no agent_id filter, so it picked the top
-- pending row across the WHOLE queue — including rows assigned to
-- OTHER agents. Meanwhile the upcoming-queue panel filters by
-- `agent_id = current_agent OR agent_id IS NULL` (only shows rows
-- assigned to me or unassigned). The two queries returned different
-- rows because they were asking different questions: panel said
-- "next is X" (X is in MY queue), RPC said "next is Y" (Y is in
-- some other agent's queue). Hugo flagged this as Skip & Next
-- dialing numbers that weren't in his visible queue.
--
-- Fix: add `(q.agent_id = p_agent_id OR q.agent_id IS NULL)` to the
-- WHERE clause so the RPC sees the same rows the panel does. Admins
-- effectively pick from "their assigned + unassigned" rather than
-- the whole queue, which is acceptable (admin can reassign rows
-- through the contacts page if they want to dial something specific).
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
       AND (q.agent_id = p_agent_id OR q.agent_id IS NULL)
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
  'Picks the top pending row from wk_dialer_queue and atomically claims it for the agent. WHERE clause matches the upcoming-queue panel: status=pending, scheduled, and agent_id IN (caller, NULL). ORDER BY: priority DESC, scheduled_for ASC NULLS FIRST, attempts ASC, created_at ASC. The picker now picks exactly what the panel shows at position 1.';
