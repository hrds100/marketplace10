# TAKEOVER

> Canonical continuity file. Any new chat or agent reads this first.
> Keep this file short, brutally current, and operational.
> No history dump. Replace stale status instead of piling garbage on top.

---

## 1. Project Snapshot

| Item | Value |
|------|-------|
| **What** | UK rent-to-rent property marketplace |
| **Live URL** | https://hub.nfstay.com |
| **Repo** | https://github.com/hrds100/marketplace10 (`main` branch) |
| **Stack** | React + Vite + TypeScript + Supabase + n8n + GoHighLevel |
| **Priority order** | reliability > scalability > clean code > speed |
| **Locked integrations** | n8n, GoHighLevel (never suggest replacing) |

---

## 2. Current Production Truth

| Item | Value |
|------|-------|
| **Latest known live commit** | `70bcc38` - docs: changelog for 2026-04-04 — WhatsApp gate, email backfill, auto wallets, admin wallet column (#250) |
| **Latest meaningful merged PRs** | #250 changelog; #249 hard-delete-user FK cleanups; #248 auto-create wallet on dashboard load |
| **Open but important** | `gh pr list --state open` → **none** (verified 2026-04-04, repo `hrds100/marketplace10`) |
| **Unproven / not yet merged** | No open PRs; verify Vercel production matches `main` after each merge |

---

## 3. Active Rules

### GLOBAL SAFETY OVERRIDE (permanent, non-negotiable)

**No agent and no Co-Pilot may directly push or deploy.**

- No agent may run: `git add`, `git commit`, `git push`, `git merge`, `git rebase`, `git tag`.
- No agent may run: `supabase functions deploy`, any CLI deploy, any infra mutation.
- No agent may claim something is "merged", "deployed", or "live".
- Co-Pilot reviews code and tests, then decides what happens next. If a change is ready, Co-Pilot handles the approval path via `gh pr merge`. Agents do not do it themselves.
- **Modes:** Research mode (read-only, default) and Edit mode (only when Co-Pilot explicitly asks, still no push/deploy). If unsure, stop and ask.
- **Roles:** Hugo describes wants and tests live. Co-Pilot is the only approver. Dimitri, Mario, Scarlett all obey the same rule.

---

- **Branch workflow:** All work on feature branches (`feat/`, `fix/`, `docs/`). PR required to merge. Agents prepare code; Co-Pilot handles git operations.
- **Preview workflow:** Every push gets a Vercel preview. Fetch real URL from PR comments. Never guess.
- **Co-Pilot audit before merge:** Hugo brings branch/PR/preview details to the Co-Pilot. Co-Pilot audits GitHub reality (including a strict code review via `gh pr diff`) before merge approval. Claude's claim is not the source of truth - GitHub is.
- **Tests required before DONE:** Playwright e2e test mandatory. `npm run check` mandatory. Zero TypeScript errors always.
- **Visibility gate:** If work is not pushed to a GitHub feature branch, it is not done. Local-only changes are not proof.

---

## 4. Critical Flows

| Flow | Key files | What to know |
|------|-----------|-------------|
| **List-a-Deal** | `src/pages/ListADealPage.tsx`, `src/pages/admin/AdminQuickList.tsx` | Tenant submits property → admin reviews in Pending tab → approves → goes live |
| **Deals / Inquiries** | `src/pages/DealsPageV2.tsx`, `src/components/InquiryPanel.tsx` | Operators browse deals, send inquiries via WhatsApp or email. Payment gate for free-tier. |
| **Outreach / The Gate** | `src/pages/admin/AdminOutreachV2.tsx` | Admin assigns leads to landlords, tracks contacted status, NDA flow |
| **Admin Notifications** | `src/pages/admin/AdminQuickList.tsx` | Consolidated deals page: Pending Review, Live, Inactive tabs |
| **University** | `src/pages/UniversityPage.tsx` | Educational content for operators |
| **Invest / JV** | `src/pages/invest/*` | Investment module - separate agent instructions at `docs/invest/` |
| **nfstay Booking** | Separate repo (`bookingsite`) | Shares same Supabase. Deploy marketplace10 first, bookingsite second. |

---

## 5. Known Issues / Watchlist

- Check `gh issue list` for current bugs
- Social login dead-end for existing users: fixed in `fix/legacy-social-auth-reconcile` branch (2026-04-04). Existing email/password users trying social login were hitting "User already registered" dead-end. Now redirects to /signin.
- Password seed `_NFsTay2!` must never be renamed (broke all social logins on 2026-03-23)
- `vite.config.ts` is fragile - no React aliases, no polyfill changes
- Supabase edge function deploys reset `verify_jwt` to true - must patch after every deploy
- Never use `sed` on .tsx/.ts files

---

## 6. Current Branch Map

| Branch | Purpose | Status |
|--------|---------|--------|
| `fix/legacy-social-auth-reconcile` | Fix social login dead-end for existing email/password users | Open — PR pending |
| `fix/hospitable-clean-sync` | PR #189 — consistent listing sync mapping across n8n workflows | Open — hospitable backlog |
| `fix/hospitable-photo-quality` | PR #188 — full-res Airbnb photos instead of thumbnails | Open — hospitable backlog |
| `fix/hospitable-sync-listings` | PR #187 — real Airbnb listings sync to nfstay | Open — hospitable backlog |

> Update this table when branches are created or merged. Delete merged branches. Only list branches verified on GitHub — never local-only.

---

## 7. Recent Decisions

- Admin pages consolidated: Submissions + Listings merged into single Deals page with 3 tabs (2026-04-02)
- WhatsApp reply architecture: webhook (instant) + poll (backup inquiry only, no reply duplication) (2026-04-02)
- Outreach renamed to "The Gate" with contacted badge from DB (2026-04-01)
- Visibility gate + Co-Pilot review gate added to prevent local-only work being treated as done (2026-04-03)
- List-a-deal: deposit/profit made optional, email prefill fixed, Airbnb pricing timeout increased + error logging added (2026-04-03, PR #199, merged)
- Email inquiry gate: email inquiries now reach admin gate (401 fixed). process-inquiry edge function redeployed 2026-04-03 (PR #193)
- Outreach: global Reset Test Data button added with PIN confirmation (PIN: 1234) — wipes all inquiries + outreach flags on all properties (PR #175, 2026-04-03)

---

## 8. Environment / External Systems

| System | Details |
|--------|---------|
| **Supabase** | Project `asazddtvjvmckouxcmmo`. Shared with bookingsite. Edge functions deployed separately via CLI. |
| **Vercel** | Team `hugos-projects-f8cc36a8`. Auto-deploys from main. PR previews automatic. |
| **n8n** | `https://n8n.srv886554.hstgr.cloud`. Handles WhatsApp, email, webhooks. API key in `docs/AGENT_INSTRUCTIONS.md` Section 20. |
| **GHL** | Location `eFBsWXY3BmWDGIRez13x`. Payments, funnels, CRM webhooks. |
| **Admin emails** | `admin@hub.nfstay.com`, `hugo@nfstay.com` (hardcoded in `src/hooks/useAuth.ts`) |
| **Sentry** | `nfstay.sentry.io`, project `javascript-react` |
| **UptimeRobot** | Monitors `hub.nfstay.com/api/health` |

---

## 9. Agent Roster

Three parallel coding agents + one docs helper. Hugo pastes the agent name back to the Co-Pilot with every report.

### Fixed Agent Names

| Agent ID | Branch Prefix | Scope |
|----------|--------------|-------|
| `NF-ALPHA__BRANCH-A__LIST-A-DEAL` | `feat/alpha-*`, `fix/alpha-*` | List-a-Deal flow, AdminQuickList, pricing webhook |
| `NF-BRAVO__BRANCH-B__NOTIFICATIONS-SETTINGS-UNIVERSITY` | `feat/bravo-*`, `fix/bravo-*` | Notifications, settings, university, comms |
| `NF-CHARLIE__BRANCH-C__DEALS-OUTREACH-INQUIRY` | `feat/charlie-*`, `fix/charlie-*` | DealsPageV2, OutreachV2, InquiryPanel, CRM |
| `NF-DELTA__DOCS__AGENT-ROSTER` | `docs/delta-*` | Docs and process only — no app code |

### Mandatory Output Header

Every agent must start its report with this header block. If any field is missing, the report is incomplete and the Co-Pilot will reject it.

```
AGENT:         [exact agent ID from table above]
BRANCH:        [branch name]
COMMIT:        [short hash] - [message]
PR:            [PR link or "not yet"]
CI:            [running/passed/failed]
PREVIEW:       [real Vercel preview URL or "N/A" for docs-only]
FILES CHANGED: [list of files touched]
PROVEN:        [what was verified — test name, screenshot, or manual check]
UNPROVEN:      [what still needs Hugo or Co-Pilot verification]
```

### Handoff Rule

When Hugo brings output back to the Co-Pilot, he must paste the exact `AGENT:` line. The Co-Pilot uses the agent ID to route the report to the correct branch/scope context. No agent ID = no routing = report rejected.

---

## 10. How a New Agent Should Take Over

### Read order (exact, every session)
1. `docs/AGENT_INSTRUCTIONS.md` (operating rules)
2. `docs/TAKEOVER.md` (this file — live state)
3. Scoped docs for your task (see Section 3a of AGENT_INSTRUCTIONS.md)
4. `CLAUDE.md` is auto-loaded by Claude Code — do not re-read manually
5. `docs/COPILOT_PROMPT.md` is the master standard — read if you need the full protocol

### Trust hierarchy
- `docs/COPILOT_PROMPT.md` is the master standard (never overridden)
- `docs/AGENT_INSTRUCTIONS.md` extends it with marketplace10 rules
- `CLAUDE.md` is the quick-ref loaded every session
- This file is the live state snapshot

### Verify first
1. Run `git log --oneline -5` to confirm latest commits match Section 2 above
2. Run `git branch -a` to see active branches
3. Run `gh pr list --state open` to see open PRs
4. If anything in this file contradicts what you see in the repo, trust the repo and update this file

---

*Last updated: 2026-04-04 — `main` @ `70bcc38`; open PRs: none (`gh pr list --repo hrds100/marketplace10`)*
