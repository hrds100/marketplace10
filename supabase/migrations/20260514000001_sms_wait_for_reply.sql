-- WAIT_FOR_REPLY node support for SMS automations.
--
-- Adds:
--   1. New status 'waiting' on sms_automation_state (lead is paused waiting for reply)
--   2. New task type 'wait_for_reply' on sms_scheduled_tasks
--   3. automation_state_id + branch_label columns so a scheduled "no reply"
--      timeout can resume the exact lead/state down the correct branch.
--   4. pg_cron schedule that pokes sms-automation-worker every minute.
--
-- See docs/runbooks/SMS_AUTOMATION_WAIT_FOR_REPLY.md (created later).

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ----------------------------------------------------------------------
-- 1. Extend sms_automation_state.status to include 'waiting'
-- ----------------------------------------------------------------------
ALTER TABLE sms_automation_state
  DROP CONSTRAINT IF EXISTS sms_automation_state_status_check;

ALTER TABLE sms_automation_state
  ADD CONSTRAINT sms_automation_state_status_check
  CHECK (status IN ('active', 'suspended', 'completed', 'paused', 'waiting'));

COMMENT ON COLUMN sms_automation_state.status IS
  'active = bot running, suspended = human took over, completed = flow done, '
  'paused = user paused, waiting = parked on a WAIT_FOR_REPLY node.';

-- ----------------------------------------------------------------------
-- 2. Extend sms_scheduled_tasks for branch-aware resume
-- ----------------------------------------------------------------------
ALTER TABLE sms_scheduled_tasks
  DROP CONSTRAINT IF EXISTS sms_scheduled_tasks_type_check;

ALTER TABLE sms_scheduled_tasks
  ADD CONSTRAINT sms_scheduled_tasks_type_check
  CHECK (type IN ('delay_node', 'scheduled_message', 'scheduled_campaign', 'wait_for_reply'));

ALTER TABLE sms_scheduled_tasks
  ADD COLUMN IF NOT EXISTS automation_state_id uuid
    REFERENCES sms_automation_state(id) ON DELETE CASCADE;

ALTER TABLE sms_scheduled_tasks
  ADD COLUMN IF NOT EXISTS branch_label text;

CREATE INDEX IF NOT EXISTS idx_sms_scheduled_tasks_state_pending
  ON sms_scheduled_tasks(automation_state_id)
  WHERE status = 'pending';

-- ----------------------------------------------------------------------
-- 3. pg_cron schedule — calls sms-automation-worker every minute
-- ----------------------------------------------------------------------
DO $$
BEGIN
  PERFORM cron.unschedule('sms-automation-worker-1min');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'sms-automation-worker-1min',
  '* * * * *',
  $$
    SELECT net.http_post(
      url := 'https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/sms-automation-worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', 'nfstay-sms-worker-2026-05-14-shared-secret'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- ----------------------------------------------------------------------
-- 4. Seed "no_response" label (auto-applied by worker when a flow exits
--    on a No Reply path)
-- ----------------------------------------------------------------------
INSERT INTO sms_labels (name, colour, position)
VALUES ('no_response', '#9CA3AF', 99)
ON CONFLICT (name) DO NOTHING;
