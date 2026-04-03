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
| **Latest known live commit** | `452200f` - fix: claim button hidden behind mobile nav bar (#198) |
| **Latest meaningful merged PRs** | #198 claim button fix, #197 email inquiry 401, #196 WhatsApp inquiry gap, #195 admin deals consolidation |
| **Open but important** | Check `gh pr list --state open` for current state |
| **Unproven / not yet merged** | Check active branches below |

---

## 3. Active Rules

- **Branch workflow:** Never push to main. All work on feature branches (`feat/`, `fix/`, `docs/`). PR required to merge.
- **Preview workflow:** Every push gets a Vercel preview. Fetch real URL from PR comments. Never guess.
- **Co-Pilot audit before merge:** Hugo brings branch/PR/preview details to the Co-Pilot. Co-Pilot audits GitHub reality before merge approval. Claude's claim is not the source of truth - GitHub is.
- **Tests required before DONE:** Playwright e2e test mandatory. `npm run check` mandatory before push. Zero TypeScript errors always.
- **Visibility gate:** If work is not pushed to a GitHub feature branch, it is not done. Local-only changes are not proof.

---

## 4. Critical Flows

| Flow | Key files | What to know |
|------|-----------|-------------|
| **List-a-Deal** | `src/pages/ListADealPage.tsx`, `src/pages/admin/AdminQuickList.tsx` | Tenant submits property → admin reviews in Pending tab → approves → goes live |
| **Deals / Inquiries** | `src/pages/DealsPageV2.tsx`, `src/components/InquiryPanel.tsx` | Operators browse deals, send inquiries via WhatsApp or email. Payment gate for free-tier. |
| **Outreach / The Gates** | `src/pages/admin/AdminOutreachV2.tsx` | Admin assigns leads to landlords, tracks contacted status, NDA flow |
| **Admin Notifications** | `src/pages/admin/AdminQuickList.tsx` | Consolidated deals page: Pending Review, Live, Inactive tabs |
| **University** | `src/pages/UniversityPage.tsx` | Educational content for operators |
| **Invest / JV** | `src/pages/invest/*` | Investment module - separate agent instructions at `docs/invest/` |
| **nfstay Booking** | Separate repo (`bookingsite`) | Shares same Supabase. Deploy marketplace10 first, bookingsite second. |

---

## 5. Known Issues / Watchlist

- Check `gh issue list` for current bugs
- Password seed `_NFsTay2!` must never be renamed (broke all social logins on 2026-03-23)
- `vite.config.ts` is fragile - no React aliases, no polyfill changes
- Supabase edge function deploys reset `verify_jwt` to true - must patch after every deploy
- Never use `sed` on .tsx/.ts files

---

## 6. Current Branch Map

| Branch | Purpose | Status |
|--------|---------|--------|
| `fix/list-a-deal-airbnb-pricing` | PR #199 — deposit/profit optional, email prefill, pricing diagnostics | Merging now — Hugo manual test passed |

> Update this table when branches are created or merged. Delete merged branches. Only list branches verified on GitHub — never local-only.

---

## 7. Recent Decisions

- Admin pages consolidated: Submissions + Listings merged into single Deals page with 3 tabs (2026-04-02)
- WhatsApp reply architecture: webhook (instant) + poll (backup inquiry only, no reply duplication) (2026-04-02)
- Outreach renamed to "The Gates" with contacted badge from DB (2026-04-01)
- Visibility gate + Co-Pilot review gate added to prevent local-only work being treated as done (2026-04-03)
- List-a-deal: deposit/profit made optional, email prefill fixed, Airbnb pricing timeout increased + error logging added (2026-04-03, PR #199, merged)

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

## 9. How a New Agent Should Take Over

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

*Last updated: 2026-04-03*
