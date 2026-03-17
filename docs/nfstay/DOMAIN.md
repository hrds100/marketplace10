# NFStay — Domain Model

> Single source of truth for NFStay-specific terms, actors, and concepts.
> For marketplace10 terms (Tenant, Landlord, Deal, Thread, etc.) see `docs/DOMAIN.md`.

---

## Actors

| Actor | Definition | Auth |
|-------|-----------|------|
| **Operator** | Property owner or manager who lists vacation rentals on NFStay. Can be an individual or a company. Has a dashboard, manages properties, reservations, and settings. | Supabase Auth → `nfs_operators` row |
| **Traveler** | Guest who searches, books, and pays for vacation rentals. | Supabase Auth → uses `nfs_reservations` directly |
| **Operator User** | Team member invited by an Operator. Has a role (admin, editor, affiliate). | Supabase Auth → `nfs_operator_users` row |
| **Admin** | Hugo or `admin@hub.nfstay.com`. Full access to all NFStay data. | Same as marketplace10 admin |

### Operator vs Tenant

In marketplace10, the primary user is called **Tenant** (or **Operator**) — they are rent-to-rent property managers.
In NFStay, the primary user is called **Operator** — they are vacation-rental property owners/managers.

These are **different user types** who share the same `profiles` table but have different module-specific tables (`crm_deals` for marketplace10, `nfs_operators` for NFStay).

---

## Core Concepts

| Concept | Definition | Table |
|---------|-----------|-------|
| **Property** | A vacation rental listing. Has location, photos, amenities, pricing, availability. Can be draft or listed. | `nfs_properties` |
| **Reservation** | A booking for a property. Has dates, guest info, payment status, pricing breakdown. | `nfs_reservations` |
| **Promo Code** | A discount code created by an Operator. Can be fixed amount or percentage. | `nfs_promo_codes` |
| **Stripe Account** | An Operator's Stripe Connect account for receiving payouts. | `nfs_stripe_accounts` |
| **Hospitable Connection** | An Operator's link to Hospitable for syncing Airbnb/VRBO listings. | `nfs_hospitable_connections` |
| **White-Label** | An Operator's branded storefront on a subdomain or custom domain. | Configured in `nfs_operators` columns |
| **Booking Source** | Where a reservation came from: `main_platform`, `white_label`, or `operator_direct`. | `nfs_reservations.booking_source` |

---

## Property Lifecycle

```
Draft → Listed → (Booked) → Unlisted → Archived
```

- **Draft:** Incomplete property. Not visible to travelers.
- **Listed:** Complete and visible. Can receive bookings.
- **Unlisted:** Hidden from search but data preserved. Existing reservations unaffected.
- **Archived:** Soft-deleted. Not visible anywhere.

---

## Reservation Lifecycle

```
Pending → Confirmed → Completed
                   → Cancelled
         → Denied
```

- **Pending:** Created but not yet paid or confirmed.
- **Confirmed:** Payment received (Stripe) or manually confirmed by Operator.
- **Completed:** Stay finished.
- **Cancelled:** Cancelled by Operator or Traveler.
- **Denied:** Rejected by Operator.

---

## Payment Model

NFStay uses **Stripe Connect** (platform model):

- **Traveler pays** via Stripe Checkout → money goes to NFStay platform Stripe account
- **Platform fee** (default 3%) is retained by NFStay
- **Operator receives** the remainder via Stripe Connect transfer
- **Stripe fee** (2.9% + 30c) is deducted from the total

```
Traveler pays $100
  → Stripe fee: $3.20
  → Platform fee: $3.00
  → Operator receives: $93.80
```

---

## Onboarding Steps

An Operator goes through 8 steps before their account is active:

1. `account_setup` — name, email
2. `persona` — owner vs property manager
3. `usage_intent` — direct booking, vacation rental, widget, undecided
4. `business` — brand name, legal name, subdomain
5. `landing_page` — hero content, about us, FAQs
6. `website_customization` — colors, logo, favicon
7. `contact_info` — email, phone, WhatsApp, Telegram
8. `payment_methods` — Stripe Connect onboarding

After completing all steps, `onboarding_step` is set to `completed`.

---

## Hospitable Channels

When an Operator connects Hospitable, listings are synced from these platforms:

- `airbnb`
- `vrbo`
- `booking` (Booking.com)
- `expedia`
- `other`

NFStay has **no direct Airbnb API**. All Airbnb data flows through Hospitable.

---

## Shared with marketplace10

- **Actors overlap:** Both modules have "Operator" as a user type. They share `profiles` but have separate module tables.
- **Admin is the same:** `admin@hub.nfstay.com` and `hugo@nfstay.com` are admin for both modules.
- **Auth is shared:** Same Supabase Auth, same `profiles` table.

For marketplace10 domain terms, see `docs/DOMAIN.md`.

---

*End of NFStay Domain Model.*
