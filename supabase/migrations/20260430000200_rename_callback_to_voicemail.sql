-- Rename "Callback" pipeline column to "Voicemail"
UPDATE wk_pipeline_columns
SET name = 'Voicemail'
WHERE LOWER(name) = 'callback';
