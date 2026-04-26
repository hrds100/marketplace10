-- Audit log for silent social-identity linking events.
--
-- When an existing email/password Supabase user clicks a social provider
-- (Google/Apple/X/Facebook) and the derived-password path cannot sign them
-- in, the `link-social-identity` edge function re-keys their Supabase
-- password to the Particle-derived value so they can be signed in. Every
-- such re-key is recorded here for audit + abuse detection.

CREATE TABLE IF NOT EXISTS auth_link_events (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         UUID NOT NULL,
  email           TEXT NOT NULL,
  particle_uuid   TEXT NOT NULL,
  provider        TEXT NOT NULL CHECK (provider IN ('google','apple','twitter','facebook')),
  wallet_address  TEXT,
  ip              TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_link_events_email
  ON auth_link_events (email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_link_events_uuid
  ON auth_link_events (particle_uuid, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_link_events_created
  ON auth_link_events (created_at DESC);

ALTER TABLE auth_link_events ENABLE ROW LEVEL SECURITY;

-- Service role only — edge function writes, admin reads via service key.
-- No regular user should query this table.
CREATE POLICY "Service role full access on auth_link_events"
  ON auth_link_events
  FOR ALL
  USING (true)
  WITH CHECK (true);
