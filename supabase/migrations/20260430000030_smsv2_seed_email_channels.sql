-- Seed Resend email "from" addresses on mail.nfstay.com domain into
-- wk_numbers so the Settings → Channels tab shows them and the
-- ContactSmsModal email-mode From dropdown is populated. Hugo verified
-- mail.nfstay.com inside Resend dashboard 2026-04-27 — outbound from
-- this domain works once these wk_numbers rows exist.
--
-- Two human-named addresses for the two CRM agents Hugo's onboarding:
--   elijah@mail.nfstay.com
--   georgia@mail.nfstay.com
--
-- The wk_numbers.e164 column stores the email address for email rows
-- (column is misnamed for emails — tracked for a later cleanup PR).

INSERT INTO wk_numbers (
  e164, channel, provider, external_id, is_active,
  voice_enabled, sms_enabled, recording_enabled
)
VALUES
  ('elijah@mail.nfstay.com',  'email', 'resend', 'mail.nfstay.com:elijah',  true, false, false, false),
  ('georgia@mail.nfstay.com', 'email', 'resend', 'mail.nfstay.com:georgia', true, false, false, false)
ON CONFLICT (channel, external_id) WHERE external_id IS NOT NULL
DO NOTHING;

-- Seed the Resend credential row so Settings → Channels shows
-- "Connected" for the Email section. Webhook signing secret is set
-- separately as a Supabase Edge Function secret (RESEND_WEBHOOK_SECRET);
-- this row's secret column mirrors the existing RESEND_API_KEY env so
-- the DB-first lookup pattern works the same as it does for Wazzup.
INSERT INTO wk_channel_credentials (
  provider, label, secret, meta, is_connected, last_seen_at
)
VALUES (
  'resend',
  'Resend mail.nfstay.com',
  '__USE_ENV__',  -- placeholder: edge fn falls through to RESEND_API_KEY env
  jsonb_build_object(
    'domain', 'mail.nfstay.com',
    'verified_at', '2026-04-27',
    'addresses', jsonb_build_array(
      'elijah@mail.nfstay.com',
      'georgia@mail.nfstay.com'
    )
  ),
  true,
  now()
)
ON CONFLICT (provider, label)
DO UPDATE SET
  meta         = EXCLUDED.meta,
  is_connected = EXCLUDED.is_connected,
  last_seen_at = EXCLUDED.last_seen_at;
