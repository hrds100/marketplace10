-- ============================================================================
-- SMSV2 — Admin write policy on wk_dialer_campaigns + queue revert helper
-- (PR 23, Hugo 2026-04-27)
--
-- Why:
--   Pause / Stop buttons in /smsv2/dialer were React-only stubs — they
--   set local state but never told the server to halt. wk-dialer-start
--   already gates on `campaign.is_active`, but no UI / RPC could flip
--   it false. Add an admin UPDATE policy so the front-end can toggle
--   is_active directly from the dialer page.
--
--   Stop (vs Pause) also needs to free up any queue rows that are
--   stuck in 'dialing' from the killed batch so they aren't lost.
--   New RPC wk_dialer_revert_inflight does that atomically.
-- ============================================================================

-- 1. Admin UPDATE policy on wk_dialer_campaigns
--    (Agents already have SELECT via wk_dialer_campaigns_agent_read.)

DROP POLICY IF EXISTS wk_dialer_campaigns_admin_write ON wk_dialer_campaigns;
CREATE POLICY wk_dialer_campaigns_admin_write ON wk_dialer_campaigns
  FOR ALL TO authenticated
  USING (wk_is_admin())
  WITH CHECK (wk_is_admin());

-- 2. RPC: revert in-flight queue rows back to pending for a campaign.
--    Called by the Stop button so that contacts whose dial leg was
--    cancelled mid-ring become re-pickable on the next Start.

CREATE OR REPLACE FUNCTION wk_dialer_revert_inflight(p_campaign_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reverted integer;
BEGIN
  IF NOT wk_is_admin() THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;
  WITH updated AS (
    UPDATE wk_dialer_queue
       SET status   = 'pending',
           agent_id = NULL
     WHERE campaign_id = p_campaign_id
       AND status = 'dialing'
     RETURNING id
  )
  SELECT count(*) INTO reverted FROM updated;
  RETURN reverted;
END;
$$;

REVOKE ALL ON FUNCTION wk_dialer_revert_inflight(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wk_dialer_revert_inflight(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION wk_dialer_revert_inflight IS
  'Revert all in-flight (status=dialing) queue rows for a campaign back to pending. Called by the Stop button so cancelled-mid-ring contacts re-enter the pool. Admin-only.';
