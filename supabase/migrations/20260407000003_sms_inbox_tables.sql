-- SMS Inbox Module — Phase 2 Database Tables
-- All tables prefixed sms_* to isolate from marketplace tables
-- RLS enabled on all tables, admin-only for v1

-- ============================================================
-- 1. sms_pipeline_stages — kanban column definitions
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  colour text NOT NULL DEFAULT '#1E9A80',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sms_pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_pipeline_stages_admin" ON sms_pipeline_stages
  FOR ALL USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  ) WITH CHECK (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

-- Seed default stages
INSERT INTO sms_pipeline_stages (name, position, colour) VALUES
  ('New', 0, '#1E9A80'),
  ('Contacted', 1, '#F59E0B'),
  ('Waiting', 2, '#6B7280'),
  ('Hot Lead', 3, '#EF4444'),
  ('Closed', 4, '#9CA3AF');

-- ============================================================
-- 2. sms_labels — canonical label definitions
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  colour text NOT NULL DEFAULT '#1E9A80',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sms_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_labels_admin" ON sms_labels
  FOR ALL USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  ) WITH CHECK (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

-- Seed default labels
INSERT INTO sms_labels (name, colour, position) VALUES
  ('VIP', '#1E9A80', 0),
  ('Hot Lead', '#EF4444', 1),
  ('Follow Up', '#F59E0B', 2),
  ('New', '#6B7280', 3),
  ('Booked', '#1E9A80', 4),
  ('No Reply', '#9CA3AF', 5);

-- ============================================================
-- 3. sms_numbers — connected Twilio phone numbers
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  twilio_sid text NOT NULL,
  phone_number text NOT NULL,
  label text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  webhook_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sms_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_numbers_admin" ON sms_numbers
  FOR ALL USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  ) WITH CHECK (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

-- Seed Hugo's Twilio number
INSERT INTO sms_numbers (twilio_sid, phone_number, label, is_default, webhook_url) VALUES
  ('PN97458554bdb49120783d133ef2102a81', '+447380308316', 'Main UK', true,
   'https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/sms-webhook-incoming');

-- ============================================================
-- 4. sms_contacts — people we message
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL UNIQUE,
  display_name text,
  notes text DEFAULT '',
  pipeline_stage_id uuid REFERENCES sms_pipeline_stages(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  external_id uuid, -- future link to marketplace profiles, no FK
  opted_out boolean NOT NULL DEFAULT false,
  batch_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sms_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_contacts_admin" ON sms_contacts
  FOR ALL USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  ) WITH CHECK (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

-- ============================================================
-- 5. sms_contact_labels — many-to-many join
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_contact_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES sms_contacts(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES sms_labels(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contact_id, label_id)
);

ALTER TABLE sms_contact_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_contact_labels_admin" ON sms_contact_labels
  FOR ALL USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  ) WITH CHECK (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

-- ============================================================
-- 6. sms_conversations — one per contact+number pair
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES sms_contacts(id) ON DELETE CASCADE,
  number_id uuid NOT NULL REFERENCES sms_numbers(id) ON DELETE CASCADE,
  last_message_at timestamptz,
  last_message_preview text DEFAULT '',
  unread_count integer NOT NULL DEFAULT 0,
  is_archived boolean NOT NULL DEFAULT false,
  is_locked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contact_id, number_id)
);

ALTER TABLE sms_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_conversations_admin" ON sms_conversations
  FOR ALL USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  ) WITH CHECK (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

-- ============================================================
-- 7. sms_messages — every SMS sent or received
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  twilio_sid text UNIQUE, -- idempotency key
  from_number text NOT NULL,
  to_number text NOT NULL,
  body text NOT NULL DEFAULT '',
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('scheduled', 'queued', 'sent', 'delivered', 'undelivered', 'failed', 'received')),
  media_urls text[] DEFAULT '{}',
  number_id uuid REFERENCES sms_numbers(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES sms_contacts(id) ON DELETE SET NULL,
  campaign_id uuid, -- FK added after sms_campaigns is created
  error_code text,
  error_message text,
  scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_messages_admin" ON sms_messages
  FOR ALL USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  ) WITH CHECK (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

-- Index for fast conversation lookups
CREATE INDEX idx_sms_messages_contact_created ON sms_messages(contact_id, created_at DESC);
CREATE INDEX idx_sms_messages_twilio_sid ON sms_messages(twilio_sid) WHERE twilio_sid IS NOT NULL;

-- ============================================================
-- 8. sms_internal_notes — team notes on conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES sms_conversations(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sms_internal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_internal_notes_admin" ON sms_internal_notes
  FOR ALL USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  ) WITH CHECK (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

-- ============================================================
-- 9. sms_templates — reusable message templates
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  body text NOT NULL,
  category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_templates_admin" ON sms_templates
  FOR ALL USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  ) WITH CHECK (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

-- ============================================================
-- 10. sms_automations — flow definitions
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  flow_json jsonb, -- React Flow serialized state
  trigger_type text NOT NULL CHECK (trigger_type IN ('new_message', 'keyword', 'time_based')),
  trigger_config jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT false,
  last_run_at timestamptz,
  run_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sms_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_automations_admin" ON sms_automations
  FOR ALL USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  ) WITH CHECK (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

-- ============================================================
-- 11. sms_automation_runs — execution log + loop guard
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES sms_automations(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES sms_conversations(id) ON DELETE CASCADE,
  message_id uuid REFERENCES sms_messages(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'loop_blocked')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sms_automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_automation_runs_admin" ON sms_automation_runs
  FOR ALL USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  ) WITH CHECK (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

-- ============================================================
-- 12. sms_automation_step_runs — per-node execution log
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_automation_step_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES sms_automation_runs(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  node_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  input_data jsonb,
  output_data jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sms_automation_step_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_automation_step_runs_admin" ON sms_automation_step_runs
  FOR ALL USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  ) WITH CHECK (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

-- ============================================================
-- 13. sms_scheduled_tasks — delay nodes + scheduled messages
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_scheduled_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('delay_node', 'scheduled_message', 'scheduled_campaign')),
  reference_id uuid NOT NULL,
  node_id text,
  execute_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sms_scheduled_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_scheduled_tasks_admin" ON sms_scheduled_tasks
  FOR ALL USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  ) WITH CHECK (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

-- Index for cron polling
CREATE INDEX idx_sms_scheduled_tasks_pending ON sms_scheduled_tasks(execute_at)
  WHERE status = 'pending';

-- ============================================================
-- 14. sms_campaigns — bulk send campaigns
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  batch_name text,
  message_body text NOT NULL DEFAULT '',
  number_ids uuid[] DEFAULT '{}',
  rotation boolean NOT NULL DEFAULT false,
  include_opt_out boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'complete', 'cancelled')),
  scheduled_at timestamptz,
  total_recipients integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  delivered_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sms_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_campaigns_admin" ON sms_campaigns
  FOR ALL USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  ) WITH CHECK (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

-- Now add FK from sms_messages to sms_campaigns
ALTER TABLE sms_messages
  ADD CONSTRAINT fk_sms_messages_campaign
  FOREIGN KEY (campaign_id) REFERENCES sms_campaigns(id) ON DELETE SET NULL;

-- ============================================================
-- 15. sms_campaign_recipients — per-recipient tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES sms_campaigns(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES sms_contacts(id) ON DELETE CASCADE,
  message_id uuid REFERENCES sms_messages(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'skipped_opt_out')),
  sent_at timestamptz
);

ALTER TABLE sms_campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_campaign_recipients_admin" ON sms_campaign_recipients
  FOR ALL USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  ) WITH CHECK (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

-- ============================================================
-- 16. sms_opt_outs — numbers that texted STOP
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_opt_outs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL UNIQUE,
  reason text NOT NULL DEFAULT 'keyword_stop' CHECK (reason IN ('user_requested', 'keyword_stop')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sms_opt_outs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_opt_outs_admin" ON sms_opt_outs
  FOR ALL USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  ) WITH CHECK (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

-- ============================================================
-- 17. sms_quick_replies — one-click reply shortcuts
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  body text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sms_quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_quick_replies_admin" ON sms_quick_replies
  FOR ALL USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  ) WITH CHECK (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

-- Seed default quick replies
INSERT INTO sms_quick_replies (label, body, position) VALUES
  ('Thanks', 'Thanks, I''ll get back to you shortly.', 0),
  ('Available', 'The property is still available. Would you like to arrange a viewing?', 1),
  ('Viewing', 'When would you like to view the property?', 2),
  ('Details', 'I''ll send you the full details now.', 3),
  ('Interest', 'Thanks for your interest! Let me check availability and get back to you.', 4);

-- ============================================================
-- Enable Supabase Realtime for inbox-critical tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE sms_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE sms_conversations;
