-- ============================================================================
-- SMSV2 — Phase 1 schema foundation
-- Sandbox calling + CRM workspace. ALL tables prefixed wk_*.
-- Production sms_* tables are NOT touched.
-- Default spend cap policy: NULL = unlimited (admin sets per-agent caps later).
-- Recording retention: 90 days (enforced by purge job, not at schema level).
-- ============================================================================

-- ============================================================================
-- 0. profiles ALTER — workspace fields (CORE_CHANGE, approved 2026-04-25)
-- ============================================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS workspace_role text
    CHECK (workspace_role IN ('admin', 'agent', 'viewer')),
  ADD COLUMN IF NOT EXISTS agent_extension text UNIQUE,
  ADD COLUMN IF NOT EXISTS agent_status text DEFAULT 'offline'
    CHECK (agent_status IN ('offline', 'available', 'busy', 'idle', 'on_call')),
  ADD COLUMN IF NOT EXISTS agent_status_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS default_caller_id_number_id uuid;

CREATE INDEX IF NOT EXISTS profiles_workspace_role_idx ON profiles (workspace_role)
  WHERE workspace_role IS NOT NULL;

-- ============================================================================
-- Helper: who is admin?
-- Reuses the same hardcoded admin emails as src/hooks/useAuth.ts
-- ============================================================================
CREATE OR REPLACE FUNCTION wk_is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT (auth.jwt() ->> 'email') IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND workspace_role = 'admin'
      );
$$;

CREATE OR REPLACE FUNCTION wk_is_agent_or_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT wk_is_admin()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND workspace_role IN ('agent', 'admin')
      );
$$;

-- ============================================================================
-- 1. wk_pipelines + wk_pipeline_columns + wk_pipeline_automations
-- Outcome buttons = pipeline columns. No hardcoded dispositions.
-- ============================================================================
CREATE TABLE IF NOT EXISTS wk_pipelines (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  scope        text NOT NULL DEFAULT 'workspace',
  is_active    boolean NOT NULL DEFAULT true,
  created_by   uuid REFERENCES profiles(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wk_pipeline_columns (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id              uuid NOT NULL REFERENCES wk_pipelines(id) ON DELETE CASCADE,
  name                     text NOT NULL,
  colour                   text NOT NULL DEFAULT '#1E9A80',
  icon                     text,
  position                 integer NOT NULL,           -- 1-9 = keyboard shortcut
  sort_order               integer NOT NULL DEFAULT 0,
  is_default_on_timeout    boolean NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pipeline_id, position)
);
CREATE INDEX IF NOT EXISTS wk_pipeline_columns_pipeline_idx
  ON wk_pipeline_columns (pipeline_id, sort_order);

CREATE TABLE IF NOT EXISTS wk_pipeline_automations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id             uuid NOT NULL UNIQUE REFERENCES wk_pipeline_columns(id) ON DELETE CASCADE,
  send_sms              boolean NOT NULL DEFAULT false,
  sms_template_id       uuid,                                  -- FK added below after wk_sms_templates exists
  create_task           boolean NOT NULL DEFAULT false,
  task_title            text,
  task_due_in_hours     integer,
  retry_dial            boolean NOT NULL DEFAULT false,
  retry_in_hours        integer,
  add_tag               boolean NOT NULL DEFAULT false,
  tag                   text,
  move_to_pipeline_id   uuid REFERENCES wk_pipelines(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. wk_sms_templates
-- ============================================================================
CREATE TABLE IF NOT EXISTS wk_sms_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  body_md         text NOT NULL,
  merge_fields    jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by      uuid REFERENCES profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE wk_pipeline_automations
  ADD CONSTRAINT wk_pipeline_automations_sms_template_fk
  FOREIGN KEY (sms_template_id) REFERENCES wk_sms_templates(id) ON DELETE SET NULL;

-- ============================================================================
-- 3. wk_call_scripts
-- ============================================================================
CREATE TABLE IF NOT EXISTS wk_call_scripts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  body_md      text NOT NULL,
  created_by   uuid REFERENCES profiles(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. wk_numbers — Twilio numbers, capabilities, rotation
-- ============================================================================
CREATE TABLE IF NOT EXISTS wk_numbers (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  e164                          text NOT NULL UNIQUE,
  twilio_sid                    text UNIQUE,
  voice_enabled                 boolean NOT NULL DEFAULT false,
  sms_enabled                   boolean NOT NULL DEFAULT true,
  recording_enabled             boolean NOT NULL DEFAULT true,
  voicemail_greeting_url        text,
  assigned_agent_id             uuid REFERENCES profiles(id),
  rotation_pool_id              uuid,
  max_calls_per_minute          integer NOT NULL DEFAULT 30,
  cooldown_seconds_after_call   integer NOT NULL DEFAULT 0,
  last_used_at                  timestamptz,
  created_at                    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wk_numbers_pool_idx
  ON wk_numbers (rotation_pool_id, last_used_at NULLS FIRST)
  WHERE rotation_pool_id IS NOT NULL;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_default_caller_id_number_fk
  FOREIGN KEY (default_caller_id_number_id) REFERENCES wk_numbers(id) ON DELETE SET NULL;

-- ============================================================================
-- 5. wk_contacts (sandbox CRM contacts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wk_contacts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  phone                 text NOT NULL,
  email                 text,
  owner_agent_id        uuid REFERENCES profiles(id),
  pipeline_column_id    uuid REFERENCES wk_pipeline_columns(id),
  deal_value_pence      integer,
  is_hot                boolean NOT NULL DEFAULT false,
  custom_fields         jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_contact_at       timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS wk_contacts_phone_uniq ON wk_contacts (phone);
CREATE INDEX IF NOT EXISTS wk_contacts_owner_idx ON wk_contacts (owner_agent_id);
CREATE INDEX IF NOT EXISTS wk_contacts_column_idx ON wk_contacts (pipeline_column_id);
CREATE INDEX IF NOT EXISTS wk_contacts_hot_idx ON wk_contacts (is_hot) WHERE is_hot = true;

CREATE TABLE IF NOT EXISTS wk_contact_tags (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id   uuid NOT NULL REFERENCES wk_contacts(id) ON DELETE CASCADE,
  tag          text NOT NULL,
  added_by     uuid REFERENCES profiles(id),
  added_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id, tag)
);

-- ============================================================================
-- 6. wk_dialer_campaigns + wk_dialer_queue
-- ============================================================================
CREATE TABLE IF NOT EXISTS wk_dialer_campaigns (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                          text NOT NULL,
  pipeline_id                   uuid REFERENCES wk_pipelines(id),
  script_md                     text,
  ai_coach_enabled              boolean NOT NULL DEFAULT false,
  ai_coach_prompt_id            uuid,
  parallel_lines                integer NOT NULL DEFAULT 1
    CHECK (parallel_lines BETWEEN 1 AND 5),
  auto_advance_seconds          integer NOT NULL DEFAULT 10
    CHECK (auto_advance_seconds BETWEEN 5 AND 30),
  default_outcome_column_id     uuid REFERENCES wk_pipeline_columns(id),
  created_by                    uuid REFERENCES profiles(id),
  is_active                     boolean NOT NULL DEFAULT true,
  created_at                    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wk_dialer_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid NOT NULL REFERENCES wk_dialer_campaigns(id) ON DELETE CASCADE,
  contact_id      uuid NOT NULL REFERENCES wk_contacts(id) ON DELETE CASCADE,
  agent_id        uuid REFERENCES profiles(id),
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'dialing', 'connected', 'voicemail', 'missed', 'done', 'skipped')),
  priority        integer NOT NULL DEFAULT 0,
  attempts        integer NOT NULL DEFAULT 0,
  scheduled_for   timestamptz,
  last_attempt_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, contact_id)
);
CREATE INDEX IF NOT EXISTS wk_dialer_queue_pick_idx
  ON wk_dialer_queue (campaign_id, status, priority DESC, scheduled_for NULLS FIRST, attempts ASC)
  WHERE status = 'pending';

-- ============================================================================
-- 7. wk_lead_queues + wk_lead_assignments (round-robin / pull / manual)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wk_lead_queues (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  mode          text NOT NULL CHECK (mode IN ('round_robin', 'pull', 'manual')),
  campaign_id   uuid REFERENCES wk_dialer_campaigns(id) ON DELETE SET NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wk_lead_assignments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id    uuid NOT NULL REFERENCES wk_contacts(id) ON DELETE CASCADE,
  queue_id      uuid REFERENCES wk_lead_queues(id) ON DELETE SET NULL,
  campaign_id   uuid REFERENCES wk_dialer_campaigns(id) ON DELETE SET NULL,
  agent_id      uuid REFERENCES profiles(id),
  status        text NOT NULL DEFAULT 'unassigned'
    CHECK (status IN ('unassigned', 'assigned', 'in_progress', 'done')),
  assigned_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wk_lead_assignments_contact_idx
  ON wk_lead_assignments (contact_id, status);

-- Trigger: every wk_contacts row must have an owner_agent_id OR an active queue assignment.
CREATE OR REPLACE FUNCTION wk_contacts_orphan_check() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.owner_agent_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM wk_lead_assignments
    WHERE contact_id = NEW.id
      AND status IN ('unassigned', 'assigned', 'in_progress')
  ) THEN
    RETURN NEW;
  END IF;
  -- INSERTs are allowed without assignment if ownership is going to be set immediately;
  -- enforce only on UPDATE that nulls owner without producing an assignment.
  IF TG_OP = 'UPDATE' AND OLD.owner_agent_id IS NOT NULL AND NEW.owner_agent_id IS NULL THEN
    RAISE EXCEPTION 'wk_contacts orphan: contact % has no owner_agent_id and no active queue assignment', NEW.id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS wk_contacts_orphan_check_trg ON wk_contacts;
CREATE TRIGGER wk_contacts_orphan_check_trg
  AFTER INSERT OR UPDATE OF owner_agent_id ON wk_contacts
  FOR EACH ROW EXECUTE FUNCTION wk_contacts_orphan_check();

-- ============================================================================
-- 8. wk_calls + wk_recordings + wk_transcripts + wk_call_intelligence
-- ============================================================================
CREATE TABLE IF NOT EXISTS wk_calls (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  twilio_call_sid          text UNIQUE,
  twilio_parent_call_sid   text,
  contact_id               uuid REFERENCES wk_contacts(id) ON DELETE SET NULL,
  agent_id                 uuid REFERENCES profiles(id),
  campaign_id              uuid REFERENCES wk_dialer_campaigns(id) ON DELETE SET NULL,
  number_id                uuid REFERENCES wk_numbers(id) ON DELETE SET NULL,
  direction                text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status                   text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'ringing', 'in_progress', 'completed', 'busy',
                       'no_answer', 'failed', 'canceled', 'missed', 'voicemail')),
  answered_by              text CHECK (answered_by IN ('human', 'machine', NULL)),
  started_at               timestamptz,
  answered_at              timestamptz,
  ended_at                 timestamptz,
  duration_sec             integer,
  disposition_column_id    uuid REFERENCES wk_pipeline_columns(id),
  agent_note               text,
  ai_coach_enabled         boolean NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wk_calls_agent_idx ON wk_calls (agent_id, started_at DESC);
CREATE INDEX IF NOT EXISTS wk_calls_contact_idx ON wk_calls (contact_id, started_at DESC);
CREATE INDEX IF NOT EXISTS wk_calls_status_idx ON wk_calls (status);

CREATE TABLE IF NOT EXISTS wk_recordings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id             uuid NOT NULL REFERENCES wk_calls(id) ON DELETE CASCADE,
  twilio_sid          text UNIQUE,
  storage_path        text,             -- supabase storage path inside call-recordings bucket
  duration_sec        integer,
  size_bytes          bigint,
  status              text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'uploading', 'ready', 'failed')),
  retention_until     timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wk_transcripts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id      uuid NOT NULL REFERENCES wk_calls(id) ON DELETE CASCADE,
  source       text NOT NULL CHECK (source IN ('whisper', 'deepgram', 'manual')),
  body         text NOT NULL,
  segments     jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wk_call_intelligence (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id            uuid NOT NULL UNIQUE REFERENCES wk_calls(id) ON DELETE CASCADE,
  summary            text,
  sentiment          text CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
  talk_ratio         numeric(4,3),     -- 0.000 .. 1.000 = agent share
  objections         jsonb,
  next_steps         jsonb,
  llm_model          text,
  cost_pence         integer,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 9. wk_live_transcripts + wk_live_coach_events
-- ============================================================================
CREATE TABLE IF NOT EXISTS wk_live_transcripts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id      uuid NOT NULL REFERENCES wk_calls(id) ON DELETE CASCADE,
  speaker      text NOT NULL CHECK (speaker IN ('agent', 'caller', 'unknown')),
  body         text NOT NULL,
  ts           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wk_live_transcripts_call_idx
  ON wk_live_transcripts (call_id, ts);

CREATE TABLE IF NOT EXISTS wk_live_coach_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id      uuid NOT NULL REFERENCES wk_calls(id) ON DELETE CASCADE,
  kind         text NOT NULL CHECK (kind IN ('objection', 'suggestion', 'question', 'metric', 'warning')),
  title        text,
  body         text,
  meta         jsonb,
  ts           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wk_live_coach_events_call_idx
  ON wk_live_coach_events (call_id, ts);

-- ============================================================================
-- 10. wk_voicemails
-- ============================================================================
CREATE TABLE IF NOT EXISTS wk_voicemails (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id         uuid REFERENCES wk_calls(id) ON DELETE SET NULL,
  contact_id      uuid REFERENCES wk_contacts(id) ON DELETE SET NULL,
  recording_id    uuid REFERENCES wk_recordings(id) ON DELETE SET NULL,
  transcript      text,
  duration_sec    integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 11. wk_activities (unified timeline)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wk_activities (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id   uuid REFERENCES wk_contacts(id) ON DELETE CASCADE,
  agent_id     uuid REFERENCES profiles(id),
  call_id      uuid REFERENCES wk_calls(id) ON DELETE SET NULL,
  kind         text NOT NULL CHECK (kind IN (
                  'call_inbound', 'call_outbound', 'call_missed',
                  'sms_inbound', 'sms_outbound', 'voicemail',
                  'stage_moved', 'tag_added', 'tag_removed',
                  'note_added', 'task_created', 'task_completed',
                  'outcome_applied'
                )),
  title        text NOT NULL,
  body         text,
  meta         jsonb,
  ts           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wk_activities_contact_idx
  ON wk_activities (contact_id, ts DESC);

-- ============================================================================
-- 12. wk_tasks
-- ============================================================================
CREATE TABLE IF NOT EXISTS wk_tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      uuid REFERENCES wk_contacts(id) ON DELETE CASCADE,
  assignee_id     uuid REFERENCES profiles(id),
  title           text NOT NULL,
  body            text,
  due_at          timestamptz,
  status          text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'done', 'cancelled')),
  created_by      uuid REFERENCES profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);
CREATE INDEX IF NOT EXISTS wk_tasks_assignee_idx
  ON wk_tasks (assignee_id, status, due_at);

-- ============================================================================
-- 13. wk_voice_agent_limits + wk_voice_call_costs (spend control)
-- daily_limit_pence NULL = unlimited (default policy approved 2026-04-25)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wk_voice_agent_limits (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id                 uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  daily_limit_pence        integer,
  daily_spend_pence        integer NOT NULL DEFAULT 0,
  spend_reset_at           timestamptz NOT NULL DEFAULT date_trunc('day', now()),
  is_admin                 boolean NOT NULL DEFAULT false,
  block_outbound           boolean NOT NULL DEFAULT false,
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wk_voice_call_costs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id             uuid NOT NULL UNIQUE REFERENCES wk_calls(id) ON DELETE CASCADE,
  carrier_cost_pence  integer NOT NULL DEFAULT 0,
  ai_cost_pence       integer NOT NULL DEFAULT 0,
  total_pence         integer GENERATED ALWAYS AS (carrier_cost_pence + ai_cost_pence) STORED,
  computed_at         timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 14. wk_killswitches
-- ============================================================================
CREATE TABLE IF NOT EXISTS wk_killswitches (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            text NOT NULL CHECK (kind IN (
                    'all_dialers', 'agent_dialer', 'ai_coach', 'outbound'
                  )),
  scope_agent_id  uuid REFERENCES profiles(id) ON DELETE CASCADE,
  is_active       boolean NOT NULL DEFAULT true,
  reason          text,
  created_by      uuid REFERENCES profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  cleared_at      timestamptz
);
CREATE INDEX IF NOT EXISTS wk_killswitches_active_idx
  ON wk_killswitches (kind, scope_agent_id) WHERE is_active = true;

-- ============================================================================
-- 15. wk_audit_log
-- ============================================================================
CREATE TABLE IF NOT EXISTS wk_audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid REFERENCES profiles(id),
  action       text NOT NULL,
  entity_type  text NOT NULL,
  entity_id    uuid,
  meta         jsonb,
  ts           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wk_audit_log_entity_idx
  ON wk_audit_log (entity_type, entity_id, ts DESC);

-- ============================================================================
-- 16. wk_webhook_outbox + wk_jobs (async work / retry)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wk_webhook_outbox (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_kind        text NOT NULL,
  payload           jsonb NOT NULL,
  attempts          integer NOT NULL DEFAULT 0,
  last_attempt_at   timestamptz,
  status            text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'done', 'dead')),
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wk_webhook_outbox_pick_idx
  ON wk_webhook_outbox (status, created_at) WHERE status IN ('pending', 'processing');

CREATE TABLE IF NOT EXISTS wk_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'done', 'failed', 'dead')),
  attempts        integer NOT NULL DEFAULT 0,
  scheduled_for   timestamptz NOT NULL DEFAULT now(),
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wk_jobs_pick_idx
  ON wk_jobs (status, scheduled_for) WHERE status = 'pending';

-- ============================================================================
-- updated_at triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION wk_set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'wk_pipeline_automations', 'wk_sms_templates', 'wk_call_scripts',
      'wk_contacts', 'wk_voice_agent_limits', 'wk_jobs'
    ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I_set_updated_at ON %I; ' ||
      'CREATE TRIGGER %I_set_updated_at BEFORE UPDATE ON %I ' ||
      'FOR EACH ROW EXECUTE FUNCTION wk_set_updated_at();',
      t, t, t, t
    );
  END LOOP;
END $$;

-- ============================================================================
-- 17. RLS — admins always allowed; agents see own rows; viewers read-only
-- ============================================================================
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'wk_pipelines', 'wk_pipeline_columns', 'wk_pipeline_automations',
      'wk_sms_templates', 'wk_call_scripts', 'wk_numbers',
      'wk_contacts', 'wk_contact_tags',
      'wk_dialer_campaigns', 'wk_dialer_queue',
      'wk_lead_queues', 'wk_lead_assignments',
      'wk_calls', 'wk_recordings', 'wk_transcripts', 'wk_call_intelligence',
      'wk_live_transcripts', 'wk_live_coach_events',
      'wk_voicemails', 'wk_activities', 'wk_tasks',
      'wk_voice_agent_limits', 'wk_voice_call_costs',
      'wk_killswitches', 'wk_audit_log',
      'wk_webhook_outbox', 'wk_jobs'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;

-- Admin-everything policies (one per table). Edge functions use service role and bypass RLS.
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'wk_pipelines', 'wk_pipeline_columns', 'wk_pipeline_automations',
      'wk_sms_templates', 'wk_call_scripts', 'wk_numbers',
      'wk_contact_tags', 'wk_dialer_campaigns', 'wk_dialer_queue',
      'wk_lead_queues', 'wk_lead_assignments',
      'wk_recordings', 'wk_transcripts', 'wk_call_intelligence',
      'wk_live_transcripts', 'wk_live_coach_events',
      'wk_voicemails', 'wk_tasks', 'wk_voice_agent_limits',
      'wk_voice_call_costs', 'wk_killswitches', 'wk_audit_log',
      'wk_webhook_outbox', 'wk_jobs'
    ])
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I_admin_all ON %I; ' ||
      'CREATE POLICY %I_admin_all ON %I FOR ALL TO authenticated ' ||
      'USING (wk_is_admin()) WITH CHECK (wk_is_admin());',
      t, t, t, t
    );
  END LOOP;
END $$;

-- Read access for agents on shared reference data
CREATE POLICY wk_pipelines_agent_read ON wk_pipelines
  FOR SELECT TO authenticated USING (wk_is_agent_or_admin());
CREATE POLICY wk_pipeline_columns_agent_read ON wk_pipeline_columns
  FOR SELECT TO authenticated USING (wk_is_agent_or_admin());
CREATE POLICY wk_pipeline_automations_agent_read ON wk_pipeline_automations
  FOR SELECT TO authenticated USING (wk_is_agent_or_admin());
CREATE POLICY wk_sms_templates_agent_read ON wk_sms_templates
  FOR SELECT TO authenticated USING (wk_is_agent_or_admin());
CREATE POLICY wk_call_scripts_agent_read ON wk_call_scripts
  FOR SELECT TO authenticated USING (wk_is_agent_or_admin());
CREATE POLICY wk_numbers_agent_read ON wk_numbers
  FOR SELECT TO authenticated USING (wk_is_agent_or_admin());
CREATE POLICY wk_dialer_campaigns_agent_read ON wk_dialer_campaigns
  FOR SELECT TO authenticated USING (wk_is_agent_or_admin());

-- Per-agent scoped tables
CREATE POLICY wk_contacts_agent_rw ON wk_contacts
  FOR ALL TO authenticated
  USING (
    wk_is_admin() OR owner_agent_id = auth.uid() OR EXISTS (
      SELECT 1 FROM wk_lead_assignments la
      WHERE la.contact_id = wk_contacts.id
        AND la.agent_id = auth.uid()
        AND la.status IN ('assigned', 'in_progress')
    )
  )
  WITH CHECK (
    wk_is_admin() OR owner_agent_id = auth.uid()
  );

CREATE POLICY wk_calls_agent_rw ON wk_calls
  FOR ALL TO authenticated
  USING (wk_is_admin() OR agent_id = auth.uid())
  WITH CHECK (wk_is_admin() OR agent_id = auth.uid());

CREATE POLICY wk_activities_agent_rw ON wk_activities
  FOR ALL TO authenticated
  USING (
    wk_is_admin() OR agent_id = auth.uid() OR EXISTS (
      SELECT 1 FROM wk_contacts c
      WHERE c.id = wk_activities.contact_id AND c.owner_agent_id = auth.uid()
    )
  )
  WITH CHECK (
    wk_is_admin() OR agent_id = auth.uid()
  );

CREATE POLICY wk_voice_agent_limits_self_read ON wk_voice_agent_limits
  FOR SELECT TO authenticated
  USING (wk_is_admin() OR agent_id = auth.uid());

-- ============================================================================
-- 18. Seed: default workspace pipeline + columns + automations
-- Columns: Interested / Callback / No pickup / Not interested / Voicemail / Wrong number
-- ============================================================================
DO $$
DECLARE
  pipeline_id uuid;
  col_interested uuid;
  col_callback uuid;
  col_nopickup uuid;
  col_notint uuid;
  col_voicemail uuid;
  col_wrong uuid;
BEGIN
  -- Only seed if no pipeline exists yet
  IF NOT EXISTS (SELECT 1 FROM wk_pipelines) THEN
    INSERT INTO wk_pipelines (name, scope) VALUES ('Default workspace pipeline', 'workspace')
      RETURNING id INTO pipeline_id;

    INSERT INTO wk_pipeline_columns (pipeline_id, name, colour, position, sort_order, is_default_on_timeout)
      VALUES (pipeline_id, 'Interested',     '#1E9A80', 1, 1, false) RETURNING id INTO col_interested;
    INSERT INTO wk_pipeline_columns (pipeline_id, name, colour, position, sort_order)
      VALUES (pipeline_id, 'Callback',       '#F59E0B', 2, 2) RETURNING id INTO col_callback;
    INSERT INTO wk_pipeline_columns (pipeline_id, name, colour, position, sort_order, is_default_on_timeout)
      VALUES (pipeline_id, 'No pickup',      '#6B7280', 3, 3, true) RETURNING id INTO col_nopickup;
    INSERT INTO wk_pipeline_columns (pipeline_id, name, colour, position, sort_order)
      VALUES (pipeline_id, 'Not interested', '#EF4444', 4, 4) RETURNING id INTO col_notint;
    INSERT INTO wk_pipeline_columns (pipeline_id, name, colour, position, sort_order)
      VALUES (pipeline_id, 'Voicemail',      '#9CA3AF', 5, 5) RETURNING id INTO col_voicemail;
    INSERT INTO wk_pipeline_columns (pipeline_id, name, colour, position, sort_order)
      VALUES (pipeline_id, 'Wrong number',   '#737373', 6, 6) RETURNING id INTO col_wrong;

    INSERT INTO wk_pipeline_automations (column_id, send_sms, create_task, task_title, task_due_in_hours, add_tag, tag) VALUES
      (col_interested, true,  true,  'Send rent guide', 24, true, 'interested'),
      (col_callback,   true,  true,  'Call back',        2, false, NULL);
    INSERT INTO wk_pipeline_automations (column_id, send_sms, retry_dial, retry_in_hours) VALUES
      (col_nopickup,   true,  true, 2);
    INSERT INTO wk_pipeline_automations (column_id, add_tag, tag) VALUES
      (col_notint,     true, 'not_interested'),
      (col_wrong,      true, 'wrong_number');
    INSERT INTO wk_pipeline_automations (column_id) VALUES (col_voicemail);
  END IF;
END $$;

-- ============================================================================
-- 19. Daily spend reset (pg_cron)
-- ============================================================================
-- Runs at 00:00 UTC every day. Requires pg_cron extension.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('wk-spend-daily-reset')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'wk-spend-daily-reset');
    PERFORM cron.schedule(
      'wk-spend-daily-reset',
      '0 0 * * *',
      $cron$ UPDATE wk_voice_agent_limits
              SET daily_spend_pence = 0,
                  spend_reset_at = now(),
                  block_outbound = false
              WHERE daily_spend_pence > 0 OR block_outbound = true; $cron$
    );
  END IF;
END $$;

-- ============================================================================
-- DONE — Phase 1 schema applied.
-- Next: storage bucket call-recordings is created in a separate migration
--       (storage schema lives in the storage namespace and is best handled
--        via the Supabase dashboard or a dedicated migration).
-- ============================================================================
