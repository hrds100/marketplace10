# NFStay Module — Documentation Index

> NFStay is a vacation-rental marketplace module inside the marketplace10 codebase.
> It is a **separate apartment in the same building** — isolated logic, shared foundation.

---

## Required Reading Order

1. **[AGENT_INSTRUCTIONS.md](AGENT_INSTRUCTIONS.md)** — Read FIRST. Every session. No exceptions.
2. **[BOUNDARIES.md](BOUNDARIES.md)** — What belongs to NFStay vs marketplace10 vs shared infra.
3. **[ARCHITECTURE.md](ARCHITECTURE.md)** — How NFStay fits in the ecosystem.
4. **[DATABASE.md](DATABASE.md)** — All `nfs_` tables, RLS, and schema rules.
5. **[DOMAIN.md](DOMAIN.md)** — Terms, actors, and concepts.

## By Task Type

| Task | Read |
|------|------|
| Any NFStay task | AGENT_INSTRUCTIONS.md + BOUNDARIES.md |
| Properties / listings | + FEATURES.md + DATABASE.md |
| Bookings / payments | + FEATURES.md + INTEGRATIONS.md (Stripe section) |
| Hospitable / Airbnb sync | + INTEGRATIONS.md (Hospitable section) + WEBHOOKS.md |
| White-label / domains | + WHITE_LABEL.md |
| Database / schema / RLS | + DATABASE.md + SHARED_INFRASTRUCTURE.md |
| Webhooks / background jobs | + WEBHOOKS.md + INTEGRATIONS.md |
| Frontend routes / pages | + ROUTES.md + ARCHITECTURE.md |
| Environment / secrets | + ENVIRONMENT.md |
| Bug / "X not working" | + runbooks/DIAGNOSE_BEFORE_FIX.md |
| New to NFStay | + HANDOFF.md + FEATURES.md |
| Why was X decided? | + DECISIONS.md |

## Full File List

| File | Purpose |
|------|---------|
| [AGENT_INSTRUCTIONS.md](AGENT_INSTRUCTIONS.md) | NFStay-specific agent operating rules |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System topology, module boundaries, data flow |
| [DATABASE.md](DATABASE.md) | Complete schema, RLS policies, migration rules |
| [DOMAIN.md](DOMAIN.md) | Actors, concepts, terminology |
| [FEATURES.md](FEATURES.md) | Full feature inventory with status |
| [INTEGRATIONS.md](INTEGRATIONS.md) | Stripe, Hospitable, Google Maps, email, Cloudflare |
| [WEBHOOKS.md](WEBHOOKS.md) | All webhook and background job flows |
| [WHITE_LABEL.md](WHITE_LABEL.md) | Subdomain/custom domain white-label system |
| [ROUTES.md](ROUTES.md) | All frontend routes and middleware |
| [ACCEPTANCE.md](ACCEPTANCE.md) | BDD scenarios (Given/When/Then) |
| [BOUNDARIES.md](BOUNDARIES.md) | NFStay vs marketplace10 vs shared |
| [SHARED_INFRASTRUCTURE.md](SHARED_INFRASTRUCTURE.md) | What is reused from the wider ecosystem |
| [ENVIRONMENT.md](ENVIRONMENT.md) | All env vars and secrets |
| [DECISIONS.md](DECISIONS.md) | Architecture decision records |
| [HANDOFF.md](HANDOFF.md) | Onboarding checklist for new agents/devs |
| [CHANGELOG.md](CHANGELOG.md) | Change history |
| [runbooks/DIAGNOSE_BEFORE_FIX.md](runbooks/DIAGNOSE_BEFORE_FIX.md) | Bug diagnosis protocol |

---

**Parent repo docs:** `docs/AGENT_INSTRUCTIONS.md` governs the entire repo. NFStay docs extend it for NFStay-specific context.
