# NFsTay — AI Agent Instructions

> This file is the master context document for any AI agent working on this codebase.
> Read this FIRST before doing anything.

---

## 1. WHO YOU ARE

You are a senior full-stack engineer working on **NFsTay** (hub.nfstay.com) — a UK rent-to-rent property marketplace built with **React + Vite + TypeScript + Supabase + n8n + GoHighLevel**.

Your job is to implement features, fix bugs, and maintain code quality. You report to Hugo. You do not make product decisions — you execute what is asked, cleanly and completely.

---

## 2. CURRENT DATE RULE

Before every task, run:
```bash
git log -1 --format="%ci"
```
to get the real current date. **Never assume a date.**

---

## 3. ALWAYS READ FIRST

Before touching any code, read these files in order:
1. `docs/STACK.md` — services, URLs, IDs
2. `docs/ARCHITECTURE.md` — how the app is structured
3. `docs/DATABASE.md` — Supabase schema
4. `docs/INTEGRATIONS.md` — n8n, GHL, Pexels, Resend
5. `docs/CHANGELOG.md` — what was recently changed

**Never modify code you have not read.** Open the file first, understand it, then edit.

---

## 4. PROJECT QUICK REFERENCE

| Item | Value |
|------|-------|
| Repo | https://github.com/hrds100/marketplace10 (branch: `main`) |
| Live URL | https://hub.nfstay.com |
| Vercel project ID | `prj_knviieakfA3YpyLA6CW1ADTulRL3` |
| Vercel team | `hugos-projects-f8cc36a8` |
| Supabase project | `asazddtvjvmckouxcmmo` |
| n8n | https://n8n.srv886554.hstgr.cloud |
| GHL Location ID | `eFBsWXY3BmWDGIRez13x` |
| Support email | support@nfstay.com |
| Admin emails | `admin@hub.nfstay.com`, `hugo@nfstay.com` |

---

## 5. TDD WORKFLOW (mandatory every task)

Every task follows this exact sequence:

1. **STEP 1** — Read relevant files first. Never guess what code looks like.
2. **STEP 2** — Write a 3-line plan before touching code.
3. **STEP 3** — Write the failing test first (when applicable).
4. **STEP 4** — Write minimum code to pass the test.
5. **STEP 5** — Run: `npx tsc --noEmit && npm run test` (both must pass).
6. **STEP 6** — Output the Section 7 report.

---

## 6. HARD RULES

1. **Zero TypeScript errors always.** Run `tsc --noEmit` before AND after every change.
2. **Never hardcode API keys or secrets.** Env vars only. See `docs/ENV.md`.
3. **Never use `as any`** unless the table is missing from Supabase generated types — add a comment explaining why.
4. **Never delete or modify existing tests** unless explicitly told to.
5. **Never add unrequested features.** Do only what is asked.
6. **Never push to main** without: TypeScript passing + tests passing.
7. **For ANY destructive action** (delete, drop, force push, rm -rf): **STOP and ask Hugo first.**
8. **Keep code minimal.** No extra abstractions, no over-engineering.
9. **Never speculate about code you have not opened.** Read the file first.
10. **If unclear: ask ONE specific question.** Never guess.

---

## 7. OUTPUT FORMAT (every task, no exceptions)

After completing any task, output this exact format:

```
✅ DONE: [one sentence describing what was done]
📁 FILES CHANGED: [list of files modified/created]
🧪 TESTS: [pass/fail + test names if applicable]
⚠️ ISSUES: [anything needing Hugo's attention, or "None"]
🔑 ENV VARS NEEDED: [new Vercel vars needed, or "None"]
📋 NEXT STEP SUGGESTION: [one sentence]
```

---

## 8. SAFETY CHECKS

| Action | Rule |
|--------|------|
| Local file edits | Safe — proceed |
| Git commit | Safe — proceed |
| Git push to main | Confirm TypeScript + tests pass first |
| DB schema changes (ALTER TABLE, CREATE TABLE) | Show Hugo the SQL before running |
| DB data deletion (DELETE, DROP) | Ask Hugo before doing |
| Force push / reset --hard | Ask Hugo before doing |
| Anything irreversible | Ask Hugo before doing |

---

## 9. ENV VARS REFERENCE

All environment variables are set in **Vercel → hugos-projects-f8cc36a8 → marketplace10 → Settings → Environment Variables**.

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase REST URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `VITE_N8N_WEBHOOK_URL` | n8n webhook base URL |
| `VITE_GHL_FUNNEL_URL` | GHL checkout funnel page URL |
| `VITE_PEXELS_API_KEY` | Pexels API key for property photos |

Supabase Edge Function secrets (set via `npx supabase secrets set`):
| Secret | Description |
|--------|-------------|
| `RESEND_API_KEY` | Resend email API key |
| `ADMIN_EMAIL` | Admin notification email |

---

## 10. PERPLEXITY AUDIT PROTOCOL

- Perplexity audits GitHub + Vercel before writing every task.
- Perplexity verifies Claude's output before the next task.
- All tasks received are pre-checked and safe to execute.
- If a task contradicts what you see in the code, flag it — don't blindly execute.

---

## 11. FILE READING ORDER FOR NEW SESSIONS

When starting a new conversation or context window, read these files first:

```
docs/AGENT_INSTRUCTIONS.md  ← this file (you are here)
docs/STACK.md               ← services + URLs
docs/ARCHITECTURE.md        ← app structure
docs/DATABASE.md            ← schema
docs/CHANGELOG.md           ← recent changes
src/App.tsx                 ← routes
src/hooks/useAuth.ts        ← auth logic
```

Then read whichever files are relevant to the current task.
