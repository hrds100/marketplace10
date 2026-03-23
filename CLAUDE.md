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
- **Never use `sed` to edit .tsx/.ts files** - use proper Edit tools. sed creates malformed code (duplicate hooks, merged lines) that crashes React.
- **After any branch merge**, always check: `git diff <before>..HEAD -- vite.config.ts src/main.tsx src/App.tsx src/layouts/AdminLayout.tsx`

## Admin
- Admin emails: `admin@hub.nfstay.com`, `hugo@nfstay.com` (hardcoded in `src/hooks/useAuth.ts`)
- Admin routes: `/admin/*` wrapped in `AdminGuard`
- Supabase project: `asazddtvjvmckouxcmmo`
- Vercel team: `hugos-projects-f8cc36a8`
