-- Seed Hugo's already-paired Wazzup24 WhatsApp channels into wk_numbers
-- so the Settings → Channels tab shows them immediately. PR 60 follow-up,
-- 2026-04-27.
--
-- Channel state at seed time (verified via GET /v3/channels):
--   86534e75-d962-4943-8827-863b7f79b30b → 447868778292 → state='active'
--   31c79664-bc32-4dc4-998a-a9a6b75125b1 → 447487589933 → state='notEnoughMoney'
--   7d1e19db-8e96-4559-bb67-6decb8b9de4c → 441618189073 → state='blocked'
--
-- Only the active channel gets is_active=true; the other two are inserted
-- with is_active=false so the dialer + sender skip them. Hugo can flip
-- them on from Settings → Channels once Wazzup health is restored.

-- Idempotent INSERTs keyed on (channel='whatsapp', external_id=channelId)
-- via the unique index from the schema migration.
INSERT INTO wk_numbers (
  e164, channel, provider, external_id, is_active,
  voice_enabled, sms_enabled, recording_enabled
)
VALUES
  ('+447868778292', 'whatsapp', 'wazzup', '86534e75-d962-4943-8827-863b7f79b30b', true,  false, false, false),
  ('+447487589933', 'whatsapp', 'wazzup', '31c79664-bc32-4dc4-998a-a9a6b75125b1', false, false, false, false),
  ('+441618189073', 'whatsapp', 'wazzup', '7d1e19db-8e96-4559-bb67-6decb8b9de4c', false, false, false, false)
ON CONFLICT (channel, external_id) WHERE external_id IS NOT NULL
DO NOTHING;

-- Seed the Wazzup credential row so the Settings → Channels badge shows
-- 'Connected' immediately (the secret column mirrors the env var so the
-- DB-first lookup in wazzup-send / wazzup-sync-channels resolves the
-- same key — admin can rotate via Settings UI later without redeploying).
INSERT INTO wk_channel_credentials (
  provider, label, secret, meta, is_connected, last_seen_at
)
VALUES (
  'wazzup',
  'Wazzup24 primary',
  'bf6e5715d80c4e0e9c964d29a8fb90af',
  jsonb_build_object(
    'integration_id', '7273c4a1-d214-4994-a3c7-9087cc4fda14',
    'paired_channel_count', 3,
    'webhook_uri', 'https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/wazzup-webhook'
  ),
  true,
  now()
)
ON CONFLICT (provider, label)
DO UPDATE SET
  secret       = EXCLUDED.secret,
  meta         = EXCLUDED.meta,
  is_connected = EXCLUDED.is_connected,
  last_seen_at = EXCLUDED.last_seen_at;
