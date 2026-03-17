# NFStay — Changelog

> Track every shipped change. Update in the same commit as the change.

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
