-- Smart Pathways — add current_node_id tracking + campaign-linked automations
-- 2026-04-07

-- Track where a contact is in an automation flow (for re-entry on reply)
ALTER TABLE sms_automation_runs ADD COLUMN IF NOT EXISTS current_node_id text;

-- Link campaigns to automations so inbound replies route to the right flow
ALTER TABLE sms_campaigns ADD COLUMN IF NOT EXISTS automation_id uuid REFERENCES sms_automations(id) ON DELETE SET NULL;

-- Expand status CHECK to include 'waiting_reply' for pause-and-resume flows
ALTER TABLE sms_automation_runs DROP CONSTRAINT IF EXISTS sms_automation_runs_status_check;
ALTER TABLE sms_automation_runs ADD CONSTRAINT sms_automation_runs_status_check
  CHECK (status IN ('running', 'completed', 'failed', 'loop_blocked', 'waiting_reply'));
