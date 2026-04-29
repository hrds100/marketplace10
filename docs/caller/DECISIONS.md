# Caller — Decisions

A running record of the architectural decisions Hugo and the Co-Pilot have made for Caller. Each entry is dated. New decisions are appended at the bottom.

---

## D1 — No new database

**Date:** 2026-04-29
**Decision:** Caller uses the existing Supabase project (`asazddtvjvmckouxcmmo`) and the existing `wk_*` tables. No new schemas, no parallel database, no migration of existing data.
**Why:** The current data model works. Building a parallel database would force a sync layer and double the surface area. The risk is high; the benefit is zero.
**How to apply:** Caller hooks read and write the same tables as smsv2. RLS policies stay as they are. Any new column or table requires Hugo approval and a migration in `supabase/migrations/`.

---

## D2 — Reuse the backend

**Date:** 2026-04-29
**Decision:** All `wk-*` edge functions are reused as-is. The browser invokes them via `supabase.functions.invoke()`, the same pattern smsv2 uses.
**Why:** The edge functions are the result of months of debugging (PRs 125–154 alone fixed 15+ Twilio edge cases). Rebuilding them would re-introduce bugs that have already been hunted. The backend is the most stable layer of the system.
**How to apply:** Caller does not modify any `wk-*` function. If a real bug is found during integration, the fix goes to the existing function (with tests), not to a Caller-only fork.

---

## D3 — Rename CRM → Caller

**Date:** 2026-04-29
**Decision:** The new frontend is named "Caller", not "CRM v2" or "SMSv2". The product surface (sidebar, page titles, brand) uses "Caller". Internal folder is `src/features/caller/`. Database tables (`wk_*`) and edge functions (`wk-*`) keep their existing names.
**Why:** "smsv2" no longer reflects what the product does (it is a power-dialer, not an SMS tool). "CRM" is a generic word that means different things to different teams. "Caller" is specific, clean, and gives the rebuild a separate identity from the brittle history of smsv2.
**How to apply:** All UI strings, sidebar labels, and page titles say "Caller". Folder name is `caller/`. The `/crm/*` URL is preserved for cutover compatibility (no agent retraining needed).

---

## D4 — Rebuild frontend only first

**Date:** 2026-04-29
**Decision:** Phase 1 through Phase 6 of the build plan touch only the frontend (`src/features/caller/`) and routing (`src/App.tsx`). The backend is touched only if a real bug is identified during integration testing.
**Why:** The frontend is where the mess lives. SettingsPage at 4,700 lines, LiveCallScreen at 600+ lines, SmsV2Store mixing DB cache with UI state — these are the sources of friction. The backend is solid. Rewriting both at once doubles the risk and triples the timeline.
**How to apply:** Every PR in `BUILD_PLAN.md` lists the files it touches. If a PR proposes touching `supabase/functions/`, the Co-Pilot stops and asks Hugo. The frontend rebuild ships first; backend cleanup is a separate, later project (if needed at all).

---

## D5 — `/caller/*` parallel route during build

**Date:** 2026-04-29
**Decision:** During Phases 1–5, Caller mounts at `/caller/*`. The legacy `/crm/*` route remains untouched and continues to serve `Smsv2Layout`. Cutover (Phase 6) is the only step that changes the `/crm` route binding.
**Why:** Live agents must keep working while Caller is being built. Any route change before Caller is fully proven risks breaking real revenue-generating workflows. Parallel run also lets Hugo and selected testers compare behaviors side-by-side.
**How to apply:** Phase 1 adds `/caller/*` to `src/App.tsx`. The `/crm/*` line is not modified until Phase 6. The cutover PR is a single one-line change to the route binding.

---

## D6 — No `select('*')` on shared tables

**Date:** 2026-04-29
**Decision:** Inherited from `CLAUDE.md` rule 5. Caller hooks always list explicit columns in Supabase queries.
**Why:** `select('*')` makes schema changes silently break readers. Explicit columns force the writer to update every reader if a column is renamed.
**How to apply:** Every `supabase.from('wk_*').select(...)` lists columns by name. A grep for `select('*')` in `caller/` must return zero hits.

---

## D7 — Realtime + RLS double check

**Date:** 2026-04-29
**Decision:** Caller hooks add explicit filters (e.g. `.eq('agent_id', user.id)`) on top of RLS, even though RLS already enforces the rule.
**Why:** Defense in depth. If RLS is misconfigured during a migration, the client-side filter prevents data leak. If the client-side filter is missing, RLS still saves us. Both layers cost nothing and protect against bugs.
**How to apply:** Every hook that reads agent-scoped data adds the filter explicitly. Reviewers verify both client filter and RLS policy in PRs.

---

## D8 — Tests are the proof, not the code

**Date:** 2026-04-29
**Decision:** A change is "done" only when (a) TypeScript is clean, (b) the build passes, (c) the realtime path emits the expected payload, and (d) the user-facing scenario in `TEST_PLAN.md` runs green. Code that compiles but is not tested is **UNPROVEN** and must be marked as such in `LOG.md`.
**Why:** Every PR that landed in smsv2's "fix(crm dialer)" run (PRs 125–154) compiled. Many shipped without integration tests. The result was a hotfix queue. Caller will not repeat that pattern.
**How to apply:** Reviewers reject PRs that report "TypeScript clean" without a test artefact. Manual tests are acceptable when documented (screenshot + log line in PR description).

---

## D9 — One agent per file

**Date:** 2026-04-29
**Decision:** Two parallel agents may not edit the same file in the same run. Co-Pilot assigns scopes and tracks them in `LOG.md`. Scope violation = revert.
**Why:** Parallel edits to the same file produce merge conflicts, race conditions, and silent overwrites. The Co-Pilot lacks the context to reconcile two agents writing to the same file at once.
**How to apply:** Every parallel agent declares its file list before starting. Co-Pilot logs the assignment in `LOG.md`. Any agent that touches a file outside its declared scope has its work rolled back.

---

## D10 — Skeleton: stub pages with clean architecture

**Date:** 2026-04-29
**Decision:** Phase 1 ships `/caller/*` mounted with a real `CallerLayout` + sidebar + statusbar, but every page renders a `StubPage` placeholder ("This page lands in Phase N"). No imports from `smsv2/` are introduced. Real UI lands per phase.
**Why:** Hugo chose architectural cleanliness over day-1 visible UI. The "cheat — point at smsv2 temporarily" alternative would have broken the no-feature-to-feature-imports rule on day one and required a refactor PR in Phase 2 to fix it. The "big bang copy" alternative (~100 files) would have made PR 1 unreviewable.
**How to apply:** Phase 2-5 each replace the stub with the real component for that phase's pages. The stub component lives at `src/features/caller/components/StubPage.tsx` and is removed when no page references it any more.

---

## D11 — Live testing: mixed (automated build + Hugo proof)

**Date:** 2026-04-29
**Decision:** Phase 2 and Phase 3 use Twilio test credentials (`+15005550006` for "always answers", `+15005550003` for "no SMS-capable", etc.) for automated Playwright tests during the build. Once the test suite is green, Hugo runs a single live-phone verification session at the end of Phase 3 to confirm ring + audio + transcript + coach + recording.
**Why:** Twilio test creds prove the pipeline (dial → status callback → answer → hangup) without consuming live minutes or needing a human on the other end. But they don't produce real audio, so the coach + transcript paths can only be proven with a real call. Hugo doing one live session at the end is cheaper than scheduling many.
**How to apply:** All Caller automated specs use the test-cred numbers. The Phase 3 LOG.md entry must record Hugo's live-test outcome before the agent moves to Phase 4.

---

## D12 — Schema changes: full autonomy

**Date:** 2026-04-29
**Decision:** During the Caller build, the agent may add nullable columns, indexes, new `wk_*` tables, or RLS policies as needed. Each change is documented in `DECISIONS.md` (a new D-numbered entry) plus a migration in `supabase/migrations/`. Hugo reviews schema changes at phase boundaries.
**Why:** Hugo chose speed. The current `wk_*` schema is solid but may have gaps for new features (e.g. a Caller-specific telemetry column on `wk_calls`). Always-stop-and-ask would block the build for trivial additive migrations. Full autonomy with documentation and post-hoc review keeps the build moving while preserving the audit trail.
**How to apply:** Every migration is paired with a DECISIONS.md entry that names: the table/column added, the rationale, and any reader/writer impact. Renames, drops, and breaking changes still trigger an explicit Hugo prompt — autonomy applies to additive schema only.

---

## D13 — Phase pauses: non-stop, error-only

**Date:** 2026-04-29
**Decision:** Phases 1 → 6 run continuously. The agent only halts on (a) build failure, (b) test failure, (c) attempted edit of a frozen-zone file, or (d) Hugo's mandatory live-call test at the end of Phase 3 and the cutover sign-off at Phase 6. The "no phase starts until Hugo signs off in LOG.md" rule from `CALLER_OPERATING_SYSTEM.md` is interpreted as self-attested by the agent — the agent writes the LOG entry and proceeds.
**Why:** Hugo wants speed. The OS doc was written conservatively; he's now consciously trading some safety for velocity. Two human gates remain (Phase 3 live test, Phase 6 cutover) — both are at moments of irreversibility.
**How to apply:** Every phase ends with a LOG.md entry recording the verification commands and outputs. The agent moves to the next phase immediately after writing the entry. Hugo's only required intervention is at the two named gates.

<!-- New decisions go below this line. Use the same format. -->
