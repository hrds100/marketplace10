-- Convert the final two ported numbers to Twilio voice+SMS (Hugo 2026-07-07).
-- Originally kept on WhatsApp; now wanted for SMS + calls too. Existing
-- WhatsApp messages stay in wk_sms_messages (channel='whatsapp') and remain
-- viewable; only new inbound WhatsApp routing retires for these numbers.
UPDATE wk_numbers
  SET provider='twilio', channel='sms', voice_enabled=true, sms_enabled=true, is_active=true
  WHERE e164 IN ('+447886070823', '+447886081796');
