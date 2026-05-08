-- Swap Proposal Sent (currently pos 7) and Closed (currently pos 6).
-- Hugo wants: Nurturing (5) → Proposal Sent (6) → Closed (7).
-- Use temp position to avoid unique constraint (pipeline_id, position).

UPDATE wk_pipeline_columns SET position = 99, sort_order = 99
WHERE LOWER(name) LIKE 'closed%';

UPDATE wk_pipeline_columns SET position = 6, sort_order = 6
WHERE name = 'Proposal Sent';

UPDATE wk_pipeline_columns SET position = 7, sort_order = 7
WHERE LOWER(name) LIKE 'closed%';
