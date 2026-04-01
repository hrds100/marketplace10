# Markdown Audit and Update Plan

> Audit date: 2026-04-01
> Scope: All meaningful markdown files under `/Users/hugo/Downloads/AI Folder/nfstay/`
> Objective: Standardize copilot behavior across the workspace via one master prompt

---

## Summary

- **95 markdown files** inventoried across the nfstay workspace, including hidden `.claude` / `.agents` docs and excluding node_modules plus test-results artifacts
- **Tracked canonical docs added to `marketplace10/docs/`:** `COPILOT_PROMPT.md` + `MD_AUDIT_AND_UPDATE_PLAN.md`
- **20 files changed** to reference and align with the master standard
- **~75 files left as-is** (reference docs, historical records, generated artifacts, or already aligned)
- **Active doc footguns removed** (dead `docs/nfstay/` paths, dead `DIAGNOSE_BEFORE_FIX.md` path, guessed preview URL pattern, rigid `feature/invest-wiring` branch rule)
- **Em dashes replaced** with regular hyphens in updated files where touched

---

## Why the canonical copy moved

The original workspace-level `docs/COPILOT_PROMPT.md` lived outside both NFStay product repos, so GitHub could not audit it as part of `marketplace10` or `bookingsite`.

The tracked canonical source now lives in:

- `marketplace10/docs/COPILOT_PROMPT.md`

Workspace-level copies under `/Users/hugo/Downloads/AI Folder/nfstay/docs/` are convenience mirrors only.

---

## Files Changed

### Shared root + bookingsite

| File | Action | Reason |
|------|--------|--------|
| `CLAUDE.md` | Updated | Points to the tracked canonical source in `marketplace10/docs/` |
| `docs/HOTKEY_CLAUDE.md` | Updated | Points to the tracked canonical source |
| `docs/HOTKEY_OPUS.md` | Updated | Points to the tracked canonical source |
| `docs/HOW_TO_WORK_WITH_ME.md` | Updated | Points to the tracked canonical source |
| `docs/PLANNING_AGENT.md` | Updated | Points to the tracked canonical source |
| `bookingsite/CLAUDE.md` | Updated | Points to the tracked canonical source |
| `bookingsite/docs/AGENT_INSTRUCTIONS.md` | Updated | Points to the tracked canonical source |
| `bookingsite/BOOKINGSITE_HOTKEY.md` | Updated | Points to the tracked canonical source |

### marketplace10

| File | Action | Reason |
|------|--------|--------|
| `marketplace10/CLAUDE.md` | Updated | Added tracked master prompt pointer |
| `marketplace10/docs/AGENT_INSTRUCTIONS.md` | Updated | Added tracked master prompt reference; fixed dead runbook path; fixed stale bookingsite references; removed guessed preview URL pattern |
| `marketplace10/docs/COPILOT.md` | Updated | Added tracked master prompt reference in header |
| `marketplace10/docs/COPILOT_PROMPT.md` | **CREATED** | Tracked canonical master copilot standard |
| `marketplace10/docs/MD_AUDIT_AND_UPDATE_PLAN.md` | **CREATED** | Tracked audit appendix |
| `marketplace10/docs/STACK.md` | Updated | Replaced stale booking-boundaries path |
| `marketplace10/docs/roles/bug-fixer.md` | Updated | Replaced dead runbook path |
| `marketplace10/docs/invest/AGENT_INVESTMENT_INSTRUCTIONS.md` | Updated | Added inheritance chain pointer; fixed duplicate numbering; removed permanent branch lock |
| `marketplace10/docs/invest/BOUNDARIES.md` | Updated | Replaced stale booking-boundaries path |
| `marketplace10/docs/invest/EXECUTION_PLAN.md` | Updated | Replaced fixed branch name with task-scoped branch guidance |
| `marketplace10/docs/invest/MIGRATION_PLAN.md` | Updated | Replaced fixed branch name with task-scoped branch guidance |
| `marketplace10/docs/invest/PHASES.md` | Updated | Replaced fixed branch name with task-scoped branch guidance |

---

## Follow-Up Work Still Needed

| Task | Priority | Notes |
|------|----------|-------|
| Commit and push the doc branches | High | Required before GitHub can verify the new standard end to end |
| Decide whether the root workspace docs should stay as mirrors or be removed | Medium | They are now convenience copies, not source of truth |
| Review unchanged historical docs for tone consistency only if useful | Low | Not blocking safe day-to-day operation |

---

*Audit appendix updated 2026-04-01.*
