-- Add 'unipile' to the provider check on wk_numbers + wk_channel_credentials.
-- PR 69 (multi-channel pivot to Unipile), Hugo 2026-04-27.
--
-- Hugo's call: Wazzup24's INBOX tariff blocks API initiations and the next
-- tier up that meets our chat-volume needs is too expensive ($90+ for MAX
-- per channel, doubled for 2 numbers). Unipile (€49/mo for up to 10
-- accounts) fits better, runs the same QR-paired personal-WhatsApp model,
-- and adds LinkedIn / Email / Telegram capacity for the same flat fee.
--
-- This migration is purely additive — relaxes the provider check so
-- 'unipile' becomes valid alongside 'twilio' / 'wazzup' / 'resend'. Existing
-- wazzup rows stay untouched; we'll deprecate them in a follow-up PR after
-- Unipile is proven in production.

-- wk_numbers
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wk_numbers_provider_chk') THEN
    ALTER TABLE wk_numbers DROP CONSTRAINT wk_numbers_provider_chk;
  END IF;
END $$;

ALTER TABLE wk_numbers
  ADD CONSTRAINT wk_numbers_provider_chk
  CHECK (provider IN ('twilio', 'wazzup', 'resend', 'unipile'));

COMMENT ON COLUMN wk_numbers.provider IS
  'twilio (sms) | wazzup (whatsapp legacy) | resend (email) | unipile (whatsapp/linkedin/telegram/email — replaces wazzup). PR 69.';

-- wk_channel_credentials
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'wk_channel_credentials'::regclass
               AND contype = 'c'
               AND conname LIKE '%provider%') THEN
    EXECUTE (
      SELECT 'ALTER TABLE wk_channel_credentials DROP CONSTRAINT ' || conname
      FROM pg_constraint
      WHERE conrelid = 'wk_channel_credentials'::regclass
        AND contype = 'c'
        AND conname LIKE '%provider%'
      LIMIT 1
    );
  END IF;
END $$;

ALTER TABLE wk_channel_credentials
  ADD CONSTRAINT wk_channel_credentials_provider_chk
  CHECK (provider IN ('twilio', 'wazzup', 'resend', 'unipile'));

-- Seed an empty Unipile credential row so the Settings → Channels tab has
-- somewhere to render the "Connect WhatsApp" button. The actual API token
-- lives in Supabase Edge Function secrets (UNIPILE_TOKEN + UNIPILE_DSN);
-- this row is just a UI-visible placeholder.
INSERT INTO wk_channel_credentials (provider, label, secret, meta, is_connected, last_seen_at)
VALUES (
  'unipile',
  'Unipile (api38.unipile.com:16812)',
  '__USE_ENV__',
  jsonb_build_object(
    'dsn', 'api38.unipile.com:16812',
    'note', 'Token is in Supabase Edge Function secret UNIPILE_TOKEN'
  ),
  false,
  null
)
ON CONFLICT (provider, label) DO UPDATE SET meta = EXCLUDED.meta;
