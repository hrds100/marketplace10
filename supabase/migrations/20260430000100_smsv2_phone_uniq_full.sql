-- ============================================================================
-- SMSV2 — Convert wk_contacts_phone_uniq partial → full unique
-- (PR 118, Hugo 2026-04-28)
--
-- Why:
--   PR 82 (20260430000051) restored `wk_contacts_phone_uniq` as a
--   PARTIAL unique index (`WHERE phone IS NOT NULL`). Postgres allows
--   that, but `INSERT … ON CONFLICT (phone)` requires either a
--   non-partial unique index OR an inference clause that includes the
--   partial predicate. PostgREST + supabase-js do NOT support the
--   inference WHERE, so BulkUploadModal (and unipile-poll-messages)
--   fail with: "there is no unique or exclusion constraint matching
--   the ON CONFLICT specification" — exactly Hugo's bulk-import error
--   on 2026-04-28.
--
-- Fix:
--   Drop the partial unique and recreate as a full unique. Postgres
--   default NULLS DISTINCT semantics still allow many email-only
--   contacts (phone NULL) to coexist, so behaviour is unchanged.
--
-- Defensive dedup pass first — between PR 34 (dropped unique) and
-- PR 82 (re-added partial) any dupes that crept in were cleaned by
-- PR 82's dedup, but new dupes COULD exist if any insert path went
-- around the partial constraint (e.g. NULL → real phone updates).
-- ============================================================================

-- Dedup pass: keep oldest per phone, reassign FK rows, drop dupes.
WITH ranked AS (
  SELECT
    id,
    phone,
    ROW_NUMBER() OVER (PARTITION BY phone ORDER BY created_at ASC) AS rn,
    FIRST_VALUE(id) OVER (PARTITION BY phone ORDER BY created_at ASC) AS canonical_id
  FROM wk_contacts
  WHERE phone IS NOT NULL
), dupes AS (
  SELECT id AS dupe_id, canonical_id FROM ranked WHERE rn > 1
)
UPDATE wk_sms_messages m
SET contact_id = d.canonical_id
FROM dupes d
WHERE m.contact_id = d.dupe_id;

DELETE FROM wk_contacts
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY phone ORDER BY created_at ASC) AS rn
    FROM wk_contacts
    WHERE phone IS NOT NULL
  ) r
  WHERE r.rn > 1
);

-- Same for email.
DELETE FROM wk_contacts
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at ASC) AS rn
    FROM wk_contacts
    WHERE email IS NOT NULL AND email <> ''
  ) r
  WHERE r.rn > 1
);

-- Convert partial → full unique on phone.
DROP INDEX IF EXISTS wk_contacts_phone_uniq;
CREATE UNIQUE INDEX wk_contacts_phone_uniq ON wk_contacts (phone);

COMMENT ON INDEX wk_contacts_phone_uniq IS
  'Full unique on phone (NULLs distinct). PR 118 (2026-04-28) — converted from partial so .upsert(..., { onConflict: ''phone'' }) works.';

-- Same for email.
DROP INDEX IF EXISTS wk_contacts_email_uniq;
CREATE UNIQUE INDEX wk_contacts_email_uniq ON wk_contacts (email);

COMMENT ON INDEX wk_contacts_email_uniq IS
  'Full unique on email (NULLs distinct). PR 118 (2026-04-28) — converted from partial for ON CONFLICT support.';
