# NFStay — Execution Plan

> The complete build roadmap from zero to production.
> The agent follows this plan step by step. Tajul approves each step.
> Hugo only needed for final production merge and marketplace10 emergencies.

---

## How This Works

1. **Tajul pastes the hotkey** (from `HOTKEY_TAJUL.md`) and says "let's get started"
2. **The agent reads this file** and tells Tajul what Phase and Step we're on
3. **The agent does the work** — writes code, runs commands, pushes to branches, opens PRs
4. **Tajul reviews the preview** and approves or flags issues
5. **Tajul provides credentials, API keys, and access** when the agent needs them
6. **When a phase is complete** — the agent reports what's done and what's next

**Tajul does not need to write tasks.** The agent reads this plan and proposes the next step automatically.

## Roles

| Person | Role | When involved |
|--------|------|---------------|
| **Agent (Claude Code)** | Does ALL the work — code, commands, deployments, PRs | Always |
| **Tajul** | Approves steps, provides credentials/API keys, reviews previews, runs SQL if needed | Every step |
| **Hugo** | Final production merge to main, emergencies that risk marketplace10 | End of build + emergencies only |

**Tajul has full access to:** Stripe Dashboard, Hospitable Dashboard, Google Cloud Console, Cloudflare, Resend, Supabase, Vercel, n8n, DNS, domains — everything.
**Hugo is only needed when:** merging to main (final production deploy) or if something risks breaking hub.nfstay.com.

---

## Current Status

> **Update this section after completing each step. This is how the agent knows where we are.**

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 — Foundation | COMPLETE | Bug fixes, placeholders, DB tables live, Step 1.6 verified |
| Phase 2 — Properties + Maps | COMPLETE | All frontend built. DB migration executed. Table, RLS, indexes, RPC verified. |
| Phase 3 — Reservations + Pricing | IN PROGRESS | Step 3.1 done (migration + types). Migration awaiting execution. |
| Phase 4 — Payments (Stripe) | NOT STARTED | Tajul provides Stripe keys |
| Phase 5 — Integrations (Hospitable + iCal) | NOT STARTED | Tajul provides Hospitable credentials |
| Phase 6 — White-Label + Analytics | NOT STARTED | Tajul handles DNS + domains |

---

## PHASE 1 — FOUNDATION

**Goal:** Operators can sign up, log in, complete onboarding, and access a dashboard.
**Dependencies:** None — fully self-contained.
**Tajul needed:** Approve SQL migration before it runs.

### Step 1.1 — Database tables (nfs_operators, nfs_operator_users, nfs_stripe_accounts, nfs_auth_tokens)

**What the agent does:**
1. Create migration file `supabase/migrations/[timestamp]_nfs_phase1_foundation.sql`
2. Include all Phase 1 tables from `docs/nfstay/DATABASE.md`
3. Include all RLS policies
4. Output the full SQL for Tajul to review
5. Run the migration once Tajul approves

**What Tajul does:** Review the SQL looks correct (agent will explain what each table does). Say APPROVED to run it.

**Done when:** Tables exist in Supabase, RLS policies are active.

---

### Step 1.2 — NFStay route group and layout

**What the agent does:**
1. Create `app/(nfstay)/layout.tsx` — shared NFStay layout
2. Create `app/(nfstay)/nfstay/layout.tsx` — operator sidebar + nav
3. Create `app/(nfstay)/nfstay/page.tsx` — dashboard home (placeholder)
4. Verify marketplace10 routes still work (no interference)
5. Push to `feat/nfs-phase1-foundation` branch
6. Open PR, share preview URL

**What Tajul does:** Open the preview. Check that `/nfstay` shows the NFStay layout. Check that `/dashboard` (marketplace10) still works normally.

**Done when:** `/nfstay` renders. `/dashboard` is unaffected.

---

### Step 1.3 — Operator signup and login

**What the agent does:**
1. Create `hooks/nfstay/use-nfs-auth.ts` — NFStay auth hook
2. On Supabase Auth signup, INSERT into `nfs_operators` with `profile_id = auth.uid()`
3. Create `app/(nfstay)/nfstay/login/page.tsx` — operator login page
4. Auth guard: redirect unauthenticated users to login
5. Push and share preview

**What Tajul does:** Test signup with a test email. Test login. Verify `nfs_operators` row was created in Supabase.

**Done when:** New user can sign up and log in. `nfs_operators` row exists.

---

### Step 1.4 — Onboarding wizard (8 steps)

**What the agent does:**
1. Create `app/(nfstay)/nfstay/onboarding/page.tsx`
2. Build 8-step wizard: account_setup, persona, usage_intent, business, landing_page, website_customization, contact_info, payment_methods
3. Each step saves to `nfs_operators` columns
4. Completion gate: `onboarding_step = 'completed'` required to access dashboard
5. Push and share preview

**What Tajul does:** Walk through all 8 steps. Verify data saves. Verify you can't access dashboard until onboarding is complete.

**Done when:** Full onboarding works. Data persists. Gate enforced.

---

### Step 1.5 — Operator settings page

**What the agent does:**
1. Create `app/(nfstay)/nfstay/settings/page.tsx`
2. Tabs: Profile, Contact, Branding (basics)
3. Read/update `nfs_operators` columns
4. Push and share preview

**What Tajul does:** Edit settings, save, reload — verify data persists.

**Done when:** Settings page works with all three tabs.

---

### Step 1.6 — Phase 1 verification

**Agent runs through the complete checklist:**
- [ ] New operator can sign up
- [ ] Login works
- [ ] Onboarding wizard completes all 8 steps
- [ ] Data persists in `nfs_operators`
- [ ] Onboarding gate prevents dashboard access until complete
- [ ] Settings page reads and updates operator data
- [ ] RLS prevents cross-operator access
- [ ] marketplace10 (`/dashboard`, `/admin`, `/inbox`) is unaffected
- [ ] TypeScript compiles with zero errors
- [ ] Update `docs/nfstay/FEATURES.md` — mark Phase 1 features as Done
- [ ] Update `docs/nfstay/CHANGELOG.md`
- [ ] Update `EXECUTION_PLAN.md` current status

**What Tajul does:** Confirm all checkboxes pass on the preview.

---

## PHASE 2 — PROPERTIES + MAPS

**Goal:** Operators can create, edit, and list properties. Travelers can search and view them on a map.
**Dependencies:** Phase 1 complete.
**Tajul needed:** SQL migration approval. Google Maps key referrer update if needed (Tajul has Google Cloud access).

### Step 2.1 — Database table (nfs_properties)

**What the agent does:**
1. Create migration `[timestamp]_nfs_phase2_properties.sql`
2. Full `nfs_properties` table from `DATABASE.md`
3. Indexes (operator, listing_status, location, full-text search)
4. RLS policies (operator manages own, public reads listed)
5. Show Tajul the SQL and explain what it does. Run once Tajul says APPROVED.

---

### Step 2.2 — Supabase Storage buckets

**What the agent does:**
1. Create `nfs-images` bucket (public read, authenticated upload)
2. Create `nfs-branding` bucket (public read, authenticated upload)
3. Set bucket policies
4. Show Tajul the bucket config. Run once Tajul says APPROVED.

---

### Step 2.3 — Property creation wizard (10 steps)

**What the agent does:**
1. Create `app/(nfstay)/nfstay/properties/new/page.tsx`
2. 10-step wizard: basics, location, guest/rooms, photos, amenities, description, rules, availability, iCal config, fees/discounts/rates
3. Photo upload to `nfs-images` bucket
4. Google Places autocomplete for location
5. Save as draft or publish
6. Push and share preview

**What Tajul does:** Create a test property through all 10 steps. Upload a photo. Verify data saves.

---

### Step 2.4 — Property list and detail (operator)

**What the agent does:**
1. Create `app/(nfstay)/nfstay/properties/page.tsx` — property list
2. Create `app/(nfstay)/nfstay/properties/[id]/page.tsx` — property detail/edit
3. Filter, sort, listing status management (draft/listed/unlisted/archived)
4. Push and share preview

---

### Step 2.5 — Traveler search page with Google Maps

**What the agent does:**
1. Create `app/(nfstay)/traveler/search/page.tsx`
2. Google Maps with property markers and clustering
3. Filter panel (type, guests, price range, dates)
4. Property cards with images
5. Full-text search via Postgres
6. Push and share preview

**What Tajul does:** Search for properties. Verify map loads. Verify filters work. Verify only listed properties appear.

---

### Step 2.6 — Traveler property detail page

**What the agent does:**
1. Create `app/(nfstay)/traveler/property/[id]/page.tsx`
2. Photo gallery, description, amenities, rules, location map, booking widget (placeholder)
3. Push and share preview

---

### Step 2.7 — Phase 2 verification

- [ ] Operator can create property through 10-step wizard
- [ ] Photos upload to Supabase Storage
- [ ] Property list shows operator's properties
- [ ] Draft/listed/unlisted/archived status works
- [ ] Traveler search shows only listed properties
- [ ] Map loads with markers
- [ ] Places autocomplete works
- [ ] Property detail page renders correctly
- [ ] marketplace10 unaffected
- [ ] Docs updated

---

## PHASE 3 — RESERVATIONS + PRICING

**Goal:** Operators can manage reservations. Travelers can check availability and see pricing.
**Dependencies:** Phase 2 complete.
**Tajul needed:** SQL migration approval. Resend API key (Tajul has access to create/provide).

### Step 3.1 — Database tables (nfs_reservations, nfs_promo_codes, nfs_guest_sessions)
→ Migration + RLS + ESCALATE for SQL review

### Step 3.2 — Pricing engine (Edge Function)
→ Create `supabase/functions/nfs-pricing-calculate/`
→ Base rate × nights + cleaning fee + extra guest fee + custom fees − discounts
→ ESCALATE for deployment

### Step 3.3 — Operator create reservation flow
→ Manual reservation creation with guest info, dates, pricing

### Step 3.4 — Reservation list + calendar view (operator)
→ Filter by status, date range. Calendar visualization.

### Step 3.5 — Traveler availability check + pricing display
→ Query `nfs_reservations` for conflicts. Display pricing breakdown.

### Step 3.6 — Promo code CRUD + validation
→ Operator creates codes. Traveler applies them.

### Step 3.7 — Email Edge Function
→ Create `supabase/functions/nfs-email-send/`
→ Booking confirmation template
→ Ask Tajul for Resend API key. Deploy once provided.

### Step 3.8 — Phase 3 verification
- [ ] Operator can create reservation manually
- [ ] Availability check prevents double-booking
- [ ] Pricing calculation matches expected math
- [ ] Promo codes apply correctly
- [ ] Calendar view shows reservations
- [ ] Booking confirmation email sends
- [ ] marketplace10 unaffected

---

## PHASE 4 — PAYMENTS (STRIPE)

**Goal:** Travelers can pay via Stripe Checkout. Operators can connect Stripe and receive payouts.
**Dependencies:** Phase 3 complete.
**Tajul needed:** YES — Stripe keys, webhook endpoint creation, Connect redirect URI. Tajul has Stripe Dashboard access.

### Step 4.1 — Database table (nfs_webhook_events)
→ Migration + RLS + ESCALATE for SQL review

### Step 4.2 — Stripe Checkout Edge Function
→ Create `supabase/functions/nfs-stripe-checkout/`
→ ESCALATE for Stripe keys + deployment

### Step 4.3 — Stripe webhook Edge Functions
→ Create `supabase/functions/nfs-stripe-webhook/` and `nfs-stripe-connect-webhook/`
→ Agent gives Tajul exact step-by-step instructions to create webhook endpoints in Stripe Dashboard and copy signing secrets

### Step 4.4 — Stripe Connect OAuth Edge Function
→ Create `supabase/functions/nfs-stripe-connect-oauth/`
→ Agent gives Tajul exact steps to set Connect redirect URI in Stripe Dashboard

### Step 4.5 — Frontend payment flow
→ Traveler checkout → Stripe → success/cancel pages

### Step 4.6 — Operator Stripe Connect UI
→ Settings tab: connect Stripe, view earnings, dashboard link

### Step 4.7 — Phase 4 verification
- [ ] Traveler can complete payment via Stripe Checkout (test mode)
- [ ] Webhook updates reservation status
- [ ] Operator can connect Stripe account
- [ ] Platform fee calculated correctly
- [ ] Webhook idempotency works
- [ ] marketplace10 unaffected

**Tajul involvement:** ~30 min in Stripe Dashboard (agent gives exact step-by-step instructions)

---

## PHASE 5 — INTEGRATIONS (HOSPITABLE + iCAL)

**Goal:** Operators can import listings from Airbnb/VRBO via Hospitable. iCal sync works.
**Dependencies:** Phase 4 complete.
**Tajul needed:** YES — verify Hospitable credentials, update webhook URL. Tajul has Hospitable Dashboard access.

### Step 5.1 — Database table (nfs_hospitable_connections)
→ Migration + RLS + ESCALATE for SQL review

### Step 5.2 — Hospitable OAuth Edge Function
→ Create `supabase/functions/nfs-hospitable-oauth/`
→ Agent gives Tajul exact steps to verify credentials + set redirect URI in Hospitable Dashboard

### Step 5.3 — n8n Hospitable sync workflows (5 workflows)
→ nfs-hospitable-init-sync, listing-sync, reservation-sync, manual-sync, retry
→ Agent activates workflows after Tajul confirms test data flows correctly

### Step 5.4 — iCal Edge Function + n8n sync
→ Create `supabase/functions/nfs-ical-feed/`
→ n8n workflow: `nfs-ical-sync` (cron every 4 hours)
→ ESCALATE for deployment + activation

### Step 5.5 — Hospitable connection UI
→ Settings tab: connect/disconnect Hospitable, sync status, manual resync button

### Step 5.6 — Phase 5 verification
- [ ] Operator can connect Hospitable via OAuth
- [ ] Listings sync from Hospitable to nfs_properties
- [ ] Reservations sync from Hospitable
- [ ] Manual resync works
- [ ] iCal feed generates valid ICS
- [ ] marketplace10 unaffected

**Tajul involvement:** ~20 min (agent gives exact step-by-step for Hospitable Dashboard)

---

## PHASE 6 — WHITE-LABEL + ANALYTICS + PRODUCTION

**Goal:** Operators get branded storefronts. Analytics track usage. nfstay.app goes live.
**Dependencies:** Phase 5 complete.
**Tajul needed:** YES — DNS changes, Vercel domain config, Cloudflare verification. Tajul has all access.

### Step 6.1 — Database table (nfs_analytics)
→ Migration + RLS + ESCALATE for SQL review

### Step 6.2 — Middleware update for white-label routing
→ **CAUTION** — middleware.ts is a protected file (routes hub.nfstay.com traffic)
→ Agent must show Tajul exactly what changes and confirm marketplace10 routing still works
→ If marketplace10 routing breaks → STOP and escalate to Hugo

### Step 6.3 — White-label storefront pages
→ `app/(nfstay)/white-label/*` — landing, search, property, booking, payment

### Step 6.4 — Custom domain verification Edge Function
→ Create `supabase/functions/nfs-domain-verify/`
→ ESCALATE for Cloudflare credentials + deployment

### Step 6.5 — Analytics tracking + operator dashboard
→ Page view tracking, booking event tracking
→ Operator analytics dashboard with stats

### Step 6.6 — Domain configuration
→ Agent gives Tajul exact DNS records to set for nfstay.app + *.nfstay.app → Vercel
→ Agent gives Tajul exact steps to add domains in Vercel project

### Step 6.7 — Cleanup workflows
→ n8n: `nfs-cleanup-expired` (daily cron — expired tokens/sessions)
→ ESCALATE for activation

### Step 6.8 — Final E2E verification
- [ ] Full flow: signup → onboarding → property → booking → payment → confirmation
- [ ] White-label: subdomain routing works
- [ ] Custom domains: verification + SSL
- [ ] Analytics: data recording and dashboard
- [ ] nfstay.app serves traveler search
- [ ] hub.nfstay.com is 100% unaffected
- [ ] All docs updated
- [ ] All features in FEATURES.md marked Done

**Tajul involvement:** ~45 min (DNS, Vercel domains, Cloudflare — agent gives exact step-by-step)

---

## AFTER PHASE 6 — PRODUCTION READY

When all phases pass:
1. Agent reports: "NFStay is production-ready. All 6 phases verified."
2. Tajul tells Hugo: "NFStay build complete. Ready for production merge."
3. Hugo reviews and says "ship to production"
4. Agent merges to main
5. Verify hub.nfstay.com is unaffected and nfstay.app works

**Hugo's only involvement: final "ship to production" approval.**
**Everything else is agent + Tajul from start to finish.**

---

## RULES FOR THE AGENT

1. **Always check this file first** to know where we are in the plan
2. **After completing each step**, update the Current Status section and `FEATURES.md`
3. **Always tell Tajul what the next step is** — don't wait for him to ask
4. **If a step needs credentials or dashboard access**, ask Tajul — he has everything. Only escalate to Hugo if marketplace10 is at risk.
5. **Each step gets its own commit** — small, reviewable, reversible
6. **Never batch multiple steps** into one massive PR
7. **If something goes wrong**, fix it before moving to the next step

---

*End of NFStay Execution Plan.*
