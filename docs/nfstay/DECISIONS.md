# NFStay — Architecture Decision Records

> Why key decisions were made. Helps future agents understand constraints without re-debating.
> Add a new entry for every significant architecture decision.

---

## ADR-001: Clean rebuild instead of legacy migration

**Date:** 2026-03-17
**Status:** Accepted
**Context:** NFStay had a working legacy system (Express + MongoDB + Redis on VPS). Forensic audit found critical issues: placeholder JWT secret, Stripe key mismatch, exposed Redis, CORS wide open, 205 worker restarts, no tests, hardcoded URLs.
**Decision:** Rebuild from scratch on Supabase + Vercel + n8n. Zero legacy code migration.
**Rationale:** Patching the legacy system would take longer than rebuilding, and the MongoDB-to-Postgres migration requires schema redesign anyway. Clean rebuild gives us proper auth, RLS, and testability from day one.

---

## ADR-002: Module inside marketplace10 repo (not separate repo)

**Date:** 2026-03-17
**Status:** Accepted
**Context:** NFStay could be a separate repo/project or a module inside marketplace10.
**Decision:** Module inside marketplace10 with strict isolation (`nfs_` prefix, `(nfstay)/` routes, `nfstay/` directories).
**Rationale:** Shared auth (Supabase), shared deployment (Vercel), shared CI. Separate repo means duplicate infra. Module approach with strict boundaries gives isolation benefits without operational overhead. Extractable if ever needed.

---

## ADR-003: All tables prefixed nfs_

**Date:** 2026-03-17
**Status:** Accepted
**Context:** NFStay tables coexist with marketplace10 tables in the same Supabase project.
**Decision:** All NFStay tables use `nfs_` prefix. No exceptions.
**Rationale:** Prevents naming collisions (marketplace10 already has a `properties` table). Makes ownership instantly clear. Enables easy extraction.

---

## ADR-004: n8n replaces BullMQ workers

**Date:** 2026-03-17
**Status:** Accepted
**Context:** Legacy system used BullMQ + Redis for 5 Hospitable sync workers. Required a VPS and had 205 restarts.
**Decision:** Replace all BullMQ workers with n8n workflows.
**Rationale:** n8n provides visual debugging, built-in retry logic, cron scheduling, and webhook nodes — all features we'd have to build manually with BullMQ. Already running for marketplace10. Eliminates Redis and VPS dependency.

---

## ADR-005: Supabase Storage replaces Cloudinary

**Date:** 2026-03-17
**Status:** Accepted
**Context:** Legacy system used Cloudinary for image storage. No existing data to migrate.
**Decision:** Use Supabase Storage (buckets: `nfs-images`, `nfs-branding`).
**Rationale:** Same infra, simpler auth (RLS on buckets), built-in image transformation, no extra service to manage. Cloudinary adds complexity with no benefit since we're starting fresh.

---

## ADR-006: Stripe webhooks on Edge Functions, Hospitable on n8n

**Date:** 2026-03-17
**Status:** Accepted
**Context:** Need to handle webhooks from both Stripe and Hospitable.
**Decision:** Stripe webhooks → Supabase Edge Functions. Hospitable webhooks → n8n webhook nodes.
**Rationale:** Stripe webhooks need low-latency signature verification and direct DB writes — Edge Functions are ideal. Hospitable webhooks trigger multi-step sync workflows with pagination, retries, and complex logic — n8n is purpose-built for this.

---

## ADR-007: Shared Supabase Auth (no custom JWT)

**Date:** 2026-03-17
**Status:** Accepted
**Context:** Legacy system had custom JWT with a placeholder secret (`your_jwt_secret`). Security nightmare.
**Decision:** Use Supabase Auth exclusively. No custom JWT implementation.
**Rationale:** Supabase Auth handles signup, login, magic links, JWT issuance, and token refresh. `auth.uid()` works in RLS policies. No secret management needed. Impossible to forget to set a JWT secret because there isn't one.

---

## ADR-008: profiles table is read-only for NFStay

**Date:** 2026-03-17
**Status:** Accepted
**Context:** `profiles` table exists in marketplace10. Both modules need user identity.
**Decision:** NFStay reads `profiles` but never writes to it or adds columns. NFStay-specific data goes in `nfs_operators`.
**Rationale:** Prevents schema coupling. If marketplace10 changes `profiles`, NFStay isn't affected (as long as `id`, `name`, `email` remain). Clear ownership.

---

## ADR-009: Shared signup — no separate NFStay signup page

**Date:** 2026-03-19
**Status:** Accepted
**Context:** Original plan had a dedicated `NfsOperatorSignup` page at `/nfstay/signup`. But the platform has three products (marketplace, invest, booking) sharing one auth system.
**Decision:** Remove separate NFStay signup. Users sign up once via shared `/signup` (which also provisions their crypto wallet via Particle and runs OTP verification). NFStay activation happens via `NfsOperatorGuard` → redirect to `/nfstay/onboarding` → creates `nfs_operators` row.
**Rationale:** One signup, one OTP, one wallet, three products. No friction if a booking operator also wants to invest. Simpler for users. Avoids duplicate auth flows.

---

## ADR-010: Invest module explicitly protected from NFStay agents

**Date:** 2026-03-19
**Status:** Accepted
**Context:** On 2026-03-19, an AI agent building NFStay silently stripped all blockchain integration from the invest module — removing `useBlockchain`, `useInvestData`, and reverting invest pages to mock data. This was caught before merge but would have broken live crypto features.
**Decision:** Add invest module (`inv_*` tables, `src/pages/invest/*`, `useBlockchain.ts`, `useInvestData.ts`, `contractAbis.ts`, `WalletProvisioner.tsx`) to BOUNDARIES.md as explicitly protected. Add mandatory diff verification to the agent hotkey.
**Rationale:** The original BOUNDARIES.md only listed marketplace10 as protected. The invest module was not called out, which allowed the agent to treat it as "cleanup-able" code. Explicit protection + diff verification prevents recurrence.

---

*Add new decisions below this line.*

---

*End of NFStay Architecture Decisions.*
