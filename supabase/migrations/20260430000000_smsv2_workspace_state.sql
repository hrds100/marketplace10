-- ============================================================================
-- SMSV2 — guided agent workspace (Phase 1: schema)
--
-- Hugo's directive 2026-04-30: redesign the agent experience as a guided
-- workspace, NOT a prompt runner. Drop the auto-stage-advance idea
-- entirely; instead, attach a target pipeline stage to SMS templates so
-- sending the template moves the contact deterministically.
--
-- This migration is foundation only — no behaviour change yet. Phases 2+
-- wire the new columns into hooks + UI + edge fn.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Per-agent call scripts
--   Existing: wk_call_scripts (id, name, body_md, created_by, is_default).
--   New: owner_agent_id. Resolution priority in the client:
--     - row WHERE owner_agent_id = auth.uid() (the agent's own script)
--     - else row WHERE is_default = true AND owner_agent_id IS NULL
--     - else hard-coded fallback in the edge fn
-- ----------------------------------------------------------------------------

ALTER TABLE wk_call_scripts
  ADD COLUMN IF NOT EXISTS owner_agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

-- One row max per agent.
CREATE UNIQUE INDEX IF NOT EXISTS wk_call_scripts_one_per_agent
  ON wk_call_scripts (owner_agent_id) WHERE owner_agent_id IS NOT NULL;

COMMENT ON COLUMN wk_call_scripts.owner_agent_id IS
  'Per-agent script. NULL + is_default=true = global default. Resolution priority: own > default.';

-- ----------------------------------------------------------------------------
-- 2. Per-agent SMS templates + stage coupling
--   Existing: wk_sms_templates (id, name, body_md, merge_fields, created_by).
--   New:
--     - is_global: shared with all agents.
--     - owner_agent_id: agent-specific template.
--     - move_to_stage_id: when the agent picks this template and sends,
--       the contact's pipeline_column_id moves to this stage.
-- ----------------------------------------------------------------------------

ALTER TABLE wk_sms_templates
  ADD COLUMN IF NOT EXISTS is_global       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS owner_agent_id  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS move_to_stage_id uuid REFERENCES wk_pipeline_columns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS wk_sms_templates_owner_idx
  ON wk_sms_templates (owner_agent_id) WHERE owner_agent_id IS NOT NULL;

COMMENT ON COLUMN wk_sms_templates.is_global IS
  'Shared with all agents. Templates are EITHER is_global=true OR owner_agent_id is set.';
COMMENT ON COLUMN wk_sms_templates.owner_agent_id IS
  'Agent-specific template. Visible only to that agent in the dropdown.';
COMMENT ON COLUMN wk_sms_templates.move_to_stage_id IS
  'Optional: when this template is used to send, move the contact to this pipeline stage. Hugo 2026-04-30: replaces auto-stage detection from coach output.';

-- ----------------------------------------------------------------------------
-- 3. wk_coach_facts.category — group facts in the new FactsDrawer UI
-- ----------------------------------------------------------------------------

ALTER TABLE wk_coach_facts
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'deal'
    CHECK (category IN ('deal','returns','compliance','logistics','objection'));

-- Backfill the seeded facts to sensible categories (idempotent UPDATE).
UPDATE wk_coach_facts SET category = 'deal'        WHERE key IN ('partner_count','flagship_deal','deal_structure','entry_minimum','setup_cost','agreement_length');
UPDATE wk_coach_facts SET category = 'returns'     WHERE key IN ('payment_cadence','exit_path','monthly_yield');
UPDATE wk_coach_facts SET category = 'logistics'   WHERE key IN ('office_location','office_visit','property_visit','portfolio_size');
UPDATE wk_coach_facts SET category = 'compliance'  WHERE key IN ('compliance','voting');
UPDATE wk_coach_facts SET category = 'objection'   WHERE key IN ('legitimacy');

-- ----------------------------------------------------------------------------
-- 4. sms_messages.call_id — link an SMS to a call so the timeline can group
--    them. Nullable: ad-hoc SMS (not tied to a call) leave it null.
-- ----------------------------------------------------------------------------

ALTER TABLE sms_messages
  ADD COLUMN IF NOT EXISTS call_id uuid REFERENCES wk_calls(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sms_messages_call_id_idx ON sms_messages (call_id) WHERE call_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 5. wk_call_timeline — unified per-call timeline view
--    Joins transcripts + coach events + SMS + agent activities (notes,
--    stage changes via wk_activities.kind).
--    The Past-call view + the in-call timeline panel both read this.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW wk_call_timeline AS
  SELECT
    call_id,
    ts,
    'transcript'::text AS kind,
    body,
    speaker AS subtype,
    NULL::uuid AS ref_id,
    NULL::jsonb AS meta
  FROM wk_live_transcripts
  UNION ALL
  SELECT
    call_id,
    ts,
    'coach'::text AS kind,
    body,
    kind::text AS subtype,
    id AS ref_id,
    NULL::jsonb AS meta
  FROM wk_live_coach_events
  WHERE status = 'final'
  UNION ALL
  SELECT
    call_id,
    created_at AS ts,
    'sms'::text AS kind,
    body,
    direction AS subtype,
    id AS ref_id,
    jsonb_build_object('status', status, 'twilio_sid', twilio_sid) AS meta
  FROM sms_messages
  WHERE call_id IS NOT NULL
  UNION ALL
  SELECT
    call_id,
    ts,
    'activity'::text AS kind,
    body,
    kind::text AS subtype,
    id AS ref_id,
    meta
  FROM wk_activities
  WHERE call_id IS NOT NULL;

COMMENT ON VIEW wk_call_timeline IS
  'Unified per-call event stream: transcripts, coach events, SMS, agent activities. Used by the in-call timeline panel + PastCallScreen.';

-- ----------------------------------------------------------------------------
-- 6. RLS for the new columns + view
--   Existing RLS on wk_call_scripts / wk_sms_templates / wk_coach_facts /
--   sms_messages already covers the new columns. The view inherits row-
--   level security from its underlying tables (Postgres standard).
--
--   Per-agent script ownership: agents should only edit their own row.
--   Add an explicit policy.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS wk_call_scripts_agent_owns ON wk_call_scripts;
CREATE POLICY wk_call_scripts_agent_owns ON wk_call_scripts
  FOR ALL TO authenticated
  USING (
    -- Read: everyone (default + own); admin sees all.
    is_default = true
    OR owner_agent_id = auth.uid()
    OR wk_is_admin()
  )
  WITH CHECK (
    -- Write: only own row OR admin.
    owner_agent_id = auth.uid()
    OR wk_is_admin()
  );

DROP POLICY IF EXISTS wk_sms_templates_agent_owns ON wk_sms_templates;
CREATE POLICY wk_sms_templates_agent_owns ON wk_sms_templates
  FOR ALL TO authenticated
  USING (
    is_global = true
    OR owner_agent_id = auth.uid()
    OR wk_is_admin()
  )
  WITH CHECK (
    owner_agent_id = auth.uid()
    OR wk_is_admin()
  );
