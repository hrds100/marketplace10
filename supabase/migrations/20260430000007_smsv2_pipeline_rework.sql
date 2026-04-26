-- ============================================================================
-- SMSV2 — Pipeline rework + follow-up timer schema (PR 18, Hugo 2026-04-26)
--
-- Why:
--   Hugo on a real call: "Wrong number you can delete. Voicemail
--   delete because you can just use no pickup. We need a column called
--   Nurturing — they should have a follow-up time, and notes for what
--   to do on the follow-up. Callback should also have a timer.
--   Interested too. The follow-up time triggers a banner that stays
--   on top of the screen, expandable, with call/SMS buttons."
--
--   This migration ships the schema piece. The banner UI lands in
--   PR 19. The Settings → Pipelines tab will gain timer configuration
--   in a follow-up.
--
-- What this migration does:
--   1. Default pipeline: replace Voicemail + Wrong number with
--      Nurturing. Final column set: Interested, Callback, No pickup,
--      Not interested, Nurturing. (Admins can still add Wrong number
--      / Voicemail / anything else manually via Settings.)
--   2. Drop auto-SMS / auto-task / auto-tag automation from the
--      default columns. Hugo's call: "the outcome should not have like
--      SMS plus task plus whatever — you just put on the pipeline that
--      they want." SMS now goes through the mid-call sender (PR 16,
--      mandatory stage). Outcome cards = pure pipeline routing.
--   3. New table wk_contact_followups for agent-scheduled timer
--      follow-ups (Nurturing, Callback, Interested all support these).
--   4. Add column wk_pipeline_columns.requires_followup boolean —
--      tells the UI which stages must collect a follow-up time before
--      the move is committed.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. wk_pipeline_columns.requires_followup
-- ----------------------------------------------------------------------------

ALTER TABLE wk_pipeline_columns
  ADD COLUMN IF NOT EXISTS requires_followup boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN wk_pipeline_columns.requires_followup IS
  'When true, the agent must pick a follow-up datetime + optional note before the contact moves into this column. The follow-up surfaces in the persistent banner (PR 19) until dismissed or done.';

-- ----------------------------------------------------------------------------
-- 2. Default pipeline rework — Nurturing in, Voicemail + Wrong number out
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  pl_id uuid;
  col_voicemail_id uuid;
  col_wrong_id uuid;
  col_interested_id uuid;
  col_callback_id uuid;
  col_nurturing_id uuid;
  col_nopickup_id uuid;
  col_notint_id uuid;
  max_pos integer;
  max_sort integer;
BEGIN
  -- Only touch the seeded default workspace pipeline.
  SELECT id INTO pl_id FROM wk_pipelines WHERE scope = 'workspace' ORDER BY created_at LIMIT 1;
  IF pl_id IS NULL THEN
    RAISE NOTICE 'wk_pipelines: no workspace pipeline yet — skipping rework';
    RETURN;
  END IF;

  -- Drop Voicemail + Wrong number from the default seed. Both have
  -- ON DELETE CASCADE on wk_pipeline_automations and ON DELETE SET
  -- NULL on wk_contacts.pipeline_column_id + wk_calls.disposition_-
  -- column_id, so this is safe.
  SELECT id INTO col_voicemail_id FROM wk_pipeline_columns
   WHERE pipeline_id = pl_id AND LOWER(name) = 'voicemail';
  SELECT id INTO col_wrong_id FROM wk_pipeline_columns
   WHERE pipeline_id = pl_id AND LOWER(name) = 'wrong number';

  IF col_voicemail_id IS NOT NULL THEN
    DELETE FROM wk_pipeline_columns WHERE id = col_voicemail_id;
  END IF;
  IF col_wrong_id IS NOT NULL THEN
    DELETE FROM wk_pipeline_columns WHERE id = col_wrong_id;
  END IF;

  -- Resolve remaining column ids for the automation cleanup below.
  SELECT id INTO col_interested_id FROM wk_pipeline_columns
   WHERE pipeline_id = pl_id AND LOWER(name) = 'interested';
  SELECT id INTO col_callback_id FROM wk_pipeline_columns
   WHERE pipeline_id = pl_id AND LOWER(name) = 'callback';
  SELECT id INTO col_nopickup_id FROM wk_pipeline_columns
   WHERE pipeline_id = pl_id AND LOWER(name) = 'no pickup';
  SELECT id INTO col_notint_id FROM wk_pipeline_columns
   WHERE pipeline_id = pl_id AND LOWER(name) = 'not interested';

  -- Add Nurturing — only if it doesn't already exist.
  SELECT id INTO col_nurturing_id FROM wk_pipeline_columns
   WHERE pipeline_id = pl_id AND LOWER(name) = 'nurturing';
  IF col_nurturing_id IS NULL THEN
    SELECT COALESCE(MAX(position), 0), COALESCE(MAX(sort_order), 0)
      INTO max_pos, max_sort
      FROM wk_pipeline_columns WHERE pipeline_id = pl_id;
    INSERT INTO wk_pipeline_columns (
      pipeline_id, name, colour, position, sort_order, requires_followup
    )
    VALUES (
      pl_id, 'Nurturing', '#8B5CF6', max_pos + 1, max_sort + 1, true
    )
    RETURNING id INTO col_nurturing_id;

    INSERT INTO wk_pipeline_automations (column_id, send_sms, create_task, retry_dial, add_tag)
    VALUES (col_nurturing_id, false, false, false, false);
  END IF;

  -- Mark Callback + Interested as requires_followup = true. Both
  -- need a timer the agent fills in when moving the contact.
  IF col_callback_id IS NOT NULL THEN
    UPDATE wk_pipeline_columns
       SET requires_followup = true
     WHERE id = col_callback_id;
  END IF;
  IF col_interested_id IS NOT NULL THEN
    UPDATE wk_pipeline_columns
       SET requires_followup = true
     WHERE id = col_interested_id;
  END IF;

  -- 3. Strip auto-SMS / auto-task / auto-tag from the default
  -- automations. Hugo's call: outcome cards are pure stage moves now.
  -- The mid-call SMS sender (PR 16, mandatory stage) is the only path
  -- for SMS. Tags / tasks / retries can be re-enabled per column from
  -- Settings later if Hugo decides he wants them back.
  UPDATE wk_pipeline_automations
     SET send_sms = false,
         sms_template_id = NULL,
         create_task = false,
         task_title = NULL,
         task_due_in_hours = NULL,
         retry_dial = false,
         retry_in_hours = NULL,
         add_tag = false,
         tag = NULL
   WHERE column_id IN (
     col_interested_id, col_callback_id, col_nopickup_id,
     col_notint_id, col_nurturing_id
   );
END $$;

-- ----------------------------------------------------------------------------
-- 3. wk_contact_followups — agent-scheduled timer follow-ups
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS wk_contact_followups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      uuid NOT NULL REFERENCES wk_contacts(id) ON DELETE CASCADE,
  agent_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  column_id       uuid REFERENCES wk_pipeline_columns(id) ON DELETE SET NULL,
  call_id         uuid REFERENCES wk_calls(id) ON DELETE SET NULL,
  due_at          timestamptz NOT NULL,
  note            text,
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'done', 'dismissed', 'snoozed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wk_contact_followups_due_idx
  ON wk_contact_followups (agent_id, due_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS wk_contact_followups_contact_idx
  ON wk_contact_followups (contact_id, due_at);

ALTER TABLE wk_contact_followups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wk_contact_followups_agent_owns ON wk_contact_followups;
CREATE POLICY wk_contact_followups_agent_owns ON wk_contact_followups
  FOR ALL TO authenticated
  USING (wk_is_admin() OR agent_id = auth.uid())
  WITH CHECK (wk_is_admin() OR agent_id = auth.uid());

DROP TRIGGER IF EXISTS wk_contact_followups_updated_at ON wk_contact_followups;
CREATE TRIGGER wk_contact_followups_updated_at
  BEFORE UPDATE ON wk_contact_followups
  FOR EACH ROW EXECUTE FUNCTION wk_set_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'wk_contact_followups'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE wk_contact_followups';
  END IF;
END $$;

COMMENT ON TABLE wk_contact_followups IS
  'Agent-scheduled timer follow-ups. Created when an agent moves a contact into a stage with requires_followup = true (Nurturing, Callback, Interested). Surfaced in the persistent banner UI (PR 19) until done or dismissed.';
