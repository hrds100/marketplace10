-- WhatsApp Channel Support
-- Adds channel column to sms_numbers, sms_messages, sms_conversations
-- All existing data defaults to 'sms'. Zero breaking changes.

ALTER TABLE sms_numbers
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'sms'
  CHECK (channel IN ('sms', 'whatsapp'));

ALTER TABLE sms_messages
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'sms'
  CHECK (channel IN ('sms', 'whatsapp'));

ALTER TABLE sms_conversations
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'sms'
  CHECK (channel IN ('sms', 'whatsapp'));
