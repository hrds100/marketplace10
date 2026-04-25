-- ============================================================================
-- SMSV2 — Phase 1 outcome engine + lead picker RPCs
-- Implements the "CALL → DECIDE → CLICK → AUTO EVERYTHING" rule from §0.6.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- wk_apply_outcome(call_id, contact_id, column_id, agent_note)
-- The transactional click handler. All automation runs in one BEGIN…COMMIT.
-- Returns: jsonb { applied: ['sms_queued','task_created',...], column_id }
-- ----------------------------------------------------------------------------
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
BEGIN
  -- The agent must own the call (RLS check, mirrored explicitly here)
  IF NOT wk_is_admin() THEN
    IF NOT EXISTS (SELECT 1 FROM wk_calls WHERE id = p_call_id AND agent_id = v_actor) THEN
      RAISE EXCEPTION 'forbidden: not your call';
    END IF;
  END IF;

  -- 1. Update the call
  UPDATE wk_calls
     SET disposition_column_id = p_column_id,
         agent_note            = COALESCE(p_agent_note, agent_note)
   WHERE id = p_call_id;

  -- 2. Move the contact to the new pipeline column
  IF p_contact_id IS NOT NULL THEN
    UPDATE wk_contacts
       SET pipeline_column_id = p_column_id,
           updated_at = now()
     WHERE id = p_contact_id;
  END IF;

  -- 3. Activity timeline write
  INSERT INTO wk_activities (contact_id, agent_id, call_id, kind, title, meta)
  VALUES (p_contact_id, v_actor, p_call_id, 'outcome_applied',
          'Outcome applied',
          jsonb_build_object('column_id', p_column_id, 'note', p_agent_note));
  v_applied := array_append(v_applied, 'activity_logged');

  -- 4. Read automations for this column
  SELECT * INTO v_auto
    FROM wk_pipeline_automations
   WHERE column_id = p_column_id;

  IF v_auto.column_id IS NULL THEN
    -- No automations row → just the move + activity
    RETURN jsonb_build_object('applied', to_jsonb(v_applied), 'column_id', p_column_id);
  END IF;

  SELECT name INTO v_contact_name FROM wk_contacts WHERE id = p_contact_id;

  -- 4a. Send SMS
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

  -- 4b. Create task
  IF v_auto.create_task AND v_auto.task_title IS NOT NULL AND p_contact_id IS NOT NULL THEN
    INSERT INTO wk_tasks (contact_id, assignee_id, title, due_at, created_by)
    VALUES (p_contact_id, v_actor, v_auto.task_title,
            now() + make_interval(hours => COALESCE(v_auto.task_due_in_hours, 24)),
            v_actor);
    v_applied := array_append(v_applied, 'task_created');
  END IF;

  -- 4c. Retry dial — schedule another queue entry
  IF v_auto.retry_dial AND v_auto.retry_in_hours IS NOT NULL AND p_contact_id IS NOT NULL THEN
    INSERT INTO wk_dialer_queue (campaign_id, contact_id, status, scheduled_for, priority)
    SELECT campaign_id, p_contact_id, 'pending',
           now() + make_interval(hours => v_auto.retry_in_hours), 5
      FROM wk_calls WHERE id = p_call_id;
    v_applied := array_append(v_applied, 'retry_queued');
  END IF;

  -- 4d. Add tag
  IF v_auto.add_tag AND v_auto.tag IS NOT NULL AND p_contact_id IS NOT NULL THEN
    INSERT INTO wk_contact_tags (contact_id, tag, added_by)
    VALUES (p_contact_id, v_auto.tag, v_actor)
    ON CONFLICT DO NOTHING;
    v_applied := array_append(v_applied, 'tag_added');
  END IF;

  -- 4e. Move to a different pipeline (hand-off) — pick that pipeline's first column
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

-- ----------------------------------------------------------------------------
-- wk_pick_next_lead(agent_id, campaign_id) — atomic SKIP-LOCKED next-lead picker.
-- Returns the contact + queue row, marking the queue row 'dialing'.
-- ----------------------------------------------------------------------------
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
    SELECT id
      FROM wk_dialer_queue q
     WHERE q.status = 'pending'
       AND (p_campaign_id IS NULL OR q.campaign_id = p_campaign_id)
       AND (q.scheduled_for IS NULL OR q.scheduled_for <= now())
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

-- ----------------------------------------------------------------------------
-- Hot-lead recompute — called by pg_cron every 5 minutes
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION wk_recompute_hot_leads()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH counts AS (
    SELECT contact_id, COUNT(*) AS n
      FROM wk_activities
     WHERE created_at >= now() - interval '7 days'
     GROUP BY contact_id
  )
  UPDATE wk_contacts c
     SET is_hot = COALESCE(counts.n, 0) >= 3
   FROM counts
   WHERE c.id = counts.contact_id
     AND (c.is_hot <> (counts.n >= 3));
$$;

REVOKE ALL ON FUNCTION wk_recompute_hot_leads() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wk_recompute_hot_leads() TO service_role;

-- Schedule the hot-lead job
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('wk-hot-recompute')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'wk-hot-recompute');
    PERFORM cron.schedule(
      'wk-hot-recompute',
      '*/5 * * * *',
      $cron$ SELECT wk_recompute_hot_leads(); $cron$
    );
  END IF;
END $$;
