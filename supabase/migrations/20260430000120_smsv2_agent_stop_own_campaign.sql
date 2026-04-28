-- ============================================================================
-- SMSV2 / CRM — agents can pause/stop their OWN campaigns
-- (PR 121, Hugo 2026-04-28)
--
-- Why:
--   PR 23 made wk_dialer_campaigns UPDATE admin-only and gated
--   wk_dialer_revert_inflight on wk_is_admin(). Agents pressing Stop
--   on /crm/dialer hit "Stop reverted partial: forbidden: admin only".
--   Pause silently no-ops (RLS blocks the UPDATE with 0 rows affected).
--
--   Agents need to halt their own dial sessions — the killswitch /
--   spend gate is upstream protection; per-agent Pause/Stop is a
--   normal dialer control. Open the policies up but scope writes to
--   campaigns where the agent is assigned (wk_campaign_agents) AND
--   queue rows the agent owns. Admins keep blanket access.
-- ============================================================================

-- 1. Replace wk_dialer_campaigns_admin_write with a wider write policy
--    that lets an agent flip is_active on any campaign they're assigned
--    to via wk_campaign_agents.

DROP POLICY IF EXISTS wk_dialer_campaigns_admin_write ON wk_dialer_campaigns;
CREATE POLICY wk_dialer_campaigns_agent_or_admin_write
  ON wk_dialer_campaigns
  FOR UPDATE TO authenticated
  USING (
    wk_is_admin()
    OR EXISTS (
      SELECT 1 FROM wk_campaign_agents a
       WHERE a.campaign_id = wk_dialer_campaigns.id
         AND a.agent_id = auth.uid()
    )
  )
  WITH CHECK (
    wk_is_admin()
    OR EXISTS (
      SELECT 1 FROM wk_campaign_agents a
       WHERE a.campaign_id = wk_dialer_campaigns.id
         AND a.agent_id = auth.uid()
    )
  );

-- INSERT + DELETE remain admin-only (campaign creation/destruction is
-- a separate, more sensitive flow).
DROP POLICY IF EXISTS wk_dialer_campaigns_admin_insert ON wk_dialer_campaigns;
CREATE POLICY wk_dialer_campaigns_admin_insert
  ON wk_dialer_campaigns
  FOR INSERT TO authenticated
  WITH CHECK (wk_is_admin());

DROP POLICY IF EXISTS wk_dialer_campaigns_admin_delete ON wk_dialer_campaigns;
CREATE POLICY wk_dialer_campaigns_admin_delete
  ON wk_dialer_campaigns
  FOR DELETE TO authenticated
  USING (wk_is_admin());

-- 2. Patch wk_dialer_revert_inflight: drop the admin-only guard. The
--    function still uses SECURITY DEFINER but now scopes the update
--    to rows owned by the calling agent UNLESS the caller is admin
--    (admins still revert ALL in-flight rows for the campaign).

CREATE OR REPLACE FUNCTION wk_dialer_revert_inflight(p_campaign_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reverted integer;
  v_caller uuid := auth.uid();
  v_is_admin boolean := wk_is_admin();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'forbidden: not authenticated';
  END IF;

  -- Non-admin agents must be assigned to this campaign before they
  -- can revert anything in it. Stops cross-agent tampering.
  IF NOT v_is_admin AND NOT EXISTS (
    SELECT 1 FROM wk_campaign_agents
     WHERE campaign_id = p_campaign_id AND agent_id = v_caller
  ) THEN
    RAISE EXCEPTION 'forbidden: agent not assigned to campaign';
  END IF;

  WITH updated AS (
    UPDATE wk_dialer_queue
       SET status   = 'pending',
           agent_id = NULL
     WHERE campaign_id = p_campaign_id
       AND status = 'dialing'
       -- Agents only revert their own in-flight rows; admins revert all.
       AND (v_is_admin OR agent_id = v_caller)
     RETURNING id
  )
  SELECT count(*) INTO reverted FROM updated;
  RETURN reverted;
END;
$$;

REVOKE ALL ON FUNCTION wk_dialer_revert_inflight(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wk_dialer_revert_inflight(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION wk_dialer_revert_inflight IS
  'PR 121 (Hugo 2026-04-28): agents can revert their OWN in-flight queue rows for campaigns they''re assigned to. Admins revert all rows. Returns count.';
