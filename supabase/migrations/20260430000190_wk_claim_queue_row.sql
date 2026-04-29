-- ============================================================================
-- wk_claim_queue_row: claim a SPECIFIC queue row by ID
--
-- The picker was using wk_pick_next_lead (which picks its own top row
-- from the DB), but the ORDER BY in the RPC didn't always match the
-- PostgREST ORDER BY the panel used — different rows at position #1.
--
-- New approach: the client reads the queue with the SAME Supabase
-- client query the panel uses (identical filters + order), picks the
-- top row, then calls this RPC to atomically claim it. Ordering is
-- guaranteed to match because it's the same query.
--
-- SECURITY DEFINER because agents have no UPDATE policy on
-- wk_dialer_queue (RLS blocks client-side UPDATEs).
-- ============================================================================

CREATE OR REPLACE FUNCTION wk_claim_queue_row(
  p_queue_id  uuid,
  p_agent_id  uuid
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
  UPDATE wk_dialer_queue q
     SET status   = 'dialing',
         agent_id = p_agent_id,
         attempts = q.attempts + 1
   WHERE q.id = p_queue_id
     AND q.status = 'pending'
   RETURNING q.id, q.contact_id, q.campaign_id, q.attempts;
END;
$$;

REVOKE ALL ON FUNCTION wk_claim_queue_row(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wk_claim_queue_row(uuid, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION wk_claim_queue_row IS
  'Claims a specific wk_dialer_queue row by ID. Sets status=dialing, assigns agent, increments attempts. Returns nothing if the row is not pending (already claimed). SECURITY DEFINER to bypass RLS.';
