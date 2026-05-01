-- Allow agents to INSERT / UPDATE / DELETE on wk_dialer_queue.
-- Previously only wk_is_admin() had write access, which blocked
-- agents (and Hugo's hugodesouzax@gmail.com account which had
-- workspace_role='agent') from adding leads to the queue.

-- INSERT: agents can add leads to queue
DROP POLICY IF EXISTS wk_dialer_queue_agent_insert ON wk_dialer_queue;
CREATE POLICY wk_dialer_queue_agent_insert ON wk_dialer_queue
  FOR INSERT TO authenticated
  WITH CHECK (wk_is_agent_or_admin());

-- UPDATE: agents can change status, priority
DROP POLICY IF EXISTS wk_dialer_queue_agent_update ON wk_dialer_queue;
CREATE POLICY wk_dialer_queue_agent_update ON wk_dialer_queue
  FOR UPDATE TO authenticated
  USING (wk_is_agent_or_admin())
  WITH CHECK (wk_is_agent_or_admin());

-- DELETE: agents can remove leads from queue
DROP POLICY IF EXISTS wk_dialer_queue_agent_delete ON wk_dialer_queue;
CREATE POLICY wk_dialer_queue_agent_delete ON wk_dialer_queue
  FOR DELETE TO authenticated
  USING (wk_is_agent_or_admin());
