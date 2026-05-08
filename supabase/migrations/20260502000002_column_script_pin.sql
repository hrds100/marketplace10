-- ============================================================================
-- SMSV2 / CRM — Per-column script pin (Hugo 2026-05-02)
--
-- Why:
--   Hugo wants each pipeline column (stage) to have its own call script.
--   When an agent calls a lead in the "Follow-Up" column, the dialer
--   loads the follow-up script + coach automatically. No manual mode
--   switching — the lead's position in the pipeline decides.
--
-- Resolution chain (updated):
--   agent own > COLUMN-PINNED > campaign-pinned > workspace default
--
-- Also adds coach prompt override columns per column, same pattern
-- as wk_campaign_ai_settings.
-- ============================================================================

-- ─── Part A: add call_script_id to wk_pipeline_columns ──────────────

ALTER TABLE wk_pipeline_columns
  ADD COLUMN IF NOT EXISTS call_script_id uuid
    REFERENCES wk_call_scripts(id) ON DELETE SET NULL;

ALTER TABLE wk_pipeline_columns
  ADD COLUMN IF NOT EXISTS coach_style_prompt text;

ALTER TABLE wk_pipeline_columns
  ADD COLUMN IF NOT EXISTS coach_script_prompt text;

COMMENT ON COLUMN wk_pipeline_columns.call_script_id IS
  'Pin a specific call script to this pipeline column. Leads in this column get this script. NULL = inherit from campaign or workspace default.';

COMMENT ON COLUMN wk_pipeline_columns.coach_style_prompt IS
  'Override coach style prompt for calls to leads in this column. NULL = inherit.';

COMMENT ON COLUMN wk_pipeline_columns.coach_script_prompt IS
  'Override coach script prompt for calls to leads in this column. NULL = inherit.';
