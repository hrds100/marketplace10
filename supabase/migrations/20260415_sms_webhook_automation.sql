-- SMS Webhook Automation — send leads from selected pipeline stages to external webhooks
-- Creates: endpoints, settings, queue, logs tables + stage-change trigger + cron schedule
-- Admin-only RLS
-- Safe to re-run (IF NOT EXISTS guards everywhere)

-- ============================================================
-- 1. sms_webhook_endpoints — webhook destinations (e.g. WAtoolbox groups)
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  send_window_start time NOT NULL DEFAULT '08:00:00',
  send_window_end time NOT NULL DEFAULT '21:00:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sms_webhook_endpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sms_webhook_endpoints_admin" ON sms_webhook_endpoints;
CREATE POLICY "sms_webhook_endpoints_admin" ON sms_webhook_endpoints
  FOR ALL USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  ) WITH CHECK (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

-- ============================================================
-- 2. sms_webhook_settings — single-row global config
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_webhook_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT false,
  numbers_per_hour integer NOT NULL DEFAULT 10 CHECK (numbers_per_hour > 0),
  delay_seconds integer NOT NULL DEFAULT 30 CHECK (delay_seconds >= 0),
  workflow_name text NOT NULL DEFAULT 'Add to Group - NFSTAY',
  trigger_stages uuid[] NOT NULL DEFAULT '{}',
  move_to_stage_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sms_webhook_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sms_webhook_settings_admin" ON sms_webhook_settings;
CREATE POLICY "sms_webhook_settings_admin" ON sms_webhook_settings
  FOR ALL USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  ) WITH CHECK (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

-- Seed the single settings row if it doesn't exist
INSERT INTO sms_webhook_settings (enabled, numbers_per_hour, delay_seconds, workflow_name)
SELECT false, 10, 30, 'Add to Group - NFSTAY'
WHERE NOT EXISTS (SELECT 1 FROM sms_webhook_settings);

-- ============================================================
-- 3. sms_webhook_queue — FIFO queue of phone numbers awaiting dispatch
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_webhook_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES sms_contacts(id) ON DELETE CASCADE,
  phone text NOT NULL,
  stage_id uuid,
  endpoint_id uuid REFERENCES sms_webhook_endpoints(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Permanent dedupe: a phone number can only ever be queued once
-- (manual "Remove from history" action in UI deletes both queue + logs to unlock)
CREATE UNIQUE INDEX IF NOT EXISTS sms_webhook_queue_phone_unique
  ON sms_webhook_queue (phone);

CREATE INDEX IF NOT EXISTS sms_webhook_queue_status_scheduled_idx
  ON sms_webhook_queue (status, scheduled_for)
  WHERE status = 'pending';

ALTER TABLE sms_webhook_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sms_webhook_queue_admin" ON sms_webhook_queue;
CREATE POLICY "sms_webhook_queue_admin" ON sms_webhook_queue
  FOR ALL USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  ) WITH CHECK (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

-- ============================================================
-- 4. sms_webhook_logs — execution history
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid,
  endpoint_id uuid REFERENCES sms_webhook_endpoints(id) ON DELETE SET NULL,
  phone text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'failed')),
  http_status integer,
  response_body text,
  error text,
  attempt integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sms_webhook_logs_created_at_idx
  ON sms_webhook_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS sms_webhook_logs_endpoint_idx
  ON sms_webhook_logs (endpoint_id, created_at DESC);

ALTER TABLE sms_webhook_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sms_webhook_logs_admin" ON sms_webhook_logs;
CREATE POLICY "sms_webhook_logs_admin" ON sms_webhook_logs
  FOR ALL USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  ) WITH CHECK (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

-- ============================================================
-- 5. Stage-change trigger — enqueue contacts on stage transition
-- ============================================================
CREATE OR REPLACE FUNCTION sms_webhook_enqueue_on_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg RECORD;
  cleaned_phone text;
BEGIN
  -- Only react to pipeline_stage_id transitions to a non-null value
  IF NEW.pipeline_stage_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.pipeline_stage_id IS NOT DISTINCT FROM OLD.pipeline_stage_id THEN RETURN NEW; END IF;
  IF NEW.opted_out = true THEN RETURN NEW; END IF;

  SELECT enabled, trigger_stages INTO cfg FROM sms_webhook_settings LIMIT 1;
  IF cfg IS NULL OR cfg.enabled = false THEN RETURN NEW; END IF;
  IF NOT (NEW.pipeline_stage_id = ANY(cfg.trigger_stages)) THEN RETURN NEW; END IF;

  cleaned_phone := regexp_replace(NEW.phone_number, '\D', '', 'g');
  IF cleaned_phone = '' THEN RETURN NEW; END IF;

  -- Permanent dedupe: if this phone has ever been queued, skip silently
  IF EXISTS (SELECT 1 FROM sms_webhook_queue WHERE phone = cleaned_phone) THEN
    RETURN NEW;
  END IF;

  INSERT INTO sms_webhook_queue (contact_id, phone, stage_id)
  VALUES (NEW.id, cleaned_phone, NEW.pipeline_stage_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sms_webhook_enqueue_trg ON sms_contacts;
CREATE TRIGGER sms_webhook_enqueue_trg
  AFTER UPDATE OF pipeline_stage_id ON sms_contacts
  FOR EACH ROW EXECUTE FUNCTION sms_webhook_enqueue_on_stage_change();

-- Also catch INSERTs that already have a stage set (unusual but possible from imports)
CREATE OR REPLACE FUNCTION sms_webhook_enqueue_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg RECORD;
  cleaned_phone text;
BEGIN
  IF NEW.pipeline_stage_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.opted_out = true THEN RETURN NEW; END IF;

  SELECT enabled, trigger_stages INTO cfg FROM sms_webhook_settings LIMIT 1;
  IF cfg IS NULL OR cfg.enabled = false THEN RETURN NEW; END IF;
  IF NOT (NEW.pipeline_stage_id = ANY(cfg.trigger_stages)) THEN RETURN NEW; END IF;

  cleaned_phone := regexp_replace(NEW.phone_number, '\D', '', 'g');
  IF cleaned_phone = '' THEN RETURN NEW; END IF;

  IF EXISTS (SELECT 1 FROM sms_webhook_queue WHERE phone = cleaned_phone) THEN
    RETURN NEW;
  END IF;

  INSERT INTO sms_webhook_queue (contact_id, phone, stage_id)
  VALUES (NEW.id, cleaned_phone, NEW.pipeline_stage_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sms_webhook_enqueue_insert_trg ON sms_contacts;
CREATE TRIGGER sms_webhook_enqueue_insert_trg
  AFTER INSERT ON sms_contacts
  FOR EACH ROW EXECUTE FUNCTION sms_webhook_enqueue_on_insert();

-- ============================================================
-- 6. Updated_at auto-touch for endpoints + settings
-- ============================================================
CREATE OR REPLACE FUNCTION sms_webhook_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sms_webhook_endpoints_touch ON sms_webhook_endpoints;
CREATE TRIGGER sms_webhook_endpoints_touch
  BEFORE UPDATE ON sms_webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION sms_webhook_touch_updated_at();

DROP TRIGGER IF EXISTS sms_webhook_settings_touch ON sms_webhook_settings;
CREATE TRIGGER sms_webhook_settings_touch
  BEFORE UPDATE ON sms_webhook_settings
  FOR EACH ROW EXECUTE FUNCTION sms_webhook_touch_updated_at();
