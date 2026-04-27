-- ============================================================================
-- SMSV2 — Per-call current_stage cursor (PR 42, Hugo 2026-04-27)
--
-- Why:
--   Hugo's screenshot 2026-04-27: the live coach fired SCRIPT — Open
--   ("Hi, it's Hugo from NFSTAY...") as the LATEST card mid-call,
--   even though the conversation was clearly past the opener (caller
--   had answered, said no minutes, agreed to 3pm callback). The
--   v10 prompt classifies each utterance independently so the model
--   has no way to know "we're already in PERMISSION TO PITCH; don't
--   regress to OPEN".
--
--   This migration adds wk_calls.current_stage. The edge fn
--   (wk-voice-transcription) updates it whenever it emits a SCRIPT
--   card, and reads it back on the next generation to inject into
--   the prompt: "your previous SCRIPT card was at QUALIFY; do not
--   fire OPEN unless the caller explicitly hangs up + restarts."
-- ============================================================================

ALTER TABLE wk_calls
  ADD COLUMN IF NOT EXISTS current_stage text NULL;

COMMENT ON COLUMN wk_calls.current_stage IS
  'PR 42: human label of the last SCRIPT-kind coach card''s script_section (Open / Qualify / Permission to pitch / Pitch / Returns / SMS close / Follow-up lock). Read by the coach prompt to enforce forward-only stage progression.';

-- No backfill needed — existing calls just have NULL until the next
-- coach generation writes one.
