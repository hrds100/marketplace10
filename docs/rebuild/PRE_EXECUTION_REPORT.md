# PRE-EXECUTION VERIFICATION REPORT
## nfstay Rebuild — Final Safety Check

Date: 2026-04-05
Sources: 3 specialist agents (Frontend Mapper, Backend Mapper, Risk Auditor)
All findings are code-verified, not guessed.

---

## SECTION 1 — CRITICAL INVARIANTS

| Invariant | Status | Evidence |
|-----------|--------|----------|
| JV properties not impacted by rebuild | **CONFIRMED SAFE** | JV cards use `inv_properties` table with `list_on_deals` flag. Injected via `useInvestProperties()` hook with absolute imports. Moving DealsPage to features/deals/ does NOT break this — all imports are absolute (`@/`). |
| Booking system fully frozen | **CONFIRMED SAFE** | BookingSitePage + all nfstay admin pages use absolute imports. No code changes planned. BUT: if `useAuth` moves to `@core/auth/`, import path must be aliased — see BLOCKER #1. |
| Booking session integrity | **CONFIRMED SAFE** | Same `useAuth` hook, same Supabase session. No token/cookie changes. `useUserTier` uses Realtime subscription — remains intact. |
| Investment system fully frozen | **CONFIRMED SAFE** | All invest pages/edge functions untouched. Shared tables (`profiles`, `aff_profiles`, `user_bank_accounts`) remain in same schema. |
| Wallet creation for ALL paths | **CONFIRMED SAFE with 1 exception** | Auto-creates on dashboard load for: email signup, social login, landlord claim, admin-created users. EXCEPTION: `/settings` route skips auto-creation (intentional — avoids disruption). Manual `requireWallet()` still works there. |
| No notification regression | **PARTIAL — 1 ISSUE** | WhatsApp (GHL), Email (Resend), In-app (bell) all remain. BUT: `receive-tenant-whatsapp` edge function currently sends a duplicate WhatsApp reply that GHL workflow `cf089a15` already handles. Must remove the code-side WhatsApp send. |

---

## SECTION 2 — BLOCKERS (must fix BEFORE rebuild starts)

### BLOCKER 1: Auth import path will break frozen zones

**Problem:** When `useAuth` moves from `@/hooks/useAuth` to `@core/auth/useAuth`, every frozen page (invest + booking) breaks because they import from the old path and cannot be edited.

**Fix:** Create a re-export file at the OLD path that points to the new location:
```typescript
// src/hooks/useAuth.ts (keep this file as a bridge)
export { useAuth } from '@core/auth/useAuth';
```
This lets frozen pages keep their old import while new code uses the core path.

**Status:** NOT in the rebuild plan. Must add to Phase 0.

### BLOCKER 2: 5 live n8n calls NOT yet replaced

| File | n8n Call | Replacement needed |
|------|---------|-------------------|
| `useAIChat.ts:29` | `/webhook/ai-university-chat` | `ai-chat` edge function (NOT YET BUILT) |
| `ListADealPage.tsx:263` | `/webhook/ai-generate-listing` | `ai-description` edge function (NOT YET BUILT) |
| `ListADealPage.tsx:414` | `/webhook/airbnb-pricing` | `airbnb-pricing` edge function (NOT YET BUILT) |
| `AdminQuickList.tsx:345` | `/webhook/airbnb-pricing` | Same edge function |
| `AdminDeals.tsx:341` | `/webhook/airbnb-pricing` | Same edge function |

These 3 edge functions must be built in Phase 3 BEFORE deleting n8n code.

### BLOCKER 3: Affiliate commission still calls n8n directly

| File | Line | Call |
|------|------|------|
| `PaymentSheet.tsx` | 72 | `fetch('https://n8n.srv886554.hstgr.cloud/webhook/aff-commission-subscription')` |
| `InquiryPanel.tsx` | 94 | Same hardcoded URL |

**Fix:** Replace with Supabase `aff_events` INSERT (already in Phase 3, step 29). But these are hardcoded URLs, not env vars — they silently fail when n8n is down.

### BLOCKER 4: CRM stage move notification not addressed

`CRMPage.tsx:93` calls `notifyCrmStageMove()` which hits n8n `/webhook/move-crm-stage`.

**Decision needed from Hugo:** Delete the notification (CRM stages save to DB anyway) or replace with an edge function?

### BLOCKER 5: `receive-tenant-whatsapp` sends duplicate WhatsApp

Our code sends a GHL WhatsApp reply AND GHL workflow `cf089a15` also sends one. Must remove the code-side WhatsApp send from `receive-tenant-whatsapp` edge function.

---

## SECTION 3 — CROSS-SYSTEM DEPENDENCY MAP

### Core rebuild ↔ Booking

| Shared resource | How booking uses it | Rebuild impact |
|----------------|--------------------|----|
| `profiles` table | Reads `tier`, `whatsapp`, `email` | SAFE — no schema change planned |
| `useAuth` hook | Imports from `@/hooks/useAuth` | BLOCKER #1 — needs re-export bridge |
| `useUserTier` hook | Reads `profiles.tier` via Realtime | SAFE — no change planned |
| `nfs_operators` table | Booking's own table | SAFE — frozen, not touched |
| Supabase session | Same auth session | SAFE — no session changes |

### Core rebuild ↔ Investment

| Shared resource | How invest uses it | Rebuild impact |
|----------------|--------------------|----|
| `profiles` table | Reads `wallet_address`, `referred_by`, `email` | SAFE — no schema change |
| `aff_profiles` table | Reads referral codes for commissions | SAFE — schema unchanged |
| `aff_commissions` table | Writes commission records | SAFE — schema unchanged |
| `user_bank_accounts` table | Reads/writes bank details | SAFE — schema unchanged |
| `useAuth` hook | Same import path concern | BLOCKER #1 |
| `send-email` edge function | Called by `inv-crypto-confirm`, `inv-approve-order` | SAFE — function stays flat, same path |
| `particle-generate-jwt` | Called by wallet creation | SAFE — stays in same path |

### Auth ↔ Wallet

| Step | What happens | Status |
|------|-------------|--------|
| Dashboard load | WalletProvisioner checks `profiles.wallet_address` | SAFE |
| No wallet found | `silentCreateWallet()` after 5s delay | SAFE |
| JWT generated | Calls `particle-generate-jwt` edge function | SAFE — flat path unchanged |
| Wallet saved | Updates `profiles.wallet_address` | SAFE |
| Settings page | Skipped (intentional) | SAFE |

### Gate ↔ Landlord communications

| Step | Channel | System | Status |
|------|---------|--------|--------|
| Admin releases inquiry | WhatsApp | GHL via `ghl-enroll` edge function | SAFE |
| Admin releases inquiry | Email | Resend via `send-email` edge function | SAFE |
| Landlord clicks magic link | Auth | `landlord-magic-login` edge function | SAFE |
| Landlord claims account | DB | `claim-landlord-account` edge function | SAFE |

### GHL wiring

| Flow | Edge function | GHL endpoint | Status |
|------|--------------|-------------|--------|
| OTP send | `send-otp` | Workflow enrollment `baabc69a` | SAFE |
| Landlord cold outreach | `ghl-enroll` | Workflow enrollment `67250bfa` | SAFE |
| Landlord warm outreach | `ghl-enroll` | Workflow enrollment `0eb4395c` | SAFE |
| Inquiry WhatsApp reply | `process-inquiry` | Conversations API (direct message) | SAFE |
| Inbound WhatsApp auto-reply | GHL workflow `cf089a15` | Native GHL trigger | SAFE — code must NOT also reply |

---

## SECTION 4 — USER FLOW TRUTH TABLE

### Email Signup
| Step | Systems | Notifications | Wallet | Booking dep? | Invest dep? |
|------|---------|--------------|--------|-------------|-------------|
| Fill form, submit | Supabase auth | None | No | No | No |
| OTP sent | `send-otp` edge fn → GHL | WhatsApp OTP | No | No | No |
| Enter code | `verify-otp` edge fn | None | No | No | No |
| Land on dashboard | ProtectedRoute passes | Welcome email (Resend) + admin email | Auto-create after 5s | No | No |

### Social Signup (Google/Apple)
| Step | Systems | Notifications | Wallet | Booking dep? | Invest dep? |
|------|---------|--------------|--------|-------------|-------------|
| Click social button | Particle Network | None | Created during auth flow | No | No |
| Redirect to /auth/particle | ParticleAuthCallback | None | Wallet already exists | No | No |
| OTP verification | Same as email signup | WhatsApp OTP | Already created | No | No |
| Land on dashboard | ProtectedRoute passes | Welcome email | Wallet restore (social method) | No | No |

### Existing User Signin
| Step | Systems | Notifications | Wallet | Booking dep? | Invest dep? |
|------|---------|--------------|--------|-------------|-------------|
| Email + password | Supabase auth | None | Restore existing | No | No |
| Land on dashboard | ProtectedRoute passes | None | Restore session | No | No |

### Landlord Magic Login
| Step | Systems | Notifications | Wallet | Booking dep? | Invest dep? |
|------|---------|--------------|--------|-------------|-------------|
| Click WhatsApp link | Browser → /inbox?token=X | None | No | No | No |
| Token validated | `landlord-magic-login` edge fn | None | No | No | No |
| Session set | Supabase auth | None | Auto-create after 5s | No | No |
| Land on /dashboard/crm | CRM Leads tab | None | Background creation | No | No |

### Landlord Claim
| Step | Systems | Notifications | Wallet | Booking dep? | Invest dep? |
|------|---------|--------------|--------|-------------|-------------|
| See inquiry in CRM | Supabase `inquiries` table | None | No | No | No |
| Sign NDA | `inquiries` UPDATE nda_signed | None | No | No | No |
| Set email + password | `claim-landlord-account` edge fn | None | No | No | No |
| Account claimed | `profiles` UPDATE email | None | Wallet exists from magic login | No | No |

### Admin Release (Gate)
| Step | Systems | Notifications | Wallet | Booking dep? | Invest dep? |
|------|---------|--------------|--------|-------------|-------------|
| Admin clicks Release | `inquiries` UPDATE authorized | Bell notification | No | No | No |
| WhatsApp to landlord | `ghl-enroll` → GHL workflow | WhatsApp (GHL) | No | No | No |
| Email to landlord | `send-email` edge fn | Email (Resend) | No | No | No |

### Inquiry Submission
| Step | Systems | Notifications | Wallet | Booking dep? | Invest dep? |
|------|---------|--------------|--------|-------------|-------------|
| Click Email button | EmailInquiryModal opens | None | No | No | No |
| Submit form | `process-inquiry` edge fn | WhatsApp to tenant (GHL) + Email to tenant (Resend) + Bell (admin) | No | No | No |

---

## SECTION 5 — MISSING OR UNCLEAR ITEMS

### Must clarify before execution:

1. **CRM stage move notification** — Delete `notifyCrmStageMove()` or replace with edge function? Hugo must decide.

2. **AdminOutreach.tsx (old)** — Plan says delete, but it's still imported in App.tsx. Confirm it's not used as a fallback for AdminOutreachV2.

3. **Pages missing from rebuild plan Section 3.2:**
   - `BookingSitePage.tsx` — frozen but not listed
   - `ParticleAuthCallback.tsx` — auth callback, not listed
   - `AuthBridgePage.tsx` — auth bridge, not listed
   - `BrandPage.tsx` — brand guide, not listed
   - `NotFound.tsx` — 404 page, not listed
   - `ModuleOverviewPage.tsx` — university module, not listed
   - `LessonPage.tsx` — listed in university module but needs explicit mapping

4. **`generate-description` edge function** — exists but appears orphaned (not called anywhere). Confirm delete.

5. **nfstay hooks location** — BookingSitePage imports from `@/hooks/nfstay/`. If hooks move to `@core/hooks/`, booking breaks. Must keep nfstay hooks in original path.

6. **`DealsPageV2` vs `DealsPage` naming** — Plan says `DealsPage.tsx`, code uses `DealsPageV2.tsx`. Clarify rename.

### Must add to frozen zones:

7. **DashboardLayout.tsx** — wallet auto-creation depends on WalletProvisioner living inside DashboardLayout. If restructured, wallets stop creating.

8. **All hooks imported by frozen zones** — `useAuth`, `useUserTier`, nfstay hooks must keep their old import paths (use re-export bridges).

---

## SECTION 6 — FINAL VERDICT

### 1. Is the rebuild plan truly covering everything important?

**Almost.** The architecture, boundaries, testing, CI enforcement, skills, and session capsules are solid. But 8 items are missing or unclear (listed in Section 5).

### 2. What is still missing?

| Missing item | Severity | Action |
|-------------|----------|--------|
| Auth import bridge for frozen zones | **CRITICAL** | Add re-export files in Phase 0 |
| 3 AI edge functions not yet built | **BLOCKING** | Must build before Phase 3 can start |
| Affiliate commission n8n calls | **BLOCKING** | Replace in Phase 3, step 29 |
| CRM notification decision | **MEDIUM** | Hugo decides: delete or replace |
| Duplicate WhatsApp in receive-tenant-whatsapp | **MEDIUM** | Remove code-side send |
| 6 pages not in plan Section 3.2 | **LOW** | Add to plan for completeness |
| DashboardLayout in frozen zones | **MEDIUM** | Add to Section 3.8 |
| generate-description orphan cleanup | **LOW** | Confirm and delete |

### 3. Is it safe to begin execution domain by domain?

**YES — after fixing the 3 CRITICAL/BLOCKING items:**

1. Add auth import re-export bridges to Phase 0
2. Confirm the 3 AI edge functions are built in Phase 3 (they are planned, just not built yet)
3. Confirm affiliate commission replacement is in Phase 3 (it is — step 29)

The rebuild can safely proceed with Phase 0 (establish rules) immediately. Code restructuring (Phase 1) can begin after the re-export bridges are in place. Phase 3 (n8n replacement) must complete before n8n code is deleted in Phase 2.

**Recommended execution order adjustment:**
```
Phase 0: Rules, CI, skills, config (safe — no code changes)
Phase 1: Restructure + re-export bridges (safe — import aliases)
Phase 3: Build AI edge functions + replace n8n calls (must happen BEFORE Phase 2)
Phase 2: Delete dead code (only after Phase 3 replacements are proven)
Phase 4: Bug fixes
Phase 5: New features
```

Note: Phase 3 and Phase 2 should be SWAPPED — build replacements first, delete old code after.
