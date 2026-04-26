-- ============================================================================
-- SMSV2 — wk_terminologies categories (PR 11, Hugo 2026-04-26)
--
-- Why:
--   Hugo wants col 4 of the live-call screen to show two tabs side by
--   side: Glossary (term definitions — JV, HMO, finder's fee, gross
--   yield, etc) and Objections (caller pushback Q&A — "what's the
--   catch?", "have you done this before?", etc).
--
--   PR C seeded all 12 objections into wk_terminologies. They now need
--   a category to live in. Backfill: anything whose `term` starts with
--   a question mark / is recognisably a question goes to 'objection',
--   everything else to 'glossary'.
-- ============================================================================

-- 1) Column

ALTER TABLE wk_terminologies
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'glossary'
  CHECK (category IN ('glossary', 'objection'));

CREATE INDEX IF NOT EXISTS wk_terminologies_category_idx
  ON wk_terminologies (category, sort_order, term)
  WHERE is_active = true;

COMMENT ON COLUMN wk_terminologies.category IS
  'glossary = term definitions (JV, HMO, finder''s fee). objection = caller pushback Q&A surfaced as a separate tab in the live-call glossary pane.';

-- 2) Backfill — promote known PR C objection seed rows to category =
--    'objection'. The 12 seed terms all end with "?" so the heuristic
--    is exact: anything ending in "?" becomes an objection. Everything
--    else stays at the default 'glossary'.

UPDATE wk_terminologies
   SET category = 'objection'
 WHERE category = 'glossary'
   AND term ~ '\?\s*$';
