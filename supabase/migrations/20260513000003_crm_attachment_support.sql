-- CRM attachment support: add attachment_url to templates, messages, and
-- create a public storage bucket for CRM file uploads (PDFs, images).

-- 1. Templates: store a default attachment URL per template
ALTER TABLE wk_sms_templates ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE wk_campaign_sms_templates ADD COLUMN IF NOT EXISTS attachment_url text;

-- 2. Messages: record what was attached on each outbound message
ALTER TABLE wk_sms_messages ADD COLUMN IF NOT EXISTS attachment_url text;

-- 3. Public storage bucket for CRM attachments (PDFs, brochures, images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('crm-attachments', 'crm-attachments', true)
ON CONFLICT DO NOTHING;

-- RLS: authenticated users can upload, anyone can read (public bucket)
CREATE POLICY "crm_attachments_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'crm-attachments');

CREATE POLICY "crm_attachments_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'crm-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "crm_attachments_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'crm-attachments' AND auth.role() = 'authenticated');
