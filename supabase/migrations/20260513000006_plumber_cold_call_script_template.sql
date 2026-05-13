-- Plumber Cold Call Script template for CRM.
-- Brochure PDF auto-attached.
INSERT INTO wk_sms_templates (name, body_md, is_global, owner_agent_id, move_to_stage_id, channel, subject, attachment_url)
VALUES (
  'Plumber Cold Call Script',
  'Opening' || chr(10) || chr(10) ||
  'Hey, my name''s {agent_first_name}, I''m calling from NFstay. I saw your listing on Google Maps — I can see you work in the trades industry. I just want to take one minute of your time, I think I have something you might find really interesting. Is that alright?' || chr(10) || chr(10) ||
  'One-sentence pitch' || chr(10) || chr(10) ||
  'So basically, we work with Airbnb properties using a strategy called rent-to-rent — we rent a property from a landlord instead of buying it, then list it on Airbnb for profit. We''ve got a property running in Liverpool right now and we''re looking for partners. Entry starts from 5 hundred pounds on a five-year contract.' || chr(10) || chr(10) ||
  'Close' || chr(10) || chr(10) ||
  'But as I said, I''ll keep it short — how about I send you the full breakdown so you can have a look in your own time, and then I give you a call back tomorrow? How does that sound?',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/crm-attachments/NFstay-Liverpool-Deal-Brochure.pdf'
)
ON CONFLICT DO NOTHING;
