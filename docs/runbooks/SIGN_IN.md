# Sign-In Architecture

> How nfstay authenticates users on [hub.nfstay.com/signin](https://hub.nfstay.com/signin) and [hub.nfstay.com/signup](https://hub.nfstay.com/signup).
>
> Last reviewed: 2026-04-24 — PR #499.

## Goal in one sentence

Every user ends up in `profiles` with an email, a Supabase session, and a wallet — regardless of whether they started with email+password or a social provider (Google / Apple / X / Facebook).

## Two identity systems glued together

| System | Owns | Used for |
|---|---|---|
| **Particle Network (authkit)** | Wallet (MPC, BNB Chain) + social OAuth with Google/Apple/X/Facebook | Investment module, wallet signing, social email capture |
| **Supabase Auth** | `auth.users` + our `profiles` table | Sessions, RLS, dashboard, inquiries, referrals, GHL sync, emails |

These two must agree on "who the user is". Our glue is the **derived password**:

```
derivedPassword(uuid) = uuid.slice(0, 10) + "_NFsTay2!" + uuid.slice(-6)
```

Seed string `_NFsTay2!` is defined in three places and **must stay identical**:
- [src/features/auth/SignIn.tsx](../../src/features/auth/SignIn.tsx) `derivedPassword()`
- [src/features/auth/SignUp.tsx](../../src/features/auth/SignUp.tsx) `derivedPassword()`
- [supabase/functions/link-social-identity/index.ts](../../supabase/functions/link-social-identity/index.ts) `derivedPassword()`

Changing the seed breaks every existing social-login user.

## Paths through /signin

There are **four** distinct paths a user can take, each with clear handoffs and failure modes.

### Path A — Email + password (existing Supabase user)

1. User types email + password, submits
2. [useAuth.ts](../../src/hooks/useAuth.ts) `signIn()` → `supabase.auth.signInWithPassword`
3. Session established
4. Optional side-trip: if user is an `nfs_operators` row, redirect to `/dashboard/booking-site`
5. Otherwise redirect to `redirect=` param or `/dashboard/deals`

Nothing touches Particle. Pure Supabase.

### Path B — Social login, new user (no existing Supabase account)

1. Click Google / Apple / X / Facebook button
2. [SignIn.tsx](../../src/features/auth/SignIn.tsx) `handleSocialSignIn` sets `nfstay_social_pending` in `localStorage` with `{provider, redirectTo, view: 'signin'}`
3. Calls `connect({ socialType })` from `@particle-network/authkit`'s `useConnect` hook
4. Browser redirects through Particle → OAuth provider → Particle redirect.html → back to `/signin?particleThirdpartyParams=…`
5. On return: authkit auto-processes the URL, populates `userInfo` (email, name, wallet, uuid, token)
6. `useEffect` watching `userInfo` fires → picks up the pending flag → calls `completeSocialSignIn`
7. `completeSocialSignIn`:
   - Extracts email, name, wallet address, uuid from userInfo
   - Computes `derivedPassword(uuid)`
   - Tries `supabase.auth.signInWithPassword(email, derived)` — **fails** (user doesn't exist yet)
   - Falls through to `supabase.auth.signUp(email, derived)` — **succeeds**, creates the Supabase user
   - Session is established
8. Profile update: `wallet_address`, `wallet_auth_method = provider`, `referred_by = refCode` if present
9. Side effects (fire-and-forget): `track-referral` edge function, admin `new_signup` notification
10. If `profiles.whatsapp_verified = false` → redirect to `/verify-otp` to collect phone
11. Otherwise redirect to `/dashboard/deals`

### Path C — Social login, **existing** email+password user (the silent-link path)

This is the path fixed by [PR #499](https://github.com/hrds100/marketplace10/pull/499). Before: dead-end redirect to `/signin?email=…`. After: automatic link.

1. Steps 1-7 as Path B
2. `signInWithPassword(email, derived)` **fails** — user has a different password
3. `signUp(email, derived)` **fails** with "already registered" (or returns a user with empty `identities` array)
4. **Silent link** kicks in:
   - POST to `/functions/v1/link-social-identity` with `{email, particleUuid, provider, walletAddress}`
   - Edge function ([supabase/functions/link-social-identity/index.ts](../../supabase/functions/link-social-identity/index.ts)):
     - Validates input shape (uuid format, provider allow-list, email shape)
     - `adminClient.auth.admin.listUsers` → find user by email
     - `adminClient.auth.admin.updateUserById(userId, { password: derived })` — rekeys the Supabase password
     - Writes row to `auth_link_events` (audit log)
     - Returns `{ ok: true, userId }`
5. Client retries `signInWithPassword(email, derived)` — **succeeds** now
6. Steps 8-11 as Path B

### Path D — Existing user, link failed (fallback)

If the silent link itself errors (user-not-found edge case, network blip, Supabase admin API failure), we fall back to the old behaviour:

1. Persist the message in `sessionStorage` under `nfstay_social_error`
2. Fire toast (may be lost across navigation)
3. `window.location.href = '/signin?email=…'`
4. On the new page, [SignIn.tsx](../../src/features/auth/SignIn.tsx) mount effect reads the sessionStorage message and surfaces it as a visible error line. User signs in with their real password.

## Paths through /signup

[SignUp.tsx](../../src/features/auth/SignUp.tsx) has a small state machine: `view = 'social' | 'phone' | 'email'`.

### /signup social path

1. Click Google/Apple/X/Facebook → same `useConnect({ socialType })` as signin
2. authkit redirect → return with `userInfo`
3. `finishSocialSignUp` sets `particleUser` state, transitions to `view = 'phone'`
4. User enters WhatsApp number → `handleSendOtp` fires `send-otp` edge function
5. Navigates to `/verify-otp?phone=…&name=…&email=…&wallet=…&authMethod=…`
6. `/verify-otp` is where the Supabase account actually gets created (via a 4-digit code accepted by the `verify-otp` edge function — intentionally loose gate, documented in [CLAUDE.md](../../CLAUDE.md))

### /signup email path

Pure Supabase flow, no Particle.
1. Form: email + password + name + WhatsApp + terms
2. `useAuth.signUp` → `supabase.auth.signUp` with user-chosen password (NOT derivedPassword)
3. Profile update with `whatsapp`, `whatsapp_verified = false`
4. **Funnel tier claim**: if an unclaimed `pending_payments` row matches the email → set `profiles.tier` to the paid tier, mark payment claimed
5. Referral tracking if `nfstay_ref` in localStorage
6. Side effects: `send-email` (welcome-member), `send-email` (new-signup-admin), `ab-track` beacon, `notifications` insert
7. `sendOtp(phone)` → navigate to `/verify-otp`

## Key files

| File | Purpose |
|---|---|
| [src/features/auth/SignIn.tsx](../../src/features/auth/SignIn.tsx) | The sign-in page. Social `useConnect` + email/password form + silent-link fallback. |
| [src/features/auth/SignUp.tsx](../../src/features/auth/SignUp.tsx) | The sign-up page. 3-view state machine (social → phone → email). |
| [src/features/auth/ParticleAuthCallback.tsx](../../src/features/auth/ParticleAuthCallback.tsx) | Safety fallback for stale `/auth/particle` bookmarks. New flow returns to `/signin` directly. |
| [src/features/auth/VerifyOtp.tsx](../../src/features/auth/VerifyOtp.tsx) | 4-digit WhatsApp OTP entry. Creates the Supabase user for social-signup path. |
| [src/components/ParticleProvider.tsx](../../src/components/ParticleProvider.tsx) | `<ConnectKitProvider>` wrapper + `authWalletConnectors` + `evmWalletConnectors` + wallet plugin. |
| [src/lib/particle.ts](../../src/lib/particle.ts) | Project IDs (legacy BNB Chain). **Frozen.** Changing breaks returning users' wallets. |
| [src/hooks/useAuth.ts](../../src/hooks/useAuth.ts) | Supabase session state + `signIn` / `signUp` / `signOut` helpers. |
| [supabase/functions/link-social-identity/](../../supabase/functions/link-social-identity/) | Server-side password rekey for existing email users hitting a social button. |
| [supabase/migrations/20260424_auth_link_events.sql](../../supabase/migrations/20260424_auth_link_events.sql) | Audit table for silent-link events. |

## Edge function: `link-social-identity`

**Endpoint:** `POST https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/link-social-identity`

**Body:**
```json
{
  "email": "user@example.com",
  "particleUuid": "5796bc9f-bc32-4017-99b0-57a2246d0253",
  "provider": "google",
  "walletAddress": "0x…"
}
```

**Responses:**
- `200 {"ok": true, "userId": "…"}` — rekeyed and ready for retry signIn
- `400 {"ok": false, "error": "…"}` — invalid input
- `404 {"ok": false, "error": "no existing user with this email"}` — user doesn't exist (caller should do `signUp` instead)
- `500 {"ok": false, "error": "…"}` — admin API failure, check logs

**Runs with:** `SERVICE_ROLE_KEY` from Deno env.
**verify_jwt:** `false` (called pre-login). Registered in [supabase/config.toml](../../supabase/config.toml).

**Deploy:**
```bash
SUPABASE_ACCESS_TOKEN=<token> ./scripts/deploy-function.sh link-social-identity
```

## Audit table: `auth_link_events`

Append-only log of every silent-link operation. Service-role only RLS. Query to review recent links:

```sql
SELECT email, provider, particle_uuid, wallet_address, ip, created_at
FROM auth_link_events
ORDER BY created_at DESC
LIMIT 50;
```

Useful for:
- Abuse detection (same IP hitting many emails)
- Diagnosing "why did my user get silently linked?"
- Compliance record of identity merges

## Security model (honest)

Particle does **not** expose a public JWT verification endpoint or JWKS. Their server API uses a proprietary MAC signing scheme requiring the user's `mac_key`, which the authkit SDK intentionally does not surface to client code. We therefore **cannot** validate server-side that the caller actually holds a valid Particle session for the claimed email.

Two facts that bound the risk:

1. Supabase has `mailer_autoconfirm: true` — email ownership is already NOT verified on signup today. Anyone can sign up with any email. The silent-link path is therefore **not a new vector** — it's equivalent in attack surface to the existing email-signup flow.
2. To actually sign in as someone else after a silent link, an attacker must also complete Google OAuth for that email. Google validates email ownership. Controlling the Google account = controlling the email. So the attack reduces to "the attacker owns the victim's email", which is the same precondition as a password reset.

**Follow-up hardening options** (not shipped, documented in [link-social-identity/index.ts](../../supabase/functions/link-social-identity/index.ts) header):
- Wallet-signature proof-of-control: have the client sign a challenge with their Particle MPC wallet before calling the function. Server verifies the signature matches the wallet address.
- Switch to Supabase-native OAuth once Google is configured in the project dashboard (`external_google_enabled: true` currently false). Supabase handles identity linking natively, no password hack needed.

## Frequent failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| Button spins forever, then timeout | 20s watchdog fired — `connect()` never resolved and no redirect happened. Popup blocker? Particle project config? | Check console for `[SignIn] watchdog:` line. Check Particle dashboard allowlist includes origin. |
| Redirect to `/signin?email=…` with red error line | Silent-link failed AND user has existing password account. | User signs in with their real password. Next time Google will work. |
| `Failed to fetch dynamically imported module` | Browser has stale main JS cached; referenced chunks no longer exist on current deploy. | Hard refresh / incognito. Service worker is NOT in use. |
| Console `Cross-Origin-Opener-Policy policy would block window.closed` | Previous popup-based flow (pre-PR-#499). Shouldn't appear anymore — if it does, user is on stale bundle. | Cache-clear. |
| User lands on `/verify-otp` instead of `/dashboard/deals` | `profiles.whatsapp_verified = false`. | User enters any 4-digit code; the gate is intentionally loose. |

## Debugging in production

The code logs at every decision point. Open DevTools → Console on the sign-in page and filter by `[SignIn]`:

```
[SignIn] mount — search= … pending= …
[SignIn] userInfo effect — populated? true  uuid= 5796bc9f-…
[SignIn] userInfo effect — pending= {"provider":"google","view":"signin"}
[SignIn] running completeSocialSignIn for google
```

If the user reports "loading forever", ask them to share these logs. They will tell you exactly which step stopped firing.

A 20s watchdog surfaces a visible error if `connect()` hasn't resolved and no redirect happened — so the button never silently hangs.

## Related docs

- [CLAUDE.md](../../CLAUDE.md) — project-wide rules (frozen zones, naming, shared table contracts)
- [docs/rebuild/REBUILD_PLAN.md](../rebuild/REBUILD_PLAN.md) — overall architecture
- [docs/invest/WALLET_ARCHITECTURE.md](../invest/WALLET_ARCHITECTURE.md) — how wallets feed into the investment module
- [supabase/functions/particle-generate-jwt/](../../supabase/functions/particle-generate-jwt/) — our RSA-signed JWTs for Particle (opposite direction)

## Change log for this flow

| Date | PR | Change |
|---|---|---|
| 2026-04-23 | [#499](https://github.com/hrds100/marketplace10/pull/499) | Rewire social to `useConnect` hook, delete popup flow, add `link-social-identity` edge function + `auth_link_events` audit table. |
| 2026-04-23 | [#496](https://github.com/hrds100/marketplace10/pull/496), [#498](https://github.com/hrds100/marketplace10/pull/498) | Popup-based Particle social login (reverted by #499 due to COOP issues). |
| 2026-04-23 | [#494](https://github.com/hrds100/marketplace10/pull/494), [#495](https://github.com/hrds100/marketplace10/pull/495) | Hardened intent handoff + double-OAuth-code guard (partially superseded by #499). |
| 2026-04-04 | [#238](https://github.com/hrds100/marketplace10/pull/238) | First iteration of "redirect existing users to /signin" — dead-end avoidance. |
