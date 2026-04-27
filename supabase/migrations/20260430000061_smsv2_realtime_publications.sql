-- 20260430000061_smsv2_realtime_publications
-- PR 96 follow-on (Hugo 2026-04-28).
--
-- Several tables had realtime subscriptions in the frontend (PR 88 added
-- wk_sms_templates; PR 96 added wk_pipeline_columns, wk_pipeline_automations,
-- wk_numbers) but the tables were never added to the supabase_realtime
-- publication, so INSERT/UPDATE/DELETE events never reached the client.
--
-- Symptom (Hugo's e2e test): renaming a pipeline column in Settings did
-- not propagate to /crm/pipelines or /crm/contacts without a hard refresh.
--
-- This migration is idempotent — wrapped in DO blocks that swallow the
-- "table is already in publication" duplicate error.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE wk_pipeline_columns;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE wk_pipeline_automations;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE wk_numbers;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE wk_sms_templates;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE wk_dialer_campaigns;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Verify by querying:
--   SELECT tablename FROM pg_publication_tables
--   WHERE pubname = 'supabase_realtime' ORDER BY tablename;
