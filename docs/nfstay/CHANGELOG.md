# NFStay — Changelog

> Track every shipped change. Update in the same commit as the change.

---

## 2026-03-17

### Phase 1 — Directory scaffolding + operator signup flow
- Created NFStay isolated directory structure:
  - `src/pages/nfstay/` — operator pages
  - `src/components/nfstay/` — NFStay components (layout, sidebar, guard)
  - `src/hooks/nfstay/` — NFStay hooks (use-nfs-operator)
  - `src/lib/nfstay/` — NFStay types, constants
- Operator signup page at `/nfstay/signup` (sign up + sign in modes)
- Operator dashboard placeholder at `/nfstay` with quick action cards
- `NfsOperatorLayout` — layout with sidebar, top bar, auth guard
- `NfsOperatorGuard` — auth guard without marketplace10 WhatsApp OTP requirement
- `NfsOperatorSidebar` — collapsible sidebar with nav items
- `useNfsOperator` hook — fetches operator record from `nfs_operators`
- Routes wired into `App.tsx` (additive only — no existing routes modified)
- TypeScript compiles with zero errors

### Phase 1 — Core foundation migration created
- Created `supabase/migrations/20260317120000_nfs_phase1_core_tables.sql`
- Tables: `nfs_operators`, `nfs_operator_users`, `nfs_auth_tokens`
- RLS policies for all 3 tables (operator owner access, team access, service-role-only for tokens)
- `updated_at` auto-trigger via `nfs_set_updated_at()` function
- **Status: awaiting Hugo's SQL review before execution**

### Documentation infrastructure created
- Created complete `docs/nfstay/` directory with 17 documentation files
- Files cover: agent instructions, architecture, database schema, domain model, features, integrations, webhooks, white-label, routes, acceptance scenarios, boundaries, shared infrastructure, environment vars, decisions, handoff, changelog, and diagnosis runbook
- All files adapted from forensic audit findings and rebuild strategy
- Cross-references established between NFStay docs and repo-level docs

### Forensic audit completed
- Full codebase audit of legacy VPS system (Express + MongoDB + Redis)
- Live VPS inspection: PM2 processes, nginx config, env vars, Redis, Node version
- Critical findings documented: placeholder JWT_SECRET, Stripe key mismatch, exposed Redis, CORS wide open
- Results in: `Nfstay-VPS-backup/FORENSIC_TAKEOVER_AUDIT_REPORT.md`

### Rebuild strategy designed
- Complete rebuild plan: Supabase + Vercel + n8n (zero VPS)
- Database schema designed: 11 `nfs_` tables with full SQL
- 6-phase execution plan with dependencies and success criteria
- Integration access requirements documented
- Results in: `Nfstay-VPS-backup/NFSTAY_REBUILD_STRATEGY.md`

---

*Add new entries above this line, newest first.*
