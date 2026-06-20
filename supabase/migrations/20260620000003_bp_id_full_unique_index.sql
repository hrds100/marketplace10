-- ============================================================================
-- Partial unique indexes can't be used by PostgREST's upsert onConflict
-- (the inference clause would need a matching WHERE). Replace the partial
-- index with a full UNIQUE index — PostgreSQL still allows multiple NULL
-- bp_ids (native rows) since UNIQUE is NULLS DISTINCT by default.
-- ============================================================================

DROP INDEX IF EXISTS agreements_bp_id_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS agreements_bp_id_uidx ON agreements(bp_id);
