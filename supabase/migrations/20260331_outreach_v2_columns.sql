-- OutreachV2: Add columns for inquiry authorisation and outreach tracking
-- Run manually: supabase db execute < this file

ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS authorized BOOLEAN DEFAULT false;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS always_authorised BOOLEAN DEFAULT false;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS authorisation_type TEXT CHECK (authorisation_type IN ('nda', 'direct', 'nda_and_claim'));

ALTER TABLE properties ADD COLUMN IF NOT EXISTS outreach_sent BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS outreach_sent_at TIMESTAMPTZ;
