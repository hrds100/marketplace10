# NFStay — Shared Infrastructure

> What NFStay reuses from the marketplace10 ecosystem and what assumptions depend on that shared infrastructure.

---

## 1. SUPABASE (Database + Auth + Storage)

### What is shared
- **Supabase project:** Same project as marketplace10 (see `docs/STACK.md` for IDs and URLs)
- **Auth:** `auth.users` managed by Supabase
- **`profiles` table:** Shared identity. NFStay reads `id`, `name`, `email`. Never writes.
- **`notifications` table:** NFStay INSERTs notification rows. Never modifies schema.
- **RLS engine:** Same Postgres RLS for all tables.
- **Connection:** Same Supabase URL and anon key (see `docs/ENV.md`).

### What NFStay owns
- All `nfs_*` tables (11 tables)
- All `nfs-*` Edge Functions (9 functions)
- Storage buckets: `nfs-images`, `nfs-branding`

### Assumptions
- `profiles` table schema won't change in breaking ways (columns `id`, `name`, `email` remain)
- Supabase Auth continues to use `auth.uid()` in RLS
- Service role key has full access (bypasses RLS) — used by Edge Functions and n8n

### If Supabase project changes
- All NFStay `nfs_*` tables migrate with the project
- Edge Function secrets must be re-set
- Frontend env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) must update

---

## 2. VERCEL (Hosting + Deployment)

### What is shared
- **Vercel project:** Same project as marketplace10 (see `docs/STACK.md` for project IDs)
- **Build pipeline:** Same `npm run build`, same TypeScript check
- **Preview URLs:** Same pattern (see `docs/AGENT_INSTRUCTIONS.md` Section 7)
- **Environment variables:** Same dashboard, same var store (see `docs/ENV.md`)
- **Middleware:** One `middleware.ts` handles routing for both modules

### What NFStay owns
- Routes under `app/(nfstay)/`
- Domains: `nfstay.app`, `*.nfstay.app` (added to same Vercel project)
- NFStay-specific env vars (prefixed `NFS_` or `NEXT_PUBLIC_NFS_`)

### Assumptions
- Vercel project supports wildcard domains (`*.nfstay.app`)
- Middleware can handle multiple hostname patterns without performance issues
- Build succeeds even if NFStay code has no effect on marketplace10 routes

---

## 3. n8n (Workflow Automation)

### What is shared
- **n8n instance:** Same server as marketplace10 (see `docs/STACK.md` for URL)
- **Credential store:** Same n8n credential vault
- **Execution engine:** Same Node.js runtime

### What NFStay owns
- All `nfs-*` workflows (9 workflows)
- NFStay-specific credentials (`NFStay Hospitable`, `NFStay Supabase`)

### Assumptions
- n8n instance has enough execution capacity for NFStay workflows alongside marketplace10
- Webhook paths don't collide (all NFStay webhooks use `nfs-` prefix)
- n8n version supports all required nodes (HTTP Request, Supabase, Cron, Webhook)

### Risks
- n8n downtime affects both modules
- Resource contention if too many workflows execute simultaneously
- Duplicate active workflows (already observed: 2x "NFsTay -- Landlord Replied", 2x "NFsTay -- New Message") — needs cleanup

---

## 4. GOOGLE MAPS

### What is shared
- **API key:** Same key used by marketplace10 for property maps
- **Env var:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (set in Vercel)

### What NFStay uses
- Maps JavaScript API (search map, property map)
- Places API (address autocomplete)
- Marker clustering

### What marketplace10 uses
- Maps for property location display (simpler usage)

### Assumptions
- API key has Maps JavaScript API and Places API enabled
- HTTP referrer restrictions allow `hub.nfstay.com`, `nfstay.app`, `*.nfstay.app`
- Billing is on the same Google Cloud project

---

## 5. GITHUB (Code + CI)

### What is shared
- **Repo:** Same repo (see `docs/AGENT_INSTRUCTIONS.md` Section 14 for all project refs)
- **CI:** Same pipeline (see `.github/workflows/ci.yml`)
- **Branch protection:** PRs required for main

### What NFStay owns
- `docs/nfstay/` directory
- `app/(nfstay)/` route group
- `components/nfstay/`, `hooks/nfstay/`, `lib/nfstay/` directories
- `nfs-*` Edge Function files in `supabase/functions/`
- `nfs_*` migration files in `supabase/migrations/`

### Assumptions
- CI runs on all branches (catches NFStay TypeScript errors)
- Edge Function deploy job includes NFStay functions
- Branch naming convention: `feat/nfs-*`, `fix/nfs-*`, `docs/nfs-*`

---

## 6. UI DESIGN SYSTEM

### What is shared
- **Tailwind config:** Same colors, spacing, typography
- **shadcn/ui components:** Button, Modal, Input, Card, etc.
- **Design principles:** Airbnb/Linear-style, mobile-first, 4px/8px grid

### What NFStay may add
- NFStay-specific components in `components/nfstay/`
- Property-specific UI (search map, calendar, booking widget)
- White-label theming (operator's accent color applied via CSS variables)

### Rules
- Never modify shared UI components for NFStay-specific needs
- If a shared component needs NFStay changes, create a wrapper in `components/nfstay/`
- Never introduce new hex values — use existing Tailwind tokens

---

## 7. AUTH PATTERNS

### What is shared
- Supabase Auth (signUp, signIn, signOut, onAuthStateChange)
- `profiles` table as identity bridge
- Auth guard components (if they exist)
- Supabase client initialization

### What NFStay adds
- `nfs_operators` table linked via `profile_id → profiles.id`
- NFStay-specific auth hooks in `hooks/nfstay/use-nfs-auth.ts`
- Operator onboarding gate (check `onboarding_step = 'completed'`)
- Team member access via `nfs_operator_users`

---

*End of NFStay Shared Infrastructure.*
