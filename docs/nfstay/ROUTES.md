# NFStay — Routes

> Every frontend route in the NFStay module.

---

## 1. OPERATOR ROUTES (hub.nfstay.com/nfstay/*)

| Route | Page | Auth Required |
|-------|------|--------------|
| `/nfstay` | Operator dashboard home | Yes |
| `/nfstay/onboarding` | 8-step onboarding wizard | Yes |
| `/nfstay/properties` | Property list | Yes |
| `/nfstay/properties/new` | Create property wizard | Yes |
| `/nfstay/properties/[id]` | Property detail + edit | Yes |
| `/nfstay/reservations` | Reservation list + calendar | Yes |
| `/nfstay/reservations/[id]` | Reservation detail | Yes |
| `/nfstay/create-reservation` | Operator creates reservation | Yes |
| `/nfstay/settings` | Settings (tabs: profile, stripe, hospitable, branding, promo, analytics) | Yes |
| `/nfstay/oauth-callback` | Stripe Connect OAuth return | Yes |

## 2. TRAVELER ROUTES (nfstay.app/* — platform mode)

> nfstay.app now uses the same enhanced white-label UI as operator subdomains,
> but with NFStay platform branding and all-operator property listings.

| Route | Page | Auth Required |
|-------|------|--------------|
| `/` | Landing page (hero, featured properties, about, FAQ, CTA) | No |
| `/search` | Search with map + filters (all operators' properties) | No |
| `/property/[id]` | Property detail with gallery + sections + booking widget | No |
| `/booking/[id]` | Booking lookup by reservation ID | No |
| `/payment` | Pre-checkout summary | No |
| `/payment/success` | Post-payment confirmation | No |
| `/payment/cancel` | Payment cancelled | No |

## 3. WHITE-LABEL ROUTES (*.nfstay.app or custom domains)

| Route | Page | Auth Required |
|-------|------|--------------|
| `/` | Operator landing page (hero, about, FAQs) | No |
| `/search` | Search operator's properties | No |
| `/property/[id]` | Property detail | No |
| `/booking/[id]` | Booking flow | No |
| `/payment` | Stripe checkout | No |
| `/payment/success` | Payment confirmation | No |
| `/not-found` | Operator not found | No |
| `/error` | Error state | No |

## 4. AUTH ROUTES (shared)

| Route | Page | Auth Required |
|-------|------|--------------|
| `/verify-email` | Email verification callback | No |

## 5. API ROUTES (Supabase Edge Functions)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/functions/v1/nfs-stripe-checkout` | POST | Anon | Create Stripe Checkout session |
| `/functions/v1/nfs-stripe-webhook` | POST | Stripe sig | Platform webhook |
| `/functions/v1/nfs-stripe-connect-webhook` | POST | Stripe sig | Connect webhook |
| `/functions/v1/nfs-stripe-connect-oauth` | GET/POST | Auth | Connect OAuth flow |
| `/functions/v1/nfs-hospitable-oauth` | GET/POST | Auth | Hospitable OAuth flow |
| `/functions/v1/nfs-ical-feed` | GET | Public | ICS calendar feed |
| `/functions/v1/nfs-email-send` | POST | Service role | Send email via Resend |
| `/functions/v1/nfs-domain-verify` | POST | Auth | DNS verification |
| `/functions/v1/nfs-pricing-calculate` | POST | Anon | Calculate pricing |

## 6. MIDDLEWARE ROUTING PRIORITY

```
1. hub.nfstay.com → existing marketplace10 routes (no change)
2. hub.nfstay.com/nfstay/* → NFStay operator routes
3. hub.nfstay.com/admin/* → existing admin routes (no change)
4. nfstay.app → traveler routes
5. *.nfstay.app → white-label routes (subdomain lookup)
6. Unknown hostname → custom domain check → white-label routes
```

---

## Shared with marketplace10

- **`/verify-email`** route may be shared (both modules use email verification)
- **Middleware** is shared — one file handles both marketplace10 and NFStay routing
- **Auth routes** are shared — same Supabase Auth
- All NFStay operator routes are under `/nfstay/*` to avoid collision with marketplace10 routes (`/dashboard/*`, `/admin/*`, `/inbox/*`, `/university/*`)

---

*End of NFStay Routes.*
