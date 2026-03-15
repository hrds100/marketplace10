# Admin Panel — Local Rules

## Invariants
- All admin routes are behind `AdminGuard` (checks `isAdmin` from `useAuth`)
- Admin emails hardcoded in `src/hooks/useAuth.ts` → `ADMIN_EMAILS` array
- Admin RLS uses `auth.jwt() ->> 'email'` — never `auth.users` table (causes permission error)

## Before Any DB Write
- Confirm RLS policy exists for the operation (UPDATE/DELETE on properties, INSERT on notifications)
- Admin approve/reject: updates `properties.status` — requires admin UPDATE policy
- Admin suspend: updates `profiles.suspended` — requires admin UPDATE policy on profiles

## Forbidden
- Never delete a user from `auth.users` via frontend — soft-delete only (set `suspended = true`)
- Never bypass `AdminGuard` — every `/admin/*` route must be wrapped
- Never expose service role key in frontend code

## Edge Cases
- `AdminSubmissions` queries ALL properties (not just submitted_by = user) — this is intentional
- `AdminUsers` queries ALL profiles — requires admin SELECT policy on profiles table
- Notification count polls every 30s — don't add realtime subscription (too expensive for admin)
