# nfstay hub.nfstay.com — Rebuild Plan

## 1. STACK

### Frontend
| Technology | Purpose | Version |
|-----------|---------|---------|
| React | UI framework | 18 |
| TypeScript | Type safety | 5.x |
| Vite | Build tool + dev server | 5.x |
| Tailwind CSS | Styling | 3.x |
| shadcn/ui | Component library (39+ primitives) | Latest |
| Lucide React | Icons (only icon library) | Latest |
| React Router | Page routing | 6.x |
| TanStack React Query | Server state / caching | 5.x |
| Framer Motion | Animations (minimal) | Latest |
| Sonner | Toast notifications | Latest |

### Backend
| Technology | Purpose | Details |
|-----------|---------|---------|
| Supabase | Database + Auth + Edge Functions + Realtime | Project: asazddtvjvmckouxcmmo |
| PostgreSQL | Database (via Supabase) | 50+ tables, RLS policies |
| Deno | Edge function runtime | Supabase Edge Functions |

### External Services
| Service | Purpose | How we talk to it |
|---------|---------|------------------|
| GoHighLevel (GHL) | WhatsApp messaging | REST API (Bearer token) |
| Resend | Email sending | REST API (API key) |
| Particle Network | Crypto wallet creation | SDK + JWT edge function |
| Vercel | Hosting + deployment | Git push → auto deploy |
| OpenAI | AI tasks (descriptions, pricing, chat) | REST API via edge functions |
| Pexels | Stock property photos (teaser only — cannot be displayed as real listing photos) | REST API |
| Google Maps | Map on deals page | Maps JavaScript API |

### NOT using (removed)
| Technology | Why removed |
|-----------|------------|
| ~~automation middleware~~ | Eliminated — all automations now run as Supabase Edge Functions |
| ~~Twilio~~ | Was used for OTP — now GHL handles it directly |
| ~~OpenAI via middleware~~ | Now called directly from edge functions |

---

## 2. GHL CONFIGURATION

### API Details
| Setting | Value |
|---------|-------|
| API Base URL | `https://services.leadconnectorhq.com` |
| Location ID | `eFBsWXY3BmWDGIRez13x` |
| API Version Header | `Version: 2021-07-28` |
| Auth | `Bearer {GHL_BEARER_TOKEN}` (Supabase secret) |
| nfstay WhatsApp Number | `+44 7476 368123` |

### GHL Workflows (4 only)

| # | Name | Workflow ID | URL | Triggered by | Sends to |
|---|------|------------|-----|-------------|----------|
| 1 | OTP - nfstay | `baabc69a-a00f-412a-863e-7189ae025091` | [Open](https://app.leadconnectorhq.com/location/eFBsWXY3BmWDGIRez13x/workflow/baabc69a-a00f-412a-863e-7189ae025091) | send-otp edge function enrolls contact | New user (WhatsApp OTP code) |
| 2 | 1-landlord_enquiry (COLD) | `67250bfa-e1fc-4201-8bca-08c384a4a31d` | [Open](https://app.leadconnectorhq.com/location/eFBsWXY3BmWDGIRez13x/workflow/67250bfa-e1fc-4201-8bca-08c384a4a31d) | ghl-enroll edge function (admin clicks "Assign Lead") | Landlord (1st outreach WhatsApp) |
| 3 | 2-Tenant to Landlord (WARM) | `0eb4395c-e493-43dc-be97-6c4455b5c7c4` | [Open](https://app.leadconnectorhq.com/location/eFBsWXY3BmWDGIRez13x/workflow/0eb4395c-e493-43dc-be97-6c4455b5c7c4) | ghl-enroll edge function (admin releases inquiry) | Landlord (tenant lead notification) |
| 4 | 5-inbox-new-inquiry (Auto-reply) | `cf089a15-1d42-4d9a-85d1-ab35b82b4ad5` | [Open](https://app.leadconnectorhq.com/location/eFBsWXY3BmWDGIRez13x/workflow/cf089a15-1d42-4d9a-85d1-ab35b82b4ad5) | GHL trigger (inbound WhatsApp received) | Tenant (auto-reply). NOTE: GHL handles the reply natively. Our code must NOT also send a reply — GHL workflow is the single sender. Code must NOT also send a reply. |

### GHL Custom Fields

| Field Name | Field ID | Purpose | Set by |
|-----------|----------|---------|--------|
| Property Reference | `Z0thvOTyoO2KxTMt5sP8` | Property name in WhatsApp template | ghl-enroll edge function |
| Magic Link URL | `gWb4evAKLWCK0y8RHp32` | `?token=XXX` for WhatsApp button | ghl-enroll edge function |
| First Contact Sent | `QIc7FR6U3OGNEhdk7LoY` | Tracks first message delivery | ghl-enroll edge function |

### GHL API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/contacts/?query={phone}&locationId={id}` | GET | Search contact by phone |
| `/contacts/` | POST | Create new contact |
| `/contacts/{contactId}` | PUT | Update custom fields + tags |
| `/contacts/{contactId}/workflow/{workflowId}` | DELETE | Remove from workflow (before re-enrollment) |
| `/contacts/{contactId}/workflow/{workflowId}` | POST | Enroll in workflow |
| `/conversations/messages` | POST | Send free-form WhatsApp message (inquiry reply) |

---

## 3. ARCHITECTURE: Modular Monolith with Strict Boundaries

Single app. Features live in their own folders. They share a thin, stable core
that rarely changes.

**How features coordinate:** Features do not import each other's internals.
Shared behavior is coordinated through owned database contracts, edge function
contracts, and approved core abstractions. The database is NOT a free-for-all —
each shared table has one owner who defines the schema, and all other features
must follow the owner's typed contract.

### 3.1 Import Direction (one-way only)

```
features/deals/  ──→  core/auth/
features/deals/  ──→  core/database/
features/deals/  ──→  core/ui/
features/deals/  ──→  core/integrations/
features/deals/  ──✕  features/inquiry/     ← FORBIDDEN
features/deals/  ──✕  features/crm/         ← FORBIDDEN
```

Features import DOWN into core. Never SIDEWAYS into other features.
Core never imports from features.

---

## 3.2 FOLDER STRUCTURE

```
src/
  core/                              ← PROTECTED SHARED CORE
    auth/
      useAuth.ts                     ← session state, admin detection
      ProtectedRoute.tsx             ← route guard (checks whatsapp_verified)
      WhatsAppGate.tsx               ← OTP enforcement on dashboard
    database/
      client.ts                      ← single Supabase client import
      types.ts                       ← auto-generated from Supabase (never hand-edit)
    ui/
      components/ui/                 ← shadcn primitives (Button, Input, Dialog, etc.)
      layouts/DashboardLayout.tsx
      layouts/AdminLayout.tsx
      NfsLogo.tsx
      NotificationBell.tsx           ← used by dashboard + admin layouts
      FavouritesDropdown.tsx         ← used by dashboard layout
      BurgerMenu.tsx                 ← used by dashboard layout
    integrations/
      ghl.ts                         ← sendWhatsApp(), enrollWorkflow(), searchContact()
      email.ts                       ← sendEmail(type, data) — wraps send-email edge fn
      openai.ts                      ← callAI(prompt, model) — wraps AI edge fns
      pexels.ts                      ← fetchPhotos(query, count)
      maps.ts                        ← Google Maps loader
    contracts/
      tables.ts                      ← table ownership + column contracts (see 3.6)

  features/                          ← INDEPENDENT FEATURE MODULES
    auth/                            ← ONE domain: signup + verify + signin + reset
      SignUp.tsx
      VerifyOtp.tsx
      SignIn.tsx
      ForgotPassword.tsx
      ResetPassword.tsx
    deals/
      DealsPage.tsx
      DealDetail.tsx
      PropertyCard.tsx               ← lives here, NOT in core (has domain logic)
    deal-submit/
      ListADealPage.tsx
      MyListingsPanel.tsx
    inquiry/
      EmailInquiryModal.tsx
      InquiryPanel.tsx
    crm/
      CRMPage.tsx
    university/
      UniversityPage.tsx
      LessonPage.tsx
      useAIChat.ts
    affiliates/
      AffiliatesPage.tsx
    payment/
      PaymentSheet.tsx
    settings/
      SettingsPage.tsx
    wallet/
      WalletProvisioner.tsx
      useWallet.ts
    admin-gate/
      AdminOutreach.tsx              ← "The Gate" (was AdminOutreachV2)
    admin-users/
      AdminUsers.tsx
    admin-deals/
      AdminDeals.tsx
      AdminQuickList.tsx
    admin-settings/
      AdminSettings.tsx
    admin-notifications/
      AdminNotifications.tsx
    admin-dashboard/
      AdminDashboard.tsx
    admin-affiliates/
      AdminAffiliates.tsx
    admin-faq/
      AdminFAQ.tsx
    admin-university/
      AdminUniversity.tsx
    admin-pricing/
      AdminPricing.tsx
    landlord/
      MagicLoginPage.tsx
      LeadDetailsPage.tsx
      LeadNDAPage.tsx
      LeadAccessAgreement.tsx
      ClaimAccountBanner.tsx

  # FROZEN ZONES — these stay in their EXISTING paths (not moved)
  # Frozen is a governance status, not a filesystem relocation.
  # Enforced via feature-map.json + PR review. See section 3.8.
  #
  # Investment:  src/pages/invest/*, src/pages/admin/invest/*
  # Booking:     src/pages/admin/nfstay/*, BookingSitePage.tsx

supabase/
  functions/                         ← FLAT (one folder per function, Supabase CLI requirement)
    send-otp/index.ts                ← domain: auth
    verify-otp/index.ts              ← domain: auth
    process-inquiry/index.ts         ← domain: inquiry
    receive-tenant-whatsapp/index.ts ← domain: inquiry
    landlord-magic-login/index.ts    ← domain: landlord
    claim-landlord-account/index.ts  ← domain: landlord
    lead-magic-login/index.ts        ← domain: landlord
    hard-delete-user/index.ts        ← domain: admin
    hard-delete-property/index.ts    ← domain: admin
    ghl-enroll/index.ts              ← domain: admin
    reset-for-testing/index.ts       ← domain: admin
    ai-chat/index.ts                 ← domain: ai (NEW, native edge function)
    ai-description/index.ts          ← domain: ai (NEW, native edge function)
    airbnb-pricing/index.ts          ← domain: ai (NEW, native edge function)
    ai-parse-listing/index.ts        ← domain: ai (existing)
    send-email/index.ts              ← domain: email
    deal-expiry/index.ts             ← domain: email
    track-referral/index.ts          ← domain: referral
    particle-generate-jwt/index.ts   ← domain: wallet
    particle-jwks/index.ts           ← domain: wallet
    save-bank-details/index.ts       ← domain: banking
    health/index.ts                  ← domain: monitoring
    # FROZEN — existing paths, not moved:
    # inv-process-order/, inv-approve-order/, inv-crypto-confirm/,
    # inv-samcart-webhook/, revolut-*/, submit-payout-claim/,
    # nfs-stripe-*/, nfs-hospitable-oauth/, nfs-domain-verify/,
    # nfs-provision-nfstay-subdomain/, nfs-email-send/, nfs-ical-feed/
```

---

## 3.3 SHARED COMPONENT RULE

A component lives in `core/ui/` ONLY if it meets ALL of these:
1. Used by 2 or more features
2. Has NO domain logic (no Supabase queries, no business rules)
3. Is generic and stable (unlikely to change when features change)

**Examples:**
- `Button.tsx` → `core/ui/` — shadcn primitive. Zero domain logic. ✅
- `NotificationBell.tsx` → `core/ui/` — used by both layouts, pure display. ✅
- `PropertyCard.tsx` → `features/deals/` — has favourites, CRM add, tier gating, inquiry logic. Too much domain behavior for core. ❌ NOT in core.
- `EmailInquiryModal.tsx` → `features/inquiry/` — inquiry-specific. ❌ NOT in core.
- `LeadAccessAgreement.tsx` → `features/landlord/` — NDA flow. ❌ NOT in core.

**PropertyCard rule:** PropertyCard lives in `features/deals/`. If another feature
(like admin-deals) needs a property card, it gets a simplified read-only version
inside its own feature folder. Two cards, not one shared component with flags.

If a component starts in a feature and later a second feature needs it:
- If it's pure display (zero domain logic) → strip domain logic and move to `core/ui/`
- If it has domain logic → keep it in the original feature AND create a separate version in the second feature
- Never move a component to core just because it's "convenient"
- Core must stay thin

---

## 3.4 DATABASE OWNERSHIP

Each shared table has ONE owning domain. The owner defines the schema.
Other domains may READ but must follow the owner's contract.

| Table | Owner | May READ | May WRITE | Schema changes require |
|-------|-------|---------|-----------|----------------------|
| `profiles` | `core/auth` | All features | auth, settings, admin-users, wallet, landlord | Review by auth owner + test ALL readers |
| `properties` | `features/deals` (admin is privileged manager) | deal-detail, deal-submit, admin-deals, gate, inquiry | deal-submit, admin-deals (CRUD), gate (outreach_sent only) | Review by deals owner + test deals + deal-submit + admin-deals + inquiry + gate |
| `inquiries` | `features/inquiry` | gate, landlord, admin-gate | inquiry, gate (authorized flag), landlord (nda_signed) | Review by inquiry owner + test gate + landlord |
| `notifications` | `core` (shared bus) | notifications, admin-notifications | Any feature may INSERT | Adding columns requires testing notification bell + admin page |
| `user_favourites` | `features/deals` | deals | deals (INSERT/DELETE) | Deals owner only |
| `crm_deals` | `features/crm` | deal-detail | crm, deal-detail (INSERT) | CRM owner only |
| `pipeline_stages` | `features/crm` | crm | crm | CRM owner only |
| `landlord_invites` | `features/inquiry` | landlord-login | inquiry (INSERT), landlord-login (UPDATE used) | Inquiry owner + test landlord |
| `admin_audit_log` | `core` (shared bus) | admin-dashboard | Any feature may INSERT | No contract — append-only |
| `aff_profiles` | `features/affiliates` | admin-affiliates, payment | affiliates, admin-affiliates | Affiliates owner |
| `aff_events` | `features/affiliates` | admin-affiliates | affiliates, payment | Affiliates owner |
| `modules`, `lessons` | `features/university` | admin-university | university, admin-university | University owner |
| `user_progress` | `features/university` | university | university | University owner |
| `ai_settings` | `features/admin-settings` | admin-deals | admin-settings | Settings owner |
| `email_templates` | `features/admin-settings` | email edge function | admin-settings | Settings owner |
| `notification_settings` | `features/admin-settings` | email edge function | admin-settings | Settings owner |

**Backwards-compatibility rule for shared tables:**
- ADDING a column: safe — existing readers ignore it
- RENAMING a column: BREAKING — must update all readers first, then rename
- REMOVING a column: BREAKING — must confirm zero readers, then remove
- CHANGING a column type: BREAKING — must update all readers + writers

---

## 3.5 CONTRACT RULES

### Shared table contracts
Each shared table has a typed contract in `core/contracts/tables.ts`:
```typescript
// What signup writes to profiles
type ProfileInsert = { id: string; name: string; email: string; whatsapp: string; whatsapp_verified: boolean }

// What deals reads from properties
type PropertyRead = { id: string; name: string; city: string; photos: string[]; status: string; ... }
```
If you change what a table returns, update the contract. TypeScript catches the break.

### Edge function payload contracts
Each edge function defines its input/output types:
```typescript
// send-otp
type SendOtpInput = { phone: string }
type SendOtpOutput = { success: boolean }

// process-inquiry
type ProcessInquiryInput = { property_id: string; channel: string; message: string; tenant_name: string; tenant_email: string; tenant_phone: string; property_url: string }
type ProcessInquiryOutput = { success: boolean; inquiry_id: string }
```
These types live in `core/contracts/edge-functions.ts`. Frontend and edge function both import from here.

### Integration wrapper contracts
Each integration wrapper in `core/integrations/` has a typed interface:
```typescript
// ghl.ts
function sendWhatsApp(phone: string, message: string): Promise<{ sent: boolean }>
function enrollWorkflow(phone: string, workflowId: string, data: { property_name?: string; magic_link?: string; contactName?: string }): Promise<{ success: boolean; contactId: string }>

// email.ts
function sendEmail(type: string, data: Record<string, unknown>): Promise<{ id: string }>
```
Features call these. They never call `fetch('https://services.leadconnectorhq.com/...')` directly.

---

## 3.6 IMPORT BOUNDARY ENFORCEMENT

### Allowed imports per feature:
```
features/X/ MAY import from:
  ✅ core/auth/*
  ✅ core/database/*
  ✅ core/ui/*
  ✅ core/integrations/*
  ✅ core/contracts/*
  ✅ Other files within features/X/ itself

features/X/ MUST NOT import from:
  ❌ features/Y/*  (any other feature)
  ❌ frozen/*
  ❌ Any raw external URL (https://services.leadconnectorhq.com, etc.)
```

### Enforcement method:
1. **TypeScript path aliases** in `tsconfig.json`:
   ```json
   "paths": {
     "@core/*": ["./src/core/*"],
     "@features/*": ["./src/features/*"]
   }
   ```
2. **ESLint rule** (or manual review): flag any import that crosses feature boundaries
3. **PR review checklist**: "Does this PR import from another feature folder? If yes, reject."

### No raw external API calls:
```
❌ fetch('https://services.leadconnectorhq.com/contacts/')  ← inside a feature
✅ import { searchContact } from '@core/integrations/ghl'   ← use the wrapper
```
The wrapper lives in `core/integrations/`. If GHL changes their API, you update one file.

---

## 3.7 TESTING RULES

### Tier 1: Feature-local change (only files inside one feature folder)
- Run: that feature's Playwright test
- Run: TypeScript check (`npx tsc --noEmit`)
- Run: smoke suite (see below)
- Example: change CRMPage.tsx → run CRM test + smoke

### Tier 2: Shared table change (column added/renamed/removed on a table used by multiple features)
- Run: ALL features that read or write that table (see table ownership in 3.4)
- Run: full TypeScript check
- Run: smoke suite
- Example: add column to `properties` → run deals + deal-detail + deal-submit + admin-deals + gate + inquiry tests

### Tier 3: Core change (anything in `core/`)
- Run: ALL Playwright tests
- Run: full TypeScript check
- Run: smoke suite
- Example: change `useAuth.ts` → run every test (auth affects everything)

### Tier 4: Edge function change
- Run: the edge function's specific test
- Run: every feature that calls that edge function
- Run: smoke suite
- Example: change `process-inquiry` → run inquiry-email test + gate test

### Smoke suite (ALWAYS runs before merge, no exceptions):
1. `npm run build` passes
2. `npx tsc --noEmit` passes — zero errors
3. Homepage loads (/)
4. Sign up + OTP verify flow completes
5. Sign in works (existing user)
6. Deals page loads with properties (/dashboard/deals)
7. Send one inquiry (email channel) — WhatsApp + email confirmation received
8. Admin dashboard loads (/admin)

---

## 3.8 FROZEN ZONES

Frozen is a **governance status**, not a filesystem relocation.
Frozen files stay in their existing paths. They are protected by
`feature-map.json`, PR review rules, and agent prompt constraints.
No agent may modify frozen paths under any circumstances.
If a change is needed, Hugo must explicitly unfreeze it first.

| Zone | Paths (stay where they are) | Reason |
|------|----------------------------|--------|
| Investment (frontend) | `src/pages/invest/*`, `src/pages/admin/invest/*` | Blockchain + Revolut. One bug = lost funds. |
| Investment (edge functions) | `supabase/functions/inv-*`, `supabase/functions/revolut-*`, `supabase/functions/submit-payout-claim/`, `supabase/functions/save-bank-details/` | On-chain transactions. Payment processing. |
| nfstay Booking (frontend) | `src/pages/admin/nfstay/*`, `src/pages/BookingSitePage.tsx` | Hospitable + Stripe. Separate product. |
| nfstay Booking (edge functions) | `supabase/functions/nfs-*` | Stripe webhooks. Guest bookings. |
| Supabase types | `src/core/database/types.ts` | Never hand-edit. Regenerate via `supabase gen types`. |
| shadcn components | `src/core/ui/components/ui/` | Never hand-edit. Update via `npx shadcn-ui@latest add`. |
| `vite.config.ts` | Root | Particle + WASM + polyfills. Hugo must approve. |
| `src/main.tsx` | Root | Import order critical. Hugo must approve. |

### Freeze enforcement (CI-ENFORCED, not review-based):
- CI check: any diff touching frozen paths → **CI FAILS** unless `FROZEN_APPROVED` label exists
- CI check: any diff touching `src/core/` → **CI FAILS** unless `CORE_CHANGE` label exists
- `feature-map.json` marks frozen paths as `"locked": true` (backup)
- Agent prompts include: "Do NOT touch frozen paths" (backup)
- These are hard CI failures, not soft review suggestions
- No exceptions. No `--admin` bypass. Fix the issue or don't merge.

---

## 3.9 RISKS AND MITIGATIONS

| Risk | Mitigation |
|------|-----------|
| `core/` becomes a dumping ground | Strict rule: only move to core if used by 2+ features AND has zero domain logic. Review every PR that adds to core. |
| Integration wrapper hides errors | Each wrapper logs the raw API response before returning. Errors include the HTTP status + body. |
| Shared table schema drift | Typed contracts in `core/contracts/tables.ts`. TypeScript catches mismatches at build time. |
| Feature A reads a column that Feature B removes | Table ownership rule: the owner must check all readers before removing columns. |
| Edge function verify_jwt resets | Source of truth is `supabase/config.toml` (verify_jwt = false per function). Deploy via `scripts/deploy-function.sh`. Test after every deploy. |
| Agent wanders into wrong feature | PR review checklist. Feature-map.json enforcement. Agent prompt includes explicit scope. |

---

## 4. DELETE LIST

| What | Why |
|------|-----|
| `src/pages/InboxPage.tsx` | Hugo asked to delete — replaced by CRM |
| `src/components/inbox/*` (all files) | Part of inbox — delete |
| `src/pages/admin/AdminOutreach.tsx` | Old outreach — replaced by The Gate |
| `src/lib/legacy automation.ts` | Deleted — OTP functions moved to core/auth/otp.ts |
| `src/lib/notifications.ts` | Investment notifications — GHL direct + in-app bell |
| `legacy automation-workflows/` folder | Deleted — all workflows eliminated |
| `supabase/functions/legacy automation-health/` | Deleted — replaced by /health endpoint |
| `VITE_N8N_WEBHOOK_URL` env var | Remove from .env |

---

## 5. NEW EDGE FUNCTIONS TO BUILD

| Function | Replaces | What it does | OpenAI model |
|----------|----------|-------------|-------------|
| `ai/ai-chat` | legacy webhook | Lesson Q&A | Configurable via `ai_settings` |
| `ai/ai-description` | legacy webhook | Property descriptions | Configurable via `ai_settings` |
| `ai/airbnb-pricing` | legacy webhook | Airbnb rate estimation | Configurable via `ai_settings` |

---

## 6. EXECUTION ORDER

### Phase 0: Establish rules FIRST (before touching any code)
1. Write final CLAUDE.md with all inline rules
2. Create `.claude/skills/` with all skill files
3. Create `.claude/rules/` with auto-loading rules
4. Set up CI workflow (`.github/workflows/ci.yml`) with all 6 checks
5. Configure `supabase/config.toml` with verify_jwt settings
6. Create `scripts/deploy-function.sh`
7. Set up GitHub branch protection (remove --admin bypass)
8. Move old docs to `docs/legacy/`, create `docs/rebuild/` structure
9. Mark frozen zones in `feature-map.json` as locked
10. Create re-export bridges for frozen zone imports:
    - `src/hooks/useAuth.ts` → re-exports from `@core/auth/useAuth`
    - `src/hooks/useUserTier.ts` → re-exports from `@core/hooks/useUserTier`
    - Keep `src/hooks/nfstay/*` in original path (booking depends on it)
11. Add DashboardLayout.tsx to protected dependencies in feature-map.json
    (wallet auto-creation depends on WalletProvisioner living inside it)
12. Verify CI passes on a no-op PR

### Phase 1: Restructure one domain at a time
13. Move auth files (signup, verify, signin, reset) → `src/features/auth/`
14. Verify TypeScript + build + smoke
15. Move deals files → `src/features/deals/`
16. Verify again
17. Continue domain by domain: inquiry, crm, university, affiliates, etc.
18. Create `src/core/` with auth, database, ui, integrations, contracts
19. Update imports to `@core/` and `@features/` path aliases
20. Add missing pages to feature modules:
    - `BookingSitePage.tsx` → frozen (do not move, just document)
    - `ParticleAuthCallback.tsx` → `features/auth/`
    - `AuthBridgePage.tsx` → `features/auth/`
    - `BrandPage.tsx` → `features/deals/` or standalone
    - `NotFound.tsx` → `core/ui/`
    - `ModuleOverviewPage.tsx` → `features/university/`
    - `LessonPage.tsx` → `features/university/`
21. Verify TypeScript + build + full smoke after all moves complete

### Phase 2: Build new edge functions (DONE)
22. Build ai-chat edge function → use edge function directly
23. Build ai-description edge function → use edge function directly
24. Build airbnb-pricing edge function → use edge function directlys
25. use edge function directlys (PaymentSheet + InquiryPanel) with Supabase `aff_events` INSERT
26. Delete `notifyCrmStageMove()` and its import from CRMPage (Hugo confirmed: not needed)
27. Remove WhatsApp reply code from `receive-tenant-whatsapp` edge function
    (GHL workflow `cf089a15` is the single source of truth for that auto-reply)
28. When user submits inquiry (email or WhatsApp), auto-add to CRM as "Contacted" stage
29. Deploy all new/updated edge functions via deploy script
30. Run full test suite — verify ALL replacements work before proceeding

### Phase 3: Delete dead code (ONLY after Phase 2 replacements are proven)
31. Delete inbox files (InboxPage + components/inbox/)
32. Delete old AdminOutreach.tsx
33. DONE — deleted
34. DONE — deleted
35. Delete generate-description edge function (orphaned — not called anywhere)
36. DONE — deleted, OTP moved to core/auth/otp.ts
37. Kept — investment dependency, cleaned of all automation references
38. DONE — all references purged
39. Verify TypeScript + build + smoke

### Phase 4: Bug fixes
40. Affiliates "Go to Payout Settings" link → navigate to correct settings section
41. Admin notifications split (admin + user)
42. Admin FAQ persist to Supabase
43. Admin users registration date + time column
44. Admin affiliates date/time for all events
45. Run affected module tests

### Phase 5: New features
46. AI model selector in admin settings (per task: pricing / university / descriptions)
47. Notification timing/scheduling
48. WhatsApp "coming soon" toggle
49. SMS "coming soon" toggle
50. Send notification to all users (email + bell)
51. Run full test suite

---

## 7. TESTING MATRIX

| Module | Playwright test | Smoke? |
|--------|----------------|--------|
| signup | New user → OTP arrives | Yes |
| verify | Enter code → dashboard | Yes |
| signin | Login → dashboard | Yes (in smoke suite) |
| deals | Deals load + filters | Yes (in smoke suite) |
| deal-submit | Submit → AI description → admin notified | No |
| inquiry | Send inquiry → WhatsApp + email | No |
| gate | Admin releases → landlord notified | No |
| landlord | Magic link → logged in | No |
| crm | Pipeline drag-drop | No |
| university | Lessons + AI chat | No |
| affiliates | Stats display | No |
| payment | Tier upgrade after payment | No |
| settings | Profile save + password change | No |
| admin-users | List + edit + delete | Yes (in smoke suite) |
| admin-deals | Quick List AI + pricing | No |
| admin-notifications | Send to all users | No |

### Smoke suite (ALWAYS before merge):
1. `npm run build` passes
2. `npx tsc --noEmit` passes
3. Homepage loads (/)
4. Sign up + OTP verify flow completes
5. Sign in works (existing user)
6. Deals page loads (/dashboard/deals)
7. Send one inquiry → WhatsApp + email received
8. Admin dashboard loads (/admin)

---

## 8. SESSION CAPSULES + IMPACT MAPS

Every page, action, and major UI entry point has a linked Session Capsule.
The Session Capsule is the copy-paste scope block used before prompting AI.

### 8.1 What a Session Capsule contains

```yaml
session_id: INQUIRY__EMAIL_WHATSAPP
domain: inquiry
allowed_paths:
  - src/features/inquiry/*
  - supabase/functions/process-inquiry/
  - supabase/functions/receive-tenant-whatsapp/
read_only_paths:
  - src/core/*                       ← may READ, may NOT EDIT without escalation
forbidden_paths:
  - src/features/deals/*
  - src/features/crm/*
  - all frozen paths
shared_tables:
  - inquiries (OWNER — full control)
  - landlord_invites (INSERT only)
  - notifications (INSERT only)
  - properties (READ only)
  - profiles (READ only)
edge_functions:
  - process-inquiry
  - receive-tenant-whatsapp
integrations:
  - ghl (WhatsApp reply)
  - email (tenant confirmation)
adjacent_features:
  - gate (reads inquiries we create)
  - landlord (reads landlord_invites we create)
blast_radius: MEDIUM (shared tables: inquiries, landlord_invites)
required_tests:
  - inquiry Playwright test
  - gate Playwright test (reads our data)
  - smoke suite
prompt_stub: |
  You are working on the INQUIRY module.
  You may ONLY edit files in src/features/inquiry/, supabase/functions/process-inquiry/, and supabase/functions/receive-tenant-whatsapp/.
  You may READ from core/ but not edit it.
  Do NOT touch deals, CRM, gate, landlord, or any frozen paths.
```

### 8.2 Impact Map (attached to each capsule)

```yaml
impact_map:
  contracts_touched:
    - inquiries table (owner — may add columns)
    - ProcessInquiryInput type (edge function contract)
  features_affected:
    - gate (reads inquiries.authorized — if column changes, gate breaks)
    - landlord (reads landlord_invites — if schema changes, magic link breaks)
  smoke_tests_required:
    - inquiry test
    - gate test
    - full smoke suite
  risk_notes:
    - Adding a column to inquiries is SAFE (readers ignore new columns)
    - Renaming/removing a column is BREAKING (must update gate + landlord first)
```

### 8.3 Rule

Before any AI task, Hugo pastes the relevant Session Capsule + Impact Map first,
then describes the task. If the task requires touching anything outside the capsule,
the AI must STOP and report the boundary violation before proceeding.

### 8.4 Route/Action → Session Map

| Route / Action | Session ID | Domain |
|---------------|-----------|--------|
| `/signup`, `/verify-otp`, `/signin`, `/forgot-password`, `/reset-password` | `AUTH__FLOW` | auth |
| `/dashboard/deals` | `DEALS__BROWSE` | deals |
| `/deals/:id` | `DEALS__DETAIL` | deals |
| `/dashboard/list-a-deal` | `DEAL_SUBMIT__FLOW` | deal-submit |
| Send Inquiry button | `INQUIRY__EMAIL_WHATSAPP` | inquiry |
| `/dashboard/crm` | `CRM__PIPELINE` | crm |
| `/dashboard/university` | `UNIVERSITY__LESSONS` | university |
| `/dashboard/affiliates` | `AFFILIATES__DASHBOARD` | affiliates |
| Payment iframe | `PAYMENT__SUBSCRIPTION` | payment |
| `/dashboard/settings` | `SETTINGS__PROFILE` | settings |
| `/inbox` (magic link) | `LANDLORD__MAGIC_LOGIN` | landlord |
| `/lead/:token` | `LANDLORD__CLAIM` | landlord |
| `/admin/marketplace/outreach` | `GATE__ADMIN` | admin-gate |
| `/admin/marketplace/users` | `ADMIN__USERS` | admin-users |
| `/admin/marketplace/deals`, `/admin/marketplace/quick-list` | `ADMIN__DEALS` | admin-deals |
| `/admin/marketplace/settings` | `ADMIN__SETTINGS` | admin-settings |
| `/admin/marketplace/notifications` | `ADMIN__NOTIFICATIONS` | admin-notifications |
| `/admin/marketplace` (dashboard) | `ADMIN__DASHBOARD` | admin-dashboard |
| `/admin/marketplace/affiliates` | `ADMIN__AFFILIATES` | admin-affiliates |
| `/admin/marketplace/faq` | `ADMIN__FAQ` | admin-faq |
| `/admin/marketplace/university` | `ADMIN__UNIVERSITY` | admin-university |

---

## 9. BLAST RADIUS CLASSIFICATION

Every task must declare its blast radius before execution.

| Level | Definition | Test requirement |
|-------|-----------|-----------------|
| **LOW** | Feature-local only. No shared tables written. No core changes. | Feature test + smoke |
| **MEDIUM** | Shared table written or edge function modified. Other features read the data. | Feature test + all affected feature tests + smoke |
| **HIGH** | Multiple domains affected. Core integration wrapper changed. Shared table schema changed. | All affected feature tests + full test suite + smoke |
| **CORE_CHANGE** | Anything in `core/`, route shell, auth/session, layout, or global config. | ALL tests. Full smoke. Hugo reviews before merge. |

### Rule:
```
Before execution, agent declares:
  blast_radius: LOW | MEDIUM | HIGH | CORE_CHANGE
  reason: "only editing CRMPage.tsx, no shared tables"

If blast_radius >= HIGH, Co-Pilot must review the impact map
and list all affected features before approving.
```

---

## 10. CONTRACT TESTS

### 10.1 Shared table contract tests
Required for every table used by 2+ features.
These are **compile-time type checks**, NOT runtime database queries.
They run in CI without a live Supabase connection.

```typescript
// tests/contracts/profiles.test.ts
import type { ProfileInsert, ProfileRead } from '@core/contracts/tables'

test('ProfileInsert contract has all required fields', () => {
  // This test fails at COMPILE TIME if the type is wrong
  const insert: ProfileInsert = {
    id: 'test', name: 'Test', email: 'test@test.com',
    whatsapp: '+447000000001', whatsapp_verified: false
  };
  expect(insert.id).toBeDefined();
});

test('ProfileRead contract includes wallet_address', () => {
  // TypeScript will fail if wallet_address is removed from the type
  type Check = ProfileRead extends { wallet_address: string | null } ? true : never;
  const valid: Check = true;
  expect(valid).toBe(true);
});
```

Tables requiring contract tests:
- `profiles` (used by 7+ features)
- `properties` (used by 6+ features)
- `inquiries` (used by 4 features)
- `notifications` (used by 3 features)
- `aff_profiles`, `aff_events` (used by 3 features)

### 10.2 Edge function contract tests
Required for every edge function called by 2+ features.

```typescript
// Test: process-inquiry input/output contract
test('process-inquiry accepts correct input and returns inquiry_id', async () => {
  const input: ProcessInquiryInput = {
    property_id: 'test-uuid',
    channel: 'email',
    message: 'test',
    tenant_name: 'Test',
    tenant_email: 'test@test.com',
    tenant_phone: '+447000000001',
    property_url: 'https://hub.nfstay.com/deals/test'
  };
  // Validate input matches contract type
  expect(input.property_id).toBeDefined();
  expect(input.channel).toBeDefined();
});
```

Edge functions requiring contract tests:
- `send-email` (called by 6+ features)
- `ghl-enroll` (called by gate + admin-deals)
- `process-inquiry` (called by inquiry + potentially others)

### 10.3 Integration wrapper contract tests
Required for each wrapper in `core/integrations/`.

```typescript
// Test: GHL wrapper returns expected shape
test('sendWhatsApp returns { sent: boolean }', async () => {
  // Mock or use test phone
  const result = await sendWhatsApp('+447000000001', 'test');
  expect(typeof result.sent).toBe('boolean');
});
```

---

## 11. HARD LAW: SHARED SCHEMA CHANGES

No shared table schema change may be merged without ALL of the following:

1. **Contract update** — `core/contracts/tables.ts` updated with new/changed types
2. **Impact list** — all features that read or write the table explicitly listed
3. **Test list** — required tests for all impacted features listed and passing
4. **Compatibility plan** — if BREAKING (rename/remove/type change):
   - Update all readers FIRST in the same PR
   - OR add new column alongside old, migrate readers, then remove old in a follow-up PR
5. **Blast radius declared** — must be HIGH or CORE_CHANGE

```
HARD LAW: No column rename, removal, or type change on a shared table
without a compatibility plan that updates all readers in the same PR.
Violations are rejected at PR review. No exceptions.
```

---

## 12. CLAUDE.MD — THE PERSISTENT BRAIN

`CLAUDE.md` at the repo root is the single most important file. It is read by
every AI agent at the start of every session. It must contain:

```markdown
# NFSTAY CORE RULES

## Architecture
- Modular monolith (see docs/rebuild/REBUILD_PLAN.md)
- Features never import each other
- Core is protected — changes require CORE_CHANGE blast radius
- Frozen zones: invest, nfstay-booking, vite.config, main.tsx

## AI Rules
- Never touch frozen zones
- Always respect Session Capsule scope
- If task requires touching anything outside capsule → STOP and report
- Never push to main, never deploy. Co-Pilot handles merges.
- Plan before code. Always.

## Naming (ONE name per thing, everywhere, no exceptions)
- "profiles" (never "users", "accounts", "members")
- "properties" (never "deals", "listings" in code — only UI)
- "inquiries" (never "leads", "requests" in code)
- "edge function" (never "serverless function", "lambda")
- "WhatsApp" (never "SMS", "text")

## Testing
- Run required tests based on blast radius tier
- Never merge without smoke suite
- Smoke = build + tsc + homepage + signup + signin + deals + inquiry + admin

## Contracts
- profiles, properties, inquiries are shared contracts
- Never change shared table schema without compatibility plan
- See docs/rebuild/REBUILD_PLAN.md section 11

## Common Commands
- npm run dev (port 8080)
- npm run build
- npx tsc --noEmit
- npx playwright test
```

This file is the brain. Session Capsules are the scope. Impact Maps are the
dependency awareness. Together they form the AI operating system.

---

## 13. PLAN MODE — NO CODE WITHOUT A PLAN

**No AI agent is allowed to write code without producing a PLAN first.**

### The 3-step discipline:

**STEP 1 — PLAN (mandatory before any code change)**
```
PLAN:
  files_to_change:
    - src/features/inquiry/EmailInquiryModal.tsx
    - supabase/functions/process-inquiry/index.ts
  contracts_touched:
    - ProcessInquiryInput type (adding tenant_phone)
  forbidden_paths_checked:
    - frozen/ → not touched ✅
    - other features → not touched ✅
  blast_radius: MEDIUM (shared table: inquiries)
  tests_required:
    - inquiry Playwright test
    - gate Playwright test (reads inquiries)
    - smoke suite
```

**STEP 2 — APPROVE**
Hugo or Co-Pilot reviews the plan. If plan touches forbidden scope → reject.

**STEP 3 — EXECUTE**
Only after plan approval does the agent write code.

### Why this matters:
Most AI failures come from jumping straight into coding without thinking about impact.
Plan → Approve → Execute prevents ~80% of breakage.

If an agent starts coding without a plan, reject the PR.

---

## 14. SKILLS — REUSABLE TASK TEMPLATES

Each Session Capsule becomes a reusable Skill file in `.claude/skills/`.

### Structure:
```
.claude/skills/
  auth-flow.md
  deals-browse.md
  inquiry-flow.md
  admin-users.md
  gate-admin.md
  university.md
  ...
```

### Skill file format (SHORT — see Section 25 for full example):
```markdown
---
name: inquiry-flow
description: >
  Use when: inquiry, WhatsApp reply not sending, email confirmation,
  "inquiry failed", "tenant didn't get message", process-inquiry,
  receive-tenant-whatsapp, EmailInquiryModal
---
SCOPE: src/features/inquiry/*, supabase/functions/process-inquiry/, supabase/functions/receive-tenant-whatsapp/
READ-ONLY: core/integrations/ghl.ts, core/integrations/email.ts
FORBIDDEN: all other features, frozen paths
DIAGNOSE FIRST: GHL token → function logs → config.toml → then code
WORKFLOW: diagnose → read → PLAN → approve → execute → test
TESTS: inquiry + gate + smoke
REFS: docs/rebuild/contracts/inquiries.md, docs/rebuild/integrations/ghl.md
```

### Usage:
Hugo invokes `/use inquiry-flow` and Claude loads the skill automatically.

---

## 15. SYSTEM OVERVIEW

See **Section 21** for the complete 7-layer system.
The layers are: CLAUDE.md → Skills → Session Capsule → Impact Map → Reference Docs → Plan Mode → Tests.

---

## 16. CONSISTENCY RULES

ONE name per thing. Everywhere. No exceptions.

| Concept | Correct name | NEVER use |
|---------|-------------|-----------|
| User record | `profiles` | users, accounts, members |
| Property listing | `properties` | deals, listings (in code) |
| Tenant request | `inquiries` | leads, requests (in code) |
| Server function | `edge function` | serverless, lambda, API route |
| Message channel | `WhatsApp` | SMS, text, message |
| Admin review | `gate` | outreach, approval |
| Property owner | `landlord` | lister, owner |
| Property seeker | `tenant` | user, buyer, customer |
| Subscription level | `tier` | plan, membership, level |

This reduces AI hallucination. When every doc, every variable, every comment
uses the same word, the AI can't get confused about what thing you mean.

---

## 17. INTEGRATION RISK ZONE

Integrations are the #1 source of production breakage (~37% of failures).

`core/integrations/` is a HIGH RISK ZONE. Rules:

1. Every wrapper logs the raw API request + response before returning
2. Every wrapper has a timeout (10s for GHL, 30s for OpenAI)
3. Every wrapper catches errors and returns a typed failure (never throws raw)
4. Every wrapper has a contract test
5. Changes to integration wrappers require CORE_CHANGE blast radius
6. No feature may call an external API directly — always through the wrapper

```
core/integrations/ = HIGH RISK
Changes here = CORE_CHANGE blast radius
Tests = ALL features using that integration
```

---

## 18. SKILL ACTIVATION — DESCRIPTION-DRIVEN, NOT CONTENT-DRIVEN

Claude does NOT read all skills fully. It scans **name + description** first,
picks the relevant skill, THEN loads the full file.

This means: if your skill description doesn't match what Hugo says,
Claude picks the wrong context.

### Skill description rule:

Every skill file MUST have trigger words that match how Hugo actually talks:

```markdown
---
name: auth-flow
description: >
  Use when: fixing signup, signin, OTP, WhatsApp verification, registration,
  password reset, new user flow, "users can't sign up", "OTP not sending",
  "can't log in", "verification code", send-otp, verify-otp edge function
---
```

### Bad vs Good:

```
❌ description: "Authentication signup module"
   → Hugo says "fix the signup" and Claude might not match this

✅ description: "Use when fixing signup, OTP, verification code,
   WhatsApp code not sending, new user registration, send-otp"
   → Hugo says anything related and Claude activates the right skill
```

### Rule:
Every skill description must include:
1. The feature name
2. What Hugo would say when asking about it (plain English)
3. The key file names and edge functions involved
4. Common error phrases ("OTP not sending", "inquiry failed", etc.)

---

## 19. PROGRESSIVE DISCLOSURE — LAYERED CONTEXT

Claude's context window is a battlefield. Too much = confusion. Too little = hallucination.

### The rule: Session Capsules are SMALL. Deep docs are linked, not inlined.

```yaml
# SMALL capsule (always loaded):
session_id: INQUIRY__EMAIL_WHATSAPP
domain: inquiry
allowed_paths: [src/features/inquiry/*, supabase/functions/process-inquiry/, supabase/functions/receive-tenant-whatsapp/]
forbidden_paths: [everything else]
blast_radius: MEDIUM

# DEEP references (loaded only when needed):
references:
  - docs/rebuild/contracts/inquiries.md      ← table schema + ownership
  - docs/rebuild/contracts/edge-functions.md  ← edge function input/output
  - docs/rebuild/integrations/ghl.md         ← GHL API details
  - docs/rebuild/integrations/resend.md      ← email sending details
```

Claude loads the capsule first (small, fast). It only reads the reference
docs if it needs deeper information. This keeps the context window clean.

### Reference docs structure:
```
docs/rebuild/
  contracts/
    profiles.md          ← table schema, owners, readers, writers
    properties.md
    inquiries.md
    edge-functions.md    ← all edge function input/output types
  integrations/
    ghl.md               ← GHL API, workflows, custom fields
    resend.md            ← email templates, API details
    openai.md            ← models, prompts, edge functions
    pexels.md            ← photo API, usage rules
  flows/
    signup-flow.md       ← step-by-step: signup → OTP → verify → dashboard
    inquiry-flow.md      ← step-by-step: inquiry → gate → landlord → claim
    payment-flow.md      ← step-by-step: paywall → GHL → tier upgrade
```

### Why this matters:
- A task about "fix inquiry WhatsApp" loads the inquiry capsule (5 lines)
  and only pulls ghl.md if it needs to change the GHL call
- A task about "change inquiry table schema" loads the inquiry capsule
  and pulls inquiries.md for the full contract + reader list
- No task ever loads everything

---

## 20. NAVIGABLE STRUCTURE — CLAUDE READS FILES LIKE A DEV

Claude navigates the filesystem like a developer in a terminal. It reads
directory structures, scans file names, opens files based on naming patterns.

### Structure rules:

1. **File names must be self-explanatory**
   - `SignUp.tsx` not `Page1.tsx`
   - `process-inquiry/index.ts` not `edge-fn-3/index.ts`
   - `ghl.ts` not `integration-helper.ts`

2. **Folders must match domain names exactly**
   - `features/inquiry/` not `features/tenant-flow/`
   - `supabase/functions/send-otp/` not `supabase/functions/user-stuff/`

3. **Every folder should be scannable in under 5 seconds**
   - Max 6-8 files per folder
   - If a folder has more than 8 files, split it

4. **One default way per operation**
   - WhatsApp: use `core/integrations/ghl.ts` → never call GHL API directly
   - Email: use `core/integrations/email.ts` → never call Resend directly
   - AI: use `core/integrations/openai.ts` → never call OpenAI directly
   - No alternatives offered. One path. No ambiguity.

### Anti-pattern:
```
❌ "You can use method A, B, or C depending on context"
✅ "Use core/integrations/ghl.ts. No alternatives."
```

Claude performs best with ONE clear default. Options cause hesitation and
inconsistency across sessions.

---

## 21. COMPLETE SYSTEM — 7 LAYERS

```
LAYER 1 — CLAUDE.md              (persistent brain — every session)
LAYER 2 — Skills + Descriptions  (task activation — matched by trigger words)
LAYER 3 — Session Capsule        (scope boundary — what you can touch)
LAYER 4 — Impact Map             (dependency awareness — what else breaks)
LAYER 5 — Reference Docs         (deep knowledge — loaded only when needed)
LAYER 6 — Plan Mode              (thinking before coding — mandatory)
LAYER 7 — Tests                  (verification — proves it works)
```

| Layer | What it prevents |
|-------|-----------------|
| CLAUDE.md | Agent forgetting rules between sessions |
| Skills + Descriptions | Agent picking wrong context for the task |
| Session Capsule | Agent wandering into wrong feature |
| Impact Map | Agent breaking a feature it didn't know was connected |
| Reference Docs | Agent guessing instead of reading actual contracts |
| Plan Mode | Agent coding before thinking |
| Tests | Agent claiming "done" without proof |

### How Hugo uses it:
1. Hugo says: "fix the inquiry WhatsApp reply"
2. Claude matches skill description → loads `inquiry-flow` skill
3. Skill contains Session Capsule → scopes to `features/inquiry/` only
4. Skill contains Impact Map → knows gate + landlord are adjacent
5. If deeper info needed → loads `docs/rebuild/integrations/ghl.md`
6. Agent produces PLAN before any code
7. Agent runs tests after code

### The key insight:
**System design > prompts.** The architecture, the folder structure, the skill
descriptions, the contracts — these control Claude's behavior far more than
any prompt text. A well-structured project makes AI predictable.
A poorly-structured project makes AI dangerous, no matter how good the prompt.

---

## 22. VERIFY_JWT SAFEGUARD

`--no-verify-jwt` is NOT the production safeguard. It is for local `supabase functions serve` only.

The source of truth is `supabase/config.toml`. Every public-facing edge function
that handles its own auth (JWT check in code, or webhook receiver) must be configured here:

```toml
[functions.send-otp]
verify_jwt = false

[functions.verify-otp]
verify_jwt = false

[functions.process-inquiry]
verify_jwt = false

[functions.receive-tenant-whatsapp]
verify_jwt = false

[functions.send-email]
verify_jwt = false

[functions.hard-delete-user]
verify_jwt = false

[functions.landlord-magic-login]
verify_jwt = false

[functions.lead-magic-login]
verify_jwt = false

[functions.claim-landlord-account]
verify_jwt = false

[functions.ghl-enroll]
verify_jwt = false

[functions.track-referral]
verify_jwt = false

[functions.health]
verify_jwt = false
```

### Deploy script (backup, not primary):
```bash
#!/bin/bash
# scripts/deploy-function.sh
# Usage: ./scripts/deploy-function.sh send-otp
# Requires: SUPABASE_ACCESS_TOKEN env var (never hardcode)
FN="$1"
if [ -z "$FN" ]; then echo "Usage: deploy-function.sh <function-name>"; exit 1; fi
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then echo "ERROR: SUPABASE_ACCESS_TOKEN not set"; exit 1; fi
npx supabase functions deploy "$FN" --project-ref asazddtvjvmckouxcmmo --no-verify-jwt
echo "Deployed: $FN"
```

### Rule:
- `config.toml` is the source of truth for verify_jwt settings
- `--no-verify-jwt` in CLI is a backup, not the primary mechanism
- After any deploy, verify the function responds (not 401)
- Direct `npx supabase functions deploy` without the script is discouraged

---

## 23. CI ENFORCEMENT (CONCRETE)

All enforcement runs as GitHub Actions steps in `.github/workflows/ci.yml`.

### Check 1: Frozen path protection
```yaml
- name: Check frozen paths
  run: |
    FROZEN=$(git diff --name-only origin/main...HEAD | grep -E '^src/pages/(invest|admin/invest|admin/nfstay)/|^src/pages/BookingSitePage|^supabase/functions/(inv-|revolut-|nfs-|submit-payout)|^vite\.config|^src/main\.tsx')
    if [ -n "$FROZEN" ]; then
      echo "BLOCKED: PR modifies frozen paths:"
      echo "$FROZEN"
      echo "Add label FROZEN_APPROVED to proceed (Hugo must approve)"
      exit 1
    fi
```

### Check 2: Core path changes require label
```yaml
- name: Check core changes
  run: |
    CORE=$(git diff --name-only origin/main...HEAD | grep '^src/core/')
    if [ -n "$CORE" ]; then
      echo "Core files modified: $CORE"
      echo "This PR requires blast_radius: CORE_CHANGE"
      # Check for label
      if ! gh pr view "$PR_NUMBER" --json labels -q '.labels[].name' | grep -q 'CORE_CHANGE'; then
        echo "BLOCKED: Add CORE_CHANGE label"
        exit 1
      fi
    fi
```

### Check 3: No feature-to-feature imports
```yaml
- name: Check import boundaries
  run: |
    VIOLATIONS=$(grep -rn "from.*@features/" src/features/ --include="*.tsx" --include="*.ts" | \
      awk -F: '{
        split($1, path, "/");
        feature=path[3];
        if ($0 ~ "@features/" feature "/") next;
        print $0
      }')
    if [ -n "$VIOLATIONS" ]; then
      echo "BLOCKED: Feature-to-feature imports detected:"
      echo "$VIOLATIONS"
      exit 1
    fi
```

### Check 4: No select('*') on shared tables
```yaml
- name: Check select star
  run: |
    SHARED_TABLES="profiles|properties|inquiries|notifications|aff_profiles|aff_events|landlord_invites"
    VIOLATIONS=$(grep -rn "\.from(['\"]($SHARED_TABLES)['\"]).*\.select(['\"]\\*['\"])" \
      src/ supabase/functions/ --include="*.tsx" --include="*.ts" || true)
    if [ -n "$VIOLATIONS" ]; then
      echo "BLOCKED: select('*') on shared table:"
      echo "$VIOLATIONS"
      echo "Use explicit column list instead"
      exit 1
    fi
```

### Check 5: Contract tests
```yaml
- name: Run contract tests
  run: npx vitest run tests/contracts/ --reporter=verbose
```

Contract tests are **type-validation tests** that run without a live database.
They verify that typed contracts in `core/contracts/` compile correctly and
that edge function input/output types match expected shapes. They do NOT
query a live Supabase instance.

```typescript
// tests/contracts/profiles.test.ts
import type { ProfileInsert, ProfileRead } from '@core/contracts/tables'

test('ProfileInsert has all required fields', () => {
  const insert: ProfileInsert = {
    id: 'test', name: 'Test', email: 'test@test.com',
    whatsapp: '+447000000001', whatsapp_verified: false
  };
  expect(insert.id).toBeDefined();
  expect(insert.whatsapp).toBeDefined();
});

test('ProfileRead includes wallet_address', () => {
  const read: ProfileRead = {} as ProfileRead;
  // TypeScript will fail compilation if wallet_address is removed from type
  const _wallet: string | null = read.wallet_address;
});
```

### Check 6: Smoke suite
```yaml
- name: Smoke suite
  run: |
    npm run build
    npx tsc --noEmit
    npx playwright test tests/smoke/
```

---

## 24. DIAGNOSTIC-BEFORE-CODE (HARD RULE)

Every Skill and every Session Capsule workflow MUST include this as Step 1:

```
DIAGNOSTIC (mandatory before ANY code change):

Before editing code, verify the problem is actually in code:

1. CHECK LOGS: Read edge function logs for error messages
   → supabase functions logs <function-name> (if available)

2. CHECK EXTERNAL SERVICES: Is GHL responding? Is Resend up?
   → Test the integration wrapper with a simple call
   → Check if bearer tokens are valid / not expired

3. CHECK CONFIG: Is verify_jwt correct? Is the env var set?
   → Read config.toml for the function
   → Check Supabase secrets

4. CHECK RUNTIME: Can you reproduce the error?
   → Try the exact user action that fails
   → Read the browser console / network tab

5. ONLY IF confirmed in code → proceed to PLAN and code changes

If the problem is NOT in code:
→ STOP
→ Report: "Problem is in [GHL/config/credentials/external service]"
→ Do NOT make code changes to work around a config issue
```

This prevents the #1 AI failure: making unnecessary code changes when the real
problem is an expired token, a disabled workflow, or a misconfigured function.

---

## 25. SKILLS FORMAT (REFINED)

Skills are **SHORT** — 20-30 lines max. Details live in reference docs.

### Example: `.claude/skills/inquiry-flow.md` (18 lines)
```markdown
---
name: inquiry-flow
description: >
  Use when: inquiry, WhatsApp reply not sending, email confirmation,
  "inquiry failed", "tenant didn't get message", process-inquiry,
  receive-tenant-whatsapp, EmailInquiryModal
---
SCOPE: src/features/inquiry/*, supabase/functions/process-inquiry/, supabase/functions/receive-tenant-whatsapp/
READ-ONLY: core/integrations/ghl.ts, core/integrations/email.ts
FORBIDDEN: all other features, frozen paths
DIAGNOSE FIRST: GHL token → function logs → config.toml → then code
WORKFLOW: diagnose → read → PLAN → approve → execute → test
TESTS: inquiry + gate + smoke
REFS: docs/rebuild/contracts/inquiries.md, docs/rebuild/integrations/ghl.md
```

18 lines. No inline impact maps. No long instructions. Scope + diagnostic + workflow + pointers.

---

## 26. CLAUDE.MD (EXPANDED)

The CLAUDE.md at repo root must contain the top rules INLINE — not just pointers.
This is what Claude reads FIRST, every session, before anything else.

```markdown
# NFSTAY — AI Operating Rules

## Architecture
Modular monolith. core/ + features/. See docs/rebuild/REBUILD_PLAN.md for full plan.
- Features NEVER import each other. Only from core/.
- Core is protected. Changes require CORE_CHANGE blast radius + label.
- Frozen zones: invest, nfstay-booking, vite.config, main.tsx. Never touch.

## Document Authority (CRITICAL)
1. CLAUDE.md (this file)
2. .claude/skills/*
3. docs/rebuild/* (active rebuild docs)
4. REBUILD_PLAN.md
5. Everything in docs/ outside rebuild/ is LEGACY REFERENCE ONLY — never load by default.

## Naming (ONE word per concept, everywhere)
- profiles (never users/accounts/members)
- properties (never deals/listings in code)
- inquiries (never leads/requests in code)
- edge function (never serverless/lambda)
- WhatsApp (never SMS/text)
- gate (never outreach/approval)
- landlord (never lister/owner)
- tenant (never buyer/customer)
- tier (never plan/membership)

## Blast Radius (declare BEFORE every task)
- LOW: feature-local only
- MEDIUM: shared table or edge function touched
- HIGH: multiple domains, core wrapper, schema change
- CORE_CHANGE: anything in core/, layouts, auth, global config

## Testing Tiers
- Tier 1 (feature-local): feature test + smoke
- Tier 2 (shared table): all affected features + smoke
- Tier 3 (core change): ALL tests + smoke
- Tier 4 (edge function): function test + all callers + smoke
- Smoke suite (ALWAYS): build + tsc + homepage + signup + signin + deals + inquiry + admin

## Frozen Zones (NEVER touch without Hugo's explicit approval)
- src/pages/invest/*, src/pages/admin/invest/*
- supabase/functions/inv-*, supabase/functions/revolut-*
- src/pages/admin/nfstay/*, BookingSitePage.tsx
- supabase/functions/nfs-*
- vite.config.ts, src/main.tsx
- src/core/ui/components/ui/ (shadcn only)
- src/core/database/types.ts (auto-generated only)

## AI Rules
- PLAN before code. Always. No exceptions.
- DIAGNOSE before changing code. Check logs, tokens, config first.
- Never push to main. Never deploy. Co-Pilot merges via gh pr merge.
- If task touches anything outside Session Capsule scope → STOP and report.
- select('*') is FORBIDDEN on shared tables. Explicit columns only.
- No raw external API calls in features. Use core/integrations/ wrappers.

## Integration Wrappers (ONE way per service)
- WhatsApp: core/integrations/ghl.ts → ONLY way
- Email: core/integrations/email.ts → ONLY way
- AI: core/integrations/openai.ts → ONLY way
- Photos: core/integrations/pexels.ts → ONLY way

## Edge Function Deploy
- Source of truth: supabase/config.toml (verify_jwt = false per function)
- Deploy script: scripts/deploy-function.sh (requires SUPABASE_ACCESS_TOKEN env var)
- NEVER hardcode tokens in scripts or docs
- After deploy: verify function responds (not 401)

## Database Contracts
- profiles owned by core/auth
- properties owned by features/deals
- inquiries owned by features/inquiry
- Schema changes require: contract update + impact list + tests + compatibility plan
- See docs/rebuild/REBUILD_PLAN.md section 11

## Common Commands
- npm run dev (port 8080)
- npm run build
- npx tsc --noEmit
- npx playwright test
- ./scripts/deploy-function.sh <name>
```

---

## 27. BRANCH PROTECTION (GITHUB GOVERNANCE)

These rules are configured in GitHub repository settings AND documented here.

### Required for all PRs to main:
1. **Required status checks:**
   - TypeScript (npx tsc --noEmit)
   - Lint
   - Tests (including contract tests)
   - Frozen path check
   - Core change check
   - Import boundary check
   - select('*') check
   - Build (npm run build)

2. **Required reviews:**
   - At least 1 review required
   - Stale reviews dismissed on new pushes

3. **Branch protection rules:**
   - No direct push to main — ALL changes via PR
   - No bypassing required status checks (remove `--admin` bypass)
   - No force push to main
   - No branch deletion for main

4. **Labels required for sensitive changes:**
   - `CORE_CHANGE` — required when PR modifies `src/core/`
   - `FROZEN_APPROVED` — required when PR modifies frozen paths (Hugo only)

### Hard rule:
```
The --admin flag on gh pr merge is BANNED.
No one — not Co-Pilot, not agents, not Hugo — bypasses branch protection.
If CI fails, fix the issue. Do not bypass.
```

---

## 28. DOCUMENT AUTHORITY + QUARANTINE

### Authority hierarchy (highest to lowest):
```
1. CLAUDE.md                    ← global brain, always loaded
2. .claude/skills/*             ← task activation, loaded per task
3. docs/rebuild/*               ← active rebuild docs, loaded when referenced
4. REBUILD_PLAN.md              ← master architecture plan
5. docs/legacy/*                ← REFERENCE ONLY, never loaded by default
```

### Document quarantine rule:
```
All markdown files created before the rebuild are LEGACY REFERENCE ONLY.
They are NOT active instructions.
They must NOT be loaded by default into Claude context.

HARD DEFAULT: No agent may load docs/legacy/* unless the current skill
or session capsule explicitly names that file as an allowed reference.

They may only be consulted if:
1. The current task explicitly requires reviewing old behavior
2. The file is named in the Session Capsule or Skill as an allowed reference

If a legacy doc conflicts with a rebuild doc, the rebuild doc ALWAYS wins.
No exceptions.
```

### Folder structure:
```
/CLAUDE.md                       ← ACTIVE (global brain)
/docs/
  rebuild/                       ← ACTIVE (rebuild-specific)
    REBUILD_PLAN.md              ← master plan
    contracts/
      profiles.md
      properties.md
      inquiries.md
      edge-functions.md
    integrations/
      ghl.md
      resend.md
      openai.md
      pexels.md
    flows/
      signup-flow.md
      inquiry-flow.md
      payment-flow.md
      landlord-flow.md
  legacy/                        ← QUARANTINED (reference only)
    AGENT_INSTRUCTIONS.md        ← old agent rules
    COPILOT_PROMPT.md            ← old copilot rules
    COMMUNICATIONS.md            ← old comms map
    INTEGRATIONS.md              ← old integration docs
    N8N_WHATSAPP_WORKFLOW.md     ← deleted
    STACK.md                     ← old stack reference
    CHANGELOG.md                 ← historical record
    SUPER_PROMPT_INQUIRY_FIX.md  ← old fix docs
    ...all other old docs
/.claude/
  skills/                        ← ACTIVE (task templates, one per domain)
    auth-flow.md                 ← signup + verify + signin + reset (ONE domain)
    inquiry-flow.md
    deals-browse.md
    deal-submit.md
    gate-admin.md
    crm.md
    university.md
    affiliates.md
    payment.md
    settings.md
    admin-users.md
    admin-deals.md
    admin-settings.md
    admin-notifications.md
  rules/                         ← ACTIVE (auto-loaded by file pattern)
    edge-functions.md            ← loads when editing supabase/functions/**
    frozen-zones.md              ← loads when any frozen path referenced
    core-changes.md              ← loads when editing src/core/**
    shared-tables.md             ← loads when editing table contracts
```

### Legacy file header (add to every moved file):
```markdown
<!-- LEGACY DOCUMENT — DO NOT LOAD BY DEFAULT -->
<!-- This file is reference-only. Active docs are in docs/rebuild/ -->
<!-- If this conflicts with rebuild docs, rebuild docs win. -->
```

---

## 29. EDGE FUNCTION HEALTH MONITORING

The /health endpoint handles monitoring.

### Health endpoint expansion:
The existing `health/` edge function should be expanded to ping critical functions:

```typescript
// health/index.ts — expanded
const CRITICAL_FUNCTIONS = [
  'send-otp', 'verify-otp', 'process-inquiry',
  'send-email', 'ghl-enroll', 'landlord-magic-login'
];

// For each: send OPTIONS request, verify 200 response
// Return: { status: 'healthy' | 'degraded', functions: { name: status }[] }
```

### External monitoring:
- Wire health endpoint to UptimeRobot (or similar)
- Check interval: every 5 minutes
- Alert: Hugo via email if any critical function is down
- URL: `https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/health`

### Rule:
If an edge function starts returning non-200, the monitoring catches it
within 5 minutes. No more "it's been broken for days and nobody noticed."
