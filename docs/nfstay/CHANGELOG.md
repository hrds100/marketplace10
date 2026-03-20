# NFStay — Changelog

> Track every shipped change. Update in the same commit as the change.

---

## 2026-03-20

### Build Strategy: Lovable AI for UI

**Decision:** NFStay UI will be built by Lovable AI, not manually.

**What was created:**
- `docs/LOVABLE_PROMPT.md` — 2,361-line complete Lovable build prompt covering all 30+ routes, 3 portals, 15+ modals, Google Maps deep spec, admin pages, white-label portal, email flows, nice-to-have features
- `docs/NFSTAY_FRONTEND_SPEC.md` — legacy VPS frontend spec (all routes, components, auth flow)
- `docs/NFSTAY_DATABASE_SPEC.md` — complete SQL DDL for all 9 `nfs_*` tables with indexes and RLS

**LOVABLE_PROMPT.md sections:**
- Design system (Inter font, green `hsl(145 63% 42%)`, exact CSS variables)
- App bootstrap: white-label domain detection, operator guard logic, OAuth callback page
- All layouts (NfsMainLayout, NfsOperatorLayout, NfsWhiteLabelLayout + mobile bottom tab bar)
- Traveler portal (landing, search with Google Maps price markers, property view, checkout, payment)
- Operator portal (dashboard, 8-step onboarding, 10-step property wizard, reservations, settings 11 tabs, analytics)
- Admin portal (3 pages: reservations, properties, operators)
- White-label portal (5 pages: landing, search, property, payment success/cancel)
- 15 modals (refund, send email, amenities, Stripe/Hospitable disconnect, invites, promo codes, etc.)
- Email flows: 8 guest emails + 14 operator emails via Resend nfs-email-send edge function
- Nice-to-have features: 12 extras (sharing, recently viewed, comparison, currency selector, etc.)
- 20 hooks reference table with file names and signatures
- Supabase `as any` type cast workaround for nfs_* tables

**Auth decision:** Email + password for operators, email magic link for travelers. No WhatsApp OTP for now (ADR-012).

**Migration strategy:** Lovable builds the UI → copy 20 hooks from src/hooks/nfstay/ → run DB migrations → deploy Edge Functions → wire n8n.

**Sanity check audit result:** 96% alignment after patching 5 critical gaps (white-label detection, operator guard, OAuth callback, hooks reference, types workaround).

---

## 2026-03-18

### nfstay.app Traveler Routing

- Fixed: `nfstay.app` now shows NFStay traveler search page instead of marketplace10 landing
- `NfsWhiteLabelRouter` handles `type: 'main'` → renders traveler routes
- Added `isMainSite` to `WhiteLabelContext` in `use-nfs-white-label.ts`
- Routes: `/` → search, `/search` → search, `/property/:id` → detail, `/payment/*` → payment pages
- No middleware changes — pure client-side hostname detection
- hub.nfstay.com behavior: UNCHANGED

### DNS + Credentials Setup

**DNS (Cloudflare — nfstay.app zone):**
- Updated `nfstay.app` A record from old VPS IP (`31.97.118.211`) → Vercel (`76.76.21.21`)
- `*.nfstay.app` A record already pointed to Vercel — no change needed
- `connect.nfstay.app` CNAME (Cloudflare for SaaS fallback) — kept as-is
- `_dmarc.nfstay.app` TXT — kept as-is

**Credentials provided by Tajul:**
- Cloudflare API Token (`NFS_CF_API_TOKEN`) — awaiting Supabase secret set
- Cloudflare Zone ID (`NFS_CF_ZONE_ID`) — awaiting Supabase secret set
- Google Maps API Key (`VITE_GOOGLE_MAPS_API_KEY`) — awaiting Vercel env var set

**Documentation fix:**
- Corrected ENVIRONMENT.md: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` → `VITE_GOOGLE_MAPS_API_KEY` (matches actual Vite code)
- Corrected ENVIRONMENT.md: `NEXT_PUBLIC_SUPABASE_*` → `VITE_SUPABASE_*` (matches actual Vite code)

**Status:** DNS live. Supabase secrets and Vercel env var require manual setup (instructions below in this session).

### Phase 6 — White-Label + Domain + Analytics (Steps 6.1–6.8)

**Architecture Decision:**
- White-label routing is **client-side** (hostname detection in React), NOT middleware-based
- This eliminates all marketplace10 risk — no middleware.ts changes needed
- `detectWhiteLabelMode()` checks `window.location.hostname` and routes accordingly

**Database:**
- Created migration `20260318160000_nfs_phase6_analytics.sql` (awaiting execution)
- New table: `nfs_analytics` (page views, property views, booking events)
- RLS: `nfs_analytics_operator_read` (operators see own data only)

**White-Label System:**
- `lib/nfstay/white-label.ts`: Hostname detection (hub, main, subdomain, custom, dev)
- `NfsWhiteLabelProvider`: Context provider resolves operator for white-label domains
- `NfsWhiteLabelRouter`: Conditionally renders white-label vs normal routes
- `NfsWhiteLabelLayout`: Branded header/footer with operator logo, colors, contact, social

**White-Label Pages:**
- `NfsWlLanding`: Operator landing page (hero, about, FAQs, CTA)
- `NfsWlSearch`: Operator-scoped property search (filters by operator_id)
- `NfsWlProperty`: Branded property detail with booking widget (tracks `white_label` booking source)
- `NfsWlPaymentSuccess` / `NfsWlPaymentCancel`: Post-checkout pages

**Edge Function (code complete, awaiting deployment):**
- `nfs-domain-verify`: DNS verification (CNAME/A record check) + Cloudflare SaaS SSL provisioning

**Settings:**
- `SettingsDomain`: New Domain tab (subdomain management + custom domain verification)
- `NfsOperatorSettings`: Now 10 tabs (added Domain between Hospitable and Analytics)

**Analytics:**
- `useNfsAnalyticsTrack()`: Fire-and-forget event tracking hook
- `useNfsAnalyticsSummary()`: Query hook with aggregation (views, conversions, top properties)
- `NfsAnalytics`: Operator analytics dashboard (stat cards, daily chart, top properties, traffic sources)
- Analytics route `/nfstay/analytics` added to sidebar nav

**Booking Widget Update:**
- `NfsBookingWidget` now accepts `bookingSource` and `operatorDomain` props
- White-label bookings tracked as `booking_source: 'white_label'` with domain

**n8n Workflow (JSON export, awaiting import + activation):**
- `nfs-cleanup-expired`: Daily cron — deletes expired auth tokens, guest sessions, expires stale pending reservations

**Status:** Code complete (all 6 phases). Awaiting: DB migration, Edge Function deployments, n8n imports, DNS config. TypeScript: zero errors.

### Phase 5 — Hospitable + iCal Integration (Steps 5.1–5.6)

**Database:**
- Created migration `20260318150000_nfs_phase5_hospitable.sql` (awaiting Hugo's SQL review)
- New table: `nfs_hospitable_connections` (OAuth, sync state, health monitoring — 26 columns)
- RLS: `nfs_hospitable_connections_operator_access`
- Indexes: operator (unique), hospitable_customer_id, status+sync_status

**Edge Functions (code complete, awaiting deployment):**
- `nfs-hospitable-oauth`: OAuth flow (authorize, callback, disconnect, resync) with CSRF state
- `nfs-ical-feed`: Public ICS calendar feed (RFC 5545 format, confirmed reservations + blocked dates)
- `nfs-stripe-webhook`: Fixed dual-secret verification (platform + Connect webhooks)

**n8n Workflows (JSON exports, awaiting import + activation):**
- `nfs-hospitable-init-sync`: Full initial sync (listings + reservations from Hospitable → nfs_properties/nfs_reservations)
- `nfs-hospitable-listing-sync`: Real-time listing webhook handler with idempotency
- `nfs-hospitable-reservation-sync`: Real-time reservation webhook handler with idempotency
- `nfs-hospitable-manual-sync`: On-demand full resync triggered from settings UI
- `nfs-hospitable-retry`: Cron (30 min) auto-retry for failed connections

**Frontend:**
- `SettingsHospitable.tsx`: Hospitable connection settings tab (connect/disconnect/resync, status display, health monitoring)
- `PropertyCalendars.tsx`: iCal management on property detail (outbound URL with copy, inbound feed add/remove)
- `NfsOperatorSettings.tsx`: Added Hospitable tab (now 8 tabs)
- `NfsPropertyDetail.tsx`: Added Calendars tab (now 6 tabs)

**Hooks & Types:**
- `use-nfs-hospitable.ts`: `useNfsHospitableConnection`, `useNfsHospitableConnect`
- `NfsHospitableConnection`, `NfsWebhookEvent` types added to `types.ts`
- Hospitable fields added to `NfsProperty` and `NfsReservation` types

**Environment (Step 5.7 — manual setup required):**
- Supabase secrets needed: `NFS_HOSPITABLE_PARTNER_ID`, `NFS_HOSPITABLE_PARTNER_SECRET`, `NFS_HOSPITABLE_WEBHOOK_SECRET`
- n8n env var needed: `NFS_HOSPITABLE_BEARER_TOKEN`
- See `ENVIRONMENT.md` for full setup instructions

**Status:** Code complete (Steps 5.1–5.6). Awaiting: DB migration execution, Edge Function deployments, n8n workflow imports, secrets setup. TypeScript: zero errors.

### Edge Functions deployed (4 NFStay functions)
- Deployed `nfs-email-send` v1 — transactional emails via Resend (booking confirmation, cancellation, operator notification)
- Deployed `nfs-stripe-checkout` v1 — creates Stripe Checkout sessions with Connect destination charges
- Deployed `nfs-stripe-connect-oauth` v1 — operator Stripe Connect OAuth (authorize, callback, disconnect)
- Deployed `nfs-stripe-webhook` v1 — processes Stripe events (checkout.session.completed, payment_intent, charge.refunded, account.updated, transfer.created) with idempotency
- All 4 functions: ACTIVE, JWT verification disabled (public endpoints)
- Marketplace10 functions: untouched (same versions + timestamps)
- Note: `nfs-stripe-webhook` will return 500 until `NFS_STRIPE_WEBHOOK_SECRET` is set (requires Stripe Dashboard webhook creation first)

### Phase 4 — DB migration executed
- Ran `20260317150000_nfs_phase4_stripe.sql` via Supabase Management API
- Tables confirmed live: `nfs_stripe_accounts`, `nfs_webhook_events`
- RLS policies verified: `nfs_stripe_accounts_operator_access`, `nfs_webhook_events_service_only`
- Indexes verified: operator (unique), connect_account_id, event lookup, source+type
- Stripe secrets confirmed SET: `NFS_STRIPE_SECRET_KEY`, `NFS_STRIPE_CLIENT_ID`, `NFS_RESEND_API_KEY`
- Phase 3 DB confirmed already live (executed in previous session)

---

## 2026-03-17

### Phase 4 — Stripe Payments (Full Integration)

**Database:**
- Created migration `20260317150000_nfs_phase4_stripe.sql`
- New tables: `nfs_stripe_accounts` (Connect data, earnings, capabilities), `nfs_webhook_events` (idempotency)
- RLS: operator access for stripe_accounts, service-only for webhook_events

**Edge Functions:**
- `nfs-stripe-checkout`: Creates Stripe Checkout Session with Connect destination charge + platform fee
- `nfs-stripe-connect-oauth`: Full OAuth flow (authorize → callback → disconnect) with CSRF state protection
- `nfs-stripe-webhook`: Handles checkout.session.completed, payment_intent.succeeded/failed, charge.refunded, account.updated, transfer.created with idempotency

**Frontend:**
- `SettingsStripe.tsx`: Real Connect OAuth button, connection status, capabilities display, earnings summary, disconnect
- `NfsBookingWidget.tsx`: Guest email/name fields, creates reservation + redirects to Stripe Checkout
- `NfsPaymentSuccess.tsx` / `NfsPaymentCancel.tsx`: Post-checkout result pages
- `NfsReservationDetail.tsx`: Rich payment status badges, Stripe ID display, refund info

**Hooks & Types:**
- `use-nfs-stripe.ts`: `useNfsStripeAccount`, `useNfsStripeConnect`, `useNfsStripeCheckout`
- `NfsStripeAccount`, `NfsWebhookEvent` types added to `types.ts`
- Payment routes added to `constants.ts` and `App.tsx`

**Status:** Code complete, awaiting deployment. TypeScript: zero errors.

### Phase 3 — Step 3.8: Verification + Promo Codes in Settings
- Wired `NfsPromoCodeManager` into operator settings as "Promo Codes" tab (7 tabs total)
- Phase 3 verification checklist passed: all 7 items confirmed
- EXECUTION_PLAN.md: Phase 3 status updated to COMPLETE
- Email Edge Function code complete, awaiting deployment
- TypeScript: zero errors

### Phase 3 — Step 3.7: Email Edge Function (nfs-email-send)
- Created `supabase/functions/nfs-email-send/index.ts`
- Uses `NFS_RESEND_API_KEY` (separate from marketplace10's `RESEND_API_KEY`)
- 3 email types: `booking_confirmation`, `booking_cancelled`, `operator_new_booking`
- Clean HTML email templates with responsive design
- CORS headers for Supabase client calls
- Status: code complete, awaiting deployment (`supabase functions deploy nfs-email-send`)

### Phase 3 — Steps 3.2–3.6: Reservations frontend + pricing + promo codes
- Pricing utility: `src/lib/nfstay/pricing.ts` — calculates base rate × nights + fees − discounts
- Operator create reservation page with guest info, dates, pricing, status
- Reservation list page with status filters, text search, list/calendar view toggle
- Calendar view with monthly grid and color-coded reservation bars
- Reservation detail page with guest info, dates, payment, status actions (confirm, cancel, complete, no-show)
- Traveler booking widget on property detail page: date picker, guest count, availability check, pricing breakdown
- Promo code validation input for travelers (checks code validity, dates, usage limits)
- Promo code CRUD manager for operators (create, activate/deactivate, delete)
- Availability check hook using `nfs_check_availability` RPC with fallback query
- 6 new hooks: use-nfs-reservations, use-nfs-reservation, use-nfs-reservation-mutation, use-nfs-availability, use-nfs-pricing, use-nfs-promo-codes
- 5 new components: NfsReservationCard, NfsCalendarView, NfsBookingWidget, NfsPromoCodeInput, NfsPromoCodeManager
- 2 new pages: NfsCreateReservation, NfsReservationDetail
- 1 replaced page: NfsReservations (was placeholder, now full list + calendar)
- 1 updated page: NfsPropertyView (replaced "Phase 3" placeholder with real booking widget)
- Routes wired: `/nfstay/reservations/:id`, `/nfstay/create-reservation`
- TypeScript: zero errors

### Phase 3 — Step 3.1: Reservations DB migration + types
- Created migration `20260317140000_nfs_phase3_reservations.sql` (awaiting execution)
- Tables: `nfs_reservations` (booking records, guest info, payment, Hospitable sync)
- Tables: `nfs_promo_codes` (operator discount codes with validation)
- Tables: `nfs_guest_sessions` (anonymous guest tracking, service-role only)
- RLS policies: operator access, traveler read-own, public promo validation, service-only sessions
- RPC: `nfs_check_availability` (date overlap check for double-booking prevention)
- Indexes: property+status, dates, guest email, operator, hospitable ID, promo operator, session token
- TypeScript types added: `NfsReservation`, `NfsPromoCode`, `NfsGuestSession` + status/source types
- Constants added: reservation statuses, payment statuses, booking sources, promo code statuses + labels
- Routes added to constants: `RESERVATION_DETAIL`, `CREATE_RESERVATION`

### Phase 2 — DB migration executed
- `nfs_properties` table confirmed live in Supabase (60 columns)
- RLS policies verified: `nfs_properties_operator_access` (ALL), `nfs_properties_public_read` (SELECT)
- RPC function verified: `nfs_bulk_update_listing_status`
- Indexes verified: operator, listing_status, location, full-text search
- Phase 2 status updated to COMPLETE

### Phase 2 — Properties + Maps
- Property creation wizard (10 steps): basics, location, guests/rooms, photos, amenities, description, house rules, availability, pricing, review & publish
- Property list page with status filters, text search, bulk status updates
- Property detail/edit page with 5 tabs (overview, details, photos, availability, pricing)
- Photo upload to Supabase Storage (`nfs-images` bucket) with gallery, reorder, caption, delete
- Traveler search page with filters, grid/map view toggle
- Google Maps integration: search map with markers/clustering, property map, Places autocomplete
- Traveler property detail page with photo gallery, amenities, house rules, location map, booking placeholder
- 7 new hooks: use-nfs-properties, use-nfs-property, use-nfs-property-mutation, use-nfs-property-wizard, use-nfs-property-search, use-nfs-image-upload, use-nfs-google-maps
- NfsProperty + NfsPropertyImage TypeScript types added
- Property wizard constants, step labels, amenity categories added
- Migration file created: `20260317130000_nfs_phase2_properties.sql` (awaiting execution)
- Bulk status update RPC: `nfs_bulk_update_listing_status`
- 5 new pages, 10 wizard steps, 3 map components, 3 shared property components
- Routes wired in App.tsx (additive only — operator + traveler routes)
- Packages installed: `@googlemaps/js-api-loader`, `@googlemaps/markerclusterer`
- TypeScript: zero errors

### Phase 1 — Step 1.6 verification complete
- **Bug fix:** Signup now shows user-visible error if `nfs_operators` INSERT fails (was silently swallowed)
- **Bug fix:** Settings success toast auto-clears after 3 seconds (was persistent)
- **Placeholder pages:** Added `/nfstay/properties` and `/nfstay/reservations` (Phase 2/3 placeholders)
- **Routes wired:** Properties and Reservations routes added to App.tsx (additive only)
- **Database tables live:** `nfs_operators`, `nfs_operator_users`, `nfs_auth_tokens` created in Supabase
- **`nfs-images` bucket live:** Created in Supabase Storage
- **EXECUTION_PLAN.md:** Phase 1 status updated to COMPLETE
- **TypeScript:** zero errors

### Infrastructure — Supabase storage bucket created
- Created `nfs-images` storage bucket in Supabase Dashboard
  - Public read access (anon SELECT)
  - Authenticated upload (authenticated INSERT)
  - Authenticated delete (authenticated DELETE)
- Bucket is NFStay-owned per BOUNDARIES.md §4

### Phase 1 — Operator settings page (6 tabs)
- Created `src/pages/nfstay/NfsOperatorSettings.tsx` — tabbed settings page
- Created 6 settings tab components in `src/components/nfstay/settings/`:
  - SettingsProfile (name, persona, brand, legal name, subdomain)
  - SettingsContact (email, phone, WhatsApp, Telegram)
  - SettingsBranding (accent color, logo, favicon, hero headline/subheadline, about bio)
  - SettingsSocial (Google Business, Airbnb, Instagram, Facebook, X, TikTok, YouTube)
  - SettingsStripe (placeholder — Phase 4)
  - SettingsAnalytics (Google Analytics ID, Meta Pixel ID, SEO title/description)
- Created `src/hooks/nfstay/use-nfs-operator-update.ts` — reusable save hook with success/error state
- Expanded `NfsOperator` type to include all 48 DATABASE.md fields
- Route `/nfstay/settings` wired in App.tsx (additive only)
- TypeScript compiles with zero errors

### Phase 1 — 8-step onboarding wizard
- Created `src/pages/nfstay/NfsOnboarding.tsx` — wizard orchestrator with progress bar
- Created 8 step components in `src/components/nfstay/onboarding/`:
  - StepAccountSetup (first/last name)
  - StepPersona (owner vs property manager)
  - StepUsageIntent (direct booking, rental mgmt, widget, undecided)
  - StepBusiness (brand name, legal name, subdomain)
  - StepLandingPage (hero headline, subheadline, about bio)
  - StepWebsiteCustomization (accent color picker, logo URL)
  - StepContactInfo (email, phone, WhatsApp)
  - StepPaymentMethods (Stripe placeholder — Phase 4)
- Created `src/hooks/nfstay/use-nfs-onboarding.ts` — step state, save, skip, back, navigate
- Each step persists fields to `nfs_operators` via Supabase UPDATE
- Steps can be skipped (except account_setup), tracked in `onboarding_skipped_steps`
- Wizard resumes at the current `onboarding_step` on return visits
- Dashboard auto-redirects to onboarding when `onboarding_step !== 'completed'`
- Route `/nfstay/onboarding` wired in App.tsx (additive only)
- TypeScript compiles with zero errors

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
