-- Full shared inbox for agents (Hugo 2026-07-07: "all admin agent and
-- worker inbox all access"). wk_contacts had a single FOR ALL policy that
-- scoped non-admins to owned/assigned contacts, so agents still couldn't
-- read the other conversations' contacts even with the client-side change.
--
-- Add a permissive SELECT policy so any workspace member (agent/worker/admin)
-- can READ every contact. Writes stay governed by the existing
-- wk_contacts_agent_rw policy (owner/assignee/admin only) — this opens read,
-- not write.
CREATE POLICY wk_contacts_member_read ON wk_contacts
  FOR SELECT USING (wk_is_agent_or_admin());
