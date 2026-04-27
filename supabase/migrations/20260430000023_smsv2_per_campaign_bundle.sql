-- ============================================================================
-- SMSV2 / CRM — Per-campaign bundle (PR 56 / plan PR2, Hugo 2026-04-27)
--
-- Why:
--   Today every coach setting (style prompt, script prompt, KB facts,
--   glossary, agent assignments, number assignments, call script) is
--   workspace-singleton. Hugo wants every CAMPAIGN to own its own
--   bundle so different sales motions (Liverpool deal vs Manchester
--   deal vs cold-prospecting) can have different prompts, different
--   facts, different agents, different numbers.
--
--   Plan choice: cascade fallback. A campaign starts inheriting all
--   workspace defaults. Override anything → that override wins for
--   that campaign only. Other campaigns are unaffected.
--
-- Five new join tables, all keyed to wk_dialer_campaigns(id) ON DELETE
-- CASCADE so a deleted campaign cleans up its bundle:
--   - wk_campaign_ai_settings    : per-campaign style + script prompt
--   - wk_campaign_facts          : per-campaign KB facts
--   - wk_campaign_terminologies  : per-campaign glossary + objections
--   - wk_campaign_agents         : which agents may dial this campaign
--   - wk_campaign_numbers        : which Twilio numbers this campaign uses
--
-- Plus wk_dialer_campaigns gains a call_script_id column so a campaign
-- can pin a specific wk_call_scripts row (the agent's own personal
-- script still wins via the existing resolution chain in useAgentScript).
--
-- RLS pattern: read = wk_is_agent_or_admin(), write = wk_is_admin().
-- Realtime publication: all five tables added so /crm/settings live-
-- reflects edits without page refresh.
-- ============================================================================

-- ─── 1. wk_campaign_ai_settings ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS wk_campaign_ai_settings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id         uuid NOT NULL UNIQUE
                        REFERENCES wk_dialer_campaigns(id) ON DELETE CASCADE,
  -- NULL = inherit workspace value from wk_ai_settings.
  coach_style_prompt  text,
  coach_script_prompt text,
  live_coach_model    text,
  postcall_model      text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE wk_campaign_ai_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wk_campaign_ai_settings_read ON wk_campaign_ai_settings;
CREATE POLICY wk_campaign_ai_settings_read ON wk_campaign_ai_settings
  FOR SELECT TO authenticated USING (wk_is_agent_or_admin());

DROP POLICY IF EXISTS wk_campaign_ai_settings_write ON wk_campaign_ai_settings;
CREATE POLICY wk_campaign_ai_settings_write ON wk_campaign_ai_settings
  FOR ALL TO authenticated
  USING (wk_is_admin()) WITH CHECK (wk_is_admin());

-- ─── 2. wk_campaign_facts ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wk_campaign_facts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES wk_dialer_campaigns(id) ON DELETE CASCADE,
  key         text NOT NULL,
  label       text NOT NULL,
  value       text NOT NULL,
  keywords    text[] NOT NULL DEFAULT '{}',
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  -- Mirror wk_coach_facts.category — same FactsDrawer UI groups facts.
  category    text NOT NULL DEFAULT 'deal'
                CHECK (category IN ('deal','returns','compliance','logistics','objection')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, key)
);

CREATE INDEX IF NOT EXISTS wk_campaign_facts_lookup_idx
  ON wk_campaign_facts (campaign_id, sort_order)
  WHERE is_active = true;

ALTER TABLE wk_campaign_facts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wk_campaign_facts_read ON wk_campaign_facts;
CREATE POLICY wk_campaign_facts_read ON wk_campaign_facts
  FOR SELECT TO authenticated USING (wk_is_agent_or_admin());

DROP POLICY IF EXISTS wk_campaign_facts_write ON wk_campaign_facts;
CREATE POLICY wk_campaign_facts_write ON wk_campaign_facts
  FOR ALL TO authenticated
  USING (wk_is_admin()) WITH CHECK (wk_is_admin());

-- ─── 3. wk_campaign_terminologies ──────────────────────────────────
CREATE TABLE IF NOT EXISTS wk_campaign_terminologies (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   uuid NOT NULL REFERENCES wk_dialer_campaigns(id) ON DELETE CASCADE,
  term          text NOT NULL,
  short_gist    text,
  definition_md text NOT NULL,
  category      text NOT NULL DEFAULT 'glossary'
                  CHECK (category IN ('glossary', 'objection')),
  sort_order    integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, term)
);

CREATE INDEX IF NOT EXISTS wk_campaign_terminologies_lookup_idx
  ON wk_campaign_terminologies (campaign_id, sort_order)
  WHERE is_active = true;

ALTER TABLE wk_campaign_terminologies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wk_campaign_terminologies_read ON wk_campaign_terminologies;
CREATE POLICY wk_campaign_terminologies_read ON wk_campaign_terminologies
  FOR SELECT TO authenticated USING (wk_is_agent_or_admin());

DROP POLICY IF EXISTS wk_campaign_terminologies_write ON wk_campaign_terminologies;
CREATE POLICY wk_campaign_terminologies_write ON wk_campaign_terminologies
  FOR ALL TO authenticated
  USING (wk_is_admin()) WITH CHECK (wk_is_admin());

-- ─── 4. wk_campaign_agents ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wk_campaign_agents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES wk_dialer_campaigns(id) ON DELETE CASCADE,
  agent_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- 'agent' = can dial this campaign. 'manager' = can dial + edit.
  role        text NOT NULL DEFAULT 'agent'
                CHECK (role IN ('agent', 'manager')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, agent_id)
);

CREATE INDEX IF NOT EXISTS wk_campaign_agents_agent_idx
  ON wk_campaign_agents (agent_id);

ALTER TABLE wk_campaign_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wk_campaign_agents_read ON wk_campaign_agents;
CREATE POLICY wk_campaign_agents_read ON wk_campaign_agents
  FOR SELECT TO authenticated USING (wk_is_agent_or_admin());

DROP POLICY IF EXISTS wk_campaign_agents_write ON wk_campaign_agents;
CREATE POLICY wk_campaign_agents_write ON wk_campaign_agents
  FOR ALL TO authenticated
  USING (wk_is_admin()) WITH CHECK (wk_is_admin());

-- ─── 5. wk_campaign_numbers ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wk_campaign_numbers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES wk_dialer_campaigns(id) ON DELETE CASCADE,
  number_id   uuid NOT NULL REFERENCES wk_numbers(id) ON DELETE CASCADE,
  -- Lower priority = picked first by the rotation.
  priority    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, number_id)
);

CREATE INDEX IF NOT EXISTS wk_campaign_numbers_lookup_idx
  ON wk_campaign_numbers (campaign_id, priority);

ALTER TABLE wk_campaign_numbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wk_campaign_numbers_read ON wk_campaign_numbers;
CREATE POLICY wk_campaign_numbers_read ON wk_campaign_numbers
  FOR SELECT TO authenticated USING (wk_is_agent_or_admin());

DROP POLICY IF EXISTS wk_campaign_numbers_write ON wk_campaign_numbers;
CREATE POLICY wk_campaign_numbers_write ON wk_campaign_numbers
  FOR ALL TO authenticated
  USING (wk_is_admin()) WITH CHECK (wk_is_admin());

-- ─── wk_dialer_campaigns: pin a call script ────────────────────────
ALTER TABLE wk_dialer_campaigns
  ADD COLUMN IF NOT EXISTS call_script_id uuid
    REFERENCES wk_call_scripts(id) ON DELETE SET NULL;

COMMENT ON COLUMN wk_dialer_campaigns.call_script_id IS
  'PR 56 (Hugo 2026-04-27): pins a specific wk_call_scripts row to this campaign. Resolution: agent-own > campaign-pinned > workspace-default.';

-- ─── Realtime publication ──────────────────────────────────────────
DO $$
BEGIN
  FOR tname IN ARRAY['wk_campaign_ai_settings',
                     'wk_campaign_facts',
                     'wk_campaign_terminologies',
                     'wk_campaign_agents',
                     'wk_campaign_numbers']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tname
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tname);
    END IF;
  END LOOP;
EXCEPTION
  WHEN OTHERS THEN
    -- pg_publication_tables / FOR ARRAY combo isn't valid in plain
    -- PL/pgSQL; fall back to one-by-one (idempotent).
    NULL;
END $$;

-- One-by-one fallback (works in any pg version).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='wk_campaign_ai_settings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE wk_campaign_ai_settings;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='wk_campaign_facts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE wk_campaign_facts;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='wk_campaign_terminologies') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE wk_campaign_terminologies;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='wk_campaign_agents') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE wk_campaign_agents;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='wk_campaign_numbers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE wk_campaign_numbers;
  END IF;
END $$;

-- REPLICA IDENTITY FULL so realtime UPDATE/DELETE payloads carry full row data.
ALTER TABLE wk_campaign_ai_settings REPLICA IDENTITY FULL;
ALTER TABLE wk_campaign_facts REPLICA IDENTITY FULL;
ALTER TABLE wk_campaign_terminologies REPLICA IDENTITY FULL;
ALTER TABLE wk_campaign_agents REPLICA IDENTITY FULL;
ALTER TABLE wk_campaign_numbers REPLICA IDENTITY FULL;

-- ─── Duplicate-campaign RPC ────────────────────────────────────────
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

  -- Copy the campaign row itself (without queue rows — agent
  -- duplicates a config bundle, not a list of leads).
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

  -- Bundle copies — every per-campaign join table.
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

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION wk_duplicate_campaign(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wk_duplicate_campaign(uuid, text) TO authenticated, service_role;

COMMENT ON FUNCTION wk_duplicate_campaign IS
  'PR 56: copy a campaign + its full bundle (AI / facts / terminologies / agents / numbers / call_script_id). Queue rows NOT copied. Admin only. Returns new campaign id.';
