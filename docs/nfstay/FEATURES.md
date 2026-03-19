# NFStay — Feature Inventory

> Complete list of every NFStay feature. Tracks build phase, status, and system ownership.
> Update this file in the same commit as any feature change.

---

## Feature Status Key

- **Planned** — Designed but not started
- **In Progress** — Currently being built
- **Done** — Shipped and working
- **Blocked** — Cannot proceed (reason noted)

---

## Phase 1 — Core Foundation

| Feature | Status | System | Notes |
|---------|--------|--------|-------|
| Operator signup (Supabase Auth) | Done | Supabase Auth | Shared auth, creates `nfs_operators` row |
| Operator login | Done | Supabase Auth | Shared auth |
| Magic link email verification | Planned | Edge Function + Resend | `nfs_auth_tokens` table |
| Onboarding wizard (8 steps) | Done | Frontend + Supabase | Persists to `nfs_operators` columns |
| Operator dashboard layout | Done | Frontend | Sidebar, nav, basic layout |
| Operator settings (profile, contact, branding basics) | Done | Frontend + Supabase | 6 tabs: profile, contact, branding, social, stripe (placeholder), analytics |
| Multi-user access (invite, roles) | Planned | Supabase | `nfs_operator_users` table |
| Account switcher | Planned | Frontend | Query `nfs_operator_users` |

## Phase 2 — Properties + Maps

| Feature | Status | System | Notes |
|---------|--------|--------|-------|
| Property creation wizard (10 steps) | Done | Frontend + Supabase | `nfs_properties` table |
| Photo upload | Done | Supabase Storage | `nfs-images` bucket |
| Property list (operator) | Done | Frontend + Supabase | Filter, sort, bulk actions |
| Property detail/edit (operator) | Done | Frontend + Supabase | Tabs: overview, details, photos, availability, pricing |
| Draft vs listed vs archived | Done | Supabase | `listing_status` column |
| Bulk edit / bulk status update | Done | Supabase RPC | `nfs_bulk_update_listing_status` function |
| Traveler search page | Done | Frontend + Supabase | Text search, filters, grid/map toggle |
| Google Maps search view | Done | Frontend | `@googlemaps/js-api-loader` |
| Property markers + clustering | Done | Frontend | `@googlemaps/markerclusterer` |
| Places autocomplete | Done | Frontend | `NfsPlacesAutocomplete` component |
| Traveler property detail page | Done | Frontend | Gallery, map, amenities, rules, booking widget placeholder |

## Phase 3 — Reservations + Pricing

| Feature | Status | System | Notes |
|---------|--------|--------|-------|
| Operator create reservation | Done | Frontend + Supabase | Manual reservation flow with guest info, dates, pricing |
| Reservation list + calendar view | Done | Frontend + Supabase | Filter by status, text search, list/calendar toggle |
| Reservation detail page | Done | Frontend + Supabase | Status, guest info, payment, status actions |
| Traveler availability check | Done | Supabase RPC | `nfs_check_availability` with fallback query |
| Pricing engine | Done | Frontend utility | `src/lib/nfstay/pricing.ts` — base rate × nights + fees − discounts |
| Promo code CRUD | Done | Frontend + Supabase | Create, activate/deactivate, delete |
| Promo code validation | Done | Supabase query | Check code, dates, usage limits |
| Booking confirmation email | Done | Edge Function + Resend | `nfs-email-send` — 3 templates, awaiting deployment |
| Reservation export (CSV) | Planned | Frontend | Client-side generation |

## Phase 4 — Payments (Stripe)

| Feature | Status | System | Notes |
|---------|--------|--------|-------|
| Stripe Checkout (traveler) | Done | Edge Function | `nfs-stripe-checkout` — creates Checkout Session with Connect destination charge |
| Payment success/cancel pages | Done | Frontend | `/nfstay/payment/success` and `/nfstay/payment/cancel` |
| Stripe Connect OAuth (operator) | Done | Edge Function | `nfs-stripe-connect-oauth` — authorize + callback + disconnect |
| Operator earnings dashboard | Planned | Frontend + Edge Function | Query Stripe API |
| Operator payout info | Done | Frontend | Stripe Dashboard link from settings |
| Stripe Connect disconnect | Done | Edge Function | Deauthorize + clear `nfs_stripe_accounts` |
| Platform webhook handler | Done | Edge Function | `nfs-stripe-webhook` — handles checkout.session.completed, payment_intent.*, charge.refunded, account.updated, transfer.created |
| Connect webhook handler | Done | Edge Function | Handled in `nfs-stripe-webhook` (account.updated events) |
| Webhook idempotency | Done | Supabase | `nfs_webhook_events` table — dedup by `external_event_id` |

## Phase 5 — Integrations (Hospitable + iCal)

| Feature | Status | System | Notes |
|---------|--------|--------|-------|
| Hospitable OAuth connect | Done | Edge Function | `nfs-hospitable-oauth` — authorize, callback, disconnect, resync |
| Initial full sync | Done | n8n | `nfs-hospitable-init-sync` — listings + reservations |
| Listing sync (ongoing) | Done | n8n | `nfs-hospitable-listing-sync` — webhook with idempotency |
| Reservation sync (ongoing) | Done | n8n | `nfs-hospitable-reservation-sync` — webhook with idempotency |
| Manual resync | Done | n8n | `nfs-hospitable-manual-sync` — on-demand from settings |
| Retry failed syncs | Done | n8n (cron) | `nfs-hospitable-retry` — every 30 min |
| Hospitable disconnect | Done | Edge Function | Deactivates connection |
| Hospitable connection UI | Done | Frontend | Settings tab with status, health, sync stats |
| iCal public feed | Done | Edge Function | `nfs-ical-feed` — RFC 5545 ICS format |
| iCal inbound sync config | Done | Frontend + Supabase | `PropertyCalendars` component — add/remove feeds |
| iCal inbound sync execution | Planned | n8n (cron) | `nfs-ical-sync` — not yet built |
| iCal outbound URL display | Done | Frontend | Copy-to-clipboard in Calendars tab |

## Phase 6 — White-Label + Domain + Analytics

| Feature | Status | System | Notes |
|---------|--------|--------|-------|
| Subdomain routing (`*.nfstay.app`) | Done | Client-side hostname router | `detectWhiteLabelMode()` in `lib/nfstay/white-label.ts` |
| Custom domain routing | Done | Client-side hostname router | Queries `nfs_operators.custom_domain` |
| White-label landing page | Done | Frontend | Operator hero, about, FAQs, CTA |
| White-label storefront (search) | Done | Frontend | Operator-branded, filters by operator_id |
| White-label property detail | Done | Frontend | Operator-branded with booking widget |
| White-label booking flow | Done | Frontend | Uses existing `NfsBookingWidget` with `white_label` booking source |
| Custom domain verification | Done | Edge Function | `nfs-domain-verify` — DNS check + Cloudflare SSL provisioning |
| Domain settings UI | Done | Frontend | Subdomain + custom domain management in settings |
| Analytics: tracking hook | Done | Frontend + Supabase | `useNfsAnalyticsTrack()` — page views, property views, booking events |
| Operator analytics dashboard | Done | Frontend | `/nfstay/analytics` — stats, daily chart, top properties, traffic sources |
| `nfstay.app` domain routing | Done | Client-side | Detected as `type: 'main'` — serves traveler routes |
| Cleanup expired tokens/sessions | Done | n8n (cron) | `nfs-cleanup-expired` — daily, 3 cleanup tasks |
| `nfs_analytics` DB migration | Done | Supabase | Migration file created, awaiting execution |

---

## Shared with marketplace10

No features are shared. NFStay features are completely independent from marketplace10 features (marketplace, CRM, university, inbox). They share infrastructure (auth, Supabase, Vercel) but not functionality.

---

*End of NFStay Feature Inventory.*
