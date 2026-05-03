-- Agreements table — unique per-prospect token sale contracts.
-- Admin creates, sends link, prospect reads + signs, then pays via SamCart.

CREATE TABLE IF NOT EXISTS agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  contact_id uuid REFERENCES wk_contacts(id) ON DELETE SET NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  property_id uuid REFERENCES inv_properties(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Token Sale Agreement',
  recipient_name text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  terms_html text,
  signer_name text,
  signature_png text,
  signed_at timestamptz,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'opened', 'signed', 'paid')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agreements_token_idx ON agreements (token);
CREATE INDEX IF NOT EXISTS agreements_status_idx ON agreements (status);
CREATE INDEX IF NOT EXISTS agreements_contact_idx ON agreements (contact_id);

ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agreements_public_read"
  ON agreements FOR SELECT
  USING (true);

CREATE POLICY "agreements_auth_update"
  ON agreements FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "agreements_admin_insert"
  ON agreements FOR INSERT
  WITH CHECK (
    (auth.jwt() ->> 'email') IN ('admin@hub.nfstay.com', 'hugo@nfstay.com', 'hugodesouzax@gmail.com')
  );

CREATE POLICY "agreements_admin_delete"
  ON agreements FOR DELETE
  USING (
    (auth.jwt() ->> 'email') IN ('admin@hub.nfstay.com', 'hugo@nfstay.com', 'hugodesouzax@gmail.com')
  );
