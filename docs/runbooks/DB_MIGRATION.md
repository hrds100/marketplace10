# DB Migration Checklist

Every Supabase schema change follows this sequence. No shortcuts.

## Before Writing SQL
- [ ] Confirm the column/table doesn't already exist (query the DB first)
- [ ] Check if an RLS policy is needed for the new column/table
- [ ] If adding an enum value: confirm the column is actually an enum, not text

## Write the SQL
- [ ] Use `IF NOT EXISTS` / `IF NOT EXISTS` for safety
- [ ] Include RLS policies in the same migration block
- [ ] Include any seed data if needed

## Execute
- [ ] Show Hugo the SQL before running
- [ ] Run in Supabase → SQL Editor
- [ ] Verify: query the new column/table via curl or Supabase dashboard

## After Migration
- [ ] Regenerate types: `SUPABASE_ACCESS_TOKEN=... npx supabase gen types typescript --linked > src/integrations/supabase/types.ts`
- [ ] Run `npx tsc --noEmit` - fix any type errors from new schema
- [ ] Update `docs/DATABASE.md` with new columns/tables
- [ ] Commit types + docs in the same PR as the feature code
