-- /sms multi-pipeline: lets operators create separate pipelines (e.g.
-- "Plumber") with their own columns, instead of one global stage list.
--
-- Mirrors the /crm side (wk_pipelines + wk_pipeline_columns). Existing
-- stages are preserved and assigned to a default "Main" pipeline so the
-- UI keeps working unchanged. A second "Plumber" pipeline is seeded
-- with starter columns Hugo asked for.

CREATE TABLE IF NOT EXISTS sms_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sms_pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY sms_pipelines_admin ON sms_pipelines
  FOR ALL
  USING ((auth.jwt() ->> 'email') = ANY (ARRAY[
    'admin@hub.nfstay.com',
    'hugo@nfstay.com',
    'hugodesouzax@gmail.com',
    'hugords100@gmail.com',
    'hugo24eu@gmail.com'
  ]))
  WITH CHECK ((auth.jwt() ->> 'email') = ANY (ARRAY[
    'admin@hub.nfstay.com',
    'hugo@nfstay.com',
    'hugodesouzax@gmail.com',
    'hugords100@gmail.com',
    'hugo24eu@gmail.com'
  ]));

INSERT INTO sms_pipelines (name, position) VALUES ('Main', 0) ON CONFLICT DO NOTHING;
INSERT INTO sms_pipelines (name, position) VALUES ('Plumber', 1) ON CONFLICT DO NOTHING;

ALTER TABLE sms_pipeline_stages
  ADD COLUMN IF NOT EXISTS pipeline_id uuid REFERENCES sms_pipelines(id) ON DELETE CASCADE;

UPDATE sms_pipeline_stages
SET pipeline_id = (SELECT id FROM sms_pipelines WHERE name = 'Main' LIMIT 1)
WHERE pipeline_id IS NULL;

WITH plumber AS (SELECT id FROM sms_pipelines WHERE name = 'Plumber' LIMIT 1)
INSERT INTO sms_pipeline_stages (name, position, colour, pipeline_id)
SELECT s.name, s.position, s.colour, (SELECT id FROM plumber)
FROM (VALUES
  ('New Leads',        0, '#1E9A80'),
  ('Contacted',        1, '#8B5CF6'),
  ('Brochure Sent',    2, '#0EA5E9'),
  ('Interested',       3, '#10B981'),
  ('Call Scheduled',   4, '#F59E0B'),
  ('Closed',           5, '#22C55E'),
  ('Not Interested',   6, '#EF4444')
) AS s(name, position, colour)
WHERE NOT EXISTS (
  SELECT 1 FROM sms_pipeline_stages st
  WHERE st.pipeline_id = (SELECT id FROM plumber) AND st.name = s.name
);

ALTER TABLE sms_pipeline_stages ALTER COLUMN pipeline_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS sms_pipeline_stages_pipeline_id_idx
  ON sms_pipeline_stages (pipeline_id, position);
