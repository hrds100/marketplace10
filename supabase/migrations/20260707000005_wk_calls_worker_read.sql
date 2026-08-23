-- Workers see calls in the shared inbox (Hugo 2026-07-07).
-- wk_calls_agent_rw only lets non-admins read their OWN calls
-- (agent_id = auth.uid()), so inbound calls (agent_id null) were invisible
-- to workers — admins saw them, workers didn't. Add a permissive SELECT
-- policy giving workers read access to every call, matching the shared
-- inbox (admins + workers see all; agents stay scoped to their own).
CREATE POLICY wk_calls_worker_read ON wk_calls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.workspace_role = 'worker'
    )
  );
