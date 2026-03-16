# NFsTay — Domain & Terms

_Last updated: 2026-03-16_

> **Single source of truth for project-wide concepts and actors.** All docs and prompts must use these terms consistently. See `docs/ACCEPTANCE.md` for behavior scenarios.

---

## Actors (who)

| Term | Definition |
|------|------------|
| **Tenant** | The rent-to-rent operator / serviced accommodation manager who inquires about a property. In code: the user whose `id` equals `chat_threads.operator_id` in a given thread. |
| **Operator** | Same as Tenant. Use interchangeably in product copy; in DB we use `operator_id`. |
| **Landlord** | The property owner or their agent. In code: the user whose `id` equals `chat_threads.landlord_id` in a given thread. |
| **Admin** | User with admin privileges (emails in `useAuth.ts`). Can access `/admin/*` and admin-only operations. |

---

## Core concepts

| Term | Definition |
|------|------------|
| **Deal** | A listed property (row in `properties`). Has status, photos, rent, profit_est, submitted_by. |
| **Listing** | Same as Deal. Used in UI (e.g. "List a Deal"). |
| **Property** | Same as Deal. DB table `properties`. |
| **Thread** | One conversation about one deal. Row in `chat_threads`; has operator_id, landlord_id, property_id, terms_accepted. |
| **Message** | One message in a thread. Row in `chat_messages`; has body, body_receiver, sender_id, is_masked. |
| **NDA / Agreement** | The fee-protection agreement the **landlord** signs before contact details are revealed. Stored as `chat_threads.terms_accepted` and rows in `agreement_acceptances`. Only the landlord signs; the tenant never signs the NDA. |
| **Tier** | Subscription level in `profiles.tier`: `free`, `monthly`, `yearly`, `lifetime`. Controls access (e.g. first message in inbox requires paid tier for tenant). |
| **Payment** | Checkout via GHL funnel; tier updated by n8n webhook. Unlocks tenant’s ability to send first message (and other paid features). |
| **Submission** | A deal submitted by a user (List a Deal flow). |
| **CRM stage** | Pipeline stage for a user’s deal in `crm_deals` (e.g. lead, viewing, offer). |

---

## Inbox-specific flows (canonical)

- **Tenant (operator):** To send the **first message** in a thread, must have a **paid tier**. Payment gate (PaymentSheet / GHL) is shown until paid. Tenant does **not** sign the NDA.
- **Landlord:** To send their **first reply** in a thread, must **sign the NDA**. NDA modal is shown until signed. Landlord does **not** see the payment gate for messaging.
- **Terms:** All docs and prompts use Tenant/Operator and Landlord as above. Do not invert roles (e.g. NDA is never for the tenant to sign).

---

## Where this is used

- **AGENT_INSTRUCTIONS.md** — Section 3a references this file.
- **MESSAGING.md** — Inbox flows reference this canonical definition.
- **ACCEPTANCE.md** — Scenarios use these terms.
- When adding new concepts or actors, add them here first; then use them consistently everywhere.

---

## Claude Prompt Refinement Protocol

Any task touching roles, actors, or inbox flows (who pays, who signs NDA, who sends first message) must include **DOMAIN.md** in the refined prompt's required doc list (Phase 1).

When Claude refines a prompt involving role logic:
- Confirm which actor is performing the action (Tenant/Operator vs Landlord vs Admin) using the definitions above
- Confirm the canonical flow (tenant pays first, landlord signs NDA — never inverted)
- Flag any prompt that inverts roles or contradicts the canonical flows before executing

See `docs/AGENT_INSTRUCTIONS.md` Section 0 and Section 12 for the full two-phase protocol.
