-- Import GHL→Twilio ported numbers (Hugo 2026-07-07)
-- 4 numbers become Twilio voice+SMS lines, accessible to all admin+worker.
-- The other two ported numbers (+447886070823, +447886081796) stay on
-- WhatsApp (Unipile) and are intentionally NOT touched here.
--
-- assigned_agent_id left NULL: inbound routing rings all workers+admins
-- (see wk-voice-twiml-incoming), so no single owner is needed.

-- 3 brand-new numbers
INSERT INTO wk_numbers (e164, provider, channel, voice_enabled, sms_enabled, is_active)
VALUES
  ('+447476368123', 'twilio', 'sms', true, true, true),
  ('+447475909148', 'twilio', 'sms', true, true, true),
  ('+447533011938', 'twilio', 'sms', true, true, true)
ON CONFLICT (e164) DO UPDATE
  SET provider='twilio', channel='sms', voice_enabled=true, sms_enabled=true, is_active=true;

-- Existing row with no WhatsApp history: convert unipile→twilio voice+SMS
UPDATE wk_numbers
  SET provider='twilio', channel='sms', voice_enabled=true, sms_enabled=true, is_active=true
  WHERE e164 = '+447886076294';
