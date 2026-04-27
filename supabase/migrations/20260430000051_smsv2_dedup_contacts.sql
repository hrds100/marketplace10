-- Dedup wk_contacts.phone + add unique constraint + clean up trash from
-- the buggy first poll run. PR 82 (Hugo 2026-04-27 — "audit how the
-- inbox is supposed to work").
--
-- Problem: Phase 1 migration (20260425000002) declared phone NOT NULL
-- UNIQUE, but the constraint isn't on the live DB — must have been
-- dropped in some later migration. PR 81's poller relied on app-level
-- dedup which races: every minute it created another contact row for
-- the same phone (21 dupes for +447863992555 after 5 polls).
--
-- Fix:
--   1. For each phone with >1 contact, pick the OLDEST as canonical.
--   2. Reassign every wk_sms_messages.contact_id from a dupe → canonical.
--   3. Same for any other tables that reference wk_contacts.id.
--   4. Delete the dupes.
--   5. Add UNIQUE constraint so future inserts can't duplicate.

-- Step 1: build (canonical, dupe) pairs.
CREATE TEMP TABLE _dedup AS
WITH ranked AS (
  SELECT
    id,
    phone,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY phone ORDER BY created_at ASC) AS rn,
    FIRST_VALUE(id) OVER (PARTITION BY phone ORDER BY created_at ASC) AS canonical_id
  FROM wk_contacts
  WHERE phone IS NOT NULL
)
SELECT id AS dupe_id, canonical_id, phone
FROM ranked
WHERE rn > 1;

-- Step 2: reassign wk_sms_messages.
UPDATE wk_sms_messages m
SET contact_id = d.canonical_id
FROM _dedup d
WHERE m.contact_id = d.dupe_id;

-- Step 3: reassign other tables that FK to wk_contacts.id (best-effort —
-- we run with ON CONFLICT DO NOTHING since dupe rows in linking tables
-- might collide with the canonical's row).
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT
      tc.table_name,
      kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema   = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema    = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name   = 'wk_contacts'
      AND ccu.column_name  = 'id'
      AND tc.table_schema  = 'public'
      AND tc.table_name   <> 'wk_sms_messages' -- already handled above
  LOOP
    BEGIN
      EXECUTE format(
        'UPDATE %I SET %I = d.canonical_id FROM _dedup d WHERE %I.%I = d.dupe_id',
        rec.table_name, rec.column_name, rec.table_name, rec.column_name
      );
    EXCEPTION WHEN unique_violation THEN
      -- linking row already exists for canonical; let CASCADE drop the dupe row.
      NULL;
    END;
  END LOOP;
END $$;

-- Step 4: delete the dupe contacts. CASCADE drops their stranded rows
-- in any table where reassignment hit a unique conflict.
DELETE FROM wk_contacts
WHERE id IN (SELECT dupe_id FROM _dedup);

-- Step 5: enforce uniqueness on phone going forward. Use a partial
-- unique index so NULL phones (e.g. email-only contacts) don't collide.
CREATE UNIQUE INDEX IF NOT EXISTS wk_contacts_phone_uniq
  ON wk_contacts (phone)
  WHERE phone IS NOT NULL;

-- Step 6: same for email, since the email channel will start using
-- email lookups too.
CREATE UNIQUE INDEX IF NOT EXISTS wk_contacts_email_uniq
  ON wk_contacts (email)
  WHERE email IS NOT NULL AND email <> '';

-- Drop the temp table (cleanup, automatic at session end but explicit
-- for tidy logs).
DROP TABLE _dedup;
