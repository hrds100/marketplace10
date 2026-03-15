# Supabase Integration — Local Rules

## types.ts is AUTO-GENERATED
- Never hand-edit `types.ts` — regenerate with: `SUPABASE_ACCESS_TOKEN=... npx supabase gen types typescript --linked > src/integrations/supabase/types.ts`
- After any schema change (ALTER TABLE, new table), regenerate types

## Tables NOT in Generated Types
These tables exist in the DB but are not in `types.ts` — access requires `as any` cast with comment:
- `ai_settings` — AI model + prompt config
- `notifications` — admin notifications

## RLS is Enforced on ALL Tables
- Every query runs as the authenticated user (anon key)
- Service role key is NEVER in frontend code
- Before writing any mutation, check the RLS policy exists for that user role
- Admin operations use `auth.jwt() ->> 'email'` policies (not `auth.users` subquery)

## Client Setup
- `client.ts` creates a single Supabase client with localStorage session persistence
- Auto-refresh token enabled
- All hooks and pages import from `@/integrations/supabase/client`
