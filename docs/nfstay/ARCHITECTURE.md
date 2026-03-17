# NFStay — Architecture

> How NFStay fits inside the marketplace10 ecosystem. Module boundaries, data flow, and deployment model.

---

## 1. SYSTEM TOPOLOGY

```
┌─────────────────────────────────────────────────────────────┐
│                        VERCEL                               │
│                                                             │
│  hub.nfstay.com              nfstay.app (Phase 6)          │
│  ┌──────────────────┐   ┌──────────────────────┐           │
│  │ marketplace10     │   │ NFStay traveler      │           │
│  │ (existing)        │   │ (public search/book) │           │
│  │                   │   │                      │           │
│  │ /dashboard/*      │   │ nfstay.app           │           │
│  │ /admin/*          │   │ *.nfstay.app (WL)    │           │
│  │ /inbox/*          │   │ custom domains (WL)  │           │
│  │ /university/*     │   │                      │           │
│  │                   │   │                      │           │
│  │ /nfstay/*  ←──────┼───┤ NFStay operator      │           │
│  │ (operator dash)   │   │ dashboard            │           │
│  └────────┬──────────┘   └──────────┬───────────┘           │
│           │                         │                       │
│           └────────┬────────────────┘                       │
│                    │                                        │
│           Supabase Client SDK                              │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                     SUPABASE                                │
│                                                             │
│  Auth (shared)    │  nfs_* tables    │  Storage             │
│  profiles         │  nfs_operators   │  nfs-images bucket   │
│  (shared, R/O)    │  nfs_properties  │  nfs-branding bucket │
│                   │  nfs_reservations│                      │
│                   │  nfs_*           │                      │
│                                                             │
│  Edge Functions:                                           │
│  nfs-stripe-webhook      nfs-stripe-connect-webhook        │
│  nfs-stripe-checkout     nfs-stripe-connect-oauth          │
│  nfs-ical-feed           nfs-email-send                    │
│  nfs-hospitable-oauth    nfs-domain-verify                 │
│  nfs-pricing-calculate                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                      n8n                                    │
│                                                             │
│  NFStay workflows (nfs-* prefix):                          │
│  nfs-hospitable-init-sync       nfs-hospitable-retry       │
│  nfs-hospitable-listing-sync    nfs-ical-sync              │
│  nfs-hospitable-reservation-sync  nfs-booking-notification │
│  nfs-hospitable-manual-sync     nfs-cleanup-expired        │
│  nfs-payout-notification                                   │
│                                                             │
│  marketplace10 workflows (existing, unchanged):            │
│  ai-university-chat, airbnb-pricing, send-otp, etc.        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. WHAT RUNS WHERE

| System | What it handles for NFStay | Why |
|--------|---------------------------|-----|
| **Supabase (DB + RLS)** | All CRUD operations, auth, data queries | Direct client access with RLS, no API layer needed |
| **Supabase Edge Functions** | Stripe webhooks, Stripe checkout, Hospitable OAuth, iCal feed, email, domain verify, pricing calc | Need server-side secrets, external API calls, webhook signature verification |
| **n8n** | Hospitable sync (5 workflows), iCal inbound sync, booking notifications, payout notifications, cleanup cron | Long-running, multi-step, retry logic, cron scheduling |
| **Vercel** | Frontend (Next.js), middleware routing, static assets | Standard web hosting |
| **VPS** | Nothing | Eliminated in rebuild |

### Decision rule: Edge Function vs n8n

- **Edge Function** when: single request/response, needs Supabase secrets, latency matters (webhooks, checkout)
- **n8n** when: multi-step workflow, needs retry/error handling, scheduled/cron, orchestrates multiple API calls

---

## 3. FRONTEND STRUCTURE

```
app/
├── (hub)/                         # existing marketplace10 routes
│   ├── dashboard/
│   ├── admin/
│   ├── inbox/
│   └── university/
│
├── (nfstay)/                      # NFStay module (isolated)
│   ├── layout.tsx                 # NFStay shared layout
│   ├── nfstay/                    # operator dashboard (hub.nfstay.com/nfstay/*)
│   │   ├── page.tsx               # dashboard home
│   │   ├── properties/
│   │   │   ├── page.tsx           # property list
│   │   │   ├── new/page.tsx       # create property wizard
│   │   │   └── [id]/page.tsx      # property detail/edit
│   │   ├── reservations/
│   │   │   ├── page.tsx           # reservation list + calendar
│   │   │   └── [id]/page.tsx      # reservation detail
│   │   ├── create-reservation/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx           # tabs: profile, stripe, hospitable, branding, promo, analytics
│   │   ├── onboarding/
│   │   │   └── page.tsx           # 8-step wizard
│   │   └── layout.tsx             # operator sidebar + nav
│   │
│   ├── traveler/                  # traveler-facing pages
│   │   ├── page.tsx               # landing / search
│   │   ├── search/page.tsx        # search with map
│   │   ├── property/[id]/page.tsx # property detail
│   │   ├── reservations/page.tsx  # my reservations
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   │
│   └── white-label/               # white-label storefront
│       ├── page.tsx               # operator landing page
│       ├── search/page.tsx
│       ├── property/[id]/page.tsx
│       ├── booking/[id]/page.tsx
│       ├── payment/
│       │   ├── page.tsx           # Stripe checkout
│       │   └── success/page.tsx
│       └── layout.tsx

components/
├── nfstay/                        # NFStay components (isolated)
│   ├── operator/
│   ├── traveler/
│   ├── white-label/
│   └── shared/
├── ui/                            # shared UI (existing — Button, Modal, etc.)
└── ...                            # existing marketplace10 components

hooks/
├── nfstay/                        # NFStay hooks (isolated)
│   ├── use-nfs-auth.ts
│   ├── use-nfs-properties.ts
│   ├── use-nfs-reservations.ts
│   └── ...
└── ...                            # existing marketplace10 hooks

lib/
├── nfstay/                        # NFStay services/utils (isolated)
│   ├── api/
│   ├── types/
│   └── utils/
└── ...                            # existing marketplace10 lib
```

---

## 4. DATA FLOW

### Operator creates a property

```
Frontend form → Supabase client INSERT nfs_properties → RLS checks operator owns row → saved
Photos → Supabase Storage upload to nfs-images bucket → URL stored in nfs_properties.images
```

### Traveler books a property

```
Frontend: check availability → Supabase query nfs_reservations for conflicts
Frontend: calculate pricing → Edge Function nfs-pricing-calculate
Frontend: checkout → Edge Function nfs-stripe-checkout → creates Stripe Checkout Session
Traveler → Stripe hosted checkout → pays
Stripe → webhook POST → Edge Function nfs-stripe-webhook
Edge Function → INSERT nfs_reservations (status: confirmed) → INSERT nfs_webhook_events
n8n → nfs-booking-notification workflow → sends confirmation email via Resend
```

### Hospitable sync

```
Operator clicks "Connect Hospitable" → Edge Function nfs-hospitable-oauth → redirect to Hospitable
Hospitable → callback → Edge Function stores auth code in nfs_hospitable_connections
Edge Function → triggers n8n webhook nfs-hospitable-init-sync
n8n → paginates Hospitable API → upserts nfs_properties + nfs_reservations
Ongoing: Hospitable → webhook → n8n nfs-hospitable-listing-sync / reservation-sync
```

### White-label routing

```
Browser → brand.nfstay.app → Vercel
Middleware → detects *.nfstay.app → extracts subdomain
Middleware → queries nfs_operators WHERE subdomain = extracted
Middleware → rewrites to /white-label/* with operator context
```

---

## 5. AUTH MODEL

NFStay uses **shared Supabase Auth**. No separate auth system.

```
auth.users (Supabase Auth)
    │
    └── profiles (shared table — marketplace10 owns)
            │
            └── nfs_operators (NFStay-specific — profile_id → profiles.id)
                    │
                    ├── nfs_operator_users (multi-user access)
                    ├── nfs_properties
                    ├── nfs_reservations
                    └── nfs_stripe_accounts
```

- **Operator:** Signs up via Supabase Auth → profile created → `nfs_operators` row created
- **Traveler:** Signs up via Supabase Auth → profile created → uses `nfs_reservations` directly
- **JWT:** Managed by Supabase. `auth.uid()` used in all RLS policies. No custom JWT.

---

## 6. WHAT IS INDEPENDENT vs SHARED

| Layer | Independent (NFStay only) | Shared (with marketplace10) |
|-------|--------------------------|----------------------------|
| Database tables | All `nfs_*` tables | `profiles`, `notifications` |
| Frontend routes | `app/(nfstay)/*` | `app/(auth)/*`, root layout |
| Components | `components/nfstay/*` | `components/ui/*` |
| Hooks | `hooks/nfstay/*` | Auth hooks, shared utilities |
| Edge Functions | `nfs-*` functions | None |
| n8n workflows | `nfs-*` workflows | None |
| Storage buckets | `nfs-images`, `nfs-branding` | None |
| Auth | — | Supabase Auth (fully shared) |
| Deployment | — | Vercel project (fully shared) |
| CI | — | GitHub Actions (fully shared) |

---

## 7. WORKERS AND BACKGROUND JOBS

NFStay has **no VPS workers**. All background processing uses n8n.

| Job | System | Trigger | Frequency |
|-----|--------|---------|-----------|
| Hospitable init sync | n8n | Webhook (on OAuth connect) | On demand |
| Hospitable listing sync | n8n | Webhook (from Hospitable) | On event |
| Hospitable reservation sync | n8n | Webhook (from Hospitable) | On event |
| Hospitable manual sync | n8n | Webhook (from UI button) | On demand |
| Hospitable retry | n8n | Cron | Every 30 min |
| iCal inbound sync | n8n | Cron | Every 4 hours |
| Booking notification | n8n | Supabase webhook | On insert |
| Payout notification | n8n | Stripe webhook relay | On event |
| Cleanup expired tokens | n8n | Cron | Daily |

---

## Shared with marketplace10

- **Supabase project** — same database, same auth, same RLS engine
- **Vercel project** — same build, same deployment pipeline
- **n8n instance** — same server, workflows coexist (prefixed)
- **Google Maps API key** — same key
- **CI pipeline** — same GitHub Actions workflow
- **UI design system** — same Tailwind config, same shadcn/ui components

See `docs/nfstay/SHARED_INFRASTRUCTURE.md` for full details.

---

*End of NFStay Architecture.*
