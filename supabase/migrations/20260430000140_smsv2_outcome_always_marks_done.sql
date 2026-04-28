-- ============================================================================
-- SMSV2 / CRM — every outcome marks the contact's queue row 'done'
-- (PR 124, Hugo 2026-04-28)
--
-- Why:
--   Hugo: "Done 0, but wrong as I have called already." Reproduced —
--   on /crm/dialer the campaign rollup shows "0 done" even after the
--   agent has called + applied outcomes on multiple leads. Cause:
--   wk_apply_outcome only marked queue rows 'done' for TERMINAL
--   outcomes (PR 123); non-terminal outcomes (Callback, Interested,
--   Nurturing) left the queue row at whatever it was (usually
--   'connected'). Connected ≠ Done in the rollup, so the counter
--   stayed at 0.
--
--   Hugo's mental model: "if I've called them and picked an outcome,
--   that's done." Done means "I'm finished with this lead in this
--   campaign for now."
--
-- Fix:
--   Always mark the contact's pending/dialing/connected queue rows in
--   the active campaign as 'done' when an outcome is applied. The
--   retry_dial automation still INSERTs a fresh 'pending' row for
--   future re-dial — that's intentional, separate from the original
--   row's lifecycle. This means:
--
--     - Outcome=Interested → queue row done · maybe new retry row
--     - Outcome=Callback   → queue row done · maybe new retry row
--     - Outcome=Not interested → queue row done · NO retry (terminal)
--     - Outcome=Nurturing  → queue row done · maybe new retry row
-- ============================================================================

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
  v_campaign_id uuid;
BEGIN
  IF NOT wk_is_admin() THEN
    IF NOT EXISTS (SELECT 1 FROM wk_calls WHERE id = p_call_id AND agent_id = v_actor) THEN
      RAISE EXCEPTION 'forbidden: not your call';
    END IF;
  END IF;

  SELECT is_terminal INTO v_is_terminal
    FROM wk_pipeline_columns WHERE id = p_column_id;

  -- Capture the campaign so the queue UPDATE below can scope to it.
  -- Without this we'd mark queue rows in OTHER campaigns done too,
  -- which would silently kill multi-campaign workflows.
  SELECT campaign_id INTO v_campaign_id
    FROM wk_calls WHERE id = p_call_id;

  UPDATE wk_calls
     SET disposition_column_id = p_column_id,
         agent_note            = COALESCE(p_agent_note, agent_note)
   WHERE id = p_call_id;

  -- PR 124: also update last_contact_at so the contacts page shows
  -- a real "Last contact" instead of "—" after every call. Hugo's
  -- complaint: "Last Contact also not true showing — seems almost
  -- nothing is wired for the agents."
  IF p_contact_id IS NOT NULL THEN
    UPDATE wk_contacts
       SET pipeline_column_id = p_column_id,
           last_contact_at = now(),
           updated_at = now()
     WHERE id = p_contact_id;
  END IF;

  -- PR 124: ALWAYS mark this contact's active queue rows in this
  -- campaign as 'done'. Replaces PR 123's terminal-only logic. Every
  -- outcome means "I'm done with this lead for now"; future retry-dial
  -- automation creates a fresh pending row separately below.
  IF p_contact_id IS NOT NULL THEN
    UPDATE wk_dialer_queue
       SET status = 'done',
           agent_id = NULL
     WHERE contact_id = p_contact_id
       AND status IN ('pending', 'dialing', 'connected', 'voicemail')
       AND (v_campaign_id IS NULL OR campaign_id = v_campaign_id);
    v_applied := array_append(v_applied, 'queue_marked_done');
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

  -- retry_dial only fires for NON-terminal columns. For terminal
  -- (Not interested / Closed / No pickup) the queue is permanently
  -- closed.
  IF v_auto.retry_dial AND v_auto.retry_in_hours IS NOT NULL AND p_contact_id IS NOT NULL
     AND NOT COALESCE(v_is_terminal, false) THEN
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

-- Backfill: every queue row whose disposition_column_id has been set
-- (= an outcome was applied for this row's call) but the queue row is
-- still pending/dialing/connected/voicemail. Match by contact + the
-- campaign's most recent call with disposition.
WITH disposed AS (
  SELECT DISTINCT contact_id, campaign_id
    FROM wk_calls
   WHERE disposition_column_id IS NOT NULL
     AND contact_id IS NOT NULL
     AND campaign_id IS NOT NULL
)
UPDATE wk_dialer_queue q
   SET status = 'done',
       agent_id = NULL
  FROM disposed d
 WHERE q.contact_id = d.contact_id
   AND q.campaign_id = d.campaign_id
   AND q.status IN ('pending', 'dialing', 'connected', 'voicemail');

-- ─── last_contact_at auto-update via triggers ─────────────────────────
-- Whenever an outbound message lands or a call gets answered, bump
-- the contact's last_contact_at. Single source of truth for the
-- "Last contact" column on /crm/contacts.

CREATE OR REPLACE FUNCTION wk_touch_last_contact_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only outbound messages count as "we contacted them".
  IF TG_TABLE_NAME = 'wk_sms_messages' THEN
    IF NEW.direction = 'outbound' AND NEW.contact_id IS NOT NULL THEN
      UPDATE wk_contacts
         SET last_contact_at = COALESCE(NEW.created_at, now())
       WHERE id = NEW.contact_id
         AND (last_contact_at IS NULL OR last_contact_at < COALESCE(NEW.created_at, now()));
    END IF;
  ELSIF TG_TABLE_NAME = 'wk_calls' THEN
    -- Update on answered_at OR ended_at (whichever is set first).
    IF NEW.contact_id IS NOT NULL AND (
      (NEW.answered_at IS NOT NULL AND (OLD.answered_at IS NULL OR OLD.answered_at <> NEW.answered_at))
      OR
      (NEW.ended_at IS NOT NULL AND (OLD.ended_at IS NULL OR OLD.ended_at <> NEW.ended_at))
    ) THEN
      UPDATE wk_contacts
         SET last_contact_at = COALESCE(NEW.answered_at, NEW.ended_at, now())
       WHERE id = NEW.contact_id
         AND (last_contact_at IS NULL OR last_contact_at < COALESCE(NEW.answered_at, NEW.ended_at, now()));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wk_sms_messages_touch_contact ON wk_sms_messages;
CREATE TRIGGER wk_sms_messages_touch_contact
  AFTER INSERT ON wk_sms_messages
  FOR EACH ROW EXECUTE FUNCTION wk_touch_last_contact_at();

DROP TRIGGER IF EXISTS wk_calls_touch_contact ON wk_calls;
CREATE TRIGGER wk_calls_touch_contact
  AFTER UPDATE OF answered_at, ended_at ON wk_calls
  FOR EACH ROW EXECUTE FUNCTION wk_touch_last_contact_at();

-- Backfill last_contact_at from the most recent outbound message OR
-- call for each contact. Greatest of the two. NULL contacts keep NULL.
WITH msg_max AS (
  SELECT contact_id, MAX(created_at) AS ts
    FROM wk_sms_messages
   WHERE direction = 'outbound' AND contact_id IS NOT NULL
   GROUP BY contact_id
), call_max AS (
  SELECT contact_id, MAX(GREATEST(COALESCE(answered_at, '-infinity'::timestamptz), COALESCE(ended_at, '-infinity'::timestamptz))) AS ts
    FROM wk_calls
   WHERE contact_id IS NOT NULL
   GROUP BY contact_id
), combined AS (
  SELECT
    COALESCE(m.contact_id, c.contact_id) AS contact_id,
    GREATEST(COALESCE(m.ts, '-infinity'::timestamptz), COALESCE(c.ts, '-infinity'::timestamptz)) AS ts
    FROM msg_max m
    FULL OUTER JOIN call_max c ON c.contact_id = m.contact_id
)
UPDATE wk_contacts wc
   SET last_contact_at = combined.ts
  FROM combined
 WHERE wc.id = combined.contact_id
   AND combined.ts > '-infinity'::timestamptz
   AND (wc.last_contact_at IS NULL OR wc.last_contact_at < combined.ts);

COMMENT ON FUNCTION wk_touch_last_contact_at IS
  'PR 124 (Hugo 2026-04-28): auto-update wk_contacts.last_contact_at on every outbound message or answered/ended call. Powers the /crm/contacts "Last contact" column.';
