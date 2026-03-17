# NFStay — White-Label System

> How operators run branded storefronts on subdomains or custom domains.

---

## 1. OVERVIEW

White-label lets operators present NFStay as their own brand:
- **Subdomain:** `luxstays.nfstay.app` — automatic, no DNS setup needed
- **Custom domain:** `bookings.example.com` — requires DNS verification

Travelers see the operator's branding (logo, colors, hero content, FAQs) and only that operator's properties.

---

## 2. SUBDOMAIN ROUTING

### How it works

```
Browser → brand.nfstay.app → Vercel
  ↓
middleware.ts detects *.nfstay.app host
  ↓
Extracts subdomain from hostname
  ↓
Queries nfs_operators WHERE subdomain = extracted
  ↓
If found → rewrites to /white-label/* with operator context
If not found → shows 404 / "not found" page
```

### Vercel configuration
- `*.nfstay.app` must be configured as a wildcard domain in Vercel
- Middleware runs on every request and checks the hostname
- No server-side rendering dependency — static rewrite + client-side data fetch

### Subdomain rules
- Stored in `nfs_operators.subdomain` (lowercase, unique)
- Set during onboarding (business step)
- Cannot conflict with reserved subdomains: `www`, `api`, `connect`, `cd`, `admin`, `app`
- Must be alphanumeric + hyphens, 3-63 characters

---

## 3. CUSTOM DOMAIN ROUTING

### How it works

```
Browser → bookings.example.com → Vercel (catch-all)
  ↓
middleware.ts: hostname is not *.nfstay.app and not hub.nfstay.com
  ↓
Queries nfs_operators WHERE custom_domain = hostname AND custom_domain_verified = true
  ↓
If found → rewrites to /white-label/* with operator context
If not found → shows error page
```

### Domain verification flow

1. Operator enters custom domain in settings
2. System displays DNS instructions:
   - Option A: A record → `31.97.118.211` (or Vercel IP after migration)
   - Option B: CNAME → `cname.vercel-dns.com`
3. Operator clicks "Verify"
4. Edge Function `nfs-domain-verify` checks DNS
5. If correct → `custom_domain_verified = true`
6. Edge Function calls Cloudflare API to provision SSL (SaaS)

### Cloudflare SaaS
- Used for custom domain SSL provisioning
- `CF_API_TOKEN` and `CF_ZONE_ID` stored as Edge Function secrets
- Creates a custom hostname in the Cloudflare zone
- SSL is issued automatically by Cloudflare

---

## 4. WHITE-LABEL PAGES

```
app/(nfstay)/white-label/
├── layout.tsx           # loads operator branding, applies theme
├── page.tsx             # operator landing page (hero, about, FAQs)
├── search/page.tsx      # search operator's properties only
├── property/[id]/page.tsx  # property detail (operator-branded)
├── booking/[id]/page.tsx   # booking flow
├── payment/
│   ├── page.tsx         # Stripe checkout
│   └── success/page.tsx # payment confirmation
├── not-found/page.tsx   # operator not found
└── error/page.tsx       # error state
```

### Branding data loaded from `nfs_operators`

| Field | Used for |
|-------|---------|
| `brand_name` | Page title, header |
| `accent_color` | Theme color (buttons, links, accents) |
| `logo_url` | Header logo |
| `favicon_url` | Browser tab icon |
| `hero_photo`, `hero_headline`, `hero_subheadline` | Landing page hero section |
| `about_bio`, `about_photo` | About us section |
| `faqs` | FAQ accordion on landing page |
| `contact_email`, `contact_phone`, `contact_whatsapp` | Contact info in footer |
| `social_*` | Social links in footer |

---

## 5. BOOKING SOURCE TRACKING

When a reservation is created on a white-label site:

```sql
INSERT INTO nfs_reservations (
  booking_source,    -- 'white_label'
  operator_domain,   -- 'luxstays.nfstay.app' or 'bookings.example.com'
  ...
)
```

This lets operators track which reservations came from their branded site vs the main platform.

---

## 6. MIDDLEWARE LOGIC (SIMPLIFIED)

```typescript
// middleware.ts — NFStay white-label routing
const hostname = request.headers.get('host');

// 1. hub.nfstay.com → normal hub routing
if (hostname === 'hub.nfstay.com') return next();

// 2. *.nfstay.app → white-label subdomain
if (hostname?.endsWith('.nfstay.app') && hostname !== 'nfstay.app') {
  const subdomain = hostname.split('.')[0];
  // rewrite to /white-label/* with subdomain context
}

// 3. nfstay.app → traveler-facing
if (hostname === 'nfstay.app') {
  // rewrite to traveler routes
}

// 4. Unknown hostname → custom domain check
// Query nfs_operators for matching custom_domain
// If found and verified → rewrite to /white-label/*
```

---

## 7. RESERVED SUBDOMAINS

These subdomains cannot be claimed by operators:

| Subdomain | Reason |
|-----------|--------|
| `www` | Standard redirect |
| `api` | Legacy API (if reused) |
| `connect` | Legacy Cloudflare target |
| `cd` | Legacy CNAME target |
| `admin` | Reserved |
| `app` | Reserved |
| `mail` | Email |
| `staging` | Reserved |
| `dev` | Reserved |

---

## Shared with marketplace10

**No.** marketplace10 does not have a white-label system. This is entirely NFStay-specific. The only shared element is the Vercel middleware file, which must handle both marketplace10 and NFStay routing without conflict.

---

*End of NFStay White-Label System.*
