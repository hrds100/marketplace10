# NFStay — Agent Instructions

> **NFStay-specific operating rules.** Read AFTER the repo-level `docs/AGENT_INSTRUCTIONS.md`.
> The repo-level file governs all work in this repo. This file adds NFStay-specific context.

---

## 1. RELATIONSHIP TO REPO-LEVEL INSTRUCTIONS

The repo-level `docs/AGENT_INSTRUCTIONS.md` is the **primary authority**. It defines:
- Two-phase execution protocol (Phase 1 refinement, Phase 2 execution)
- Hard rules (TypeScript zero errors, no direct push to main, preview URLs, etc.)
- Hugo interaction protocol
- CI enforcement
- Response format

**This file does NOT override any repo-level rule.** It extends them for NFStay-specific context.

---

## 2. REQUIRED READING — NFStay TASKS

### Always read (every NFStay task)

1. `docs/AGENT_INSTRUCTIONS.md` (repo-level — primary authority)
2. `docs/nfstay/AGENT_INSTRUCTIONS.md` (this file)
3. `docs/nfstay/BOUNDARIES.md` (what belongs where)

### By task type

| Task type | Additional NFStay docs to read |
|-----------|-------------------------------|
| Properties / listings | `FEATURES.md` + `DATABASE.md` |
| Bookings / reservations | `FEATURES.md` + `INTEGRATIONS.md` (Stripe) + `DATABASE.md` |
| Hospitable / Airbnb sync | `INTEGRATIONS.md` (Hospitable) + `WEBHOOKS.md` |
| White-label / domains | `WHITE_LABEL.md` |
| Database / schema / RLS | `DATABASE.md` + `SHARED_INFRASTRUCTURE.md` |
| Webhooks / n8n workflows | `WEBHOOKS.md` + `INTEGRATIONS.md` |
| Frontend routes / pages | `ROUTES.md` + `ARCHITECTURE.md` |
| Environment / secrets | `ENVIRONMENT.md` |
| Bug / "X not working" | `runbooks/DIAGNOSE_BEFORE_FIX.md` |
| Unknown / cross-cutting | All NFStay docs |

---

## 3. NFSTAY MODULE RULES

These rules are specific to NFStay development and supplement the repo-level hard rules.

### 3.1 Isolation rules

1. **All NFStay database tables use the `nfs_` prefix.** No exceptions.
2. **Never modify existing marketplace10 tables** (`profiles`, `properties`, `crm_deals`, `chat_threads`, etc.) for NFStay purposes. If NFStay needs data from a shared table, read it — never write to it or add columns.
3. **Exception:** `notifications` table — NFStay may INSERT rows (shared notification system). Never modify the table schema.
4. **NFStay frontend code lives in isolated directories:**
   - Routes: `app/(nfstay)/`
   - Components: `components/nfstay/`
   - Hooks: `hooks/nfstay/`
   - Services/lib: `lib/nfstay/`
5. **Never import NFStay code from marketplace10 code** and vice versa. Shared utilities (UI components, auth hooks) live in shared directories and are imported by both.
6. **NFStay Edge Functions are prefixed `nfs-`.** Example: `nfs-stripe-webhook`, `nfs-ical-feed`.
7. **NFStay n8n workflows are prefixed `nfs-`.** Example: `nfs-hospitable-init-sync`.

### 3.2 Shared infrastructure rules

1. **Supabase Auth is shared.** NFStay uses the same `auth.users` and `profiles` table. Do not create a separate auth system.
2. **The `profiles` table is read-only for NFStay.** NFStay reads `profiles.id`, `profiles.name`, `profiles.email`. NFStay never writes to `profiles` or adds columns.
3. **Supabase project is shared.** Same project ID, same connection, same RLS engine.
4. **Vercel project is shared.** Same deployment, same build, same preview URLs.
5. **n8n instance is shared.** NFStay workflows coexist with marketplace10 workflows. Use `nfs-` prefix to avoid collision.
6. **Google Maps API key is shared.** Same key, both modules use it.

### 3.3 Documentation update rules

When any NFStay change affects:
- Database schema → update `docs/nfstay/DATABASE.md` in the same commit
- Integrations → update `docs/nfstay/INTEGRATIONS.md` in the same commit
- Routes → update `docs/nfstay/ROUTES.md` in the same commit
- Features → update `docs/nfstay/FEATURES.md` in the same commit
- Webhooks → update `docs/nfstay/WEBHOOKS.md` in the same commit
- Environment variables → update `docs/nfstay/ENVIRONMENT.md` in the same commit
- Architecture decisions → add entry to `docs/nfstay/DECISIONS.md`
- Any shipped change → add entry to `docs/nfstay/CHANGELOG.md`
- Shared stack (new service/tool) → also update `docs/STACK.md` (repo-level)

### 3.4 Evidence-first workflow

1. **Never guess what NFStay code does.** Open the file first.
2. **Never assume a table exists.** Check `docs/nfstay/DATABASE.md` or query the schema.
3. **Never assume an integration works.** Check `docs/nfstay/INTEGRATIONS.md` for status.
4. **Never assume a feature is built.** Check `docs/nfstay/FEATURES.md` for phase status.
5. **When in doubt, read BOUNDARIES.md.** It tells you what belongs to NFStay, what belongs to marketplace10, and what is shared.

### 3.5 No-guessing rules (NFStay-specific)

- If you don't know whether a feature should use Supabase Edge Function or n8n → check `docs/nfstay/ARCHITECTURE.md` Section 2.
- If you don't know whether something is shared → check `docs/nfstay/BOUNDARIES.md`.
- If you don't know the table name → check `docs/nfstay/DATABASE.md`.
- If you don't know the webhook flow → check `docs/nfstay/WEBHOOKS.md`.
- If you can't find the answer in docs → ask Hugo. One specific question.

---

## 4. DEFINITION OF DONE — NFSTAY TASKS

A NFStay task is DONE when:

1. TypeScript compiles with zero errors (`npx tsc --noEmit`)
2. All tests pass
3. Lint is clean
4. Preview URL provided and tested
5. No existing marketplace10 features broken
6. RLS policies exist for any new table operations
7. Relevant NFStay docs updated in the same commit
8. Acceptance scenarios from `docs/nfstay/ACCEPTANCE.md` hold (if applicable)
9. No hardcoded secrets, URLs, or API keys
10. Empty states, loading states, and error states exist for any new UI

---

## 5. BRANCH NAMING

NFStay branches follow the repo convention with an `nfs` scope:

- `feat/nfs-[description]` — new NFStay feature
- `fix/nfs-[description]` — NFStay bug fix
- `docs/nfs-[description]` — NFStay documentation

---

## 6. HANDOFF RULES

When handing off NFStay work to another agent or developer:
1. Point them to `docs/nfstay/HANDOFF.md` first
2. Ensure `docs/nfstay/FEATURES.md` reflects current build status
3. Ensure `docs/nfstay/CHANGELOG.md` is up to date
4. Note any in-progress work or known issues

---

## 7. CROSS-REFERENCES

| Need | Go to |
|------|-------|
| Repo-level rules | `docs/AGENT_INSTRUCTIONS.md` |
| What belongs where | `docs/nfstay/BOUNDARIES.md` |
| Shared infra details | `docs/nfstay/SHARED_INFRASTRUCTURE.md` |
| Full feature list | `docs/nfstay/FEATURES.md` |
| Database schema | `docs/nfstay/DATABASE.md` |
| All integrations | `docs/nfstay/INTEGRATIONS.md` |
| Webhook flows | `docs/nfstay/WEBHOOKS.md` |
| White-label system | `docs/nfstay/WHITE_LABEL.md` |
| Frontend routes | `docs/nfstay/ROUTES.md` |
| Environment vars | `docs/nfstay/ENVIRONMENT.md` |
| Architecture decisions | `docs/nfstay/DECISIONS.md` |
| BDD scenarios | `docs/nfstay/ACCEPTANCE.md` |

---

*End of NFStay Agent Instructions.*
