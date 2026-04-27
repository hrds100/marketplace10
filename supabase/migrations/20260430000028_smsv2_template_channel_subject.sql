-- ============================================================================
-- SMSV2 / CRM — Template `channel` + `subject` everywhere (PR 64)
-- Hugo 2026-04-27.
--
-- Why:
--   PR 60 (multi-channel) added `channel` to wk_sms_templates so admins
--   could mark a template as SMS / WhatsApp / Email-only (or universal).
--   It did NOT add a `subject` column — needed for email templates.
--   It also didn't carry `channel` over to wk_campaign_sms_templates
--   (the per-campaign override table from PR 62/27).
--
--   Hugo confirmed today: the templates section is multi-channel
--   (SMS / WA / Email). Email needs a Subject field. So:
--
--     1. wk_sms_templates: add `subject text`. Channel already exists.
--     2. wk_campaign_sms_templates: add `channel` + `subject` (mirror).
--
--   No data migration needed — existing rows default to NULL channel
--   ('universal') and NULL subject (only required when channel='email').
-- ============================================================================

-- ─── 1. wk_sms_templates ─────────────────────────────────────────────
ALTER TABLE wk_sms_templates
  ADD COLUMN IF NOT EXISTS subject text;

COMMENT ON COLUMN wk_sms_templates.subject IS
  'PR 64 (2026-04-27): subject line for email-channel templates. Required when channel=''email'' (UI-validated). Ignored for SMS / WhatsApp.';

-- ─── 2. wk_campaign_sms_templates ───────────────────────────────────
ALTER TABLE wk_campaign_sms_templates
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS subject text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wk_campaign_sms_templates_channel_chk'
  ) THEN
    ALTER TABLE wk_campaign_sms_templates
      ADD CONSTRAINT wk_campaign_sms_templates_channel_chk
      CHECK (channel IS NULL OR channel IN ('sms', 'whatsapp', 'email'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS wk_campaign_sms_templates_channel_idx
  ON wk_campaign_sms_templates (channel);

COMMENT ON COLUMN wk_campaign_sms_templates.channel IS
  'PR 64: NULL = universal. Else sms / whatsapp / email. Mirrors wk_sms_templates.channel for the per-campaign override table.';
COMMENT ON COLUMN wk_campaign_sms_templates.subject IS
  'PR 64: subject line for email-channel templates. Required when channel=''email''.';
