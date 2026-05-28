-- Contractor agreements: extend agreements table with type, sender signature, and recipient email.
-- Additive only — no renames, no removals, no type changes.

ALTER TABLE agreements
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'investor'
    CHECK (type IN ('investor', 'contractor')),
  ADD COLUMN IF NOT EXISTS recipient_email text,
  ADD COLUMN IF NOT EXISTS sender_signature_png text,
  ADD COLUMN IF NOT EXISTS sender_name text,
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES agreement_templates(id) ON DELETE SET NULL;

ALTER TABLE agreements ALTER COLUMN amount SET DEFAULT 0;

CREATE INDEX IF NOT EXISTS agreements_type_idx ON agreements (type);

-- Templates: add sender signature storage
ALTER TABLE agreement_templates
  ADD COLUMN IF NOT EXISTS sender_signature_png text,
  ADD COLUMN IF NOT EXISTS sender_name text DEFAULT 'Hugo Souza',
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'investor'
    CHECK (type IN ('investor', 'contractor'));

-- Allow unauthenticated contractor signing (contractors don't have accounts)
CREATE POLICY "agreements_contractor_anon_update"
  ON agreements FOR UPDATE
  USING (type = 'contractor' AND status IN ('sent', 'opened'))
  WITH CHECK (type = 'contractor');
