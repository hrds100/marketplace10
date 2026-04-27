-- ============================================================================
-- SMSV2 — Dialer test fixture (PR 33, Hugo 2026-04-27)
--
-- Why:
--   Hugo wants 20 test contacts wired to his own UK mobile so he can
--   stress the parallel dialer without affecting real leads. Each row
--   shares the same phone number (+447863992555) but a different name
--   so the queue + dial board show distinct entries. Auto-queues all
--   20 into a brand-new "Dialer test" campaign with parallel_lines=3
--   so pressing Start fires three parallel calls to Hugo's phone, the
--   first leg that picks up wins, the others hang up — the exact
--   behaviour Hugo asked us to verify end-to-end.
--
-- Idempotent: each contact INSERTed only if its name doesn't already
-- exist (case-insensitive); the campaign INSERTed only if no row with
-- the same name exists; queue rows upserted via the existing
-- (campaign_id, contact_id) UNIQUE.
-- ============================================================================

DO $$
DECLARE
  test_phone constant text := '+447863992555';
  campaign_id uuid;
  pipeline_id uuid;
  contact_ids uuid[] := ARRAY[]::uuid[];
  cid uuid;
  v_name text;
  test_names constant text[] := ARRAY[
    'Test Lead 01 — Sarah B',
    'Test Lead 02 — James W',
    'Test Lead 03 — Priya S',
    'Test Lead 04 — Marcus R',
    'Test Lead 05 — Aisha K',
    'Test Lead 06 — Daniel O',
    'Test Lead 07 — Emma H',
    'Test Lead 08 — Felix Z',
    'Test Lead 09 — Olivia P',
    'Test Lead 10 — Liam G',
    'Test Lead 11 — Chloe M',
    'Test Lead 12 — Noah V',
    'Test Lead 13 — Maya R',
    'Test Lead 14 — Jacob D',
    'Test Lead 15 — Zara T',
    'Test Lead 16 — Oscar L',
    'Test Lead 17 — Amelia C',
    'Test Lead 18 — Theo F',
    'Test Lead 19 — Sienna J',
    'Test Lead 20 — Adam Y'
  ];
BEGIN
  -- Resolve the workspace pipeline (existing seed in 20260425000002).
  SELECT id INTO pipeline_id
    FROM wk_pipelines
   WHERE scope = 'workspace'
   ORDER BY created_at
   LIMIT 1;

  IF pipeline_id IS NULL THEN
    RAISE NOTICE 'No workspace pipeline yet — skipping dialer test seed';
    RETURN;
  END IF;

  -- INSERT contacts (idempotent on name).
  FOREACH v_name IN ARRAY test_names LOOP
    SELECT id INTO cid FROM wk_contacts WHERE LOWER(name) = LOWER(v_name) LIMIT 1;
    IF cid IS NULL THEN
      INSERT INTO wk_contacts (
        name, phone, owner_agent_id, pipeline_column_id,
        custom_fields, is_hot
      )
      VALUES (
        v_name, test_phone, NULL, NULL,
        jsonb_build_object('source', 'dialer_test_seed'),
        false
      )
      RETURNING id INTO cid;
    END IF;
    contact_ids := array_append(contact_ids, cid);
  END LOOP;

  -- Tag every test contact so they're easy to clean up later.
  INSERT INTO wk_contact_tags (contact_id, tag)
  SELECT id, 'dialer-test'
    FROM wk_contacts
   WHERE id = ANY(contact_ids)
  ON CONFLICT DO NOTHING;

  -- INSERT a "Dialer test" campaign with 3 parallel lines.
  SELECT id INTO campaign_id
    FROM wk_dialer_campaigns
   WHERE LOWER(name) = LOWER('Dialer test (Hugo)')
   LIMIT 1;
  IF campaign_id IS NULL THEN
    INSERT INTO wk_dialer_campaigns (
      name, pipeline_id, parallel_lines, auto_advance_seconds,
      ai_coach_enabled, is_active
    )
    VALUES (
      'Dialer test (Hugo)', pipeline_id, 3, 10, true, true
    )
    RETURNING id INTO campaign_id;
  END IF;

  -- Queue every test contact into the campaign (idempotent).
  INSERT INTO wk_dialer_queue (campaign_id, contact_id, status, priority)
  SELECT campaign_id, c, 'pending', 0
    FROM unnest(contact_ids) AS c
  ON CONFLICT (campaign_id, contact_id) DO NOTHING;

  RAISE NOTICE 'Dialer test seed complete: 20 contacts, campaign %', campaign_id;
END $$;
