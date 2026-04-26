-- Pending payments for funnel-first flow
-- Stores GHL payment info when the user hasn't signed up yet.
-- On signup, the app checks this table and applies the tier.

CREATE TABLE IF NOT EXISTS pending_payments (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email       TEXT NOT NULL,
  tier        TEXT NOT NULL CHECK (tier IN ('monthly', 'yearly', 'lifetime')),
  product_id  TEXT,
  amount      NUMERIC(10,2) DEFAULT 0,
  contact_id  TEXT,
  first_name  TEXT,
  phone       TEXT,
  claimed     BOOLEAN DEFAULT false,
  claimed_at  TIMESTAMPTZ,
  claimed_by  UUID,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by email (signup checks this)
CREATE INDEX IF NOT EXISTS idx_pending_payments_email
  ON pending_payments (email, claimed, created_at DESC);

-- RLS: service role only
ALTER TABLE pending_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on pending_payments"
  ON pending_payments
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE pending_payments IS 'Stores GHL payments from funnel visitors who have not signed up yet';
