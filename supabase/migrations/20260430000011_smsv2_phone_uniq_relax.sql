-- ============================================================================
-- SMSV2 — Relax wk_contacts.phone UNIQUE + reseed 20 distinct test
-- contacts (PR 34, Hugo 2026-04-27)
--
-- Why:
--   PR 33 worked around the UNIQUE phone constraint by inserting ONE
--   contact for Hugo's number with 20 queue rows pointing to it. Hugo
--   on follow-up: "I don't see them" — he wants to see 20 distinct
--   names in /smsv2/contacts and the dialer queue, all routed to his
--   number. That requires multiple wk_contacts rows to share a phone.
--
--   The phone UNIQUE was a soft hygiene rule (avoid accidental dupes
--   on imports), not a correctness rule. Drop it and replace with a
--   non-unique btree index for query speed. BulkUploadModal upsert
--   that depended on this UNIQUE for ON CONFLICT keeps working today
--   because Postgres falls through gracefully (new rows just insert);
--   the ignoreDuplicates flag becomes a no-op but that's the desired
--   behaviour for shared-phone use cases like this test fixture.
--
--   Also drop wk_contacts_phone_uniq's twin in BulkUploadModal: not
--   needed because there's no app-level UNIQUE phone check there
--   either.
-- ============================================================================

-- 1. Drop the unique index. Replace with a non-unique one keyed on
--    phone for query performance (lookup by phone in webhooks etc).
DROP INDEX IF EXISTS wk_contacts_phone_uniq;
CREATE INDEX IF NOT EXISTS wk_contacts_phone_idx ON wk_contacts (phone);

COMMENT ON INDEX wk_contacts_phone_idx IS
  'Lookup index. Replaced wk_contacts_phone_uniq in PR 34 (2026-04-27) so a single phone can map to multiple contacts (test fixtures + shared landlines + multi-name CSV imports).';

-- 2. Seed 20 DISTINCT contacts for Hugo's number. Existing single
--    'Hugo (dialer test)' row from the PR 33 seed stays intact;
--    these 20 are siblings.
DO $$
DECLARE
  test_phone constant text := '+447863992555';
  v_campaign_id uuid;
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
  SELECT id INTO pipeline_id
    FROM wk_pipelines
   WHERE scope = 'workspace'
   ORDER BY created_at
   LIMIT 1;
  IF pipeline_id IS NULL THEN
    RAISE NOTICE 'No workspace pipeline yet — skipping';
    RETURN;
  END IF;

  -- Insert each contact only if its NAME doesn't already exist
  -- (idempotent re-runs).
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

  -- Tag for cleanup.
  INSERT INTO wk_contact_tags (contact_id, tag)
  SELECT id, 'dialer-test'
    FROM wk_contacts
   WHERE id = ANY(contact_ids)
  ON CONFLICT DO NOTHING;

  -- Use the existing 'Dialer test (Hugo)' campaign from PR 33.
  SELECT id INTO v_campaign_id
    FROM wk_dialer_campaigns
   WHERE LOWER(name) = LOWER('Dialer test (Hugo)')
   LIMIT 1;
  IF v_campaign_id IS NULL THEN
    INSERT INTO wk_dialer_campaigns (
      name, pipeline_id, parallel_lines, auto_advance_seconds,
      ai_coach_enabled, is_active
    )
    VALUES (
      'Dialer test (Hugo)', pipeline_id, 3, 10, true, true
    )
    RETURNING id INTO v_campaign_id;
  END IF;

  -- Wipe the campaign's existing queue rows pointing to the OLD
  -- single-Hugo contact so we restart cleanly with the 20 new rows.
  -- The PR 33 fix already dropped the (campaign_id, contact_id)
  -- UNIQUE so multiple rows per contact were possible — but those
  -- aren't needed once we have 20 distinct contacts.
  DELETE FROM wk_dialer_queue WHERE campaign_id = v_campaign_id
    AND status = 'pending';

  -- Insert one queue row per test contact.
  INSERT INTO wk_dialer_queue (campaign_id, contact_id, status, priority)
  SELECT v_campaign_id, c, 'pending', 0
    FROM unnest(contact_ids) AS c;

  RAISE NOTICE 'Seeded % test contacts under campaign %',
    array_length(contact_ids, 1), v_campaign_id;
END $$;
