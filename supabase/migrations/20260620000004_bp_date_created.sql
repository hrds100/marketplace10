-- ============================================================================
-- Surface BP's original DateCreated / DateEdited on agreement rows so the
-- "Date Created" column in /agreements shows when the proposal was created
-- in Better Proposals, not when we imported it.
-- ============================================================================

ALTER TABLE agreements
  ADD COLUMN IF NOT EXISTS bp_date_created timestamptz,
  ADD COLUMN IF NOT EXISTS bp_date_edited timestamptz;

CREATE INDEX IF NOT EXISTS agreements_bp_date_created_idx
  ON agreements(bp_date_created DESC NULLS LAST);
