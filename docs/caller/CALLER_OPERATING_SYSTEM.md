# CALLER OPERATING SYSTEM

> **The only file future agents must read first. Loaded via hotkey.**
> Owner: Hugo. Last updated: 2026-04-29.

---

## MISSION

Caller is a clean, isolated calling platform built to replace the legacy `smsv2` frontend at `/crm`.

- Caller is **frontend-only** for now. The backend (edge functions, database, integrations) is already working and stays intact.
- The product name in the UI and folder names is **Caller**, not "CRM v2", not "SMSv2". Internal database tables (`wk_*`) and edge functions (`wk-*`) keep their existing names.
- The legacy `/crm` route (mounting `Smsv2Layout`) keeps running until Caller is proven and Hugo signs off on cutover.
- Caller is mounted at `/caller/*` during development and parallel-run; only after proof does `/crm` flip to Caller.

---

## CORE RULES

1. **Same Supabase database.** No new project. No new shared tables. No schema changes without Hugo approval.
2. **Same `wk-*` edge functions.** Caller calls them the same way smsv2 does — via `supabase.functions.invoke()`.
3. **Same integrations.** Twilio (voice + SMS), OpenAI (coach + post-call), Resend (email), Unipile (multi-channel WhatsApp).
4. **Never rebuild a working backend without proof it is broken.** If a `wk-*` edge function works today, Caller reuses it. Replacement requires evidence.
5. **Rebuild frontend + state layer first.** Pages, components, hooks, store. Backend is touched only if a real bug is identified during integration.
6. **Caller never imports from `smsv2/` or any other feature.** Caller imports from `core/` only.
7. **Caller never modifies smsv2 code.** Old code stays untouched until cutover.

---

## READ ORDER

Future agents must read in this exact order before doing any work:

1. **`docs/caller/CALLER_OPERATING_SYSTEM.md`** (this file) — global rules + mission
2. **`docs/caller/*`** — ARCHITECTURE, BUILD_PLAN, DECISIONS, TEST_PLAN, LOG
3. **`.claude/skills/*`** — task-specific activation rules
4. **THEN code** — only after the above is loaded into context

If an agent skips this order and starts editing files, the work is invalid and must be redone.

---

## AGENT ORCHESTRATION

Multiple agents may run in parallel **only if their scopes do not overlap**.

- Each agent owns an isolated scope: a single page, a single hook, a single component, or a single test file.
- **No two agents may edit the same file in the same run.** If two scopes touch the same file, one must finish and merge before the other starts.
- The Co-Pilot (Hugo's senior reviewer) assigns scopes to agents and tracks ownership in `docs/caller/LOG.md`.
- Every parallel agent must declare its file list before starting. If an agent discovers it needs to touch a file outside its declared scope, it stops and reports.
- Agents that violate scope (touch files not in their assignment) have their work reverted.

Allowed parallel patterns:
- Agent A: `src/features/caller/pages/InboxPage.tsx`
- Agent B: `src/features/caller/pages/ContactsPage.tsx`
- Agent C: `src/features/caller/hooks/useCalls.ts`

Forbidden parallel patterns:
- Two agents both writing to `src/features/caller/store/callerProvider.tsx`
- Two agents both editing `docs/caller/LOG.md`

---

## EXECUTION LAW

The four laws of every change:

1. **Build new** — write the new code in `src/features/caller/`. Do not modify smsv2.
2. **Prove working** — test it in the browser, run the test plan, show evidence (Playwright pass, screenshot, log line).
3. **THEN replace old** — only after proof, change the route or swap the import.
4. **NEVER break the working system** — if a change risks `/crm`, stop and ask Hugo.

A change is not "done" until step 2 produces evidence. Code that compiles is not proof. Tests passing is proof.

---

## FROZEN ZONES

These paths must NEVER be modified by any Caller agent. Hugo's explicit approval is required to touch any of them.

**Investment**
- `src/pages/invest/*`
- `src/pages/admin/invest/*`
- `supabase/functions/inv-*`
- `supabase/functions/revolut-*`
- `supabase/functions/submit-payout-claim/`
- `supabase/functions/save-bank-details/`

**nfstay Booking**
- `src/pages/admin/nfstay/*`
- `src/pages/BookingSitePage.tsx`
- `supabase/functions/nfs-*`

**Build system**
- `vite.config.ts` (Particle + WASM + polyfills — fragile)
- `src/main.tsx` (import order critical)

**Auto-generated**
- `src/core/database/types.ts` (`supabase gen types` only)
- `src/components/ui/*` (shadcn-managed — `npx shadcn-ui@latest add` only)

**Legacy CRM (until cutover)**
- `src/features/smsv2/*` — read-only reference for porting; never edited by Caller agents
- `src/features/crm/*` — landlord-deals page, unrelated to Caller scope

If a Caller task seems to require touching a frozen path, the agent stops and asks Hugo.

---

## IMPORT RULES

- **No feature-to-feature imports.** `caller/` imports only from `core/` and standard libraries.
- **Use core integrations only.** Twilio goes through `src/core/integrations/twilio-voice.ts`. WhatsApp goes through Unipile via `wk-sms-send`. Email goes through Resend via `wk-email-send`. AI goes through `wk-voice-transcription` and `wk-ai-postcall`.
- **No raw external API calls in `features/caller/`.** No `fetch('https://api.twilio.com/...')` in browser code. All third-party traffic flows through edge functions or core wrappers.
- **No `import` from `src/features/smsv2/`.** Caller is a fresh tree. Logic that needs to be reused is copied to `caller/lib/` (with attribution in DECISIONS.md), not imported.

---

## DATA RULES

- **No new database.** Caller writes and reads existing `wk_*` tables.
- **No schema changes** unless Hugo approves and a migration is written. Renames, new columns, new tables — all require approval.
- **No `select('*')` on shared tables.** Explicit columns only. This rule is inherited from `CLAUDE.md` and is non-negotiable.
- **RLS is the source of truth for permission.** Caller hooks may add `.eq('agent_id', ...)` filters as a UX hint, but server-side RLS must enforce the rule.
- **Pence are integers.** Spend tracking uses integer pence in the existing `wk_calls.cost_pence` column. No floats. No mid-flight conversion.

---

## TESTING STANDARD

A change is **proven** only when all of the following are true:

1. **TypeScript clean** — `npx tsc --noEmit` returns zero errors.
2. **Build passes** — `npm run build` succeeds.
3. **Realtime works** — the relevant Supabase subscription emits the expected payload (verified by browser-side log or Playwright).
4. **End-to-end behavior verified** — the user-facing scenario in `TEST_PLAN.md` runs green in Playwright, or a manual test with screenshot is logged.

If any of the four are missing, the change is **UNPROVEN** and must be marked as such in `LOG.md`.

DB checks alone are not proof. "It compiles" is not proof. "It looks right" is not proof.

---

## REVIEW STANDARD

The Co-Pilot or any review agent must:

1. **Read the actual files changed.** Do not trust a summary. Open every file in the diff.
2. **Check diffs against the brief.** What was asked vs. what was done. Flag scope creep.
3. **Confirm behavior, not intent.** Run the change. Verify the user-facing outcome.
4. **Verify TypeScript is clean** with `npx tsc --noEmit`.
5. **Verify no frozen-zone files were touched.**
6. **Verify no smsv2 files were modified.**

A review that says "looks good" without these six checks is not a review.

---

## OUTPUT FORMAT

Every Caller task closes with three artefacts:

### 1. Hugo summary
Two to four short sentences in plain English. What changed, what was proved, what is next. No jargon.

### 2. Agent prompts
The exact prompts used to spawn each subagent, copied into `docs/caller/LOG.md` so the chain of custody is visible.

### 3. Review result
PASS / FAIL / PARTIAL with the six checks above. Cite file paths and command outputs.

---

## CUTOVER STRATEGY

Caller never replaces `/crm` in a single step.

**Phase 1 — Parallel run**
- Caller mounts at `/caller/*` (new route).
- `/crm/*` continues to mount `Smsv2Layout` (old code, unchanged).
- Hugo and selected testers use `/caller/*` while live agents continue to use `/crm`.
- Both routes read and write the same `wk_*` tables; data is shared, no migration needed.

**Phase 2 — Proof**
- Every scenario in `TEST_PLAN.md` passes on `/caller/*`.
- No console errors during a full real call.
- Hugo signs off in `LOG.md`.

**Phase 3 — Cutover**
- `/crm/*` is repointed to `CallerLayout`.
- `/smsv2/*` redirect to `/crm/*` is preserved.
- Old `smsv2/` folder stays in the repo for one week as a safety net.

**Phase 4 — Cleanup**
- After one week of green telemetry, `smsv2/` is deleted in a dedicated PR.
- `LOG.md` records the deletion date.

**RULE: Never break `/crm` until Caller is fully proven.** A direct route swap without parallel-run evidence is forbidden.
