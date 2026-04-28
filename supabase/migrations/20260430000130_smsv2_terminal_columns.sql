-- ============================================================================
-- SMSV2 / CRM — terminal pipeline columns + queue cleanup on outcome
-- (PR 123, Hugo 2026-04-28)
--
-- Why:
--   Hugo: "I have a contact already marked Not interested but they're
--   back on the queue as a next." Reproduced: wk_apply_outcome moves
--   wk_contacts.pipeline_column_id to "Not interested", but the
--   matching wk_dialer_queue row stays at whatever status it was
--   ('connected' or, after a Pause/Stop revert, back to 'pending').
--   The picker re-selects the contact on the next dial burst.
--
--   Two-layer fix:
--     1. Mark "Not interested", "Closed", "No pickup" as terminal so
--        every system can detect them by attribute, not by name match.
--     2. Update wk_apply_outcome to set the queue row to 'done' when
--        the chosen column is terminal.
--     3. Update wk_pick_next_lead with a defence-in-depth predicate so
--        even old queue rows whose contact was later moved to a
--        terminal column never get re-picked.
-- ============================================================================

-- 1. Add the boolean.
ALTER TABLE wk_pipeline_columns
  ADD COLUMN IF NOT EXISTS is_terminal boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN wk_pipeline_columns.is_terminal IS
  'True when moving a contact to this column ends the dial cycle (Not interested, Closed, No pickup). PR 123.';

-- 2. Mark seeded terminal columns. Match by lowercased name on the
--    workspace pipeline so admins renaming the column doesn't break
--    semantics (they can re-flag manually if they want a custom one).
DO $$
DECLARE
  pl_id uuid;
BEGIN
  SELECT id INTO pl_id FROM wk_pipelines WHERE scope = 'workspace' ORDER BY created_at LIMIT 1;
  IF pl_id IS NULL THEN
    RAISE NOTICE 'No workspace pipeline yet — skipping terminal-column flagging';
    RETURN;
  END IF;

  UPDATE wk_pipeline_columns
     SET is_terminal = true
   WHERE pipeline_id = pl_id
     AND LOWER(name) IN ('not interested', 'closed', 'no pickup');
END $$;

-- 3. Patch wk_apply_outcome: when the chosen column is terminal, mark
--    every pending/dialing/connected queue row for the contact as
--    'done' so it never gets picked again. Other behaviour unchanged.
CREATE OR REPLACE FUNCTION wk_apply_outcome(
  p_call_id      uuid,
  p_contact_id   uuid,
  p_column_id    uuid,
  p_agent_note   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_auto record;
  v_applied text[] := ARRAY[]::text[];
  v_template_body text;
  v_contact_name text;
  v_is_terminal boolean := false;
BEGIN
  IF NOT wk_is_admin() THEN
    IF NOT EXISTS (SELECT 1 FROM wk_calls WHERE id = p_call_id AND agent_id = v_actor) THEN
      RAISE EXCEPTION 'forbidden: not your call';
    END IF;
  END IF;

  SELECT is_terminal INTO v_is_terminal
    FROM wk_pipeline_columns WHERE id = p_column_id;

  UPDATE wk_calls
     SET disposition_column_id = p_column_id,
         agent_note            = COALESCE(p_agent_note, agent_note)
   WHERE id = p_call_id;

  IF p_contact_id IS NOT NULL THEN
    UPDATE wk_contacts
       SET pipeline_column_id = p_column_id,
           updated_at = now()
     WHERE id = p_contact_id;
  END IF;

  -- PR 123: terminal-column outcome — finalise every active queue row
  -- for this contact so the picker never re-selects them.
  IF COALESCE(v_is_terminal, false) AND p_contact_id IS NOT NULL THEN
    UPDATE wk_dialer_queue
       SET status = 'done',
           agent_id = NULL
     WHERE contact_id = p_contact_id
       AND status IN ('pending', 'dialing', 'connected');
    v_applied := array_append(v_applied, 'queue_terminated');
  END IF;

  INSERT INTO wk_activities (contact_id, agent_id, call_id, kind, title, meta)
  VALUES (p_contact_id, v_actor, p_call_id, 'outcome_applied',
          'Outcome applied',
          jsonb_build_object('column_id', p_column_id, 'note', p_agent_note));
  v_applied := array_append(v_applied, 'activity_logged');

  SELECT * INTO v_auto
    FROM wk_pipeline_automations
   WHERE column_id = p_column_id;

  IF v_auto.column_id IS NULL THEN
    RETURN jsonb_build_object('applied', to_jsonb(v_applied), 'column_id', p_column_id);
  END IF;

  SELECT name INTO v_contact_name FROM wk_contacts WHERE id = p_contact_id;

  IF v_auto.send_sms AND v_auto.sms_template_id IS NOT NULL AND p_contact_id IS NOT NULL THEN
    SELECT body_md INTO v_template_body
      FROM wk_sms_templates WHERE id = v_auto.sms_template_id;
    IF v_template_body IS NOT NULL THEN
      INSERT INTO wk_jobs (kind, payload)
      VALUES ('send_sms', jsonb_build_object(
        'contact_id', p_contact_id,
        'template_id', v_auto.sms_template_id,
        'body', v_template_body,
        'agent_id', v_actor
      ));
      v_applied := array_append(v_applied, 'sms_queued');
    END IF;
  END IF;

  IF v_auto.create_task AND v_auto.task_title IS NOT NULL AND p_contact_id IS NOT NULL THEN
    INSERT INTO wk_tasks (contact_id, assignee_id, title, due_at, created_by)
    VALUES (p_contact_id, v_actor, v_auto.task_title,
            now() + make_interval(hours => COALESCE(v_auto.task_due_in_hours, 24)),
            v_actor);
    v_applied := array_append(v_applied, 'task_created');
  END IF;

  IF v_auto.retry_dial AND v_auto.retry_in_hours IS NOT NULL AND p_contact_id IS NOT NULL
     AND NOT COALESCE(v_is_terminal, false) THEN
    -- PR 123: retry-dial only fires for NON-terminal columns. A
    -- terminal column ending in retry_dial=true would create a
    -- contradiction (queue was just terminated above).
    INSERT INTO wk_dialer_queue (campaign_id, contact_id, status, scheduled_for, priority)
    SELECT campaign_id, p_contact_id, 'pending',
           now() + make_interval(hours => v_auto.retry_in_hours), 5
      FROM wk_calls WHERE id = p_call_id;
    v_applied := array_append(v_applied, 'retry_queued');
  END IF;

  IF v_auto.add_tag AND v_auto.tag IS NOT NULL AND p_contact_id IS NOT NULL THEN
    INSERT INTO wk_contact_tags (contact_id, tag, added_by)
    VALUES (p_contact_id, v_auto.tag, v_actor)
    ON CONFLICT DO NOTHING;
    v_applied := array_append(v_applied, 'tag_added');
  END IF;

  IF v_auto.move_to_pipeline_id IS NOT NULL AND p_contact_id IS NOT NULL THEN
    UPDATE wk_contacts
       SET pipeline_column_id = (
             SELECT id FROM wk_pipeline_columns
              WHERE pipeline_id = v_auto.move_to_pipeline_id
              ORDER BY sort_order ASC LIMIT 1
           ),
           updated_at = now()
     WHERE id = p_contact_id;
    v_applied := array_append(v_applied, 'pipeline_moved');
  END IF;

  RETURN jsonb_build_object('applied', to_jsonb(v_applied), 'column_id', p_column_id);
END;
$$;

REVOKE ALL ON FUNCTION wk_apply_outcome(uuid, uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wk_apply_outcome(uuid, uuid, uuid, text) TO authenticated, service_role;

-- 4. Defence in depth: wk_pick_next_lead also skips contacts whose
--    current pipeline_column_id is terminal. Catches edge cases where
--    a queue row was created BEFORE the contact was moved to terminal.
CREATE OR REPLACE FUNCTION wk_pick_next_lead(
  p_agent_id    uuid,
  p_campaign_id uuid DEFAULT NULL
)
RETURNS TABLE (
  queue_id    uuid,
  contact_id  uuid,
  campaign_id uuid,
  attempts    integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT q.id
      FROM wk_dialer_queue q
      LEFT JOIN wk_contacts c ON c.id = q.contact_id
      LEFT JOIN wk_pipeline_columns col ON col.id = c.pipeline_column_id
     WHERE q.status = 'pending'
       AND q.attempts < 3
       AND (p_campaign_id IS NULL OR q.campaign_id = p_campaign_id)
       AND (q.scheduled_for IS NULL OR q.scheduled_for <= now())
       AND COALESCE(col.is_terminal, false) = false
     ORDER BY q.priority DESC NULLS LAST, q.scheduled_for ASC NULLS FIRST, q.attempts ASC
     LIMIT 1
     FOR UPDATE SKIP LOCKED
  )
  UPDATE wk_dialer_queue q
     SET status = 'dialing',
         agent_id = p_agent_id,
         attempts = q.attempts + 1
   FROM picked p
   WHERE q.id = p.id
   RETURNING q.id, q.contact_id, q.campaign_id, q.attempts;
END;
$$;

REVOKE ALL ON FUNCTION wk_pick_next_lead(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wk_pick_next_lead(uuid, uuid) TO authenticated, service_role;

-- 5. Backfill: every existing pending queue row whose contact is
--    already in a terminal column should be marked done so the panel
--    immediately reflects reality after this migration runs.
UPDATE wk_dialer_queue q
   SET status = 'done',
       agent_id = NULL
  FROM wk_contacts c
  JOIN wk_pipeline_columns col ON col.id = c.pipeline_column_id
 WHERE q.contact_id = c.id
   AND q.status IN ('pending', 'dialing', 'connected')
   AND col.is_terminal = true;
