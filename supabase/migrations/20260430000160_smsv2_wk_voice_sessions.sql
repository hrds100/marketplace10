-- ============================================================================
-- SMSV2 / CRM — wk_voice_sessions (PR 143, Hugo 2026-04-28)
--
-- Problem: every browser tab that signs in as the same user mints a Twilio
-- Voice Client token with `identity = user.id`. Twilio's gateway evicts
-- the older client when a new one registers with the same identity,
-- firing `error 31005 HANGUP` to the loser. With multiple hub.nfstay.com
-- tabs open the dialer's Device gets continuously evicted → "Connection
-- lost (31005)" loop, calls drop mid-ring.
--
-- Fix: suffix the Twilio identity with a per-tab session UUID so each
-- tab is a distinct gateway client. To still support inbound + parallel-
-- dial routing (which need a SINGLE deterministic <Client> to ring), we
-- track each user's MOST RECENT session here. wk-voice-token UPSERTs on
-- every token mint; wk-voice-twiml-incoming and wk-voice-twiml-outgoing
-- (parallel-dial branch) read this table to know who to ring.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.wk_voice_sessions (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id   text NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wk_voice_sessions_last_seen_idx
  ON public.wk_voice_sessions(last_seen_at);

-- Edge functions hit this table with the service role key. The browser
-- never reads it directly — agents have no need to. RLS denies-by-default.
ALTER TABLE public.wk_voice_sessions ENABLE ROW LEVEL SECURITY;
