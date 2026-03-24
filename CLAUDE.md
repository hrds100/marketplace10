# nfstay - hub.nfstay.com

UK rent-to-rent property marketplace. React + Vite + TypeScript + Supabase + n8n + GoHighLevel.

## Priority Order
reliability > scalability > clean code > speed

## Locked Integrations (do NOT suggest replacing)
- **n8n** - all webhook/automation workflows
- **GoHighLevel** - payments, funnels, CRM webhooks

## Repo Map
```
src/
  pages/          ← route-level components (DealsPage, CRMPage, ListADealPage, admin/*)
  components/     ← shared UI (PropertyCard, InquiryPanel, MyListingsPanel)
  hooks/          ← useAuth, useUserTier, useFavourites, usePropertyImage, useAIChat
  lib/            ← utilities (ghl.ts, n8n.ts, pexels.ts, propertyImage.ts)
  integrations/   ← Supabase client + auto-generated types (never hand-edit types.ts)
  layouts/        ← DashboardLayout, AdminLayout
  data/           ← static data (universityData, faqItems)
docs/             ← STACK, ARCHITECTURE, DATABASE, INTEGRATIONS, CHANGELOG, ENV
supabase/         ← edge functions (send-email)
n8n-workflows/    ← workflow JSON exports
```

## Core Commands
```bash
npm run dev          # local dev server (port 8080)
npm run check        # typecheck + lint + test (run before every push)
npm run build        # production build
npm run clean        # clear build cache if things get weird
git push origin main # auto-deploys to Vercel → hub.nfstay.com
```

## Where Truth Lives
- Full agent instructions: `docs/AGENT_INSTRUCTIONS.md`
- Stack reference: `docs/STACK.md`
- DB schema: `docs/DATABASE.md`
- Integrations: `docs/INTEGRATIONS.md`
- Recent changes: `docs/CHANGELOG.md`
- nfstay Lovable prompt: `docs/LOVABLE_PROMPT.md` (2,361 lines - paste into Lovable to build full UI)
- nfstay module docs: `docs/nfstay/` (agent instructions, architecture, database, decisions, execution plan)

## Top Rules (full list in docs/AGENT_INSTRUCTIONS.md)
1. Read the file before editing it. Never guess.
2. Zero TypeScript errors - always.
3. No hardcoded secrets - env vars only.
4. Every async call: try/catch + user-visible error state.
5. Every DB write: confirm RLS policy covers it first.
6. Destructive actions: STOP and ask Hugo.

## DO NOT TOUCH (crash risk)
- **`vite.config.ts`** - Do NOT add resolve.alias for React. Do NOT change node polyfills. The Particle SDK + WASM + polyfills are fragile. Adding React 18 aliases caused a site-wide crash on 2026-03-22.
- **`src/main.tsx`** - Do NOT modify. Import order is critical. ES module imports are hoisted above inline code.
- **`src/layouts/AdminLayout.tsx`** - All lucide-react icons must be imported. A missing icon = ReferenceError = blank page everywhere.
- **Password seed `_NFsTay2!`** - This string appears in `derivedPassword()` in SignIn.tsx, SignUp.tsx, ParticleAuthCallback.tsx, and VerifyOtp.tsx. It MUST stay exactly `_NFsTay2!` (mixed case). Renaming it breaks ALL social login users (Google, Apple, X, Facebook). On 2026-03-23 a bulk rename accidentally changed it and locked out all users.
- **Never use `sed` to edit .tsx/.ts files** - use proper Edit tools. sed creates malformed code (duplicate hooks, merged lines) that crashes React.
- **After any branch merge**, always check: `git diff <before>..HEAD -- vite.config.ts src/main.tsx src/App.tsx src/layouts/AdminLayout.tsx`
- **After any bulk rename**, always verify: `grep -rn "_NFsTay2!" src/pages/SignIn.tsx src/pages/SignUp.tsx src/pages/ParticleAuthCallback.tsx src/pages/VerifyOtp.tsx` - all 4 must match

## Admin
- Admin emails: `admin@hub.nfstay.com`, `hugo@nfstay.com` (hardcoded in `src/hooks/useAuth.ts`)
- Admin routes: `/admin/*` wrapped in `AdminGuard`
- Supabase project: `asazddtvjvmckouxcmmo`
- Vercel team: `hugos-projects-f8cc36a8`

## Feature Map System

Every file in this repo is mapped to a feature tag in `feature-map.json`. All operational rules live in `docs/AGENT_INSTRUCTIONS.md` - do not duplicate them here.

### Rules
1. **Check `feature-map.json` before touching any file.** Know which feature session owns it.
2. **Never modify files outside the active feature scope.** If the task is DEALS, do not edit ADMIN files.
3. **Never opportunistically refactor unrelated code.** Stay in your lane.
4. **Always state which file you are editing before editing it.** No silent edits.
5. **If a cross-feature change is needed, describe it in plain text only and ask Hugo first.** Do not implement cross-feature changes without approval.
6. **Sub-features use double underscore:** `FEATURE__SUBFEATURE` (e.g. `DEALS__PROPERTY_CARD`).
7. **LOCKED files in `feature-map.json` must not be modified.** Coordinate with Hugo first.
8. **Use `AI_SESSION_TEMPLATE.md` to scope every task.** Paste the feature tag and file list before starting work.

## Agent Teams

Agent Teams is enabled. Multiple workers can run in parallel on different features.

### How it works
- **Commander** (team lead): reads `docs/roles/commander.md`, coordinates workers
- **Workers**: each gets a role, a feature scope, and their own branch
- `feature-map.json` prevents overlap - no two workers touch the same files

### Role files (in docs/roles/)
- `commander.md` - team lead instructions (task splitting, anti-overlap, reporting)
- `ui-designer.md` - visual/frontend work (follows .claude/rules/design.md)
- `bug-fixer.md` - diagnose-first bug fixing (follows runbooks)
- `feature-builder.md` - new features and enhancements
- `tester.md` - Playwright e2e tests and edge case hunting

### To start a team session
Tell the commander what you want done. Example:
"Create a team. Worker 1: fix inbox NDA bug (CRM_INBOX). Worker 2: redesign deals filters (DEALS). Worker 3: test the investment payout flow (INVEST)."

### Anti-overlap (enforced by commander)
- Each worker gets ONE feature session from feature-map.json
- Each worker gets its OWN branch
- LOCKED files are never assigned to workers
- Shared files (App.tsx, main.tsx) are commander-only
