-- pg_cron schedule that polls Unipile every 60s for new WhatsApp messages.
-- Webhook delivery from Unipile is broken for our endpoint despite identical
-- config to working third-party webhooks in the same Unipile org. Polling is
-- a robust fallback. PR 81 (Hugo 2026-04-27).
--
-- Implementation: pg_cron + pg_net call the unipile-poll-messages edge fn
-- every minute. The edge fn:
--   - Lists Unipile's WHATSAPP accounts
--   - For each, pulls the most recent 50 messages
--   - Inserts new ones (composite UNIQUE on channel + external_id makes
--     it idempotent — we won't duplicate on reruns)
--
-- This adds at most 60s of latency to inbound. Acceptable until Unipile
-- fixes webhook delivery (or we move to LinkedIn/Email and pollings
-- elsewhere).

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop any prior schedule with this name (idempotent re-apply).
DO $$
BEGIN
  PERFORM cron.unschedule('unipile-poll-messages-1min');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'unipile-poll-messages-1min',
  '* * * * *', -- every minute
  $$
    SELECT net.http_post(
      url := 'https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/unipile-poll-messages',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', 'nfstay-poll-2026-04-27-shared-secret'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
