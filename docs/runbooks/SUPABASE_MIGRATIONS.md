# Supabase migrations runbook

## Source of truth
- All schema migrations live in `supabase/migrations/`.
- Each filename MUST start with a 14-digit timestamp prefix (YYYYMMDDHHMMSS), then `_<descriptive_name>.sql`.
  - Good: `20260426000000_smsv2_coach_prompt_v2.sql`
  - Bad: `20260426_smsv2_coach_prompt_v2.sql` (only 8 digits — the supabase CLI's `db push` parser ignores these and complains about "remote versions not found in local migrations directory")

## Standard deploy workflow
1. Create a new file with a 14-digit timestamp newer than the last applied:
   ```bash
   ts=$(date -u +%Y%m%d%H%M%S)
   touch "supabase/migrations/${ts}_my_change.sql"
   ```
2. Write the SQL.
3. Test locally if you can (`supabase db reset`), or test on a branch DB.
4. Open a PR. After merge, deploy:
   ```bash
   SUPABASE_ACCESS_TOKEN=<token> npx supabase db push --linked
   ```
   The CLI applies any new migrations and records them in `supabase_migrations.schema_migrations`.

## Emergency / out-of-band schema changes
If you applied SQL directly (Supabase dashboard SQL editor, `supabase db query`, etc.) WITHOUT going through `db push`, the schema lands but the `supabase_migrations.schema_migrations` table doesn't get a record. Future `db push` will then either:
- Try to re-apply the migration (if your local file isn't recorded), or
- Complain that there's a remote version it can't match (if the remote table got an entry but no file exists).

**To reconcile after an out-of-band change:**
- Schema applied via dashboard with no local file: create a placeholder file matching the version (see `*_remote_history_placeholder.sql` in this directory for the pattern).
- Local file with no remote history entry: `supabase migration repair --linked --status applied <version>` (the CLI reads the file and writes its content into the history table).

## Historical drift cleanup (2026-04-26)
Before this date, the repo had ~48 migration files with date-only 8-digit prefixes (e.g. `20260314_deals_v2.sql`) which the CLI's `db push` parser silently skipped. The remote `supabase_migrations` table also held 23 phantom entries for migrations applied directly to the database (during early dashboard-driven development) with no matching local files.

The 2026-04-26 cleanup PR:
- Renamed all 48 date-only files to use 14-digit timestamps (with `000000`, `000001`, … suffixes per date for ordering within the day).
- Created 23 placeholder files (one per phantom remote entry) so the CLI can match every remote version to a local file. The placeholders contain only comments — re-applying them is a no-op.
- Repaired the migration history so every renamed file is recorded as applied.

After the cleanup, `supabase db push --linked --dry-run` reports "Remote database is up to date." Future migrations follow the standard workflow above.

## Useful commands
```bash
# List migration history (Local | Remote columns)
SUPABASE_ACCESS_TOKEN=<token> npx supabase migration list --linked

# Run an arbitrary read-only query
echo "SELECT count(*) FROM wk_terminologies;" | SUPABASE_ACCESS_TOKEN=<token> npx supabase db query --linked

# Mark a version as applied (CLI reads the local file and inserts into history)
SUPABASE_ACCESS_TOKEN=<token> npx supabase migration repair --linked --status applied <version>

# Mark a version as reverted (removes from history; schema is NOT touched)
SUPABASE_ACCESS_TOKEN=<token> npx supabase migration repair --linked --status reverted <version>
```

## Where to find the access token
`reference_supabase_deploy_token` memory entry, or the `SUPABASE_ACCESS_TOKEN` env var in CI.
