-- ============================================================================
-- SMSV2 / CRM — Live-call supervisor (Listen + Whisper) (PR 59)
-- Hugo 2026-04-27.
--
-- Why:
--   Admin needs to LISTEN (silent monitor) and WHISPER (talk only to
--   agent) on a live call. Twilio's coaching feature requires the
--   call to be in a Conference, but the existing direct <Dial><Client>
--   bridge isn't. Rather than refactor every voice call to use
--   Conference up-front (high blast radius), we use Twilio's Modify
--   Call API at request time:
--
--     1. Admin clicks Listen / Whisper in WatchAgentModal.
--     2. wk-supervisor-join (new edge fn):
--          - generates conference_friendly_name = 'crm-call-<call_id>'
--          - modifies the contact leg to redirect into that Conference
--          - modifies the agent leg to redirect into that Conference
--          - originates a new <Client> call to the admin's browser with
--            Conference TwiML (muted=true for listen; coaching=true
--            callSidToCoach=<agent_sid> for whisper)
--     3. Existing direct-dial paths are untouched until an admin
--        actively starts a supervisor session.
--
-- This migration adds the column we need to track the conference name
-- + which leg's CallSid to coach.
-- ============================================================================

ALTER TABLE wk_calls
  ADD COLUMN IF NOT EXISTS conference_friendly_name text,
  ADD COLUMN IF NOT EXISTS contact_twilio_call_sid text,
  ADD COLUMN IF NOT EXISTS agent_twilio_call_sid text;

COMMENT ON COLUMN wk_calls.conference_friendly_name IS
  'PR 59 (2026-04-27): name of the Twilio Conference both legs are bridged into when an admin starts a supervisor session. NULL on calls that never had a supervisor join (the default direct <Dial><Client> path).';

COMMENT ON COLUMN wk_calls.agent_twilio_call_sid IS
  'PR 59: the agent-side leg''s CallSid. Required for Conference coaching="true" callSidToCoach=<this> so whisper audio reaches only the agent.';

COMMENT ON COLUMN wk_calls.contact_twilio_call_sid IS
  'PR 59: the contact-side leg''s CallSid (the inbound/outbound PSTN leg, distinct from the agent''s <Client> leg).';
