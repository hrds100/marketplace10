# NFStay — Complete Lovable Build Prompt
# Paste EVERYTHING below this line into Lovable

---

## What You Are Building

**NFStay** — a vacation rental platform. Three portals, one codebase:

1. **Traveler portal** (`nfstay.app`) — guests search, view, and book properties
2. **Operator portal** (`hub.nfstay.com/nfstay/*`) — property owners manage listings, reservations, get paid
3. **White-label portal** (`brand.nfstay.app` or custom domain) — operator's branded storefront

---

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- Supabase (auth + database + storage)
- React Router v6
- `@googlemaps/js-api-loader` — maps + Places autocomplete
- `@stripe/react-stripe-js` — Stripe checkout
- `embla-carousel-react` — photo galleries, carousels
- `date-fns` — all date work
- `react-hook-form` + `zod` — all forms and validation
- `react-hot-toast` — toast notifications
- `lucide-react` — all icons
- `recharts` — analytics charts

---

## Design System

### Fonts
**Inter** — `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap')`
Apply to body: `font-family: 'Inter', system-ui, sans-serif`

### CSS Variables
```css
:root {
  --background: 210 20% 98%;
  --foreground: 222 84% 5%;
  --card: 0 0% 100%;
  --card-foreground: 222 84% 5%;
  --primary: 145 63% 42%;
  --primary-foreground: 0 0% 100%;
  --secondary: 210 20% 96%;
  --secondary-foreground: 222 47% 11%;
  --muted: 210 20% 96%;
  --muted-foreground: 215 16% 47%;
  --accent: 145 63% 42%;
  --accent-foreground: 160 76% 20%;
  --accent-light: 149 80% 96%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  --border: 214 32% 91%;
  --input: 214 32% 91%;
  --ring: 145 63% 42%;
  --radius: 0.625rem;
  --success: 160 60% 45%;
  --warning: 38 92% 50%;
  --danger: 0 84% 60%;
  --info: 217 91% 60%;
}
```

### Color Reference
| Token | Value | Use |
|-------|-------|-----|
| `primary` | Green `hsl(145 63% 42%)` | All CTAs, active states, links |
| `accent-light` | `hsl(149 80% 96%)` | Active nav bg, selected chip bg |
| `background` | Near-white blue-gray | Page bg |
| `card` | Pure white | Card bg |
| `muted-foreground` | Mid-gray | Secondary text, labels |
| `border` | Blue-gray | Dividers, input borders |

### Status Badges (pill, text-xs font-medium rounded-full px-2.5 py-0.5)
| Status | Background | Text |
|--------|-----------|------|
| pending / unlisted | `hsl(46 100% 97%)` | `hsl(28 73% 26%)` amber |
| confirmed / listed / paid | `hsl(149 80% 96%)` | `hsl(160 76% 20%)` green |
| cancelled / archived / failed | `hsl(0 86% 97%)` | `hsl(0 72% 51%)` red |
| completed | `hsl(222 84% 5%)` | white dark |
| no_show / expired / draft | `hsl(220 14% 96%)` | `hsl(220 9% 26%)` gray |

### Buttons
- **Primary** — `bg-primary text-white rounded-lg px-4 py-2 font-semibold hover:bg-primary/90 transition`
- **Secondary** — `bg-secondary border border-border text-foreground rounded-lg px-4 py-2 font-semibold hover:bg-muted`
- **Outline** — `border border-border bg-transparent hover:bg-secondary rounded-lg px-4 py-2`
- **Danger** — `bg-destructive text-white rounded-lg px-4 py-2 font-semibold hover:bg-destructive/90`
- **Ghost** — `bg-transparent hover:bg-secondary text-foreground rounded-lg px-3 py-2`
- **Icon button** — `p-2 rounded-lg hover:bg-secondary`

### Cards
`bg-card rounded-[var(--radius)] border border-border shadow-sm`
Hover: `transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-px`

### Inputs
`border border-input rounded-[10px] h-11 px-3.5 text-sm bg-card outline-none transition`
Focus: `border-primary ring-2 ring-primary/15`
Error: `border-destructive ring-2 ring-destructive/15` + red error text below

### Typography Scale
| Element | Class |
|---------|-------|
| Page title | `text-2xl font-bold tracking-tight text-foreground` |
| Section heading | `text-lg font-semibold text-foreground` |
| Card title | `text-base font-semibold text-foreground` |
| Body text | `text-sm text-foreground` |
| Secondary text | `text-sm text-muted-foreground` |
| Small label | `text-xs font-medium text-muted-foreground` |
| Uppercase label | `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` |
| Monospace (IDs) | `font-mono text-xs` |

### Loading States
Every list/table/page has a **skeleton** before data loads:
- Skeleton blocks: `bg-muted rounded animate-pulse`
- Text skeleton: `h-3 bg-muted rounded w-3/4 animate-pulse`
- Image skeleton: `aspect-square bg-muted rounded-xl animate-pulse`
- Card skeleton: card outline with skeleton title + 2 skeleton lines

### Empty States
Every empty list uses: centered container, icon in muted circle (w-16 h-16 rounded-full bg-muted flex items-center justify-center), heading, sub-text, optional CTA button.

### Toast Notifications
- Success: green icon, "Saved" / "Created" / "Updated"
- Error: red icon, descriptive error message
- Info: blue icon
- Position: top-right

---

## Authentication

Use **Supabase Auth**. Two flows:

### Operator Auth
- Sign up: `/signup` — email + password form. On success: create `nfs_operators` row → redirect to `/nfstay/onboarding`
- Sign in: `/signin` — email + password. On success → redirect to `/nfstay`
- Sign out: clears Supabase session

### Traveler Auth
- `/traveler/login` — email input only. "Send magic link" button. Supabase sends magic link email. Clicking link → `/auth/callback` → redirect to `/traveler/reservations`
- Traveler can also check out as a guest (no login required)

### Auth Callback
- `/auth/callback` — handles Supabase email confirmation and magic links. Reads hash params → exchanges token → redirects to appropriate page

### Email Verification
- `/verify-email` — shows "Check your inbox" message with resend button after signup

### Operator Guard
Wrap all `/nfstay/*` routes. Logic:
1. No Supabase session → redirect `/signin?redirect=/nfstay`
2. Session exists but no `nfs_operators` row for `user.id` → redirect `/nfstay/onboarding`
3. Both exist → render page

---

## Supabase Database Schema

Tables to read/write (all prefixed `nfs_`):

### `nfs_operators`
`id, profile_id, first_name, last_name, brand_name, legal_name, subdomain, custom_domain, custom_domain_verified, accent_color, logo_url, favicon_url, hero_photo, hero_headline, hero_subheadline, about_bio, about_photo, faqs (jsonb[]), contact_email, contact_phone, contact_whatsapp, contact_telegram, social_instagram, social_facebook, social_twitter, social_tiktok, social_youtube, google_business_url, airbnb_url, google_analytics_id, meta_pixel_id, meta_title, meta_description, onboarding_step, onboarding_completed_steps (text[]), persona_type, listings_count, landing_page_enabled`

### `nfs_properties`
`id, operator_id, listing_status ('listed'|'unlisted'|'archived'|'draft'), status ('draft'|'completed'), source ('nfstay'|'airbnb'), current_step, completed_steps, property_type, rental_type, accommodation_type, size_value, size_unit, address, city, state, country, postal_code, lat, lng, timezone, max_guests, allow_children, room_counts (jsonb), room_sections (jsonb), images (jsonb: [{url,caption,order,is_cover}]), amenities (jsonb: {wifi:bool,...}), public_title, internal_title, description, check_in_time, check_out_time, max_pets, rules, cancellation_policy, availability_window, advance_notice, minimum_stay, blocked_date_ranges (jsonb), inbound_calendars (jsonb), outbound_calendar_url, cleaning_fee (jsonb), extra_guest_fee (jsonb), custom_fees (jsonb), weekly_discount (jsonb), monthly_discount (jsonb), base_rate_currency, base_rate_amount, daily_rates (jsonb), hospitable_connected, hospitable_sync_status`

### `nfs_reservations`
`id, property_id, operator_id, created_by, guest_email, guest_first_name, guest_last_name, guest_phone, guest_address, guest_city, guest_country, check_in (date), check_out (date), check_in_time, check_out_time, adults, children, infants, pets, status ('pending'|'confirmed'|'cancelled'|'completed'|'no_show'|'expired'), payment_status ('pending'|'paid'|'partially_refunded'|'refunded'|'failed'), total_amount, payment_currency, booking_source, operator_domain, guest_message, promo_code, promo_discount_amount, stripe_payment_intent_id, stripe_charge_id, stripe_refund_id, refund_amount, refund_reason, guest_token`

### `nfs_promo_codes`
`id, operator_id, code, name, discount_type ('fixed'|'percentage'), value, currency, valid_from, valid_to, max_uses, current_uses, status ('active'|'expired'|'inactive'|'draft')`

### `nfs_stripe_accounts`
`id, operator_id, connect_account_id, connection_status, payouts_enabled, charges_enabled, total_earned, pending_amount, platform_fee_pct`

### `nfs_hospitable_connections`
`id, operator_id, status ('pending'|'connected'|'disconnected'|'failed'), sync_status, total_properties, total_reservations, last_sync_at, health_status, connected_platforms (jsonb)`

### `nfs_analytics`
`id, operator_id, property_id, event_type ('page_view'|'property_view'|'booking_start'|'booking_complete'), timestamp`

---

## Complete Route Map

```
PUBLIC ROUTES (nfstay.app)
/                          NfsMainLanding
/search                    NfsSearch
/property/:id              NfsPropertyView
/checkout                  NfsCheckoutPage
/booking                   NfsGuestBookingLookup
/payment/success           NfsPaymentSuccess
/payment/cancel            NfsPaymentCancel
/signin                    SignInPage
/signup                    SignUpPage
/traveler/login            TravelerLoginPage
/auth/callback             AuthCallbackPage
/verify-email              VerifyEmailPage

TRAVELER ROUTES (auth required)
/traveler/reservations     TravelerReservationsPage
/traveler/reservation/:id  TravelerReservationDetail
/traveler/privacy-policy   PrivacyPolicyPage
/traveler/terms            TermsPage

OPERATOR ROUTES (NfsOperatorGuard)
/nfstay                    NfsOperatorDashboard
/nfstay/onboarding         NfsOnboarding (8 steps)
/nfstay/properties         NfsProperties
/nfstay/properties/new     NfsPropertyNew (10 steps, fullscreen)
/nfstay/properties/:id     NfsPropertyDetail (tabbed)
/nfstay/reservations       NfsReservations
/nfstay/reservations/:id   NfsReservationDetail
/nfstay/create-reservation NfsCreateReservation (fullscreen)
/nfstay/settings           NfsOperatorSettings (tabbed)
/nfstay/analytics          NfsAnalytics
/nfstay/oauth-callback     OAuthCallbackPage (Stripe Connect + Hospitable)

ADMIN ROUTES (admin email guard)
/admin/nfstay              AdminNfsReservations
/admin/nfstay/properties   AdminNfsProperties
/admin/nfstay/operators    AdminNfsOperators

WHITE-LABEL ROUTES (operator subdomain/custom domain)
/                          NfsWlLanding
/search                    NfsWlSearch
/property/:id              NfsWlProperty
/checkout                  NfsCheckoutPage (shared)
/booking                   NfsGuestBookingLookup (shared)
/payment/success           NfsWlPaymentSuccess
/payment/cancel            NfsWlPaymentCancel
/error                     NfsWlError
```

---

## App Bootstrap — Domain Detection & Routing Logic

### White-Label Domain Detection

**This is critical — the app must detect at startup whether it's running on a white-label domain.**

Implement a `NfsWhiteLabelProvider` that wraps the entire app at the root `App.tsx` level:

```tsx
// How it works:
const hostname = window.location.hostname;

// Is white-label if:
// 1. Custom domain: not nfstay.app and not hub.nfstay.com → e.g. myhotel.com
// 2. Subdomain of nfstay.app: *.nfstay.app (but NOT hub.nfstay.app)
const isSubdomain = hostname.endsWith('.nfstay.app') && !hostname.startsWith('hub.');
const isCustomDomain = !hostname.endsWith('nfstay.app') && hostname !== 'localhost';
const isWhiteLabel = isSubdomain || isCustomDomain;
```

If `isWhiteLabel`:
- Call Supabase: `nfs_operators WHERE subdomain = [subdomain] OR custom_domain = [hostname]` AND `status = 'active'`
- If operator found: store operator in context, render white-label route tree
- If NOT found: render `NfsWlError` page with "We couldn't find this property site"
- While loading: full-screen spinner (NFStay logo centred, animate-pulse)

If NOT white-label (`nfstay.app` or `hub.nfstay.com` or `localhost`):
- Render main route tree (traveler + operator + admin routes)

**The route split in `App.tsx`:**
```tsx
<NfsWhiteLabelProvider>
  {isWhiteLabel ? (
    <Routes>
      <Route path="/" element={<NfsWlLanding />} />
      <Route path="/search" element={<NfsWlSearch />} />
      <Route path="/property/:id" element={<NfsWlProperty />} />
      <Route path="/checkout" element={<NfsCheckoutPage />} />
      <Route path="/booking" element={<NfsGuestBookingLookup />} />
      <Route path="/payment/success" element={<NfsWlPaymentSuccess />} />
      <Route path="/payment/cancel" element={<NfsWlPaymentCancel />} />
      <Route path="*" element={<NfsWlError />} />
    </Routes>
  ) : (
    <Routes>
      {/* Main traveler + operator + admin routes */}
    </Routes>
  )}
</NfsWhiteLabelProvider>
```

**White-label context value:**
```ts
{
  operator: NfsOperator | null,
  isWhiteLabel: boolean,
  accentColor: string,      // operator.accent_color or '#2da44e'
  brandName: string,        // operator.brand_name or 'NFStay'
  logoUrl: string | null,   // operator.logo_url
}
```

Apply accent color as a CSS variable at the root of `NfsWhiteLabelLayout`:
```tsx
<div style={{ '--wl-accent': accentColor } as React.CSSProperties}>
```

---

### Operator Guard Logic

The `NfsOperatorGuard` wraps all `/nfstay/*` routes. It performs a three-step check:

```
1. Not authenticated?
   → redirect to /signin (with ?return=/nfstay)

2. Authenticated but no nfs_operators record for this profile_id?
   → redirect to /nfstay/onboarding (step 1)

3. nfs_operators exists but onboarding_step !== 'completed'?
   → redirect to /nfstay/onboarding (resumes at onboarding_step value)

4. onboarding_step === 'completed'?
   → render the requested page
```

While checking (async Supabase calls): render full-screen spinner.

---

### OAuth Callback Page — `/nfstay/oauth-callback`

**Used by both Stripe Connect and Hospitable OAuth flows.**

Both integrations redirect back to this page after OAuth consent.

**Page logic:**

```
1. On mount: read URL search params:
   - code (required)
   - state (contains operatorId + integration type: 'stripe' | 'hospitable')
   - error (if user denied)

2. If error param present:
   - Show error card: "Connection cancelled"
   - "Return to settings" button → /nfstay/settings

3. If code present:
   - Show: spinning loader + "Connecting your account..."
   - POST to correct edge function based on state.integration:
     - Stripe: call `nfs-stripe-connect-oauth` with { code, operatorId }
     - Hospitable: call `nfs-hospitable-oauth` with { code, operatorId }
   - Edge function exchanges code for tokens, saves to nfs_stripe_accounts / nfs_hospitable_connections

4. On success:
   - Show: green checkmark + "Connected successfully!"
   - Wait 1.5s then redirect to /nfstay/settings (scroll to relevant tab)

5. On error from edge function:
   - Show: red X icon + "Connection failed"
   - Error message (from edge function response)
   - "Try again" button → /nfstay/settings
```

**Visual:**
- Centered on page (no sidebar, no navbar — clean focus)
- Card: max-w-md, mx-auto, mt-32
- Uses NFStay logo at top
- Three states: Loading spinner | Success (green) | Error (red)

---

## Layouts

### `NfsMainLayout`
Used on all main site traveler pages.

**`NfsMainNavbar`:**
- Desktop: Logo (left) | empty center | "Sign in" link + "List your property" green button (right)
- Mobile: Logo (left) | hamburger icon (right) → drawer with all nav links + auth buttons
- Sticky top, white bg, border-b, z-50
- Logo: "NFStay" in bold with green primary color for "NFS" part

**`NfsMainFooter`:**
- 4 columns: About (logo + tagline + socials row) / For Operators (links) / For Travelers (links) / Legal (links)
- Bottom bar: "© 2026 NFStay. All rights reserved."
- Social icons: Instagram, Twitter, Facebook, TikTok (gray, hover → foreground)
- Links for Operators: List your property / Sign up / How it works / Pricing
- Links for Travelers: Search properties / How to book / Guest protection / Contact
- Links for Legal: Privacy policy / Terms of service / Cookie policy

### `NfsOperatorLayout`
Used on all `/nfstay/*` pages.

**Topbar (h-16, bg-card, border-b):**
- Left: NFStay logo icon + "NFStay" wordmark
- Center: nothing
- Right: Notifications bell icon (with unread count badge in red) + avatar circle (initials from name) → dropdown menu: "Your profile", "Settings", "Sign out"
- Operator brand name shown as small tag next to logo on desktop

**Sidebar (collapsible, w-56 collapsed → w-14):**
- Collapse toggle button at bottom
- Nav links with icons + labels:
  - Dashboard (LayoutDashboard icon) → `/nfstay`
  - Properties (Building2 icon) → `/nfstay/properties`
  - Reservations (CalendarCheck icon) → `/nfstay/reservations`
  - Create Reservation (PlusCircle icon) → `/nfstay/create-reservation`
  - Settings (Settings icon) → `/nfstay/settings`
  - Analytics (TrendingUp icon) → `/nfstay/analytics`
- Active link: `bg-accent-light text-primary font-semibold`
- Collapsed: icon only, tooltip on hover showing label
- Mobile: sidebar hidden, bottom tab bar with icons for main 4 sections

**Mobile bottom tab bar (operator, mobile only):**
- Fixed bottom, 4 tabs: Properties | Reservations | Create | Settings
- Active: primary green underline + primary text

### `NfsWhiteLabelLayout`
Used on white-label domains.

**Navbar:**
- Operator `logo_url` (or brand name text if no logo)
- Nav links: Home / Search / Contact
- Accent color applied to active link + CTA button

**Footer:**
- Operator contact info (email, phone, WhatsApp link)
- Social links from operator social fields
- "Powered by NFStay" subtle link

---

## TRAVELER PAGES

---

### `NfsMainLanding` — `/`

**Section 1: Hero (full viewport height min, dark overlay)**
- Background: large property photo. Dark gradient overlay (bottom to top: rgba(0,0,0,0.5) → transparent)
- Content centered:
  - Badge: "🏡 Trusted by 1,200+ operators worldwide" (pill, semi-transparent white)
  - H1: "Find Your Perfect Stay" (text-5xl font-bold text-white on desktop, text-3xl on mobile)
  - Sub: "Discover unique homes, villas and apartments worldwide. Book direct, save more." (text-white/80)
  - `NfsHeroSearch` widget below (white card, floating, -mb-12 to overlap next section)

**Section 2: Popular Destinations**
- Top padding to clear hero overlap
- Heading: "Popular Destinations" (h2)
- Horizontal embla carousel, draggable, visible overflow
- Each destination card (w-48 flex-shrink-0):
  - Photo (h-48, object-cover, rounded-2xl)
  - Dark gradient overlay bottom
  - City name in white (bottom-left, font-semibold)
  - Property count badge (top-right, green pill "X properties")
  - Hover: scale-105, shadow-lg transition
- Click → `/search?query=<city>`
- Cities: Dubai, Bali, London, Lisbon, Algarve, Barcelona, Amsterdam, Paris, New York, Sydney

**Section 3: Featured Properties**
- Heading: "Featured Properties" + "View all →" link
- Grid: xl:4 lg:3 sm:2 1 column
- Fetch `nfs_properties` WHERE `listing_status='listed'` ORDER BY `created_at DESC` LIMIT 8
- Uses `NfsPropertyCard`

**Section 4: How It Works**
- Heading: "Simple, transparent, direct"
- 3 cards horizontal:
  1. MagnifyingGlass icon (green circle bg) | "Search" | "Browse thousands of verified properties worldwide"
  2. CreditCard icon | "Book" | "Secure checkout with instant confirmation"
  3. Home icon | "Stay" | "Check in and enjoy — no hidden fees"

**Section 5: Why NFStay**
- Heading: "Why book direct with NFStay?"
- 3×2 grid of feature items (icon + title + description):
  - 💰 Save up to 15% — No OTA commission fees passed to guests
  - ✓ Verified properties — Every listing reviewed by our team
  - 🔒 Secure payments — Stripe-protected checkout
  - 📞 24/7 support — Real people, real help
  - 🔄 Flexible cancellation — Transparent policies per property
  - 🌍 Global reach — Properties in 50+ countries

**Section 6: Testimonials**
- Heading: "What our guests say"
- embla carousel, auto-play every 4s, loop
- Each review card (bg-card, rounded-2xl, p-6, border):
  - ★★★★★ stars (5, yellow)
  - Quote text in italic
  - Guest name (font-semibold) + location (muted)
  - Avatar: colored circle with initials (bg varies per card)
- 6 static reviews hardcoded

**Section 7: FAQs**
- Heading: "Frequently Asked Questions"
- Accordion (one open at a time, smooth height animation):
  1. How does booking work?
  2. What is your cancellation policy?
  3. How do I list my property?
  4. Are payments secure?
  5. Can I contact the host before booking?
  6. What if something goes wrong during my stay?
  7. How does the white-label feature work?
  8. What is Hospitable integration?

**Section 8: CTA**
- `bg-primary` green background
- White text: "Ready to list your property?" heading + sub
- "Get started free" button (white bg, primary text)
- Decorative pattern or subtle grid in background

**Footer:** `NfsMainFooter`

---

### `NfsHeroSearch` component

White card, rounded-2xl, shadow-xl, p-4, max-w-3xl.
Desktop: flex row. Mobile: flex column (stacked, full width).

**Fields:**

**1. Location (flex-1)**
- Label: "Where" (uppercase small)
- Input with MapPin icon, placeholder "Search destinations..."
- As user types → Google Places autocomplete dropdown appears:
  - Each suggestion: location icon + place name + secondary text (city/country)
  - Max 5 suggestions
  - Click → fills input, stores lat/lng
- Clear X button appears when input has value

**2. Check-in (flex-shrink-0, min-w-[120px])**
- Label: "Check in" (uppercase small)
- Date display: "Tue, Mar 15" or "Add date" (muted)
- Click → calendar popup (below, z-50):
  - 2-month calendar side by side (current + next)
  - Past dates grayed out and unclickable
  - Selected date: green circle bg
  - Today: underline
  - Range between check-in and check-out: light green bg tint
  - Navigate months: prev/next arrows
  - Click date to select

**3. Check-out (flex-shrink-0, min-w-[120px])**
- Same as check-in, auto-opens after check-in is selected
- Cannot be before check-in
- Shows nights count when both selected: "3 nights"

**4. Guests (flex-shrink-0)**
- Label: "Guests"
- Display: "X guests" or "Add guests" (muted)
- Click → dropdown popup (white card, shadow-xl, p-4, w-72):
  - **Adults (13+):** label + "Ages 13 or above" sub + [−] count [+]
  - **Children (2–12):** label + "Ages 2–12" sub + [−] count [+]
  - **Infants (under 2):** label + "Under 2" sub + [−] count [+]
  - Min 1 adult, max 20 total
  - "Done" button closes dropdown
- Click outside → close

**5. Search button**
- `bg-primary text-white rounded-xl px-6 py-3 font-semibold`
- MagnifyingGlass icon + "Search" text
- Mobile: full-width

On submit: `navigate('/search?query=...&dates=checkIn,checkOut&adults=N&children=N')`

---

### `NfsSearch` — `/search`

**Sticky header (bg-card border-b shadow-sm, z-40):**

Row 1 — Compressed search bar (max-w-2xl mx-auto):
- Rounded-full border, flex row
- Location text input (flex-1) | vertical divider | "Check in" date | vertical divider | "Check out" date | vertical divider | Guests button | Search button (green circle, MagnifyingGlass icon only)

Row 2 — Filter chips (horizontal scroll, no scrollbar):
- Type chips: **All** · **🏠 Entire home** · **🏢 Apartment** · **🏡 Villa** · **🏰 Castle** · **🛖 Cabin** · **🚢 Boat** · **🌲 Treehouse** · **🏖️ Beach house** · **🏔️ Mountain**
- Active: `bg-foreground text-background`
- Inactive: `bg-card border border-border hover:border-foreground`

Row 3 (visible when "Filters" toggled):
- "Price / night:" label
- Min input (number, w-24, £) | "–" | Max input (£)
- "Apply" button (outline)
- "Bedrooms:" + stepper (1 2 3 4 5+)

Chips row also has:
- `Filters` button (SlidersHorizontal icon) — toggles row 3
- `Clear all` link (X icon) when any filter active — resets everything

**Results area:**

Count + toggle row:
- "[N] properties found" (left, text-sm text-muted-foreground)
- Grid/Map toggle (right): `[LayoutGrid] [Map]` icon buttons in rounded-xl bg-card border

**Loading skeleton (8 cards):**
- Grid xl:4 lg:3 sm:2 1
- Each: aspect-square skeleton image + 3 skeleton text lines

**Empty state:**
- Center: MagnifyingGlass icon in gray circle
- "No exact matches"
- "Try adjusting your search or clearing some filters"
- "Clear all filters" underline button

**Grid view:** `NfsPropertyCard` grid, xl:4 lg:3 sm:2 xs:1, gap-6

**Map view (`NfsSearchMap`):**
- Google Map, full width, h-[600px], rounded-2xl
- Price markers: each visible property shows a pill marker (`£150`) — white bg, dark text, rounded-full, shadow
- Hover marker: grows slightly, shadow-lg
- Click marker:
  - Marker becomes selected (green bg, white text)
  - **Mini property card slides up from bottom** (fixed bottom-4 left-1/2 -translate-x-1/2, w-72, bg-card, rounded-2xl, shadow-xl, border):
    - Property photo (h-32, object-cover)
    - Title + location
    - Price/night
    - "View property →" green button
    - X close button (top-right of mini card)
- Map controls: zoom in/out, fullscreen button (top-right)

**URL params auto-populated on mount from:** `query`, `dates` (split on comma → checkIn, checkOut), `adults`, `children`

---

### `NfsPropertyCard` component

No explicit card border. Floats naturally.

**Image area:**
- `aspect-square rounded-2xl overflow-hidden relative`
- If `images.length > 1`:
  - Left arrow button (absolute left-2 top-1/2, white circle, shadow) — previous photo
  - Right arrow button (absolute right-2 top-1/2) — next photo
  - Arrows ONLY visible on hover of card
  - Dot indicators bottom-center (max 5 dots)
- Favourite button (top-right, absolute, m-2): Heart icon, white fill with border → red fill on toggle. State stored in localStorage `nfs_favourites = ['id1','id2',...]`
- "New" badge (top-left, absolute, m-2): green pill "New" — only if `created_at` within last 7 days

**Content:**
- `pt-3 space-y-1`
- Row 1: `public_title` (font-semibold text-sm truncate, flex-1) + star rating (text-sm) or ★ "New" text (right)
- Row 2: MapPin icon (w-3 h-3) + `city`, `country` (text-xs text-muted-foreground)
- Row 3: bedroom count + bath count (text-xs text-muted-foreground) e.g. "3 beds · 2 baths" — derived from `room_counts`
- Row 4: **`base_rate_currency` `base_rate_amount`** (font-semibold) + `/night` (text-muted-foreground text-sm)

Clicking card → `/property/:id`

---

### `NfsPropertyView` — `/property/:id`

Fetch `nfs_properties` WHERE `id = :id AND listing_status = 'listed'`. If not found → 404.

**Top nav (sticky, bg-background/80 backdrop-blur, border-b):**
- `←` Back button (ArrowLeft) → history.back() or `/search`
- Property title truncated
- Share button (Share2 icon) → Web Share API or copy link toast
- Heart favourite button

**Photo Gallery (`NfsPhotoGallery` read-only):**
- Sort images: `is_cover=true` first, then by `order`
- Desktop (≥768px): CSS grid, h-[420px]:
  - Left column (60%): cover photo, rounded-l-2xl, object-cover, full height, cursor-pointer
  - Right column (40%): 2×2 grid:
    - Top-left: image 2
    - Top-right: image 3
    - Bottom-left: image 4
    - Bottom-right: image 5 with dark overlay and "+N more" text if total images > 5
  - Rounded-r-2xl on last grid cell
- Mobile: single image with swipe (embla), dot indicators
- "View all X photos" button (absolute bottom-3 right-3): white bg, border, rounded-full, px-3 py-1.5, text-sm font-semibold

**Lightbox (opens on any photo click or "View all"):**
- Fixed fullscreen overlay, bg-black/95, z-50
- Top bar: X close button (top-right) + "[N / Total]" counter (center)
- Main image: centered, max-h-[80vh], object-contain
- Left/right arrow buttons (large circles, white/20 bg, white icon)
- Keyboard: `Esc` → close, `←` → prev, `→` → next
- Caption text below image (text-white/70, text-sm)
- Thumbnail strip (bottom, horizontal scroll):
  - Each thumb: 60×60, object-cover, rounded, cursor-pointer
  - Active: ring-2 ring-white
  - Scrolls to keep active thumb visible

**Main content (max-w-7xl mx-auto, px-4, grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8):**

**Left column:**

*Header section:*
- H1: `public_title` (text-2xl font-bold)
- Row: star rating or "New" + reviews count (if any) | · | MapPin + city, country
- Divider

*Quick stats row (4 items, icons):*
- 👥 `max_guests` guests
- 🛏 bedrooms count (from room_counts)
- 🚿 bathrooms count (from room_counts)
- 📐 `size_value` `size_unit` (if set)

*Divider*

*Description:*
- Heading: "About this place"
- Text (max 3 lines collapsed → "Show more" link → full expand → "Show less")

*Divider*

*Amenities:*
- Heading: "What this place offers"
- Grid 2-column, show top 10 amenities
- Each: checkmark icon + label
- "Show all [N] amenities →" button → **Amenities Modal**

*Amenities Modal:*
- Full-screen on mobile, centered dialog on desktop (max-w-lg)
- Title: "What this place offers"
- Grouped by category (Popular, General, Outdoors, etc.)
- Each category: bold heading + list of amenities with check icon
- Unchecked amenities shown with X icon and line-through (optional, or just omit)
- Close X button

*Divider*

*House Rules:*
- Heading: "House rules"
- Grid 2-column:
  - ClockIn icon + "Check-in after [check_in_time]"
  - ClockOut icon + "Check-out before [check_out_time]"
  - Users icon + "Max [max_guests] guests"
  - PawPrint icon + "Pets [allowed/not allowed]"
  - (if max_pets) "Max [max_pets] pets"
- Cancellation policy card (bg-muted rounded-xl p-4):
  - Shield icon + policy name (bold)
  - Policy description text
- Additional rules text (if rules field set), in smaller font

*Divider*

*Location:*
- Heading: "Where you'll be"
- `city`, `state`, `country` text
- Google Map (`NfsPropertyMap`): h-[300px] rounded-2xl overflow-hidden
  - Property pin at `lat`, `lng`
  - Non-interactive (no clicks needed), zoom level 14
  - Map type: roadmap, minimal UI (no street view, no fullscreen)

*Divider (mobile only — sidebar appears below on mobile)*

**Right column (sticky top-4 on desktop):**

`NfsBookingWidget` — see component spec below.

---

### `NfsBookingWidget` component

White card, border, rounded-2xl, p-5, shadow-md.

**Price row:** `£[base_rate_amount]` (text-2xl font-bold) + `/night` (text-muted-foreground)

**Date picker (rounded-xl border overflow-hidden):**
- Two-column: "Check in" (left, border-r) | "Check out" (right)
- Each shows: uppercase label (text-[10px]) + selected date or "Add date" (muted)
- Click either → calendar popup appears below widget

**Guests button (full width, border, rounded-xl, mt-2):**
- Left: Users icon + "X guest[s]" or "Add guests"
- Right: ChevronDown
- Click → guests popup (same as HeroSearch guests dropdown)

**Availability / date validation:**
- Blocked dates in calendar shown as gray strikethrough
- If selected dates overlap blocked → red warning "Not available for selected dates"
- Min stay enforcement: if checkOut - checkIn < minimum_stay → amber warning "Minimum [N] night stay"

**Pricing breakdown (visible once checkIn + checkOut selected):**
- `£[rate] × [N] nights = £[subtotal]`
- Cleaning fee: `£[amount]` (if enabled and amount > 0)
- Weekly discount: `-£[amount]` (in green text, if applicable: stay ≥ 7 nights)
- Monthly discount: `-£[amount]` (if stay ≥ 28 nights)
- Divider
- Promo code row:
  - Text input "Promo code" + "Apply" button (outline)
  - Success: green checkmark + "[CODE]: -£[amount]" (remove X button)
  - Error: red text "Invalid or expired code"
- Divider
- **Total: £[total]** (font-bold text-lg) in a row with "Total" label

**Reserve button:**
- `bg-primary text-white w-full rounded-xl py-3 font-semibold text-base`
- Disabled (grayed) if no dates selected
- Text: "Reserve" (dates selected, available) | "Check availability" (no dates)
- Loading spinner while checking
- On click (dates valid, available):
  1. Save `nfs_booking_intent` to sessionStorage
  2. `navigate('/checkout')`

**Footer note:** "You won't be charged yet" (text-center text-xs text-muted-foreground)
**Advance notice note:** "Minimum [N] night stay" (if minimum_stay > 1)

---

### `NfsCheckoutPage` — `/checkout`

On mount: read `nfs_booking_intent` from sessionStorage.
If missing or `expiresAt < Date.now()` → show expired screen:
- Warning icon + "Your session expired" + "Start a new search" button → `/search`

**Expiration banner (if booking intent exists but < 10 min left):**
- Fixed top banner: amber bg + clock icon + "Your booking hold expires in [MM:SS]" countdown

**Layout:** max-w-5xl, grid lg:grid-cols-[1fr_380px] gap-8

**Left — Guest form:**

"Your contact details" section:
- First name (required) + Last name (required) — side by side grid-cols-2
- Email address (required, type="email")
- Phone number (required — input with country flag + dial code selector dropdown)
- All validated: red border + error text below if invalid on blur

"Special requests" section:
- Textarea (optional), placeholder "Any special requests or notes for the host..."
- Text-xs muted note: "Requests are not guaranteed but we'll do our best"

"Promo code" section (if not already applied):
- Flex row: code input + "Apply" button
- Feedback inline (same as widget)

"Booking policies" section:
- Checkbox (required): "I have read and agree to the house rules and cancellation policy"
- Link to cancellation policy text (expands inline or opens modal)

**"Complete booking" button:**
- `bg-primary text-white w-full rounded-xl py-3.5 font-semibold text-base`
- Disabled until: all required fields valid + checkbox checked
- Loading spinner inside button while processing
- Error toast if edge function call fails

**On success:**
1. Save `nfs_last_reservation` to sessionStorage (full booking details)
2. Redirect to Stripe checkout URL from `nfs-stripe-checkout` edge function

**Right — Booking summary card:**
- Property thumbnail (h-24, object-cover, rounded-xl) + title + location (small, MapPin icon)
- Divider
- Dates: calendar icon + "Mon, Mar 15 → Thu, Mar 18" + "3 nights" (muted)
- Guests: users icon + "2 adults, 1 child"
- Divider
- Pricing breakdown (same lines as widget, read-only)
- Total (bold)
- Lock icon + "Secured by Stripe" (text-xs muted, centered)

---

### `NfsPaymentSuccess` — `/payment/success`

On mount: read + delete `nfs_last_reservation` from sessionStorage.

**Layout:** min-h-screen bg-background flex items-start justify-center pt-16 px-4

**Content (max-w-md w-full space-y-6):**

Header:
- Green circle (w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto)
- CheckCircle icon (w-8 h-8 text-green-600) inside
- "Booking Confirmed!" (h1, text-2xl font-bold text-center)
- "Hi [firstName], your reservation is confirmed. A confirmation has been sent to [email]." (text-center text-sm text-muted-foreground)

Booking detail card (bg-card border rounded-2xl overflow-hidden shadow-sm):
- Cover image (h-40, w-full object-cover) if available
- Content (p-5 space-y-4):
  - Property title (font-semibold) + location row (MapPin icon + city, country, text-xs muted)
  - Dates row: Calendar icon + "Mon, Mar 15 – Thu, Mar 18, 2026" + "[N] nights" (muted, text-xs)
  - Guests row: Users icon + "2 guests (2 adults)"
  - Divider
  - "Total paid" label (left) + "GBP 750.00" (right, font-bold text-lg)
  - Reservation ID: "Reservation ID: [id]" (monospace text-xs text-muted-foreground text-center)

Fallback (no sessionStorage): just show reservation ID from URL param `?reservation_id=X`

Actions:
- "View Booking Details" (outline button, full-width) → `/booking?id=X&email=Y`
- "Browse More Properties" (primary button, full-width) → `/search`

---

### `NfsPaymentCancel` — `/payment/cancel`

Centered, max-w-sm, pt-24.
- Amber circle + AlertTriangle icon
- "Booking not completed" (h1)
- "Your payment was cancelled. No charges were made to your card." (muted)
- "Return to property" button (outline) → uses history.back() or stored propertyId from sessionStorage
- "Browse other properties" button (primary) → `/search`

---

### `NfsGuestBookingLookup` — `/booking`

Centered, max-w-lg, pt-16.

**Header:** "Find your booking" (h1) + "Enter your email to see all reservations linked to it" (muted)

**Search form:**
- Email input (required)
- "Find bookings" primary button
- Loading state: spinner inside button

**If URL params `?id=X&email=Y`:** pre-fill email + auto-submit on mount

**Results:**

No results:
- Search icon in gray circle + "No bookings found" + "Double-check your email address or contact support"

Results list:
- Each `NfsReservationCard` (simplified traveler version):
  - Left: property thumbnail (48×48 rounded-lg)
  - Center: property title (font-semibold) + city + "Check in: [date] → [date]" + "[N] nights"
  - Right: status badge + total amount (bold)
  - Full row clickable → expands detail below or navigates to detail

---

### `SignInPage` — `/signin`

Centered card (max-w-sm, mt-16).
- NFStay logo above card
- "Sign in to your account" heading
- Email input
- Password input (with show/hide toggle)
- "Forgot password?" link (right)
- "Sign in" primary button (full-width)
- Divider: "or"
- "Sign in with Google" button (outline, Google icon)
- Footer: "Don't have an account? Sign up →" link

Error state: red banner "Invalid email or password"

### `SignUpPage` — `/signup`

Same layout as SignIn.
- "Create your account"
- Email + Password + Confirm password
- "I agree to Terms of Service and Privacy Policy" checkbox (required)
- "Create account" button
- Success → redirect to `/verify-email`
- Footer: "Already have an account? Sign in →"

### `TravelerLoginPage` — `/traveler/login`

- "Sign in as Guest"
- "Enter your email and we'll send you a magic link"
- Email input
- "Send magic link" button
- Success: message "Check your inbox at [email]" with resend button (disabled 60s countdown)

### `VerifyEmailPage` — `/verify-email`

- Envelope icon (large, muted)
- "Check your inbox"
- "We sent a verification link to [email]"
- "Resend email" link (with 60s countdown)
- "Wrong email? Sign up again" link → `/signup`

### `AuthCallbackPage` — `/auth/callback`

Blank page with centered spinner while processing Supabase auth hash.
Redirects to appropriate page after session established.

---

### `TravelerReservationsPage` — `/traveler/reservations`

Auth required. Redirect to `/traveler/login` if no session.

**Header:** "My Bookings" (h1)

**Tab filter:** All · Upcoming · Past · Cancelled

**Loading:** 3 skeleton reservation cards

**Empty state:** Calendar icon + "No bookings yet" + "Start exploring properties" button → `/search`

**Reservation list (ordered by check_in DESC):**
Each card (bg-card border rounded-2xl p-4 hover:shadow-md):
- Left: property thumbnail (w-24 h-20 rounded-xl object-cover)
- Right:
  - Property title (font-semibold)
  - Location (muted text-sm)
  - Check-in → Check-out + nights count
  - Guests count
  - Status badge + payment status badge
  - Total amount (bold)
  - "View details" link (primary color, text-sm)

Click → `/traveler/reservation/:id`

---

### `TravelerReservationDetail` — `/traveler/reservation/:id`

**Header:**
- Back arrow → `/traveler/reservations`
- "Reservation details" heading
- Status badge

**Property card:**
- Cover image (h-40 rounded-2xl)
- Title + location

**Details grid:**
- Check-in date + time
- Check-out date + time
- N nights
- Adults + children + infants + pets

**Pricing breakdown (same style as checkout)**

**Payment card:**
- Payment status
- "Paid via Stripe" + amount + currency
- Stripe charge ID (monospace, small, muted)

**Actions (based on status):**
- If `confirmed` and check-in is future: "Request cancellation" button (danger outline) → sends email to operator, shows confirmation dialog
- "Download booking summary" (outline) → generates PDF or simple print view

**Reservation ID** (monospace, small, muted, centered at bottom)

---

## OPERATOR PAGES

---

### `NfsOperatorDashboard` — `/nfstay`

Guard: redirect to onboarding if not completed.

**Page header:** "Good morning, [first_name] 👋" (h1) | date today (muted)

**Performance metrics row (4 cards, grid-cols-2 md:grid-cols-4):**
Each metric card (bg-card border rounded-2xl p-5):
- Icon (in colored circle) + label + large number + trend arrow (▲ / ▼) + % vs last period
- Properties: Building2 icon (blue)
- Active Reservations (pending+confirmed): CalendarCheck icon (green)
- Month Revenue (sum total_amount WHERE payment_status='paid' AND this calendar month): DollarSign icon (green)
- Avg Nightly Rate (avg base_rate_amount WHERE listing_status='listed'): TrendingUp icon (purple)

**Quick action cards (2×2 grid):**
- "Add Property" → `/nfstay/properties/new` (PlusCircle, green)
- "Create Reservation" → `/nfstay/create-reservation` (CalendarPlus, blue)
- "View Reservations" → `/nfstay/reservations` (List, amber)
- "Go to Settings" → `/nfstay/settings` (Settings, gray)

**Recent Reservations table (last 5):**
- Table: Guest | Property | Check-in | Status | Amount | Action
- Loading: 5 skeleton rows
- Each row: avatar initials + name | property name (truncated) | date | status badge | bold amount | "View" link
- "View all reservations →" link below table

**Recent Activity feed (right column on wide screens):**
- Last 10 events from `nfs_analytics` for this operator
- Each: dot + event type text + relative time ("2 hours ago")
- "Your properties were viewed 24 times today" etc.

---

### `NfsOnboarding` — `/nfstay/onboarding`

Full-screen layout (no operator nav). Clean wizard UI.

**Top:** Logo (centered) | Progress bar (full width, green fill, shows X/8)

**Progress indicator:** "Step [N] of 8" + step name

**Step container:** max-w-xl mx-auto, centered, pt-12

**Navigation:** "Back" (ghost, left) | "Continue" / "Finish" (primary, right) | "Skip" (ghost, right, only on optional steps)

---

**Step 1 — Account Setup**
Heading: "Welcome! Let's set up your account"
- First name input (required)
- Last name input (required)
- Email (pre-filled from auth, read-only with edit link)
- Avatar preview: circle with initials, updates live

**Step 2 — Your Role**
Heading: "I am a..."
Two large radio cards (border-2, rounded-2xl, p-6, cursor-pointer):
- Selected: `border-primary bg-primary/5`
- Card A: 🏠 icon | "Property Owner" (bold) | "I own the properties I list"
- Card B: 🏢 icon | "Property Manager" (bold) | "I manage properties for owners"

**Step 3 — How Will You Use NFStay?**
Heading: "What's your main goal?"
Four radio cards (2×2 grid):
- "Direct Booking" — Take bookings from my own audience
- "Vacation Rental" — List on the NFStay marketplace
- "Booking Widget" — Embed booking on my existing site
- "Not sure yet" — I need some guidance

**Step 4 — Your Brand**
Heading: "Tell us about your brand"
- Brand name input (required) — "What guests will see"
- Legal name input (optional) — "For invoices and contracts"
- Subdomain input — shows preview: "[input].nfstay.app" updates live
  - Validates on blur: checks uniqueness via Supabase query
  - Green checkmark if available, red X if taken

**Step 5 — Landing Page**
Heading: "Create your homepage"
- Hero headline (required, 80 char max with counter)
- Hero subheadline (optional, 160 char max with counter)
- Background photo upload:
  - Drag-drop zone (dashed border, cloud-upload icon, "Click or drag photo here")
  - Preview: shows uploaded photo with text overlay (headline + subheadline) as live preview card
  - Remove X button on uploaded photo

**Step 6 — Website Look**
Heading: "Make it yours"
- Logo upload: circle drop zone (camera icon). Preview: circular logo
- Accent color: 8 preset color swatches + custom hex input + color picker popup
  - Live preview: "Button preview" pill button with chosen color
- Favicon upload: square 32×32 drop zone

**Step 7 — Contact Details**
Heading: "How can guests reach you?"
- Contact email (required)
- Phone (required, with dial code selector)
- WhatsApp number (optional, WhatsApp icon)
- Telegram handle (optional, @ prefix)

**Step 8 — Get Paid (Optional)**
Heading: "Set up payments to receive bookings"
- Info card (bg-muted, rounded-xl, p-4):
  - Bank icon + "Connect Stripe to accept payments directly from guests. NFStay takes a small platform fee."
  - Platform fee: 3% per booking
- "Connect with Stripe" button (full-width, primary) → calls `nfs-stripe-connect-oauth` → redirects to Stripe
- If already connected: green "✓ Stripe connected" card + "Disconnect" link
- "Skip for now" ghost button

On final step completion: PATCH `nfs_operators` set `onboarding_step = 'completed'` → navigate `/nfstay`

---

### `NfsProperties` — `/nfstay/properties`

**Header row:**
- "Properties" h1 + "[N] listings" badge (muted, bg-muted rounded-full px-2)
- "Add property" primary button (PlusCircle icon)

**Filter bar:**
- Status tabs: All | Listed | Unlisted | Draft | Archived — pill style, active = bg-foreground text-background
- Search input (MagnifyingGlass icon, debounced 300ms, filters client-side on title/city/country)

**Bulk action bar** (appears when ≥1 checkbox selected, slides down from top, bg-foreground text-background, rounded-xl, flex items-center gap-3, p-3):
- "[N] selected" | "List" button (green) | "Unlist" button (amber) | "Archive" button (red) | X clear

**Properties list (divide-y):**
Each row (py-4 flex items-center gap-4 hover:bg-muted/50 px-2 rounded-xl cursor-default):
- Checkbox (left)
- Thumbnail: 56×56 rounded-lg object-cover (first image with is_cover=true, else first image)
- Info:
  - `public_title || internal_title || 'Untitled property'` (font-semibold text-sm)
  - `city`, `country` (text-xs muted)
  - Source badge if airbnb: "via Hospitable" (small gray pill)
- Status badge
- `base_rate_currency base_rate_amount / night` (text-sm font-medium)
- `updated_at` as "X days ago" (text-xs muted)
- "Edit" link (primary color text-sm)
- Three-dot MoreHorizontal icon button → dropdown:
  - List / Unlist (toggle)
  - View listing (external link to /property/:id)
  - Delete → **Delete Confirmation Dialog**

**Delete Confirmation Dialog (modal):**
- AlertTriangle icon (amber)
- "Delete property?"
- "This will permanently delete '[title]' and all its data. Reservations will not be deleted."
- "Cancel" (outline) | "Delete" (danger) buttons
- Shows spinner in Delete button while deleting
- On success: removes row from list + success toast

**Skeleton (loading):** 6 skeleton rows (each: checkbox + square + 3 text lines + badge + amount)

**Empty state:** Building2 icon + "No properties yet" + "Add your first property" button

---

### `NfsPropertyNew` — `/nfstay/properties/new`

Full-screen wizard (hides operator layout nav during wizard).

**Layout:**
- Left sidebar (desktop, w-64, bg-card border-r): Step list
- Right: Step content (scrollable) + fixed bottom action bar

**Left sidebar steps:**
1. Property Basics
2. Location
3. Guests & Rooms
4. Photos
5. Amenities
6. Description
7. House Rules
8. Availability
9. Pricing
10. Review & Publish

Each step: number circle (current = green fill, completed = green outline with check, future = gray) + step name. Clicking completed step navigates to it.

**Bottom action bar (fixed, bg-card border-t, h-16):**
- Left: "Back" ghost button
- Right: "Save & Continue" primary button | on step 10: "Publish listing" button

**Step 1 — Property Basics**
"What type of property are you listing?"
- Grid of accommodation type cards (3 columns, each: emoji + name, border rounded-xl p-3 cursor-pointer text-center):
  - Row 1: Apartment · House · Villa
  - Row 2: Cottage · Cabin · Boat
  - Row 3: Treehouse · Castle · Hotel
  - Row 4: Hostel · Farm Stay · Other
  - "Show more types" link → expands full list of 85 types
  - Selected: border-primary bg-primary/5 font-semibold
- Rental type (radio cards): "Entire place" | "Private room" | "Shared room"
- Property size: number input + unit toggle (sqm / sqft)

**Step 2 — Location**
"Where is your property located?"
- Google Places Autocomplete input (full address search)
  - Dropdown shows suggestions as user types
  - Click suggestion → auto-fills all fields below + moves map pin
- Fields auto-populated (all editable):
  - Street address, City, State/Province, Country, Postal code
- Google Map (h-[300px] rounded-2xl):
  - Pin at lat/lng (draggable)
  - Dragging pin updates address fields
  - User can also type to search and see pin move
- Timezone: auto-detected from lat/lng (shown as read-only info)

**Step 3 — Guests & Rooms**
"Who can stay here?"
- Max guests: large stepper (− count +), min 1, max 20
- Allow children: toggle
- Room breakdown:
  - Bedrooms: stepper
  - Beds: stepper
  - Bathrooms: stepper (half steps: 0, 0.5, 1, 1.5, 2...)
- "Add room details (optional)" expandable:
  - For each bedroom: "Bedroom [N]" + bed type dropdown (King/Queen/Double/Twin/Single/Sofa bed/Bunk bed) + count stepper

**Step 4 — Photos**
"Show guests what makes your place special"
- Upload zone (dashed border, h-48, cloud icon, "Drag photos here or click to browse"):
  - Accepts: jpg, jpeg, png, webp
  - Max 50 photos, each max 10MB
  - Multiple files at once
- Uploaded photos grid (3 columns):
  - Each photo: img + hover overlay with:
    - Star icon (top-left): "Set as cover" → adds star badge
    - Trash icon (top-right): delete (with confirmation)
    - Caption field (below image, text-xs input placeholder "Add a caption...")
  - Cover photo has star badge + "Cover" label
  - Drag handles for reorder
- "Min 5 photos recommended" hint (amber if < 5)
- Photos uploaded directly to Supabase Storage: `nfs-images/{operatorId}/{propertyId}/{uuid}.jpg`

**Step 5 — Amenities**
"What do you offer?"
Category tabs (horizontal scroll): Popular | General | Accessibility | Outdoors | Leisure | Entertainment | Children

Each category tab shows checklist:
- Each item: checkbox (custom green) + icon + label
- Checking saves to `amenities` jsonb

Full amenity list (organized by category):

**Popular (15):** WiFi, Air conditioning, Kitchen, Washer, Dryer, TV, Dedicated workspace, Hair dryer, Heating, Pool, Hot tub, Dishes & cutlery, Cooking basics, Cleaning products, Essentials

**General (10):** Extra pillows & blankets, Hangers, Iron, Private entrance, Room-darkening shades, Safe, Smoke alarm, Carbon monoxide alarm, First aid kit, Fire extinguisher

**Accessibility (9):** Step-free entrance, Wide doorways, Accessible parking, Elevator, Roll-in shower, Grab rails, Step-free shower, Shower chair, Accessible-height bed

**Outdoors (8):** Backyard, BBQ grill, Patio or balcony, Outdoor furniture, Outdoor dining area, Beach access, Free parking on premises, Private garage

**Leisure (8):** Exercise equipment, Pool table, Ping pong, Sauna, Private hot tub, Private pool, Beach essentials, Bikes

**Entertainment (8):** Books, Game console, Sound system, Streaming services, DVD player, Board games, Piano, Smart TV

**Children (8):** Baby bath, Baby monitor, High chair, Children's toys, Safety gates, Crib, Changing table, Children's books & toys

**Step 6 — Description**
"Tell guests about your place"
- Public title input (required, max 100 chars):
  - Character counter "XX/100" bottom-right of input
  - Turns red when > 90 chars
- Description textarea (required, min 50 / max 1000 chars):
  - h-40, resize-y
  - Character counter + hint "Describe the space, what's nearby, what makes it special"
- Right panel (desktop): writing tips card (bg-muted)

**Step 7 — House Rules**
"Set expectations for guests"
- Check-in time: dropdown (12:00, 12:30, ... 23:30, "Flexible")
- Check-out time: same
- Pets: toggle. If on → max pets stepper
- Quiet hours: toggle. If on → start time + end time dropdowns
- Cancellation policy: 4 radio cards:
  - **Flexible**: green icon | "Full refund up to 24 hours before check-in"
  - **Moderate**: amber icon | "Full refund up to 5 days before check-in"
  - **Strict**: orange icon | "50% refund up to 7 days before check-in"
  - **Non-refundable**: red icon | "No refund"
- Additional rules: textarea placeholder "No smoking · No parties · etc."

**Step 8 — Availability**
"Control when guests can book"
- Availability window: dropdown (3 months / 6 months / 1 year / 2 years / All future dates)
- Advance notice required: dropdown (Same day / 1 day / 2 days / 3 days / 5 days / 1 week / 2 weeks)
- Minimum stay: stepper (1–90 nights) + nights label
- Blocked date ranges:
  - Calendar component (month view, 2 columns desktop, 1 mobile)
  - Click-and-drag or click start then click end to create block
  - Blocked ranges: gray bg, diagonal striping
  - Each block: hover shows trash icon to remove
  - "Add blocked dates" button as alternative to drag

**Step 9 — Pricing**
"Set your rates"
- **Base rate:** currency selector (dropdown with flags, 31 currencies) + amount input (number, large font)
- **Smart pricing section:**
  - Cleaning fee: toggle → amount input (per stay or per night radio)
  - Extra guest fee: toggle → amount input + "after X guests" stepper
  - Weekly discount (≥7 nights): toggle → percentage input (%)
  - Monthly discount (≥28 nights): toggle → percentage input (%)
- **Custom rates (optional):**
  - "Override prices on specific dates" section
  - Calendar: click dates → input custom price for those dates
  - Shows: base rate as default gray, overrides in green
  - Existing overrides listed below calendar as chips with X to remove

**Step 10 — Review & Publish**
"Almost there!"
- Summary cards for each previous step (expandable):
  - Basics: property type + rental type
  - Location: full address
  - Guests: max guests, bedrooms, beds, baths
  - Photos: [N] photos, cover thumbnail
  - Amenities: [N] amenities selected
  - Description: title + first 2 lines
  - Rules: check-in/out times + cancellation policy
  - Availability: window + min stay
  - Pricing: base rate + cleaning fee etc.
  - Each section has "Edit" link → goes back to that step

- "Listing Preview" card:
  - Thumbnail + title + location + rate
  - "How guests will see it" label
  - "Preview listing" button → opens modal with read-only NfsPropertyCard

- Publish options:
  - Radio: "Save as draft" (saves, don't publish) | "Publish now" (list immediately)
  - "Publish listing" primary button (or "Save draft" if draft selected)

---

### `NfsPropertyDetail` — `/nfstay/properties/:id`

**Header:**
- ArrowLeft "← Properties" → `/nfstay/properties`
- `public_title || 'Untitled'` (h1)
- Status dropdown (pill, current status colour):
  - Listed → Unlisted / Archived
  - Unlisted → Listed / Archived
  - Draft → Listed / Unlisted / Archived
- "View live listing" link (ExternalLink icon) → `/property/:id` in new tab
- Three-dot menu → Delete (opens Delete Confirmation Dialog same as list)

**Tabs (horizontal scroll, border-b):**
Overview · Details · Photos · Availability · Rates · Calendar Sync · Hospitable

**Tab: Overview**
- Large cover photo (h-56, full width, object-cover, rounded-2xl)
- Stats grid (2×2):
  - Listing status | Rate
  - Total reservations (count) | Last updated
- "Quick edit" buttons: "Change rate" | "Update status"
- Recent reservations mini-table (last 3)

**Tab: Details**
All property fields editable inline. Organized in sections matching wizard steps (Basics, Location, Guests, Amenities, Description, Rules). Each section has "Save changes" button. Uses same form components as wizard.

**Tab: Photos**
`NfsPhotoUpload` component:
- Same as wizard step 4 but for existing property
- Reorder by drag and drop
- Star = cover photo
- Upload more button
- "Save order" button (PATCH images array)

**Tab: Availability**
- Blocked dates calendar (interactive, same as wizard step 8)
- Min stay override per date range (optional advanced)
- Advance notice setting
- "Save changes" button

**Tab: Rates**
- Base rate + currency (same as wizard step 9)
- Cleaning fee, extra guest, discounts
- Custom daily rates calendar
- "Save changes" button

**Tab: Calendar Sync**
- **Outbound (share your calendar):**
  - Label: "Your NFStay calendar URL"
  - Text input with URL (read-only) + "Copy" button (copies to clipboard + toast)
  - Instructions card: "Add to Airbnb: Settings → Availability → Export calendar"

- **Inbound (import external calendars):**
  - List of connected calendars (each row):
    - Calendar icon + name + "Last synced [X] ago" + status dot (green/red)
    - "Sync now" button (outline, small) → syncs + updates timestamp
    - Delete X button → confirmation
  - "Add calendar" form (inline, at bottom):
    - Name input (e.g. "Airbnb", "VRBO")
    - URL input + "Test URL" button (validates ICS format)
    - "Add" button (adds to list)

**Tab: Hospitable**
- If not connected:
  - Hospitable logo + "Sync with Hospitable to import Airbnb, VRBO, and Booking.com listings"
  - "Connect Hospitable" button → calls edge fn, redirects OAuth
- If connected:
  - Health badge (green "Healthy" / amber "Warning" / red "Error")
  - Stats: "[N] properties synced · [M] reservations synced"
  - Last sync: "[timestamp]" + "Sync now" button
  - Connected platforms list:
    - Each: platform logo/icon + name + status + listing count
    - Platforms: Airbnb · VRBO · Booking.com · Expedia
  - "Disconnect" link (danger, with confirmation dialog)

---

### `NfsReservations` — `/nfstay/reservations`

**Header row:**
- "Reservations" h1 + "[N]" count badge
- "Create reservation" primary button

**Filter bar (flex wrap gap-2):**
- Search input (by guest name, email, reservation ID)
- Status dropdown (All / Pending / Confirmed / Cancelled / Completed / No Show / Expired)
- Property filter dropdown (All properties / [list])
- Date range filter: Check-in from → to (two date inputs)
- View toggle: List (LayoutList) | Calendar (Calendar icon)

**List view:**
Loading: 5 skeleton cards
Empty: Calendar icon + "No reservations found" + "Adjust your filters or create your first reservation"

Each reservation row/card (bg-card border rounded-xl p-4 hover:shadow-sm cursor-pointer):
- Left: Avatar circle (initials, colored bg based on name hash)
- Center:
  - Guest name (font-semibold) + email (text-xs muted)
  - Property name (text-sm, with Building2 icon)
  - Check-in → Check-out (Calendar icon, text-sm)
  - "[N] nights · X adults" (text-xs muted)
- Right:
  - Status badge
  - Payment status badge
  - Total amount (font-bold)
  - "View →" link

Click row → `/nfstay/reservations/:id`

**Calendar view (`NfsCalendarView`):**
- Month view toggle (prev/next month arrows + month/year label + "Today" button)
- Full grid (7 columns × 5-6 rows, Mon–Sun header)
- Each day cell:
  - Day number
  - Reservation bars (horizontal, coloured by status, showing guest name truncated)
  - Multiple reservations stack vertically
  - Bars span across day cells from check-in to check-out
  - Blocked dates: gray striped background
- Click reservation bar → opens reservation detail modal (mini inline)
  - Guest name | Property | Dates | Status | Amount | "View full detail" link

---

### `NfsReservationDetail` — `/nfstay/reservations/:id`

**Header:**
- "← Reservations" back link
- "Reservation" + last 8 chars of ID (monospace)
- Status badge (large)
- Last updated timestamp (muted, small)

**Grid (lg:grid-cols-[1fr_340px] gap-6):**

**Left:**

*Guest Information card (bg-card border rounded-2xl p-5):*
- Large avatar circle (initials, 56px)
- Guest name (h2 font-bold) + email (mailto link, primary color) + phone
- If guest_address: MapPin icon + address, city, country
- Copy email button (small icon)

*Booking Details card:*
- Property: link to `/nfstay/properties/:id` with thumbnail
- Check-in: date formatted + time
- Check-out: date formatted + time
- Duration: N nights
- Guests: Adults · Children · Infants · Pets (row with icons)
- Booking source badge (main_platform / white_label / operator_direct)

*Guest Message card (only if guest_message not empty):*
- MessageSquare icon + "Guest message" heading
- Quote block (bg-muted, rounded-xl, p-4, italic)

*Pricing Breakdown card:*
- Line items same as checkout page (rate × nights, fees, discounts, promo, total)
- Total row (bold, larger font)

*Payment Details card:*
- Payment status badge
- Amount + currency (large)
- Stripe payment intent: `pi_xxxxx` (monospace small, muted) + ExternalLink → Stripe dashboard
- Processed at timestamp
- If refunded: refund amount + refund reason

*Hospitable card (only if hospitable_reservation_id exists):*
- Hospitable logo icon + "Synced from Hospitable"
- Platform name (Airbnb/VRBO/etc.)
- Hospitable reservation ID (monospace)
- Last synced timestamp

**Right sidebar:**

*Status Management card (bg-card border rounded-2xl p-5):*
- "Reservation Status" heading
- Current status badge (large)
- Status change dropdown (only shows valid transitions):
  - pending → [confirmed, cancelled]
  - confirmed → [completed, cancelled, no_show]
  - completed → [] (no changes)
  - cancelled → [] (no changes)
- "Update status" primary button → updates `nfs_reservations.status`
  - Success toast + badge updates instantly

*Payment Action card (if payment_status = 'paid'):*
- "Process Refund" button (danger outline) → **Refund Modal**

**Refund Modal:**
- "Process Refund" heading
- Current charge amount (read-only)
- "Refund amount" input (number, max = total paid)
- "Partial refund" | "Full refund" toggle (quick-fill buttons)
- "Reason for refund" dropdown: Guest requested / Cancellation / Property issue / Duplicate / Other
- "Additional notes" textarea (optional)
- "Confirm Refund" danger button | "Cancel" outline
- Warning: "This action cannot be undone. The guest will be refunded [amount] via Stripe."

*Quick Actions card:*
- "Send email to guest" button → **Send Email Modal**
- "View property listing" link → `/property/:id`

**Send Email Modal:**
- "Send email to [guest_name]" heading
- "Subject" input (pre-filled: "Regarding your reservation at [property]")
- "Message" textarea (required)
- "Send" primary button | "Cancel"
- Success: "Email sent" toast

---

### `NfsCreateReservation` — `/nfstay/create-reservation`

Full-screen page (no sidebar layout — clean focus mode).

**Header (border-b):**
- X button → back to reservations
- "Create Reservation" h1
- "Operator created" badge (muted)

**Two-column (lg:grid-cols-[1fr_380px] gap-8), scrollable left, sticky summary right:**

**Left form (sections):**

*Step 1 — Choose Property:*
- "Property" heading
- Search dropdown: type to filter operator's properties
- Each option: thumbnail + title + city
- Selecting shows property details card: cover photo + title + rate + check-in/out times

*Step 2 — Dates & Times:*
- Check-in date + time (time dropdown, 30-min increments from check_in_time)
- Check-out date + time (time dropdown)
- Duration auto-shows: "[N] nights" (green badge) or red "Not available" if dates blocked

*Step 3 — Guest Information:*
- First name (required) + Last name (required)
- Email (required)
- Phone (optional, with dial code)

*Step 4 — Guests:*
- Adults (stepper, min 1) + Children + Infants + Pets

*Step 5 — Message to Guest (optional):*
- Textarea "Notes or message to include in confirmation email"

*Step 6 — Pricing:*
- Auto-calculated: nightly rate × nights + cleaning fee + fees
- Toggle "Override total amount":
  - If on: shows editable total amount input
  - Currency selector
- Promo code input + Apply

*Step 7 — Status:*
- Radio: Confirmed (default, immediate) | Pending (awaiting confirmation)

**Right — Booking Summary card (sticky):**
- Property: thumbnail + name + city
- Dates + nights
- Guests
- Price breakdown
- Total (bold)
- "Create Reservation" primary button (full-width) — disabled until property + dates + guest name filled
  - Loading spinner while creating
  - On success: **Booking Created Modal**

**Booking Created Modal:**
- Green checkmark (large)
- "Reservation Created!"
- Reservation ID (monospace, large)
- Guest name + dates
- "View Reservation" button → `/nfstay/reservations/:id`
- "Create Another" ghost button → resets form

---

### `NfsOperatorSettings` — `/nfstay/settings`

**Layout:** Sidebar tabs on left (desktop, w-56) | content right | mobile: horizontal scroll tabs

**Tab navigation (each item: icon + label):**
- Profile (User icon)
- Contact (Phone icon)
- Branding (Palette icon)
- Landing Page (Globe icon)
- Social (Share2 icon)
- Domain (LinkIcon)
- Promo Codes (Tag icon)
- Stripe (CreditCard icon)
- Hospitable (RefreshCw icon)
- Analytics & SEO (BarChart2 icon)
- Team (Users icon)

---

**Tab: Profile**
- Avatar: large circle (80px) showing logo or initials
- First name + Last name inputs
- Persona type: radio (Owner / Manager)
- "Save changes" button
- Danger zone: "Delete account" link → opens warning modal

**Tab: Contact**
- Contact email, Contact phone (with dial code), WhatsApp, Telegram
- "Save changes"

**Tab: Branding**
- Logo: circular upload zone + preview
- Brand name: input
- Accent color: color picker + 6 presets
  - Live preview: "Preview" card showing a button + nav link in chosen color
- Favicon: 32×32 square upload
- "Save changes"

**Tab: Landing Page**
- Enable landing page: toggle (disabling hides the white-label homepage)
- Hero headline (80 char) + Hero subheadline (160 char)
- Hero background photo: upload + preview
- About section:
  - About photo: upload + circle preview
  - About bio: textarea
- FAQs editor:
  - List of FAQs (drag to reorder, each row: question preview + Edit + Delete)
  - "Add FAQ" button → inline form (question input + answer textarea + Save + Cancel)
  - **Edit FAQ inline** (replaces row with form)
  - **Delete FAQ**: confirmation prompt (inline "Are you sure? Yes / No")
- "Save all changes" button

**Tab: Social**
- Instagram URL (Instagram icon)
- Facebook URL
- Twitter/X URL
- TikTok URL
- YouTube URL
- Google Business URL
- Airbnb profile URL
- "Save changes"

**Tab: Domain**
- **Subdomain section:**
  - Current: "[subdomain].nfstay.app"
  - Edit input + "Update" button
  - Availability check (debounced Supabase query)
  - Green "✓ Available" / Red "✗ Taken"

- **Custom Domain section:**
  - "Connect a custom domain" heading + description
  - Domain input (placeholder "yourdomain.com") + "Add domain" button
  - If domain added → DNS instructions:
    - Tab A (CNAME): add `CNAME` record: name = `@` or `www`, value = `connect.nfstay.app`
    - Tab B (A record): add `A` record: name = `@`, value = `[IP]`
    - Copy button for each value
  - Verification status card:
    - Pending: amber clock icon + "Verification pending (can take up to 24h)"
    - Verified: green checkmark + "Domain verified and active"
    - Failed: red X + "Verification failed. Check your DNS settings."
  - "Verify now" button (manually triggers check)
  - "Remove domain" danger link

**Tab: Promo Codes**
- "Create promo code" button (top right) → **Create Promo Code Modal**
- Table: Code | Name | Discount | Uses | Valid | Status | Actions
- Each row:
  - `code` (monospace font-semibold)
  - name
  - Discount: "10%" or "£15" depending on type
  - Uses: "[current_uses] / [max_uses]" or "Unlimited"
  - Valid: date range or "No expiry"
  - Status toggle switch (active/inactive)
  - Edit icon → **Edit Promo Code Modal** (same form pre-filled)
  - Trash icon → **Delete Promo Code Confirmation** (inline: "Delete [CODE]? Yes / Cancel")

**Create/Edit Promo Code Modal (centered dialog, max-w-md):**
- "Create promo code" / "Edit promo code" heading
- Code input (auto-uppercase, validates no spaces) + "Generate" button (random 8-char alphanumeric)
- Name input (internal label)
- Discount type: radio pills "%" Percentage | "£" Fixed amount
- Value: number input (% shows %, fixed shows currency selector)
- Valid from: date input (optional)
- Valid to: date input (optional, must be after valid_from)
- Max uses: toggle. If on → number input
- "Save" primary button | "Cancel"

**Tab: Stripe**
- If not connected:
  - Large card: Stripe logo + "Accept payments from guests directly"
  - Fee info: "NFStay charges 3% platform fee per booking"
  - "Connect with Stripe" button (primary, full-width)
- If connected:
  - Connection status: green "Connected" badge
  - Account ID: `acct_xxxxx` (monospace, muted)
  - Charges enabled: green check or amber warning
  - Payouts enabled: green check or red warning (with "Complete Stripe onboarding" link if not)
  - Earnings summary (3 cards):
    - Total earned: £[total_earned]
    - Pending payout: £[pending_amount]
    - Platform fee: [platform_fee_pct]%
  - "Open Stripe Dashboard" button (ExternalLink icon)
  - "Disconnect Stripe" link (danger) → **Disconnect Confirmation Modal:**
    - "Disconnect Stripe?"
    - "You will no longer be able to receive payments through NFStay until you reconnect."
    - "Cancel" | "Disconnect" (danger)

**Tab: Hospitable**
- Same as property-level Hospitable tab (operator-wide view)

**Tab: Analytics & SEO**
- Google Analytics ID: input with placeholder "G-XXXXXXXXXX" + instructions link
- Meta Pixel ID: input with placeholder "XXXXXXXXXXXXXXXX" + instructions link
- SEO section:
  - Meta title: input (60 char max)
  - Meta description: textarea (160 char max)
- "Save changes"

**Tab: Team**
- Current user list (table: Avatar | Name | Email | Role | Status | Actions)
  - Own row: "(You)" badge, no remove button
  - Others: role badge + status badge + "Remove" danger text button → **Remove Member Confirmation** (inline)
- "Invite member" button → **Invite Team Member Modal:**
  - "Invite a team member" heading
  - Email input (required)
  - Role select: Admin (full access) / Editor (can edit properties + reservations) / Affiliate (view only + referral)
  - "Send invitation" primary button
  - Note: "They'll receive an email to join your NFStay team"
  - Shows invited (pending) members with "Resend invite" link

---

### `NfsAnalytics` — `/nfstay/analytics`

**Header:** "Analytics" h1 | Time range pills: 7d · 30d · 90d (right side)

**Loading:** skeleton stat cards + skeleton chart

**Stat cards row (grid-cols-2 md:grid-cols-4):**
Each card (bg-card border rounded-2xl p-5):
- Icon circle (colored bg) + metric name
- Large number (text-3xl font-bold)
- Trend: ▲ +12% vs prev period (green text) or ▼ -5% (red text)

Cards:
- 👁 Page Views (TotalPageViews count from nfs_analytics)
- 🏠 Property Views (property_view events)
- 🛒 Bookings Started (booking_start events)
- % Conversion Rate (booking_complete / property_view × 100)

**Activity Chart (recharts AreaChart or BarChart):**
- X: date labels (formatted MMM d)
- Y: event count
- Multiple data series by event_type (color coded)
- Legend below chart
- Tooltip on hover showing counts per day
- No data state: gray chart area + "No activity in this period"

**Property Performance table:**
- Columns: Property | Views | Booking Starts | Conversions | Revenue
- Each row: thumbnail (32px) + title | count | count | % | £amount
- Sorted by views DESC
- "View property" link on each row
- Empty state: "No property data yet"

---

## ADMIN PAGES

Admin guard: only accessible if `user.email` in admin list (`admin@hub.nfstay.com`, `hugo@nfstay.com`).
Uses existing `AdminLayout` from the hub app (shared layout with NFStay workspace tab active).

---

### `AdminNfsReservations` — `/admin/nfstay`

**Header:** "NFStay — Reservations" h1 | Export CSV button

**Filter bar:**
- Search (guest name, email, property name, reservation ID)
- Status dropdown: All / [all statuses]
- Operator dropdown: All operators / [operator list]
- Date range: from / to
- Booking source: All / Main Platform / White Label / Operator Direct

**Stats row (4 mini stat cards):**
- Total reservations (count)
- Confirmed bookings (count)
- Total revenue today (sum)
- Pending (count)

**Reservations table (paginated, 25 per page):**
Columns: # | Operator | Guest | Property | Check-in | Check-out | Status | Payment | Amount | Actions

Each row:
- Short ID (monospace, small)
- Operator brand_name (small badge)
- Guest name + email (small)
- Property public_title (small, truncated)
- Check-in date
- Check-out date
- Status badge (colour)
- Payment status badge
- Total amount (bold)
- "View" link → `/admin/nfstay/reservations/:id` or inline detail modal

**Row detail modal (opens on View click):**
- Full reservation detail (same as operator view)
- Admin can change status + add notes
- Cannot process refunds from admin panel (must go to Stripe)

**Pagination:** Previous / page numbers / Next

---

### `AdminNfsProperties` — `/admin/nfstay/properties`

**Header:** "NFStay — Properties" h1 | "[N] total" badge

**Filters:**
- Search (title, city, country, operator name)
- Listing status dropdown
- Operator dropdown
- Country dropdown

**Properties table (paginated):**
Columns: Thumbnail | Property | Operator | Location | Status | Rate | Reservations | Added | Actions

Each row:
- 48×48 thumbnail
- `public_title` + source badge (NFStay / Airbnb)
- Operator brand_name
- city, country
- listing_status badge
- base_rate_currency + base_rate_amount /night
- reservation count (link)
- created_at (relative)
- "View" link (opens property detail in new tab) | "Force unlist" button (danger, admin only)

**Force Unlist Confirmation:**
- "Force unlist this property?" dialog
- Reason input (required for audit)
- "Confirm" danger button

---

### `AdminNfsOperators` — `/admin/nfstay/operators`

**Header:** "NFStay — Operators" h1 | "[N] operators" badge | "Invite operator" button

**Table (paginated):**
Columns: Operator | Brand | Domain | Properties | Reservations | Stripe | Joined | Actions

Each row:
- Avatar + name + email
- brand_name + subdomain link (external)
- custom_domain (if set) + verification badge
- property count
- reservation count
- Stripe connected badge (green) or "Not connected" (muted)
- created_at relative
- "View" → operator detail modal | "Suspend" danger link

**Operator detail modal:**
- All operator settings displayed (read-only)
- Stripe account status
- Hospitable connection status
- Total revenue earned on platform
- "Suspend operator" button (danger) → disables all their listings

---

## WHITE-LABEL PAGES

### `NfsWlLanding` — `/` on white-label domain

**Same structure as NfsMainLanding but entirely operator-branded:**

All color uses `accent_color` from `nfs_operators` instead of primary green:
```css
/* Set as CSS variable at root of white-label layout: */
--wl-accent: [operator.accent_color];
```

- **Navbar:** `logo_url` image or `brand_name` text | "Search" link | optional "Contact" link | `accent_color` button
- **Hero:** `hero_photo` background | `hero_headline` + `hero_subheadline` | `NfsHeroSearch` (scoped to this operator) | `accent_color` search button
- **Properties section:** Only `operator_id = this operator` AND `listing_status = 'listed'`
- **About section:** `about_photo` + `about_bio` text
- **FAQs:** from `operator.faqs` array (accordion)
- **Contact section:** WhatsApp button, email link, phone link
- **Footer:** `NfsWhiteLabelLayout` footer with operator socials

### `NfsWlSearch` — `/search` on white-label domain
Same as `NfsSearch` but `operator_id` filter always applied. Branding from `NfsWhiteLabelLayout`.

### `NfsWlProperty` — `/property/:id` on white-label domain
Same as `NfsPropertyView`. `bookingSource = 'white_label'` in booking intent. Layout uses `NfsWhiteLabelLayout`.

### `NfsWlPaymentSuccess` / `NfsWlPaymentCancel`
Same pages as main site with `NfsWhiteLabelLayout` wrapping (operator logo + colors).

### `NfsWlError` — `/error`
- Operator logo
- "Something went wrong"
- "Return to homepage" button

---

## Google Maps Integration

### `NfsPropertyMap` component
Used in `NfsPropertyView` location section.

```
Initialize: new google.maps.Map(container, {
  center: { lat: property.lat, lng: property.lng },
  zoom: 14,
  disableDefaultUI: true,
  gestureHandling: 'none',   ← non-interactive
  styles: [minimal map style — gray roads, no POI labels]
})

Marker: AdvancedMarkerElement (try first) OR fallback to classic Marker
  - Custom HTML pin: white circle with green border + house icon
  - Shows at property lat/lng
```

If `lat` and `lng` are null → hide map section entirely.
If `VITE_GOOGLE_MAPS_API_KEY` not set → show "Map unavailable" placeholder.

### `NfsSearchMap` component
Used in `NfsSearch` map view.

```
Initialize: Map centered on geographic mean of all result lat/lngs, fitBounds to show all
zoom: auto-fit, max zoom 14

For each property with lat/lng:
  - Create custom AdvancedMarkerElement:
    - HTML: <div class="price-pin">£150</div>
    - Styled: white bg, dark text, rounded-full, shadow, px-2.5 py-1, font-semibold text-xs
    - Hover: scale-110, z-index higher, shadow-lg
    - Selected (clicked): bg-foreground text-background

  - On marker click:
    1. Set selected marker (changes marker style)
    2. Show mini property card (bottom center, fixed position)

Mini property card:
  - width: 280px, bg-card, rounded-2xl, shadow-xl, border
  - Cover photo (h-28 object-cover rounded-t-2xl)
  - p-3: title (font-semibold truncate) | location (text-xs muted) | rate (font-bold)
  - "View property" button (primary, full-width)
  - X close button (top-right absolute)
  - Clicking close → deselects marker + hides card

Fallback (if AdvancedMarkerElement unavailable): classic google.maps.Marker with label text
```

### `NfsPlacesAutocomplete` component
Used in HeroSearch and PropertyNew Step 2.

```
Uses @googlemaps/js-api-loader with library 'places'
Input: text input
As user types (debounced 300ms):
  - Call PlacesAutocomplete API
  - Show dropdown of up to 5 suggestions
  - Each: MapPin icon + main text (bold) + secondary text (muted)
On select:
  - Fill input with place name
  - Resolve place details (lat, lng, address components)
  - Call onPlaceSelect(placeDetails) callback
```

---

## Edge Functions to Call

| Function | Call from | POST body | Returns |
|----------|-----------|-----------|---------|
| `nfs-stripe-checkout` | NfsCheckoutPage | `{ reservationId, total, currency, propertyTitle, guestEmail, operatorConnectId, successUrl, cancelUrl }` | `{ checkoutUrl }` |
| `nfs-stripe-connect-oauth` | Settings > Stripe tab | `{ operatorId }` | `{ oauthUrl }` |
| `nfs-email-send` | NfsReservationDetail send email modal | `{ to, subject, body, operatorId }` | `{ success }` |
| `nfs-domain-check` | NfsWhiteLabelLayout on mount | GET `?domain=yourdomain.com` | `{ operatorId, brandName, accentColor }` or 404 |

---

## SessionStorage Keys

| Key | Set by | Read by | Shape |
|-----|--------|---------|-------|
| `nfs_booking_intent` | NfsBookingWidget on Reserve click | NfsCheckoutPage on mount | `{ propertyId, checkIn, checkOut, adults, children, operatorDomain, bookingSource, expiresAt }` |
| `nfs_last_reservation` | NfsCheckoutPage before Stripe redirect | NfsPaymentSuccess on mount | `{ id, propertyTitle, propertyCity, propertyCountry, coverImage, checkIn, checkOut, adults, children, total, currency, guestName, guestEmail }` |

---

## LocalStorage Keys

| Key | Shape | Purpose |
|-----|-------|---------|
| `nfs_favourites` | `['propertyId1', 'propertyId2']` | Favourite properties (no auth) |

---

## Constants

### Currencies (31)
USD ($) · EUR (€) · GBP (£) · AUD (A$) · CAD (C$) · CHF (Fr) · JPY (¥) · CNY (¥) · INR (₹) · KRW (₩) · MXN ($) · NOK (kr) · NZD (NZ$) · SEK (kr) · SGD (S$) · ZAR (R) · BRL (R$) · DKK (kr) · HKD (HK$) · HUF (Ft) · IDR (Rp) · ILS (₪) · MYR (RM) · PHP (₱) · PLN (zł) · RON (lei) · THB (฿) · TRY (₺) · BGN (лв) · CZK (Kč) · ISK (kr)

### Property Types (85+ — show 12 in wizard step 1, rest in "Show more")
Apartment · House · Villa · Cottage · Cabin · Boat · Treehouse · Castle · Hotel · Hostel · Farm Stay · Other (first 12)
— then: Aparthotel · Barn · Boutique hotel · Bungalow · Bus · Camper/RV · Campsite · Casa Particular · Cave · Chalet · Condominium · Cycladic House · Dammusi · Dome House · Dorm · Earth House · Guesthouse · Guest Suite · Heritage hotel · Holiday Home · Holiday Park · Houseboat · Hut · Igloo · Island · Lighthouse · Loft · Nature lodge · Pension · Ranch · Religious Building · Resort · Riad · Ryokan · Serviced apartment · Shepherds Hut · Shipping Container · Studio · Tent · Timeshare · Tiny House · Tipi · Tower · Townhouse · Train · Trullo · Villa · Windmill · Yurt

### Cancellation Policies
| Key | Label | Description |
|-----|-------|-------------|
| `flexible` | Flexible | Full refund up to 24 hours before check-in |
| `moderate` | Moderate | Full refund up to 5 days before check-in |
| `strict` | Strict | 50% refund up to 7 days before check-in |
| `non_refundable` | Non-refundable | No refund after booking |

### Check-in/Check-out Time Options
Every 30 minutes from 12:00 to 23:00: "12:00", "12:30", "13:00" ... "23:00", plus "Flexible"

---

## Modals Summary (all modals use)
- Fixed overlay: `bg-black/50 backdrop-blur-sm fixed inset-0 z-50 flex items-center justify-center`
- Modal container: `bg-card rounded-2xl shadow-2xl border max-w-md w-full mx-4 p-6`
- Close: X button top-right OR click outside overlay
- Mobile: slides up from bottom (sheet style)

All modals:
1. Delete Property Confirmation
2. Refund Modal
3. Send Email to Guest Modal
4. Amenities Show All Modal
5. Stripe Disconnect Confirmation
6. Hospitable Disconnect Confirmation
7. Invite Team Member Modal
8. Remove Team Member Confirmation
9. Create/Edit Promo Code Modal
10. Delete Promo Code Confirmation
11. Force Unlist Property (admin) Confirmation
12. Booking Created Success Modal (create reservation)
13. Cancel Reservation Confirmation (traveler side)
14. Preview Listing Modal (wizard step 10)
15. Domain DNS Instructions Modal

---

## Error & Fallback Pages

### 404 Page
For any unmatched route:
- 404 large (text-8xl font-bold muted)
- "Page not found"
- "The page you're looking for doesn't exist or has been moved"
- "Go home" button + "Search properties" button

### Property Not Found
When `/property/:id` returns no listed property:
- Home icon + "Property not available"
- "This property may have been removed or is no longer listed"
- "Search for other properties" button

### White-Label Not Found
When white-label domain not recognized:
- "We couldn't find this property site"
- "Visit NFStay.app to explore properties" button

---

## Supabase Types Workaround

The `nfs_*` tables are NOT in the auto-generated `src/integrations/supabase/types.ts`. Until you regenerate types after running migrations, use this pattern for every Supabase query touching `nfs_*` tables:

```ts
// ✓ CORRECT — cast required until types are regenerated
const { data } = await (supabase
  .from('nfs_operators') as any)
  .select('*')
  .eq('profile_id', profileId)
  .single();

// ✗ WRONG — will give TypeScript error
const { data } = await supabase
  .from('nfs_operators')   // ← TS error: not in generated types
  .select('*');
```

Apply `as any` after every `.from('nfs_*')` call throughout the entire codebase.

---

## Hooks Reference — 20 Hooks to Implement

Generate ALL of these with matching names so they can be replaced by pre-built implementations later.

### Data Fetch Hooks (`src/hooks/nfstay/`)

| Hook | File | What it does |
|------|------|---|
| `useNfsOperator()` | `use-nfs-operator.ts` | Fetch single operator by `profile_id` (current user). Returns `{ operator, loading, error }` |
| `useNfsProperties(operatorId?)` | `use-nfs-properties.ts` | Fetch operator's properties. Returns `{ properties, loading, error, refetch }` |
| `useNfsProperty(id)` | `use-nfs-property.ts` | Fetch single property by ID including images, amenities, room_counts. Returns `{ property, loading, error }` |
| `useNfsPropertySearch(filters)` | `use-nfs-property-search.ts` | Search listed properties with location, dates, guests, price, type filters. Returns `{ results, loading, total }` |
| `useNfsReservations(filters?)` | `use-nfs-reservations.ts` | Fetch operator's reservations with optional status/date/property filters. Returns `{ reservations, loading, error }` |
| `useNfsReservation(id)` | `use-nfs-reservation.ts` | Fetch single reservation by ID with all fields. Returns `{ reservation, loading, error }` |
| `useNfsPricing(property, dates, guests)` | `use-nfs-pricing.ts` | Client-side pricing calc: nightly × nights + cleaning fee + discounts + promo code. Returns `{ breakdown, total }` |
| `useNfsAnalyticsSummary(days)` | `use-nfs-analytics.ts` | Fetch analytics summary for past N days (revenue, bookings, occupancy, top property). Returns `{ summary, loading }` |
| `useNfsPromoCode()` | `use-nfs-promo-codes.ts` | CRUD for promo codes + `validateCode(code)` function. Returns `{ promoCodes, createCode, deleteCode, validateCode }` |
| `useNfsAvailability(propertyId, checkIn, checkOut)` | `use-nfs-availability.ts` | Check if dates are available (no conflicting confirmed reservations). Returns `{ available, blockedDates, loading }` |
| `useNfsWhiteLabel()` | `use-nfs-white-label.ts` | Detect white-label domain + fetch operator branding. Returns `{ operator, isWhiteLabel, accentColor, brandName, logoUrl }` |
| `useNfsGoogleMaps()` | `use-nfs-google-maps.ts` | Load Google Maps JS SDK via `@googlemaps/js-api-loader`. Returns `{ isLoaded, loadError }` |

### Mutation Hooks

| Hook | File | What it does |
|------|------|---|
| `useNfsPropertyMutation()` | `use-nfs-property-mutation.ts` | `createProperty(data)` / `updateProperty(id, data)` / `deleteProperty(id)`. Returns `{ create, update, delete, loading }` |
| `useNfsReservationMutation()` | `use-nfs-reservation-mutation.ts` | `createReservation(data)` / `updateReservation(id, data)` / `cancelReservation(id, reason)`. Returns `{ create, update, cancel, loading }` |
| `useNfsOperatorUpdate()` | `use-nfs-operator-update.ts` | `updateOperator(fields)` — PATCH nfs_operators. Returns `{ update, loading, error }` |
| `useNfsPropertyWizard()` | `use-nfs-property-wizard.ts` | Step machine for new property wizard. Auto-saves each step as draft. Returns `{ step, goNext, goBack, goTo, canProceed, savedData }` |
| `useNfsImageUpload()` | `use-nfs-image-upload.ts` | Upload files to `nfs-images/{operatorId}/{propertyId}/{uuid}.ext` in Supabase Storage. Returns `{ upload, uploading, progress }` |
| `useNfsStripeConnect()` | `use-nfs-stripe.ts` | Initiate Stripe Connect OAuth via edge function. Returns `{ account, connect, disconnect, loading }` |
| `useNfsStripeCheckout()` | `use-nfs-stripe.ts` | Call `nfs-stripe-checkout` edge function with reservationId. Returns `{ createSession, loading }` |
| `useNfsHospitable()` | `use-nfs-hospitable.ts` | Hospitable OAuth + sync status + manual trigger. Returns `{ connection, connect, disconnect, syncNow, loading }` |
| `useNfsOnboarding()` | `use-nfs-onboarding.ts` | Track onboarding step completion. `completeStep(step)` updates `nfs_operators.onboarding_step`. Returns `{ currentStep, completeStep, loading }` |

---

## Transactional Email Flows (Resend via `nfs-email-send` Edge Function)

All emails are sent by calling the Supabase Edge Function `nfs-email-send` with a JSON body:
```ts
await supabase.functions.invoke('nfs-email-send', {
  body: { template, to, data }
})
```

### Email Design System
Every email uses the same base layout:
- White card on light-grey background (`#f5f7f5`)
- Header: NFStay logo (left) + green bar (#2da44e ≈ primary)
- Body: 16px Inter, `#1a1a1a` text, 24px line-height
- CTA button: green background, white text, 8px radius, 48px height
- Footer: "© NFStay · Unsubscribe · Privacy Policy" in `#888` 12px
- Responsive — single column, max-width 600px, mobile-safe padding

### Guest Emails

| Template ID | Trigger | Subject | Key Content |
|---|---|---|---|
| `guest-booking-confirmation` | Reservation created (`status = confirmed`) | "Your booking is confirmed — [property]" | Property photo, name, dates, guest count, total price, host contact, add to calendar link, "Manage Booking" CTA |
| `guest-payment-receipt` | Stripe payment captured | "Payment receipt — [property]" | Amount charged, last 4 digits, booking ref, itemised breakdown (nightly rate × nights + cleaning fee − discount), download PDF link |
| `guest-booking-cancelled` | Reservation `status` changes to `cancelled` | "Your booking has been cancelled — [property]" | Cancellation reason, refund amount + expected days, support email, "Find another property" CTA |
| `guest-booking-reminder` | 24h before `check_in` (n8n scheduled) | "Check-in tomorrow — [property]" | Property address, check-in time, door code (if stored), host phone, Google Maps link |
| `guest-magic-link` | Traveler requests login link | "Sign in to NFStay" | One-use sign-in button, expires 15 min, "Didn't request this? Ignore" footer |
| `guest-status-change` | Any reservation status change except confirm/cancel | "Update on your booking — [property]" | Old status → new status, short explanation, "View Booking" CTA |
| `guest-review-request` | 24h after `check_out` (n8n scheduled) | "How was your stay at [property]?" | Star picker (1–5 links in email), "Leave a full review" CTA, property photo |
| `guest-welcome` | First booking ever for this email | "Welcome to NFStay" | Short intro, what to expect, support link, app download teaser |

### Operator Emails

| Template ID | Trigger | Subject | Key Content |
|---|---|---|---|
| `operator-new-reservation` | New reservation created for their property | "New booking — [property] · [dates]" | Guest name, dates, payout amount, "View Reservation" CTA, quick action buttons (Confirm / Message Guest) |
| `operator-reservation-cancelled` | Guest cancels reservation | "Booking cancelled — [property]" | Guest name, dates, reason, whether penalty applies, refund status |
| `operator-payment-received` | Stripe payment captured | "Payment received — £[amount]" | Booking ref, gross amount, NFStay fee (%), net payout, expected payout date |
| `operator-payout-processed` | Stripe payout landed in bank | "Payout of £[amount] is on its way" | Amount, bank last 4, expected arrival, "View Analytics" CTA |
| `operator-team-invite` | Operator invites team member | "You've been invited to manage [operator name]" | Invited by name, role assigned, "Accept Invitation" CTA (magic link), expires 48h |
| `operator-team-member-joined` | Invitee accepts invite | "[Name] has joined your team" | Name + role, "Manage Team" CTA |
| `operator-hospitable-synced` | n8n Hospitable sync workflow completes | "Calendar synced — [property]" | Properties synced, new bookings imported, any conflicts flagged |
| `operator-hospitable-failed` | Hospitable sync errors | "Sync failed — action required" | Error reason, "Reconnect Hospitable" CTA |
| `operator-domain-verified` | DNS check confirms domain live | "Your custom domain is live 🎉" | Domain name, preview link, "View your site" CTA |
| `operator-listing-approved` | Admin approves a property listing | "Your listing is live — [property]" | Property name, public listing URL, "View Listing" CTA |
| `operator-listing-rejected` | Admin rejects a property | "Action needed on your listing — [property]" | Rejection reason (from admin), "Edit Listing" CTA |
| `operator-low-inventory-alert` | Property has 0 available nights in next 30 days | "Heads up — no availability showing for [property]" | Calendar gap warning, "Update Availability" CTA |
| `operator-onboarding-complete` | All 8 onboarding steps done | "You're all set — [operator name]" | Summary of what's configured, "Go to Dashboard" CTA, 3 quick-start tips |
| `operator-weekly-summary` | Every Monday 08:00 (n8n scheduled) | "Your week in review — [dates]" | Reservations this week, revenue, occupancy %, top property, "View Analytics" CTA |

### Email UI Notes for Lovable
- The app does NOT render email templates in the browser — email sending is always backend (Edge Function)
- The UI only needs **trigger points**: buttons/actions that call `nfs-email-send`
- "Send Email" modal in ReservationDetail (operator side): compose subject + message body → POST to edge function → sends to guest
- "Resend confirmation" link in guest booking lookup page → POST `guest-booking-confirmation`
- Admin can trigger `operator-listing-approved` / `operator-listing-rejected` from AdminNfsProperties row detail modal
- Add `VITE_RESEND_FROM` env var placeholder in the config section (actual key stays server-side)

---

## Nice-to-Have Features

Include these as polished enhancements — they make the product feel 10× more complete.

### Property Sharing
- On `NfsPropertyView`, add a **Share** button (top-right, icon-only on mobile, icon+text on desktop)
- Dropdown: Copy link | WhatsApp | Twitter/X | Facebook | Email
- "Copied!" toast on copy link
- WhatsApp deep link: `https://wa.me/?text=Check+this+property+[encoded URL]`
- On white-label property pages, share URL = white-label domain, not nfstay.app

### Recently Viewed Properties
- Every time a user visits `/property/:id`, push `{id, timestamp}` to `localStorage('nfs_recently_viewed')` (max 10 items, FIFO)
- On `NfsLandingPage`, if `nfs_recently_viewed` has ≥ 1 item, show a **"Recently viewed"** horizontal scroll section above the footer (same `NfsPropertyCard` layout, no heading animation)
- Clear button in user account settings: "Clear history"

### Search History
- Every confirmed search (location + dates + guests) is pushed to `localStorage('nfs_search_history')` (max 5 items)
- On `NfsSearchPage` hero search, show a "Recent searches" dropdown (appears when location input is focused and field is empty)
- Each row: location name + date range chip + × remove button

### Property View Counter (Operator Dashboard)
- In `NfsPropertyDetail` header (operator view): show a badge "👁 [N] views this month" pulled from `nfs_analytics` table (`event = 'property_view'`, grouped by `property_id`, current month)
- Also show on `NfsOperatorPropertiesList` table as a column "Views (30d)"
- Record view event: when traveler opens `/property/:id`, call an edge function or Supabase RPC `increment_property_view(property_id)` (upserts into `nfs_analytics`)

### Currency Selector
- Global currency switcher in `NfsMainLayout` header (top-right, flag + code dropdown)
- Persisted in `localStorage('nfs_currency')`, default `GBP`
- Supported: GBP, USD, EUR, AED, SGD (5 currencies, no live FX — multiply by a static rate map stored in a `constants/currencies.ts` file)
- All price displays wrap in `<NfsCurrencyAmount value={penceGBP} />` component that reads localStorage and applies the rate
- Operator dashboard stays in GBP always (payout currency)
- Rates updated in `constants/currencies.ts` manually — a comment says "update quarterly"

### Print / PDF Booking Summary
- In guest booking lookup result, add a **Print summary** button (icon: printer)
- Opens a print-optimised `window.print()` view: clean black-and-white layout, property name, booking ref, dates, guest name, total paid, check-in instructions
- `@media print` CSS: hide nav, hide footer, hide buttons, show print-only elements
- Also available in operator's `ReservationDetail` page — "Print / Export PDF" in the action bar

### CSV Export — Reservations
- In `NfsOperatorReservationsList`, add an **Export CSV** button (top-right, beside filters)
- Downloads all currently filtered reservations as CSV: columns = ref, guest email, property, check-in, check-out, nights, guests, total, status, created_at
- Pure client-side: use `Papa.unparse()` from `papaparse` library, trigger download via Blob URL
- Also in Admin `AdminNfsReservations` — "Export All" downloads unfiltered full set

### Notification Preferences (Operator Settings)
- Add a **"Notifications"** tab to `NfsOperatorSettings` (tab 12, after existing 11)
- Toggles (stored in `nfs_operators.notification_prefs` JSONB):
  - Email: New reservation | Cancellation | Payment received | Payout processed | Weekly summary | Listing status change | Sync alerts
  - Each toggle: label + description + switch component
- Save button at bottom, `PATCH` to `nfs_operators` table
- The Edge Function reads these prefs before sending — if toggle is off, skip that template

### Comparison Feature
- "Compare" checkbox on each `NfsPropertyCard` (appears on hover, bottom-left)
- Max 3 properties selected — 4th triggers a toast "Maximum 3 properties for comparison"
- Sticky **comparison bar** at bottom of viewport (slides up when ≥ 2 selected): shows property thumbnails + "Compare [N]" button
- `NfsComparisonPage` at `/compare?ids=uuid1,uuid2,uuid3`: side-by-side table
  - Rows: Photo, Name, Price/night, Bedrooms, Bathrooms, Max guests, Cancellation policy, Amenities (green check / grey dash), Rating, "Book now" button
- State in `sessionStorage('nfs_compare_ids')` (array of UUIDs)

### Operator Announcement Banner
- In `NfsOperatorLayout`, above the main content: a dismissible yellow info banner
- Driven by a `nfs_announcements` table (id, message, link_url, link_label, active, created_at)
- Admin can create/toggle from `AdminNfsProperties` (or a new Admin tab)
- Dismissed state stored in `localStorage('nfs_dismissed_announcements')` as array of IDs
- Only show banners where `active = true` and ID not in dismissed list

### Guest Wishlist / Collections
- Extend the existing "Favourites" (localStorage heart toggle) with optional named **Collections** (requires auth)
- On heart icon click: if not logged in → add to `localStorage('nfs_favourites')`; if logged in → show a small popover "Save to:" with existing collection names + "New collection" input
- Collections stored in Supabase table `nfs_wishlists` (id, user_id, name, property_ids jsonb[])
- Wishlist page at `/wishlist` in traveler dashboard: list of collections, property cards per collection, delete/rename collection

### Property Availability Quick-View (Operator List)
- In `NfsOperatorPropertiesList`, each property row has a small **inline calendar heatmap** (12 weeks, Mon–Sun grid)
- Cells: green = available, red = booked, grey = blocked
- Pulls from `nfs_reservations` (check_in/check_out) for that property
- Click cell → opens `NfsPropertyDetail` on the Calendar tab

### Mobile App Feel Enhancements
- On mobile (`< 768px`), `NfsPropertyView` photo gallery becomes a **full-screen swipeable carousel** (not the desktop 3/5 grid)
- Pull-to-refresh on `NfsOperatorDashboard` (using `overscroll-behavior: contain` + a custom hook that detects 60px overscroll on touch)
- Haptic feedback on CTA button tap (mobile only): `navigator.vibrate(10)` wrapped in try/catch
- "Add to Home Screen" prompt banner on mobile for traveler-side (shown once after 3rd visit, stored in localStorage, dismissable)

---

## Add to Supabase Project Config

```
VITE_SUPABASE_URL = [your Supabase project URL]
VITE_SUPABASE_PUBLISHABLE_KEY = [your Supabase anon key]
VITE_GOOGLE_MAPS_API_KEY = [Google Maps API key]
VITE_RESEND_FROM = noreply@nfstay.app
```

Supabase project ID: `asazddtvjvmckouxcmmo`
