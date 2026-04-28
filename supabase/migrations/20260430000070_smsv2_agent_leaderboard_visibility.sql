-- PR 109 (Hugo 2026-04-28): per-agent toggle for leaderboard visibility.
-- Admins can hide an agent from the public leaderboard (mini widget on
-- the top nav and the full /crm/leaderboard page). Defaults to TRUE so
-- existing agents stay visible until an admin opts them out.

ALTER TABLE wk_voice_agent_limits
  ADD COLUMN IF NOT EXISTS show_on_leaderboard boolean NOT NULL DEFAULT true;

-- No index — wk_voice_agent_limits has one row per agent (~10s typical),
-- so a sequential scan with a column predicate is cheap.

COMMENT ON COLUMN wk_voice_agent_limits.show_on_leaderboard IS
  'PR 109: when false, agent is hidden from the leaderboard UI surfaces. Default true.';
