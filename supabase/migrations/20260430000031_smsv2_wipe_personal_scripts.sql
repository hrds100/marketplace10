-- ============================================================================
-- SMSV2 — Wipe personal call-script copies → everyone inherits v6 (PR 66)
-- Hugo 2026-04-27.
--
-- Why:
--   PR 65 shipped script v6 (no early exit, payouts to bank). Hugo:
--   "we don't have agents yet, just testing agents — make sure
--    everyone has this version."
--
--   useAgentScript resolves the agent's OWN row first (wk_call_scripts
--   WHERE owner_agent_id = auth.uid()), so anyone who'd opened the
--   EditScriptModal during testing has a stale personal copy that
--   masks v6. Cleanup: DELETE all personal rows. The default row
--   (owner_agent_id IS NULL, is_default = true) was UPDATEd to v6
--   in migration 20260430000029 — agents will fall through to it
--   on next render.
--
--   Safe because:
--     - Live agents haven't been onboarded yet (Hugo confirmed
--       2026-04-27).
--     - Personal copies were created during testing only.
--     - The default script is preserved (DELETE filtered to
--       owner_agent_id IS NOT NULL).
--     - Agents can re-customise from scratch later by clicking
--       Edit script in the live-call screen.
-- ============================================================================

DELETE FROM wk_call_scripts
 WHERE owner_agent_id IS NOT NULL;
