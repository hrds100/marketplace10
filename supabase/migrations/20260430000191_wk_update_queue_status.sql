-- ============================================================================
-- wk_update_queue_status: update a queue row's status (SECURITY DEFINER)
--
-- Agents have no UPDATE policy on wk_dialer_queue. The client-side
-- updateQueueStatus() was silently failing — rows stayed at 'dialing'
-- forever ("leaked rows"). This RPC bypasses RLS so agents can
-- transition queue rows to terminal statuses.
-- ============================================================================

CREATE OR REPLACE FUNCTION wk_update_queue_status(
  p_queue_id  uuid,
  p_status    text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('pending','dialing','connected','voicemail','missed','done','skipped','lost') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  UPDATE wk_dialer_queue
     SET status = p_status
   WHERE id = p_queue_id;
END;
$$;

REVOKE ALL ON FUNCTION wk_update_queue_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wk_update_queue_status(uuid, text) TO authenticated, service_role;
