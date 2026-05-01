-- Seed the Twilio SMS number into wk_numbers so wk-sms-send can find it.
-- The number was only in the old sms_numbers table (Phase 1); wk_numbers
-- (Phase 2 / SMSv2) had zero rows with sms_enabled=true → 503 on every send.
INSERT INTO wk_numbers (
  e164, channel, provider, external_id, is_active,
  voice_enabled, sms_enabled, recording_enabled
)
VALUES
  ('+447380308316', 'sms', 'twilio', 'PN97458554bdb49120783d133ef2102a81', true, true, true, false)
ON CONFLICT (e164) DO UPDATE SET
  channel      = EXCLUDED.channel,
  provider     = EXCLUDED.provider,
  sms_enabled  = EXCLUDED.sms_enabled,
  is_active    = EXCLUDED.is_active;
