# NFStay — Agent Instructions

> **NFStay operating law.** Read on every NFStay task. No exceptions.
> This file + `BOUNDARIES.md` together define what an agent can and cannot do for NFStay.

---

## 1. AUTHORITY CHAIN

1. **Repo-level `docs/AGENT_INSTRUCTIONS.md`** — governs all work in this repo (two-phase protocol, hard rules, CI, response format, Hugo interaction). NFStay does NOT override it.
2. **This file (`docs/nfstay/AGENT_INSTRUCTIONS.md`)** — governs NFStay-specific rules, workflows, deployment gates, and escalation.
3. **`docs/nfstay/BOUNDARIES.md`** — governs what NFStay can and cannot touch. The protection law.

If any rule here conflicts with the repo-level instructions, the repo-level instructions win.

---

## 2. REQUIRED READING

### Every NFStay task (no exceptions)

1. `docs/nfstay/AGENT_INSTRUCTIONS.md` (this file)
2. `docs/nfstay/BOUNDARIES.md`

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

### 3.1 Isolation rules

1. **All NFStay database tables use the `nfs_` prefix.** No exceptions.
2. **Never modify existing marketplace10 tables.** If NFStay needs data from a shared table, read it — never write to it or add columns. (Full protected tables list is in `BOUNDARIES.md` §3.)
3. **Exception:** `notifications` table — NFStay may INSERT rows only. Never ALTER the table.
4. **NFStay frontend code lives in isolated directories:**
   - Routes: `app/(nfstay)/`
   - Components: `components/nfstay/`
   - Hooks: `hooks/nfstay/`
   - Services/lib: `lib/nfstay/`
5. **Never import NFStay code from marketplace10 code** and vice versa. Shared utilities (UI components, auth hooks) live in shared directories and are imported by both.
6. **NFStay Edge Functions are prefixed `nfs-`.** Example: `nfs-stripe-webhook`.
7. **NFStay n8n workflows are prefixed `nfs-`.** Example: `nfs-hospitable-init-sync`.
8. **Never modify shared UI components** (`components/ui/*`). Create wrappers in `components/nfstay/` instead.
9. **Always update `docs/COMMUNICATIONS.md`** when adding, removing, or changing any email, WhatsApp, or in-app notification. Same commit. No exceptions.

### 3.2 Shared infrastructure rules

1. **Supabase Auth is shared.** Same `auth.users` and `profiles` table. Do not create a separate auth system.
2. **`profiles` is read-only for NFStay.** Read `id`, `name`, `email`. Never write or add columns.
3. **Supabase project is shared.** Same project, same connection, same RLS engine.
4. **Vercel project is shared.** Same deployment, same build, same preview URLs.
5. **n8n instance is shared.** NFStay workflows coexist with marketplace10 workflows. `nfs-` prefix prevents collision.
6. **Google Maps API key is shared.** Same key for both modules.
7. **`middleware.ts` is shared.** One file routes traffic for both modules. **Modifying it requires Hugo's approval** — a mistake breaks hub.nfstay.com.

### 3.3 Documentation update rules

When any NFStay change affects:
- Database schema → update `DATABASE.md` in the same commit
- Integrations → update `INTEGRATIONS.md` in the same commit
- Routes → update `ROUTES.md` in the same commit
- Features → update `FEATURES.md` in the same commit
- Webhooks → update `WEBHOOKS.md` in the same commit
- Environment variables → update `ENVIRONMENT.md` in the same commit
- Architecture decisions → add entry to `DECISIONS.md`
- Any shipped change → add entry to `CHANGELOG.md`
- Shared stack (new service/tool) → also update repo-level `docs/STACK.md`

### 3.4 Evidence-first workflow

1. **Never guess what NFStay code does.** Open the file first.
2. **Never assume a table exists.** Check `DATABASE.md` or query the schema.
3. **Never assume an integration works.** Check `INTEGRATIONS.md` for status.
4. **Never assume a feature is built.** Check `FEATURES.md` for phase status.
5. **When in doubt, read BOUNDARIES.md.**

### 3.5 No-guessing rules

- Edge Function vs n8n? → check `ARCHITECTURE.md` §2.
- Shared vs isolated? → check `BOUNDARIES.md`.
- Table name? → check `DATABASE.md`.
- Webhook flow? → check `WEBHOOKS.md`.
- Can't find the answer? → ask Hugo. One specific question.

---

## 4. DEPLOYMENT RULES

### 4.1 Branch safety

- **Never push or merge to main** unless Hugo explicitly instructs it.
- Always create a feature branch: `feat/nfs-*`, `fix/nfs-*`, `docs/nfs-*`.
- Always open a PR first.
- Assume main is protected even if it is not.

### 4.1a Clickable test URL (mandatory)

After every `git push`, you **must**:
1. Wait for Vercel to post the preview URL on the PR (check with `gh pr view [number] --comments | grep Preview`)
2. Include the **real** Vercel preview URL in your response — do NOT guess it from the branch name (Vercel truncates long names)
3. Include a **TEST HERE** link pointing to the **exact page that changed** (e.g. `/nfstay/properties`, `/dashboard/booking-site`), not just the root URL
4. The person reviewing must be able to click one link and immediately see what changed

Example:
```
🔗 PREVIEW:  https://marketplace10-git-feat-nfs-booki-e0b6e8-hugos-projects-f8cc36a8.vercel.app
🧪 TEST HERE: https://marketplace10-git-feat-nfs-booki-e0b6e8-hugos-projects-f8cc36a8.vercel.app/dashboard/booking-site
```

### 4.2 Production deployment gates

These actions are **irreversible** and require **Hugo's explicit approval** before execution:

| Action | Why it's dangerous |
|--------|-------------------|
| `supabase functions deploy nfs-*` | Deploys Edge Function to live Supabase — affects real traffic |
| `supabase db push` or running SQL DDL | Modifies live database schema — cannot be undone cleanly |
| `supabase secrets set` | Could overwrite existing marketplace10 secrets |
| Activating n8n workflows | Could process live webhook traffic immediately |
| `git push origin main` | Deploys to hub.nfstay.com production |
| `git push --force` | Destroys commit history |

### 4.3 SQL and migration approval

If a task produces SQL DDL statements (CREATE TABLE, ALTER TABLE, DROP anything):
1. Output the full SQL in the refinement step
2. Mark it: **"REQUIRES HUGO TO REVIEW SQL BEFORE EXECUTION"**
3. Do not let the coding agent run it until Hugo approves
4. Migration files must include `nfs` in the filename

### 4.4 Dev commands

| Command | What it does | When to use |
|---------|-------------|-------------|
| `npm run check` | Runs typecheck + lint + test in one command | **Before every push.** Mandatory. |
| `npm run clean` | Clears build cache | When dev server behaves strangely |
| `npm run dev` | Starts local dev server | Development |
| `npm run build` | Production build | Verify build before pushing |

**`npm run check` must pass before every push.** If it fails, fix it — don't push broken code.

---

## 5. APPROVAL AND ESCALATION RULES

### Tajul approves most things

Tajul has full access to all systems (Stripe, Hospitable, Cloudflare, Google Cloud, Supabase, Vercel, n8n, DNS, domains). He approves:

1. **Database migrations** — agent shows SQL, Tajul says APPROVED
2. **Edge Function deployments** — agent explains what it does, Tajul says APPROVED
3. **n8n workflow activation** — agent confirms test data flows correctly, Tajul says APPROVED
4. **Integration setup** — agent gives Tajul exact step-by-step instructions for dashboards
5. **Credential provisioning** — Tajul provides API keys, secrets, tokens
6. **DNS and domain changes** — agent gives exact records, Tajul configures

### Escalate to Hugo ONLY when

1. **Risk to hub.nfstay.com** — any change that could break the live marketplace10 site
2. **`middleware.ts` changes that break marketplace10 routing** — if testing reveals marketplace10 is affected
3. **Final production merge** — merging to main (deploys to production)
4. **Unclear situations where marketplace10 data or traffic could be impacted**

### Escalation message format

For Tajul approval:
- "Tajul, here's what I need you to approve: [specific item + explanation]"
- "Tajul, I need you to do this in [Dashboard]: [exact numbered steps]"
- "Tajul, please provide: [specific credential/key]"

For Hugo escalation (marketplace10 risk only):
- "Tajul, this could affect hub.nfstay.com. Please check with Hugo before continuing: [specific risk]"
- "Tajul, this is the final production merge. Hugo needs to approve: [what's being shipped]"

---

## 6. DEFINITION OF DONE

A NFStay task is DONE when:

1. TypeScript compiles with zero errors (`npx tsc --noEmit`)
2. All tests pass
3. Lint is clean
4. Preview URL provided and tested
5. No existing marketplace10 features broken
6. RLS policies exist for any new table operations
7. Relevant NFStay docs updated in the same commit
8. Acceptance scenarios from `ACCEPTANCE.md` hold (if applicable)
9. No hardcoded secrets, URLs, or API keys
10. Empty states, loading states, and error states exist for any new UI

---

## 7. BRANCH NAMING

- `feat/nfs-[description]` — new NFStay feature
- `fix/nfs-[description]` — NFStay bug fix
- `docs/nfs-[description]` — NFStay documentation

---

## 8. HANDOFF RULES

When handing off NFStay work:
1. Point the new agent/dev to `HANDOFF.md` first
2. Ensure `FEATURES.md` reflects current build status
3. Ensure `CHANGELOG.md` is up to date
4. Note any in-progress work or known issues

---

## 9. RUNTIME HOTKEY ASSUMPTIONS

The runtime hotkey (the prompt Tajul pastes into the agent) is intentionally lean. It handles:
- Orchestration flow (refine → APPROVED → execute)
- Approval gates (the "BEFORE YOU APPROVE" checklist)
- Escalation triggers (when Tajul must ask Hugo)
- Scope declaration (NFStay only, marketplace10 off limits)

The hotkey intentionally does **NOT** repeat:
- Protected files list → lives in `BOUNDARIES.md` §8
- Protected tables list → lives in `BOUNDARIES.md` §3
- Protected systems list → lives in `BOUNDARIES.md` §9
- Safe zone definition → lives in `BOUNDARIES.md` §8
- Deployment gates → lives in this file §4
- SQL approval rules → lives in this file §4.3
- Isolation rules → lives in this file §3.1
- Shared infra rules → lives in this file §3.2
- Definition of done → lives in this file §6
- Documentation update rules → lives in this file §3.3

**The docs are the law. The hotkey is the workflow.**

If the hotkey and docs ever conflict, the docs win. If a rule is missing from the hotkey, it still applies if it's in the docs. The hotkey's MANDATORY section tells the agent to read these files first — that is the enforcement mechanism.

---

## 10. CROSS-REFERENCES

| Need | Go to |
|------|-------|
| Repo-level rules | `docs/AGENT_INSTRUCTIONS.md` |
| What belongs where | `BOUNDARIES.md` |
| Shared infra details | `SHARED_INFRASTRUCTURE.md` |
| Full feature list | `FEATURES.md` |
| Database schema | `DATABASE.md` |
| All integrations | `INTEGRATIONS.md` |
| Webhook flows | `WEBHOOKS.md` |
| White-label system | `WHITE_LABEL.md` |
| Frontend routes | `ROUTES.md` |
| Environment vars | `ENVIRONMENT.md` |
| Architecture decisions | `DECISIONS.md` |
| BDD scenarios | `ACCEPTANCE.md` |

---

*End of NFStay Agent Instructions.*
