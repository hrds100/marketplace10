# NFStay — Handoff Checklist

> Read this if you're a new agent or developer joining the NFStay module.
> This gets you up to speed in 10 minutes.

---

## 1. WHAT IS NFSTAY

NFStay is a vacation-rental marketplace module inside the marketplace10 codebase. It lets **operators** (property owners) list vacation rentals, and **travelers** (guests) search, book, and pay.

Key capabilities:
- Property listings with photos, maps, pricing, and availability
- Booking and payment via Stripe
- Airbnb/VRBO listing sync via Hospitable
- White-label branded storefronts on custom subdomains/domains
- Operator analytics dashboard

**Current build approach (2026-03-20):**
The UI is being built by **Lovable AI** using `docs/LOVABLE_PROMPT.md` (2,361 lines).
After Lovable generates the UI, the 20 pre-built hooks in `src/hooks/nfstay/` are copied in to replace Lovable's generated stubs with real Supabase queries.
Do NOT manually rebuild UI pages — Lovable handles all of that.

---

## 2. READ THESE FIRST

| Order | File | Why |
|-------|------|-----|
| 1 | `docs/AGENT_INSTRUCTIONS.md` | Repo-level rules (two-phase protocol, hard rules, CI, response format) |
| 2 | `docs/nfstay/AGENT_INSTRUCTIONS.md` | NFStay-specific agent rules and isolation requirements |
| 3 | `docs/nfstay/BOUNDARIES.md` | What belongs to NFStay vs marketplace10 vs shared |
| 4 | `docs/nfstay/ARCHITECTURE.md` | System topology and data flow |
| 5 | `docs/nfstay/FEATURES.md` | What's built, what's planned, what's blocked |

---

## 3. KEY FACTS

| Fact | Value |
|------|-------|
| Database tables | All prefixed `nfs_` (11 tables) |
| Frontend routes | Under `app/(nfstay)/` |
| Components | Under `components/nfstay/` |
| Edge Functions | Prefixed `nfs-` (9 functions) |
| n8n workflows | Prefixed `nfs-` (9 workflows) |
| Auth | Shared Supabase Auth (same as marketplace10) |
| Payments | Stripe (NOT GoHighLevel) |
| Property sync | Hospitable (NOT direct Airbnb API) |
| Storage | Supabase Storage (NOT Cloudinary) |
| VPS | None — fully serverless |

---

## 4. WHAT NOT TO DO

1. **Don't touch marketplace10 tables** — especially `profiles` (read-only), `properties` (different module!), `crm_deals`, `chat_*`
2. **Don't import from marketplace10 directories** — only from `components/ui/` (shared) and shared auth hooks
3. **Don't use GoHighLevel** — that's marketplace10's payment system. NFStay uses Stripe.
4. **Don't create tables without `nfs_` prefix** — all NFStay tables are prefixed
5. **Don't push to main** — feature branches only. Hugo merges.
6. **Don't confuse `properties` (marketplace10) with `nfs_properties` (NFStay)** — completely different tables for completely different products

---

## 5. CURRENT STATE

Check `docs/nfstay/FEATURES.md` for the latest build status of each feature.
Check `docs/nfstay/CHANGELOG.md` for recent changes.

---

## 6. WHERE THINGS LIVE

| Thing | Location |
|-------|----------|
| NFStay docs | `docs/nfstay/` |
| NFStay pages | `src/pages/nfstay/` |
| NFStay components | `src/components/nfstay/` |
| NFStay hooks | `src/hooks/nfstay/` |
| NFStay services | `src/lib/nfstay/` |
| NFStay types | `src/lib/nfstay/types/` |
| NFStay route registration | `src/App.tsx` (routes under `/nfstay/*`) |
| NFStay migrations | `supabase/migrations/*nfs*` |
| NFStay Edge Functions | `supabase/functions/nfs-*` |
| NFStay n8n workflows | `n8n-workflows/nfs-*` |
| Shared UI | `src/components/ui/` |
| Shared auth | `src/hooks/useAuth.ts` |
| Invest module (NEVER TOUCH) | `src/pages/invest/`, `src/hooks/useBlockchain.ts` |
| Repo-level docs | `docs/` |

---

## 7. KEY DOCUMENTS

| Document | Purpose |
|----------|---------|
| `docs/LOVABLE_PROMPT.md` | **START HERE** — 2,361-line Lovable AI build prompt. Paste into Lovable to generate the full UI. |
| `docs/NFSTAY_FRONTEND_SPEC.md` | Complete legacy VPS frontend spec — all routes, components, auth flow |
| `docs/NFSTAY_DATABASE_SPEC.md` | Full SQL DDL for all 9 nfs_* tables with indexes, RLS, JSONB shapes |
| `docs/nfstay/EXECUTION_PLAN.md` | Step-by-step build plan starting with Phase 0 (Lovable) |
| `docs/nfstay/DECISIONS.md` | Why key architecture decisions were made (ADR-001 to ADR-012) |
| `Nfstay-VPS-backup/FORENSIC_TAKEOVER_AUDIT_REPORT.md` | Complete audit of the legacy system |
| `Nfstay-VPS-backup/NFSTAY_REBUILD_STRATEGY.md` | Original rebuild plan with schema and phases |

---

## 8. ASK IF UNSURE

If you're unsure about boundaries, ownership, or approach:
1. Check `docs/nfstay/BOUNDARIES.md`
2. Check `docs/nfstay/DECISIONS.md`
3. If still unsure → ask Hugo. One specific question.

---

*End of NFStay Handoff Checklist.*
