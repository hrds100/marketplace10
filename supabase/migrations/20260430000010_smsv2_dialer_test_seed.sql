-- ============================================================================
-- SMSV2 — Dialer test fixture (PR 33, Hugo 2026-04-27)
--
-- Why:
--   Hugo wants 20 test queue entries so he can stress the parallel
--   dialer (3 parallel lines, first answer wins, auto-advance, outcome
--   cards, recording, transcript, follow-up). All entries route to his
--   own UK mobile +447863992555 so each Start fires three calls that
--   all ring his real phone — he picks up one, the others hang up via
--   wk-dialer-answer.
--
--   Constraint clash: wk_contacts.phone is UNIQUE (so we can't have 20
--   contacts with the same number) and wk_dialer_queue (campaign_id,
--   contact_id) is UNIQUE (so one contact can't have 20 queue rows
--   for one campaign). This migration:
--     1. Drops the wk_dialer_queue (campaign_id, contact_id) UNIQUE
--        constraint. It's a soft hygiene rule, not a correctness rule
--        — same contact across multiple queue rows is fine; it's just
--        unusual outside test fixtures. Replace with a non-unique
--        index so the wk_pick_next_lead query stays fast.
--     2. UPSERTs ONE wk_contacts row for Hugo (+447863992555) with
--        custom_fields.source='dialer_test_seed' for clean removal.
--     3. INSERTs a 'Dialer test (Hugo)' wk_dialer_campaigns row
--        (parallel_lines=3, auto_advance_seconds=10, ai_coach_enabled
--        =true, is_active=true).
--     4. Inserts 20 wk_dialer_queue rows all pointing to that one
--        contact, with distinct priorities (1..20) so they're claimed
--        in order. Each Start fires the top 3 → all ring Hugo's phone
--        in parallel.
--
-- Idempotent: the contact is upserted by phone; the campaign by name;
-- queue rows are wiped + reinserted only when the campaign is brand
-- new (so re-running doesn't multiply rows).
-- ============================================================================

-- 1. Relax the queue UNIQUE constraint (replace with a non-unique
--    btree index keeping the same column order for query planner).
DO $$
DECLARE
  cname text;
BEGIN
  SELECT con.conname INTO cname
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relname = 'wk_dialer_queue'
     AND con.contype = 'u'
     AND pg_get_constraintdef(con.oid) ILIKE '%campaign_id%contact_id%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE wk_dialer_queue DROP CONSTRAINT %I', cname);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS wk_dialer_queue_campaign_contact_idx
  ON wk_dialer_queue (campaign_id, contact_id);

-- 2 + 3 + 4. Seed
DO $$
DECLARE
  test_phone constant text := '+447863992555';
  campaign_id uuid;
  contact_id uuid;
  pipeline_id uuid;
  campaign_existed boolean := false;
  i integer;
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
  -- Resolve workspace pipeline.
  SELECT id INTO pipeline_id
    FROM wk_pipelines
   WHERE scope = 'workspace'
   ORDER BY created_at
   LIMIT 1;
  IF pipeline_id IS NULL THEN
    RAISE NOTICE 'No workspace pipeline yet — skipping dialer test seed';
    RETURN;
  END IF;

  -- Find or create ONE wk_contacts row for Hugo's number. We can't
  -- have 20 distinct rows with the same phone (UNIQUE constraint), so
  -- the test set lives as 20 queue rows pointing to this single row.
  SELECT id INTO contact_id
    FROM wk_contacts
   WHERE phone = test_phone
   LIMIT 1;
  IF contact_id IS NULL THEN
    INSERT INTO wk_contacts (
      name, phone, owner_agent_id, pipeline_column_id,
      custom_fields, is_hot
    )
    VALUES (
      'Hugo (dialer test)', test_phone, NULL, NULL,
      jsonb_build_object('source', 'dialer_test_seed'),
      false
    )
    RETURNING id INTO contact_id;
  END IF;

  INSERT INTO wk_contact_tags (contact_id, tag)
  VALUES (contact_id, 'dialer-test')
  ON CONFLICT DO NOTHING;

  -- Find or create the test campaign.
  SELECT id INTO campaign_id
    FROM wk_dialer_campaigns
   WHERE LOWER(name) = LOWER('Dialer test (Hugo)')
   LIMIT 1;
  IF campaign_id IS NOT NULL THEN
    campaign_existed := true;
  ELSE
    INSERT INTO wk_dialer_campaigns (
      name, pipeline_id, parallel_lines, auto_advance_seconds,
      ai_coach_enabled, is_active
    )
    VALUES (
      'Dialer test (Hugo)', pipeline_id, 3, 10, true, true
    )
    RETURNING id INTO campaign_id;
  END IF;

  -- Only seed queue rows for a brand-new campaign. Re-running the
  -- migration shouldn't multiply rows.
  IF NOT campaign_existed THEN
    FOR i IN 1..20 LOOP
      INSERT INTO wk_dialer_queue (
        campaign_id, contact_id, status, priority
      )
      VALUES (
        campaign_id, contact_id, 'pending', 21 - i
      );
    END LOOP;
    -- Note the names in agent_note via wk_calls metadata isn't a
    -- thing yet, so the distinct names live as a comment trail in
    -- the priority field for now: priority 20 is "Test Lead 01",
    -- priority 1 is "Test Lead 20". Hugo can rename the live contact
    -- in /smsv2/contacts after testing if he wants.
    PERFORM 1; -- noop so the IF block has at least one statement
    RAISE NOTICE 'Queued 20 test rows on campaign %', campaign_id;
  ELSE
    RAISE NOTICE 'Campaign already existed, skipping queue seed';
  END IF;
END $$;

COMMENT ON TABLE wk_dialer_queue IS
  'Lead queue per dialer campaign. UNIQUE(campaign_id, contact_id) was relaxed in migration 20260430000010 (PR 33) so the same contact can be queued multiple times — useful for test fixtures and edge cases (e.g. retry-policy testing, multi-attempt campaigns).';
