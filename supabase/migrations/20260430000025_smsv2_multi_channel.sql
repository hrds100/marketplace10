-- ============================================================================
-- SMSV2 / CRM — multi-channel inbox (PR 60, Hugo 2026-04-27)
--
-- Why:
--   The CRM inbox is currently SMS-only (Twilio). Hugo wants a single
--   thread per contact that mixes SMS, WhatsApp (via Wazzup24, personal
--   WA paired by QR — $15/mo per channel, no template approval), and
--   inbound Email (via Resend, on a new inbox.nfstay.com subdomain so
--   we don't disturb existing nfstay.com mail).
--
--   The send/receive UX in /crm/inbox stays identical — the agent just
--   picks SMS / WhatsApp / Email from a small radio next to the Send
--   button. All three feed into the same wk_sms_messages thread and
--   the same realtime subscription.
--
-- Approach (additive, zero breaking changes):
--   1. wk_sms_messages   — add channel + external_id + subject. Backfill
--      existing rows to channel='sms' + external_id=twilio_sid. Keep
--      twilio_sid for one release cycle then drop it in a later PR.
--   2. wk_numbers        — add channel + provider + external_id + is_active.
--      Existing Twilio rows backfill to channel='sms' provider='twilio'.
--      WhatsApp channels (3 already paired in Wazzup24:
--      441618189073, 447487589933, 447868778292) become new rows with
--      channel='whatsapp' provider='wazzup' on first sync from
--      wazzup-send edge fn. Email rows (PR 3) use the email address
--      itself in e164 — column is misnamed but structurally fine; we
--      can rename in a later cleanup PR if it bothers us.
--   3. wk_sms_templates  — add channel ('sms'|'whatsapp'|'email'|null=universal)
--      so admins can author channel-specific copy.
--   4. wk_channel_credentials — new table. One row per provider. Stores
--      the Wazzup API key + Resend inbound webhook secret. Admin-only
--      RLS — never readable from the frontend. Edge fns read via
--      service role.
--
-- Out-of-scope:
--   - Schema cleanup of legacy wa-send / wa-webhook-incoming / wa-templates
--     edge functions (they wrote to LEGACY sms_messages, never wired into
--     /crm). Removed in the same PR but in a separate file change.
--
-- Reversibility:
--   Every ALTER is ADD COLUMN with a safe default. Drop-down path:
--   `ALTER TABLE wk_sms_messages DROP COLUMN channel, DROP COLUMN
--    external_id, DROP COLUMN subject;` etc. The new wk_channel_credentials
--   table is empty until a row is inserted from the Settings UI.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. wk_sms_messages: channel + external_id + subject
-- ----------------------------------------------------------------------------
ALTER TABLE wk_sms_messages
  ADD COLUMN IF NOT EXISTS channel     text NOT NULL DEFAULT 'sms',
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS subject     text;

-- Constrain channel values. Backfill any pre-existing rows (all 'sms').
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wk_sms_messages_channel_chk'
  ) THEN
    ALTER TABLE wk_sms_messages
      ADD CONSTRAINT wk_sms_messages_channel_chk
      CHECK (channel IN ('sms', 'whatsapp', 'email'));
  END IF;
END $$;

-- Backfill external_id from twilio_sid for existing SMS rows so the
-- composite UNIQUE below holds for legacy data too.
UPDATE wk_sms_messages
   SET external_id = twilio_sid
 WHERE external_id IS NULL
   AND twilio_sid IS NOT NULL;

-- (channel, external_id) UNIQUE — protects against duplicate webhook
-- inserts across providers. partial index so rows with NULL external_id
-- (e.g. agent-typed SMS that hasn't gotten a SID yet) don't conflict.
CREATE UNIQUE INDEX IF NOT EXISTS wk_sms_messages_channel_external_uniq
  ON wk_sms_messages (channel, external_id)
  WHERE external_id IS NOT NULL;

-- Index for inbox queries that filter by channel (e.g. email-only view).
CREATE INDEX IF NOT EXISTS wk_sms_messages_channel_idx
  ON wk_sms_messages (channel, created_at DESC);

COMMENT ON COLUMN wk_sms_messages.channel IS
  'sms | whatsapp | email — which transport delivered this message. PR 60.';
COMMENT ON COLUMN wk_sms_messages.external_id IS
  'Provider message id: Twilio MessageSid for sms, Wazzup messageId (UUID) for whatsapp, Resend email_id (UUID) for email. Used for idempotent webhook handling. PR 60.';
COMMENT ON COLUMN wk_sms_messages.subject IS
  'Email subject line. NULL for sms/whatsapp. PR 60.';

-- ----------------------------------------------------------------------------
-- 2. wk_numbers: channel + provider + external_id + is_active
-- ----------------------------------------------------------------------------
ALTER TABLE wk_numbers
  ADD COLUMN IF NOT EXISTS channel     text NOT NULL DEFAULT 'sms',
  ADD COLUMN IF NOT EXISTS provider    text NOT NULL DEFAULT 'twilio',
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS is_active   boolean NOT NULL DEFAULT true;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wk_numbers_channel_chk'
  ) THEN
    ALTER TABLE wk_numbers
      ADD CONSTRAINT wk_numbers_channel_chk
      CHECK (channel IN ('sms', 'whatsapp', 'email'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wk_numbers_provider_chk'
  ) THEN
    ALTER TABLE wk_numbers
      ADD CONSTRAINT wk_numbers_provider_chk
      CHECK (provider IN ('twilio', 'wazzup', 'resend'));
  END IF;
END $$;

-- For SMS rows the external_id mirrors twilio_sid (so all rows have a
-- consistent provider id we can rely on). Backfill existing rows.
UPDATE wk_numbers
   SET external_id = twilio_sid
 WHERE external_id IS NULL
   AND twilio_sid IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS wk_numbers_channel_external_uniq
  ON wk_numbers (channel, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS wk_numbers_channel_active_idx
  ON wk_numbers (channel, is_active);

COMMENT ON COLUMN wk_numbers.channel IS
  'sms | whatsapp | email — what kind of channel this row represents. PR 60.';
COMMENT ON COLUMN wk_numbers.provider IS
  'Underlying provider: twilio (sms), wazzup (whatsapp), resend (email). PR 60.';
COMMENT ON COLUMN wk_numbers.external_id IS
  'Provider channel id: Twilio number SID for sms (mirror of twilio_sid), Wazzup channelId UUID for whatsapp, Resend domain id for email. PR 60.';
COMMENT ON COLUMN wk_numbers.is_active IS
  'Admin toggle in Settings → Channels. When false, dialer + senders skip this row. PR 60.';

-- ----------------------------------------------------------------------------
-- 3. wk_sms_templates: channel filter
-- ----------------------------------------------------------------------------
ALTER TABLE wk_sms_templates
  ADD COLUMN IF NOT EXISTS channel text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wk_sms_templates_channel_chk'
  ) THEN
    ALTER TABLE wk_sms_templates
      ADD CONSTRAINT wk_sms_templates_channel_chk
      CHECK (channel IS NULL OR channel IN ('sms', 'whatsapp', 'email'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS wk_sms_templates_channel_idx
  ON wk_sms_templates (channel);

COMMENT ON COLUMN wk_sms_templates.channel IS
  'NULL = universal (works on any channel). Else the single channel this template targets. Email templates also need a non-empty subject (validated client-side). PR 60.';

-- ----------------------------------------------------------------------------
-- 4. wk_channel_credentials: per-provider secrets
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wk_channel_credentials (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider      text NOT NULL CHECK (provider IN ('twilio', 'wazzup', 'resend')),
  -- Free-text label for the admin UI. e.g. "Wazzup primary", "Resend inbox.nfstay.com".
  label         text NOT NULL,
  -- The shared secret. For Wazzup this is the API key. For Resend this
  -- is the webhook signing secret. Stored as text — Supabase Vault
  -- encryption is the future hardening path; for now the row is RLS-
  -- gated to admins only and never returned to the frontend (Settings
  -- UI displays only a masked preview + "rotate" button).
  secret        text NOT NULL,
  -- Optional connection meta — Wazzup channelIds, Resend domain id, etc.
  meta          jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Health: when set, last successful contact with the provider.
  last_seen_at  timestamptz,
  -- Health: when set, the provider reports "connected" (e.g. Wazzup
  -- channel state='active'). UI shows green badge when true.
  is_connected  boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS wk_channel_credentials_provider_label_uniq
  ON wk_channel_credentials (provider, label);

ALTER TABLE wk_channel_credentials ENABLE ROW LEVEL SECURITY;

-- Admin-only read. Edge functions use service role.
-- (Repo convention: gate by JWT email — same pattern as inv_*, aff_* tables.)
DROP POLICY IF EXISTS wk_channel_credentials_admin_read ON wk_channel_credentials;
CREATE POLICY wk_channel_credentials_admin_read ON wk_channel_credentials
  FOR SELECT TO authenticated
  USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

-- Admin-only write.
DROP POLICY IF EXISTS wk_channel_credentials_admin_write ON wk_channel_credentials;
CREATE POLICY wk_channel_credentials_admin_write ON wk_channel_credentials
  FOR ALL TO authenticated
  USING (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  )
  WITH CHECK (
    auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com')
  );

COMMENT ON TABLE wk_channel_credentials IS
  'PR 60 (2026-04-27): per-provider secrets for the multi-channel inbox. Admin-only RLS. Edge fns read via service role. One row per logical credential — for Wazzup this is the API key; for Resend this is the webhook signing secret.';

-- ----------------------------------------------------------------------------
-- 5. updated_at trigger for wk_channel_credentials
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION wk_channel_credentials_touch_updated()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wk_channel_credentials_touch_updated_trg ON wk_channel_credentials;
CREATE TRIGGER wk_channel_credentials_touch_updated_trg
  BEFORE UPDATE ON wk_channel_credentials
  FOR EACH ROW EXECUTE FUNCTION wk_channel_credentials_touch_updated();
