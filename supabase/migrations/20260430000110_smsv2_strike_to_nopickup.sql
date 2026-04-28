-- ============================================================================
-- SMSV2 / CRM — 3rd-strike contacts auto-route to "No pickup" column
-- (PR 119, Hugo 2026-04-28)
--
-- Why:
--   Today wk_dialer_strike_losers (PR 54) marks a wk_dialer_queue row
--   as 'lost' after 3 unanswered parallel-dial rounds and writes a
--   wk_activities note. The contact's pipeline_column_id stays
--   wherever it was — usually "New Leads" — so the agent never sees
--   the dead leads pile up anywhere.
--
--   Hugo's brief (2026-04-28): "non-answers go to No pickup column".
--   The "No pickup" pipeline column already exists (seeded in
--   20260430000007). We extend the strike RPC to also UPDATE
--   wk_contacts.pipeline_column_id to that column's id whenever a
--   contact crosses the 3-strikes threshold.
--
-- Behaviour:
--   - Contact attempts < 3  → row pushed to back of queue (unchanged)
--   - Contact attempts >= 3 → row marked 'lost' (unchanged)
--                           + contact moved to "No pickup" column (NEW)
--                           + audit note (unchanged)
--   - If "No pickup" column doesn't exist (very unusual) → no-op move,
--     rest of the function still runs.
-- ============================================================================

CREATE OR REPLACE FUNCTION wk_dialer_strike_losers(
  p_campaign_id uuid,
  p_contact_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lost_count integer := 0;
  v_row RECORD;
  v_nopickup_col_id uuid;
BEGIN
  -- Resolve "No pickup" column once per call. Falls back to NULL if
  -- the workspace pipeline doesn't have it (e.g. fresh seed before
  -- 20260430000007 ran) — the UPDATE then no-ops because we guard.
  SELECT c.id INTO v_nopickup_col_id
    FROM wk_pipeline_columns c
    JOIN wk_pipelines p ON p.id = c.pipeline_id
   WHERE p.scope = 'workspace'
     AND LOWER(c.name) = 'no pickup'
   ORDER BY p.created_at
   LIMIT 1;

  FOR v_row IN
    SELECT id, contact_id, attempts, priority
      FROM wk_dialer_queue
     WHERE campaign_id = p_campaign_id
       AND contact_id = ANY(p_contact_ids)
       AND status = 'dialing'
  LOOP
    IF v_row.attempts >= 3 THEN
      UPDATE wk_dialer_queue
         SET status   = 'lost',
             agent_id = NULL
       WHERE id = v_row.id;

      -- PR 119: route the contact's pipeline column to "No pickup" so
      -- the agent sees dead leads in the right column instead of
      -- still sitting in "New Leads".
      IF v_nopickup_col_id IS NOT NULL THEN
        UPDATE wk_contacts
           SET pipeline_column_id = v_nopickup_col_id
         WHERE id = v_row.contact_id;
      END IF;

      INSERT INTO wk_activities (contact_id, agent_id, kind, title, body, ts)
      VALUES (
        v_row.contact_id,
        NULL,
        'note',
        'Auto-lost after 3 attempts',
        'Three parallel-dial losses in a row. Contact moved to No pickup column. Manually requeue from /crm/contacts if needed.',
        now()
      );

      v_lost_count := v_lost_count + 1;
    ELSE
      UPDATE wk_dialer_queue
         SET status   = 'pending',
             agent_id = NULL,
             priority = COALESCE(priority, 0) - v_row.attempts
       WHERE id = v_row.id;
    END IF;
  END LOOP;

  RETURN v_lost_count;
END;
$$;

REVOKE ALL ON FUNCTION wk_dialer_strike_losers(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wk_dialer_strike_losers(uuid, uuid[]) TO authenticated, service_role;

COMMENT ON FUNCTION wk_dialer_strike_losers IS
  'PR 119 (Hugo 2026-04-28): on the 3rd strike, also moves wk_contacts.pipeline_column_id to the "No pickup" column so dead leads pile up in the right column instead of staying in New Leads.';
