# NFSTAY — AI Operating Rules

> hub.nfstay.com — UK rent-to-rent property marketplace
> React + Vite + TypeScript + Supabase + GoHighLevel + Resend

## Architecture

Modular monolith. `core/` + `features/`. See `docs/rebuild/REBUILD_PLAN.md` for full plan.

- Features NEVER import each other. Only from `core/`.
- Core is protected. Changes require CORE_CHANGE blast radius + label.
- Frozen zones: invest, nfstay-booking, vite.config, main.tsx. Never touch.
- Edge functions stay FLAT (one folder per function — Supabase CLI requirement).
- Priority: reliability > scalability > clean code > speed

## Document Authority (CRITICAL)

```
1. CLAUDE.md              ← global brain, always loaded
2. .claude/skills/*       ← task activation, loaded per task
3. docs/rebuild/*         ← active rebuild docs, loaded when referenced
4. REBUILD_PLAN.md        ← master architecture plan
5. docs/legacy/*          ← REFERENCE ONLY, never loaded by default
```

Legacy docs (anything in `docs/` outside `rebuild/`) are QUARANTINED.
If a legacy doc conflicts with a rebuild doc, the rebuild doc ALWAYS wins.
No agent may load `docs/legacy/*` unless the current skill explicitly names that file.

## Naming (ONE word per concept, everywhere)

| Concept | Correct | NEVER use |
|---------|---------|-----------|
| User record | `profiles` | users, accounts, members |
| Property listing | `properties` | deals, listings (in code) |
| Tenant request | `inquiries` | leads, requests (in code) |
| Server function | `edge function` | serverless, lambda |
| Message channel | `WhatsApp` | SMS, text |
| Admin review | `gate` | outreach, approval |
| Property owner | `landlord` | lister, owner |
| Property seeker | `tenant` | buyer, customer |
| Subscription level | `tier` | plan, membership |

## Blast Radius (declare BEFORE every task)

| Level | Definition | Tests required |
|-------|-----------|---------------|
| LOW | Feature-local only | Feature test + smoke |
| MEDIUM | Shared table or edge function touched | Feature + all affected + smoke |
| HIGH | Multiple domains, core wrapper, schema change | All affected + full suite + smoke |
| CORE_CHANGE | Anything in core/, layouts, auth, global config | ALL tests + smoke + Hugo review |

## Testing Tiers

- **Tier 1** (feature-local): feature test + smoke
- **Tier 2** (shared table): all affected features + smoke
- **Tier 3** (core change): ALL tests + smoke
- **Tier 4** (edge function): function test + all callers + smoke
- **Smoke suite** (ALWAYS): build + tsc + homepage + signup + signin + deals + inquiry + admin

## Frozen Zones (NEVER touch without Hugo's explicit approval)

- `src/pages/invest/*`, `src/pages/admin/invest/*`
- `supabase/functions/inv-*`, `supabase/functions/revolut-*`, `supabase/functions/submit-payout-claim/`, `supabase/functions/save-bank-details/`
- `src/pages/admin/nfstay/*`, `src/pages/BookingSitePage.tsx`
- `supabase/functions/nfs-*`
- `vite.config.ts`, `src/main.tsx`
- `src/core/database/types.ts` (auto-generated — `supabase gen types` only)
- `src/components/ui/*` (shadcn-managed — `npx shadcn-ui@latest add` only)

## AI Rules

1. **PLAN before code.** Always. No exceptions.
2. **DIAGNOSE before changing code.** Check logs, tokens, config first.
3. **Never push to main.** Never deploy. Co-Pilot merges via `gh pr merge`.
4. **Respect Session Capsule scope.** If task touches anything outside scope → STOP and report.
5. **`select('*')` is FORBIDDEN** on shared tables. Explicit columns only.
6. **No raw external API calls** in features. Use `core/integrations/` wrappers.
7. **Read the file before editing it.** Never guess.
8. **Zero TypeScript errors** — always. Run `npx tsc --noEmit` before committing.
9. **No hardcoded secrets** — env vars only.
10. **Every async call**: try/catch + user-visible error state.
11. **Every DB write**: confirm RLS policy covers it first.
12. **Destructive actions**: STOP and ask Hugo.
13. **Never use `sed`** to edit .tsx/.ts files — use proper Edit tools.
14. **Flowchart sync** — Any PR that adds/changes a route, edge function, user flow, or integration MUST update `src/features/flow/data/nodes.ts` and `src/features/flow/data/edges.ts` in the same PR. The `/flow` page is the living map of the business. If it's not updated, the PR is incomplete.
    - **Agent enforcement**: After merging any PR that affects routes/edge functions/flows, spawn the `docs-keeper` agent: `"PR [number] touched [list routes/edge fns]. Update src/features/flow/data/nodes.ts and edges.ts for any missing, renamed, or changed nodes/edges."` This is not optional.

## DO NOT TOUCH (crash risk)

- **`vite.config.ts`** — Particle SDK + WASM + polyfills are fragile. Adding React 18 aliases caused a site-wide crash on 2026-03-22.
- **`src/main.tsx`** — Import order is critical. ES module imports are hoisted above inline code.
- **`src/layouts/AdminLayout.tsx`** — All lucide-react icons must be imported. A missing icon = blank page.
- **Password seed `_NFsTay2!`** — This string appears in `derivedPassword()` in SignIn.tsx, SignUp.tsx, ParticleAuthCallback.tsx, and VerifyOtp.tsx. It MUST stay exactly `_NFsTay2!`. Renaming breaks ALL social login users.
- **After any branch merge**: `git diff <before>..HEAD -- vite.config.ts src/main.tsx src/App.tsx src/layouts/AdminLayout.tsx`
- **After any bulk rename**: `grep -rn "_NFsTay2!" src/pages/SignIn.tsx src/pages/SignUp.tsx src/pages/ParticleAuthCallback.tsx src/pages/VerifyOtp.tsx` — all 4 must match

## Integration Wrappers (ONE way per service)

| Service | Wrapper | Alternative? |
|---------|---------|-------------|
| WhatsApp | `core/integrations/ghl.ts` | No. |
| Email | `core/integrations/email.ts` | No. |
| AI | `core/integrations/openai.ts` | No. |
| Photos | `core/integrations/pexels.ts` | No. |
| Maps | `core/integrations/maps.ts` | No. |

## Edge Function Deploy

- Source of truth: `supabase/config.toml` (verify_jwt = false per function)
- Deploy script: `scripts/deploy-function.sh` (requires `SUPABASE_ACCESS_TOKEN` env var)
- NEVER hardcode tokens in scripts or docs
- After deploy: verify function responds (not 401)

## Database Contracts

| Table | Owner | Schema changes require |
|-------|-------|----------------------|
| `profiles` | `core/auth` | Review by auth owner + test ALL readers |
| `properties` | `features/deals` | Review by deals owner + test 6 features |
| `inquiries` | `features/inquiry` | Review by inquiry owner + test gate + landlord |
| `notifications` | `core` (shared bus) | Test notification bell + admin page |

HARD LAW: No column rename, removal, or type change on a shared table without updating all readers in the same PR.

## Diagnostic-Before-Code (HARD RULE)

Before editing ANY code, verify the problem is actually in code:

1. CHECK LOGS: Read edge function logs for error messages
2. CHECK EXTERNAL SERVICES: Is GHL responding? Is Resend up? Are tokens valid?
3. CHECK CONFIG: Is verify_jwt correct? Is the env var set?
4. CHECK RUNTIME: Can you reproduce the error?
5. ONLY IF confirmed in code → proceed to PLAN and code changes

## Audit-First Change Policy (HARD RULE)

**Applies to:** Every bug, error, regression, or unexpected behavior — no exceptions.
**Default assumption:** Treat every issue as potentially production-impacting until the audit proves otherwise.

### Step 1 — STOP. Do not edit code.

No file may be opened for editing until Step 4 is approved.

### Step 2 — Full dependency audit.

Audit every connected part of the affected flow:

- **Client callers:** Which components/pages invoke this code? What payloads do they send?
- **Function code:** Read the full function and every internal dependency it imports.
- **Environment:** Verify all env vars and secrets the function relies on are set and valid.
- **Auth & permissions:** Check headers, CORS config, JWT settings, RLS policies.
- **Data layer:** Trace every database query, external API call, and webhook in the flow.
- **Error paths:** Read logs, returned status codes, try/catch blocks, and fallback behavior.
- **Recent changes:** Run `git log` and `git diff` on all files in the flow to find what changed.

Do not skip any category. If a category seems irrelevant, note why and move on.

### Step 3 — Root-cause analysis with evidence.

Trace the issue end-to-end and identify the root cause(s). Every claim must cite evidence (a log line, a config value, a code snippet, a git diff). Produce a short report:

1. **Findings** — what you observed, with evidence.
2. **Connected files/components** — full list of everything in the affected flow.
3. **Root cause(s)** — ranked by confidence, each with supporting evidence.
4. **Verification checklist** — how to confirm the fix worked.
5. **Smallest safe fix plan** — the minimum change that resolves the issue.

### Step 4 — Ask Hugo for approval.

Present the report. Do not proceed until Hugo approves the fix plan.

### Step 5 — Apply the smallest possible fix only.

- Change only what the approved plan specifies.
- No speculative fixes, no "while I'm here" improvements, no broad refactors.
- If the fix touches a shared table or edge function, declare blast radius and test accordingly.

### Step 6 — Post-fix verification.

- Run the verification checklist from Step 3.
- Run affected feature tests + smoke suite.
- Confirm the original error no longer reproduces.
- Confirm no new errors were introduced in connected flows.

### Constraints

- No guessing without evidence.
- No destructive changes.
- Preserve existing behavior unless a change is proven necessary.
- If anything is unclear, inspect more before editing.
- A fix is not done until post-fix verification passes.

## Feature Map

Every file is mapped to a feature tag in `feature-map.json`.

1. Check `feature-map.json` before touching any file.
2. Never modify files outside the active feature scope.
3. Never opportunistically refactor unrelated code.
4. If a cross-feature change is needed, ask Hugo first.
5. LOCKED files must not be modified without Hugo's approval.

## Common Commands

```bash
npm run dev                              # local dev server (port 8080)
npm run build                            # production build
npx tsc --noEmit                         # typecheck
npx playwright test                      # e2e tests
./scripts/deploy-function.sh <name>      # deploy edge function
```

## Admin

- Admin emails: `admin@hub.nfstay.com`, `hugo@nfstay.com` (hardcoded in `src/hooks/useAuth.ts`)
- Admin routes: `/admin/*` wrapped in `AdminGuard`
- Supabase project: `asazddtvjvmckouxcmmo`
- Vercel team: `hugos-projects-f8cc36a8`

## Debug Tools

**Super Debug Report** — hidden browser-side debug artifact generator.

- **Location:** `src/core/debug/` (4 files, isolated, no side effects)
- **Kill switch:** `VITE_DEBUG_REPORT_ENABLED=true` in `.env.local` (or Vercel env vars). If not set, the entire system is inert.
- **Activation:** Hugo types `nfsdebug` on any page (NOT inside a text field). A dark bug icon appears bottom-right for the rest of that browser session.
- **What it does:** Clicking the button downloads a `nfstay-debug-*.json` file containing browser info, console errors, failed network requests, route history, user actions — all redacted of tokens, emails, and secrets.
- **Runbook:** `docs/runbooks/DEBUG_REPORT.md`

**For browser/UI bugs:** Ask Hugo to type `nfsdebug` on the affected page (not inside a text field), then click the Debug button. Hugo shares the downloaded `.json` file. Read it before proposing speculative fixes. Only available when `VITE_DEBUG_REPORT_ENABLED=true` is set.

**If the debug artifact is unavailable** (env var not set, or Hugo cannot reproduce): say so explicitly and proceed with normal audit steps.

## Cross-Repo Coordination

marketplace10 and bookingsite share Supabase project `asazddtvjvmckouxcmmo`.
Changes to shared tables (`nfs_*`, `profiles`), auth flows, or edge functions affect BOTH apps.
Deploy marketplace10 first, bookingsite second.
