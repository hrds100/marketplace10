-- ============================================================================
-- /smsv2 — Twilio account connection (admin-managed)
-- ============================================================================
-- Singleton row holding the workspace's Twilio Account SID + Auth Token.
-- Admin pastes them once in /smsv2/settings → Numbers → "Connect Twilio".
-- Existing edge functions continue to read TWILIO_* from Deno.env until
-- migrated; this table is the source of truth for the admin UI.
--
-- Auth token stored as text. RLS limits read/write to wk_is_admin() only.
-- (Supabase provides at-rest encryption; Vault migration is a v2 follow-up.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS wk_twilio_account (
  id            text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  account_sid   text NOT NULL,
  auth_token    text NOT NULL,
  friendly_name text,
  connected_at  timestamptz NOT NULL DEFAULT now(),
  connected_by  uuid REFERENCES profiles(id),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE wk_twilio_account ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wk_twilio_account_admin ON wk_twilio_account;
CREATE POLICY wk_twilio_account_admin
  ON wk_twilio_account
  FOR ALL
  USING (wk_is_admin())
  WITH CHECK (wk_is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON wk_twilio_account TO authenticated;
