-- ============================================================================
-- /smsv2 — Phase 1 RLS gap: agent-scoped reads on derived voice tables
-- ============================================================================
-- The Phase 1 schema (20260425_smsv2_phase1_schema.sql) added admin-only
-- policies for wk_recordings, wk_transcripts, wk_call_intelligence,
-- wk_live_transcripts, wk_live_coach_events, wk_voicemails, wk_tasks,
-- wk_dialer_queue, wk_lead_assignments, wk_voice_call_costs, wk_contact_tags,
-- and wk_killswitches.
--
-- Without these additional policies, an `agent` role:
--   • cannot read their own recording, transcript, or AI summary
--   • cannot subscribe to their own live transcript / coach realtime
--   • cannot see their own dialer queue / lead assignments
--   • cannot read or update their own tasks
--
-- These policies are strictly additive — they do not relax admin policies
-- already in place. Each policy is scoped: an agent sees only rows tied to
-- their own user id (via wk_calls.agent_id, wk_contacts.owner_agent_id, etc.).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. wk_recordings — agent reads recordings of own calls
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS wk_recordings_agent_read ON wk_recordings;
CREATE POLICY wk_recordings_agent_read ON wk_recordings
  FOR SELECT TO authenticated
  USING (
    wk_is_admin() OR EXISTS (
      SELECT 1 FROM wk_calls c
      WHERE c.id = wk_recordings.call_id AND c.agent_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 2. wk_transcripts — agent reads transcripts of own calls
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS wk_transcripts_agent_read ON wk_transcripts;
CREATE POLICY wk_transcripts_agent_read ON wk_transcripts
  FOR SELECT TO authenticated
  USING (
    wk_is_admin() OR EXISTS (
      SELECT 1 FROM wk_calls c
      WHERE c.id = wk_transcripts.call_id AND c.agent_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 3. wk_call_intelligence — agent reads AI summary / sentiment of own calls
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS wk_call_intelligence_agent_read ON wk_call_intelligence;
CREATE POLICY wk_call_intelligence_agent_read ON wk_call_intelligence
  FOR SELECT TO authenticated
  USING (
    wk_is_admin() OR EXISTS (
      SELECT 1 FROM wk_calls c
      WHERE c.id = wk_call_intelligence.call_id AND c.agent_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 4. wk_live_transcripts — realtime feed during own calls
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS wk_live_transcripts_agent_read ON wk_live_transcripts;
CREATE POLICY wk_live_transcripts_agent_read ON wk_live_transcripts
  FOR SELECT TO authenticated
  USING (
    wk_is_admin() OR EXISTS (
      SELECT 1 FROM wk_calls c
      WHERE c.id = wk_live_transcripts.call_id AND c.agent_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 5. wk_live_coach_events — realtime coaching feed during own calls
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS wk_live_coach_events_agent_read ON wk_live_coach_events;
CREATE POLICY wk_live_coach_events_agent_read ON wk_live_coach_events
  FOR SELECT TO authenticated
  USING (
    wk_is_admin() OR EXISTS (
      SELECT 1 FROM wk_calls c
      WHERE c.id = wk_live_coach_events.call_id AND c.agent_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 6. wk_voicemails — agent reads voicemails on own contacts or own calls
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS wk_voicemails_agent_read ON wk_voicemails;
CREATE POLICY wk_voicemails_agent_read ON wk_voicemails
  FOR SELECT TO authenticated
  USING (
    wk_is_admin()
    OR EXISTS (SELECT 1 FROM wk_calls c
               WHERE c.id = wk_voicemails.call_id AND c.agent_id = auth.uid())
    OR EXISTS (SELECT 1 FROM wk_contacts ct
               WHERE ct.id = wk_voicemails.contact_id AND ct.owner_agent_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 7. wk_tasks — agent reads + updates tasks they're assigned to or created
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS wk_tasks_agent_rw ON wk_tasks;
CREATE POLICY wk_tasks_agent_rw ON wk_tasks
  FOR ALL TO authenticated
  USING (
    wk_is_admin()
    OR assignee_id = auth.uid()
    OR created_by = auth.uid()
  )
  WITH CHECK (
    wk_is_admin()
    OR assignee_id = auth.uid()
    OR created_by = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- 8. wk_dialer_queue — agent reads own queue rows (dialing, pending for them)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS wk_dialer_queue_agent_read ON wk_dialer_queue;
CREATE POLICY wk_dialer_queue_agent_read ON wk_dialer_queue
  FOR SELECT TO authenticated
  USING (
    wk_is_admin()
    OR agent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM wk_contacts c
      WHERE c.id = wk_dialer_queue.contact_id AND c.owner_agent_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 9. wk_lead_assignments — agent reads own assignments (so they see their queue)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS wk_lead_assignments_agent_read ON wk_lead_assignments;
CREATE POLICY wk_lead_assignments_agent_read ON wk_lead_assignments
  FOR SELECT TO authenticated
  USING (wk_is_admin() OR agent_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 10. wk_voice_call_costs — agent reads cost of own calls
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS wk_voice_call_costs_agent_read ON wk_voice_call_costs;
CREATE POLICY wk_voice_call_costs_agent_read ON wk_voice_call_costs
  FOR SELECT TO authenticated
  USING (
    wk_is_admin() OR EXISTS (
      SELECT 1 FROM wk_calls c
      WHERE c.id = wk_voice_call_costs.call_id AND c.agent_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 11. wk_contact_tags — agent reads/manages tags on own contacts
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS wk_contact_tags_agent_rw ON wk_contact_tags;
CREATE POLICY wk_contact_tags_agent_rw ON wk_contact_tags
  FOR ALL TO authenticated
  USING (
    wk_is_admin() OR EXISTS (
      SELECT 1 FROM wk_contacts c
      WHERE c.id = wk_contact_tags.contact_id
        AND (c.owner_agent_id = auth.uid()
             OR EXISTS (SELECT 1 FROM wk_lead_assignments la
                        WHERE la.contact_id = c.id
                          AND la.agent_id = auth.uid()
                          AND la.status IN ('assigned', 'in_progress')))
    )
  )
  WITH CHECK (
    wk_is_admin() OR EXISTS (
      SELECT 1 FROM wk_contacts c
      WHERE c.id = wk_contact_tags.contact_id
        AND c.owner_agent_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 12. wk_killswitches — agents may read switch state (so the UI can warn them).
-- They can NEVER toggle (write stays admin-only via wk_set_killswitch RPC).
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS wk_killswitches_agent_read ON wk_killswitches;
CREATE POLICY wk_killswitches_agent_read ON wk_killswitches
  FOR SELECT TO authenticated
  USING (
    wk_is_admin()
    OR scope_agent_id IS NULL                -- global switches affect everyone
    OR scope_agent_id = auth.uid()           -- agent-scoped switches for self
  );

-- ============================================================================
-- DONE — Phase 1 RLS gap closed.
-- Verification: an `agent` role user with an active call now sees their own
-- live transcript / coach feed / recording / AI summary, plus their queue,
-- tasks, and contact tags. Cross-agent isolation preserved.
-- ============================================================================
