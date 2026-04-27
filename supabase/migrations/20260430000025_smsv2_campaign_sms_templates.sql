-- ============================================================================
-- SMSV2 / CRM — Per-campaign SMS templates (PR 62, Hugo 2026-04-27)
--
-- Why:
--   PR 56 added per-campaign overrides for AI prompts, coach facts,
--   glossary, agents, numbers + call_script_id pin. SMS templates
--   were left workspace-only because Hugo hadn't asked yet. Now he
--   has — every campaign should be able to maintain its own template
--   library without polluting the workspace pool.
--
-- Cascade fallback: a campaign sees workspace templates as inherited;
-- adding/editing inside a campaign creates a campaign-specific row in
-- wk_campaign_sms_templates that overrides the workspace one when
-- their `name` matches.
-- ============================================================================

CREATE TABLE IF NOT EXISTS wk_campaign_sms_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   uuid NOT NULL REFERENCES wk_dialer_campaigns(id) ON DELETE CASCADE,
  name          text NOT NULL,
  body_md       text NOT NULL,
  merge_fields  jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, name)
);

CREATE INDEX IF NOT EXISTS wk_campaign_sms_templates_lookup_idx
  ON wk_campaign_sms_templates (campaign_id, name);

ALTER TABLE wk_campaign_sms_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wk_campaign_sms_templates_read ON wk_campaign_sms_templates;
CREATE POLICY wk_campaign_sms_templates_read ON wk_campaign_sms_templates
  FOR SELECT TO authenticated USING (wk_is_agent_or_admin());

DROP POLICY IF EXISTS wk_campaign_sms_templates_write ON wk_campaign_sms_templates;
CREATE POLICY wk_campaign_sms_templates_write ON wk_campaign_sms_templates
  FOR ALL TO authenticated
  USING (wk_is_admin()) WITH CHECK (wk_is_admin());

-- Realtime publication so the Settings UI live-updates.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'wk_campaign_sms_templates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE wk_campaign_sms_templates;
  END IF;
END $$;
ALTER TABLE wk_campaign_sms_templates REPLICA IDENTITY FULL;

-- Update wk_duplicate_campaign to include SMS templates in the bundle copy.
CREATE OR REPLACE FUNCTION wk_duplicate_campaign(
  p_source_id uuid,
  p_new_name  text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id uuid;
BEGIN
  IF NOT wk_is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  INSERT INTO wk_dialer_campaigns (
    name, pipeline_id, parallel_lines, auto_advance_seconds,
    ai_coach_enabled, ai_coach_prompt_id, script_md,
    default_outcome_column_id, call_script_id, is_active
  )
  SELECT
    p_new_name, pipeline_id, parallel_lines, auto_advance_seconds,
    ai_coach_enabled, ai_coach_prompt_id, script_md,
    default_outcome_column_id, call_script_id, is_active
  FROM wk_dialer_campaigns
  WHERE id = p_source_id
  RETURNING id INTO v_new_id;

  IF v_new_id IS NULL THEN
    RAISE EXCEPTION 'Source campaign % not found', p_source_id;
  END IF;

  INSERT INTO wk_campaign_ai_settings
    (campaign_id, coach_style_prompt, coach_script_prompt, live_coach_model, postcall_model)
  SELECT v_new_id, coach_style_prompt, coach_script_prompt, live_coach_model, postcall_model
  FROM wk_campaign_ai_settings WHERE campaign_id = p_source_id;

  INSERT INTO wk_campaign_facts
    (campaign_id, key, label, value, keywords, sort_order, is_active, category)
  SELECT v_new_id, key, label, value, keywords, sort_order, is_active, category
  FROM wk_campaign_facts WHERE campaign_id = p_source_id;

  INSERT INTO wk_campaign_terminologies
    (campaign_id, term, short_gist, definition_md, category, sort_order, is_active)
  SELECT v_new_id, term, short_gist, definition_md, category, sort_order, is_active
  FROM wk_campaign_terminologies WHERE campaign_id = p_source_id;

  INSERT INTO wk_campaign_agents (campaign_id, agent_id, role)
  SELECT v_new_id, agent_id, role
  FROM wk_campaign_agents WHERE campaign_id = p_source_id;

  INSERT INTO wk_campaign_numbers (campaign_id, number_id, priority)
  SELECT v_new_id, number_id, priority
  FROM wk_campaign_numbers WHERE campaign_id = p_source_id;

  -- PR 62: also copy per-campaign SMS templates.
  INSERT INTO wk_campaign_sms_templates (campaign_id, name, body_md, merge_fields)
  SELECT v_new_id, name, body_md, merge_fields
  FROM wk_campaign_sms_templates WHERE campaign_id = p_source_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION wk_duplicate_campaign(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wk_duplicate_campaign(uuid, text) TO authenticated, service_role;
