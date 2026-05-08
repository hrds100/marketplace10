-- Assign the "Follow-up" coach profile to nurturing / follow-up pipeline columns.
-- These columns should use the follow-up call script, not the default cold-calling v9.

UPDATE wk_pipeline_columns
SET coach_profile_id = (
  SELECT id FROM wk_coach_profiles WHERE name = 'Follow-up' LIMIT 1
)
WHERE LOWER(name) IN ('nurturing', 'follow-up', 'nurturing (msg sent)');
