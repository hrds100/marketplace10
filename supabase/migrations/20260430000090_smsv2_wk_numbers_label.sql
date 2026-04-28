-- 20260430000090_smsv2_wk_numbers_label
-- PR 115 (Hugo 2026-04-28).
--
-- Hugo asked for an editable label per channel row in Settings →
-- Channels so admins can write notes (e.g. "Free for any agent" /
-- "Trial line" / "Belongs to Elijah"). Cosmetic — does not affect
-- any send-routing logic.

ALTER TABLE wk_numbers
  ADD COLUMN IF NOT EXISTS label text;

-- realtime publication already covers wk_numbers (PR 97).
