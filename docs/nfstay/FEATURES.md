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
| Booking confirmation email | Planned | n8n + Resend | `nfs-booking-notification` workflow — needs Resend key |
| Reservation export (CSV) | Planned | Frontend | Client-side generation |

## Phase 4 — Payments (Stripe)

| Feature | Status | System | Notes |
|---------|--------|--------|-------|
| Stripe Checkout (traveler) | Planned | Edge Function | `nfs-stripe-checkout` |
| Payment success/cancel pages | Planned | Frontend | Post-checkout redirect |
| Stripe Connect OAuth (operator) | Planned | Edge Function | `nfs-stripe-connect-oauth` |
| Operator earnings dashboard | Planned | Frontend + Edge Function | Query Stripe API |
| Operator payout info | Planned | Frontend + Edge Function | Stripe dashboard link |
| Stripe Connect disconnect | Planned | Edge Function | Clear `nfs_stripe_accounts` |
| Platform webhook handler | Planned | Edge Function | `nfs-stripe-webhook` |
| Connect webhook handler | Planned | Edge Function | `nfs-stripe-connect-webhook` |
| Webhook idempotency | Planned | Supabase | `nfs_webhook_events` table |

## Phase 5 — Integrations (Hospitable + iCal)

| Feature | Status | System | Notes |
|---------|--------|--------|-------|
| Hospitable OAuth connect | Planned | Edge Function | `nfs-hospitable-oauth` |
| Initial full sync | Planned | n8n | `nfs-hospitable-init-sync` |
| Listing sync (ongoing) | Planned | n8n | `nfs-hospitable-listing-sync` |
| Reservation sync (ongoing) | Planned | n8n | `nfs-hospitable-reservation-sync` |
| Manual resync | Planned | n8n | `nfs-hospitable-manual-sync` |
| Retry failed syncs | Planned | n8n (cron) | `nfs-hospitable-retry` |
| Hospitable disconnect | Planned | Edge Function | Update connection status |
| Hospitable connection UI | Planned | Frontend | Settings tab |
| iCal public feed | Planned | Edge Function | `nfs-ical-feed` |
| iCal inbound sync config | Planned | Frontend + Supabase | `inbound_calendars` JSONB |
| iCal inbound sync execution | Planned | n8n (cron) | `nfs-ical-sync` |
| iCal outbound URL display | Planned | Frontend | Generate URL for operators |

## Phase 6 — White-Label + Domain + Analytics

| Feature | Status | System | Notes |
|---------|--------|--------|-------|
| Subdomain routing (`*.nfstay.app`) | Planned | Vercel middleware | Rewrite to `/white-label/*` |
| Custom domain routing | Planned | Vercel middleware + API | Check `nfs_operators` for domain |
| White-label storefront (search) | Planned | Frontend | Operator-branded search page |
| White-label property detail | Planned | Frontend | Operator-branded |
| White-label booking flow | Planned | Frontend | Operator-branded checkout |
| Custom domain verification | Planned | Edge Function | `nfs-domain-verify` |
| Cloudflare SaaS provisioning | Planned | Edge Function | Cloudflare API |
| Analytics: page view tracking | Planned | Frontend + Supabase | `nfs_analytics` table |
| Analytics: booking event tracking | Planned | Edge Function | On payment webhook |
| Operator analytics dashboard | Planned | Frontend + Supabase RPC | Stats, trends, performance |
| `nfstay.app` domain routing | Planned | Vercel + DNS | Traveler-facing |
| Cleanup expired tokens/sessions | Planned | n8n (cron) | `nfs-cleanup-expired` |

---

## Shared with marketplace10

No features are shared. NFStay features are completely independent from marketplace10 features (marketplace, CRM, university, inbox). They share infrastructure (auth, Supabase, Vercel) but not functionality.

---

*End of NFStay Feature Inventory.*
