-- SCHEDULED_DELAY node: a parallel-fire timer. Fires its target message
-- after X time regardless of whether the contact replied. Lives alongside
-- the main conversation flow (Brochure → AI Reply) so the lead can keep
-- chatting with AI but still receive scheduled drip messages.

ALTER TABLE sms_scheduled_tasks
  DROP CONSTRAINT IF EXISTS sms_scheduled_tasks_type_check;

ALTER TABLE sms_scheduled_tasks
  ADD CONSTRAINT sms_scheduled_tasks_type_check
  CHECK (type IN ('delay_node', 'scheduled_message', 'scheduled_campaign', 'wait_for_reply', 'scheduled_delay'));
