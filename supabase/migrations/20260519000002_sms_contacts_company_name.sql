-- /sms contacts: add company_name column so operators can store the
-- business name separately from display_name (which is typically the
-- person). Used by message templates: {company_name} / {company name}.

ALTER TABLE sms_contacts ADD COLUMN IF NOT EXISTS company_name text;

CREATE INDEX IF NOT EXISTS sms_contacts_company_name_idx
  ON sms_contacts (company_name);
