# NFStay — Frontend Spec
*Blueprint for UI rebuild. Backend wiring happens after this is done.*

---

## Domain Routing

| Domain | What it renders |
|--------|----------------|
| `nfstay.app` | Main site (traveler + operator sign-in) |
| `*.nfstay.app` | White-label storefront (operator subdomain) |
| `yourcustomdomain.com` | White-label storefront (custom domain) |
| `hub.nfstay.com/nfstay/*` | Operator dashboard (for logged-in operators) |

Detection logic lives in `NfsWhiteLabelRouter.tsx`. It checks the hostname and chooses which route tree to render. No UI needed for this — it's infrastructure.

---

## Route Map

### A. Main Site (nfstay.app)

| Path | Component | Layout | Auth |
|------|-----------|--------|------|
| `/` | `NfsMainLanding` | `NfsMainLayout` | Public |
| `/search` | `NfsSearch` | `NfsMainLayout` | Public |
| `/property/:id` | `NfsPropertyView` | `NfsMainLayout` | Public |
| `/checkout` | `NfsCheckoutPage` | Standalone | Public |
| `/booking` | `NfsGuestBookingLookup` | `NfsMainLayout` | Public |
| `/payment/success` | `NfsPaymentSuccess` | Standalone | Public |
| `/payment/cancel` | `NfsPaymentCancel` | Standalone | Public |
| `/signin` | Auth page | Standalone | Public |
| `/signup` | Auth page | Standalone | Public |
| `/nfstay/*` | → Operator dashboard routes below | — | Operator |

### B. Operator Dashboard (hub.nfstay.com/nfstay/*)

All routes wrapped in `NfsOperatorGuard` (must be logged in + have an operator record).

| Path | Component | Notes |
|------|-----------|-------|
| `/nfstay` | `NfsOperatorDashboard` | Redirects to onboarding if not complete |
| `/nfstay/onboarding` | `NfsOnboarding` | 8-step wizard |
| `/nfstay/properties` | `NfsProperties` | List + bulk actions |
| `/nfstay/properties/new` | `NfsPropertyNew` | 10-step wizard |
| `/nfstay/properties/:id` | `NfsPropertyDetail` | Edit + tabs |
| `/nfstay/reservations` | `NfsReservations` | List + calendar view |
| `/nfstay/reservations/:id` | `NfsReservationDetail` | Single reservation |
| `/nfstay/create-reservation` | `NfsCreateReservation` | Manual booking |
| `/nfstay/settings` | `NfsOperatorSettings` | 9-tab settings |
| `/nfstay/analytics` | `NfsAnalytics` | Stats dashboard |

### C. White-Label Storefront (operator subdomain or custom domain)

| Path | Component | Notes |
|------|-----------|-------|
| `/` | `NfsWlLanding` | Operator's branded homepage |
| `/search` | `NfsWlSearch` | Operator's properties only |
| `/property/:id` | `NfsWlProperty` | Branded property detail |
| `/checkout` | `NfsCheckoutPage` | Shared with main site |
| `/booking` | `NfsGuestBookingLookup` | Shared with main site |
| `/payment/success` | `NfsWlPaymentSuccess` | Branded success |
| `/payment/cancel` | `NfsWlPaymentCancel` | Branded cancel |

### D. Admin (hub.nfstay.com/admin/nfstay/*)

| Path | Component |
|------|-----------|
| `/admin/nfstay` | `AdminNfsReservations` |
| `/admin/nfstay/reservations` | `AdminNfsReservations` |
| `/admin/nfstay/properties` | `AdminNfsProperties` |

---

## Layouts

### `NfsMainLayout`
Wraps all main site traveler pages.
- Top: `NfsMainNavbar` — logo (NFStay), links (Search, Sign in, List your property)
- Footer: `NfsMainFooter` — links, socials, copyright

### `NfsOperatorLayout`
Wraps all operator dashboard pages.
- Top bar: NFStay logo + operator name + sign out
- Sidebar: `NfsOperatorSidebar` — collapsible; links to Dashboard, Properties, Reservations, Settings, Analytics

### `NfsWhiteLabelLayout`
Wraps white-label storefront pages.
- Top: operator logo, brand name, accent color
- Bottom: operator contact info, socials

---

## Page Specs

---

### NfsMainLanding

**Route:** `/` on nfstay.app
**Purpose:** Marketing homepage + property discovery

**Sections (top to bottom):**

1. **Hero** — Full-width background image or video. Big headline. Subheadline. Search form (`NfsHeroSearch`) centred below.
2. **Popular Destinations** — Row of destination cards (city name + photo). Clicking one goes to `/search?query=<city>`.
3. **Featured Properties** — Grid of `NfsPropertyCard` components. Shows all `listing_status = 'listed'` properties, no filters.
4. **Services** — 5 feature highlight blocks (icons + text). Static content.
5. **FAQs** — Accordion. 8 Q&A items. Static content.
6. **CTA** — "List your property" button → `/signup`.

**Data it uses:**
- `nfs_properties` WHERE `listing_status = 'listed'` — for the featured grid

---

### NfsHeroSearch (component used in NfsMainLanding)

**Fields:**
- Location text input (with Places autocomplete)
- Check-in date picker
- Check-out date picker
- Guests counter (+/- buttons in dropdown)
- Search button

**On submit:** Navigate to `/search?query=<location>&dates=<check_in>,<check_out>&adults=<n>`

---

### NfsSearch

**Route:** `/search`
**Purpose:** Search results — Airbnb-style

**Layout (desktop):** Results list/grid on left, map on right (or toggleable full view)

**Header bar (sticky):**
- Location search input
- Check-in / Check-out date inputs
- Guests selector (dropdown popup, +/- adults)
- Search button (red gradient)
- Property type chips: All | Entire home | Apartment | Villa | Cottage | Cabin | Beach | Mountain
- Filters button → expands price range inputs (min/max per night)
- Clear all link (when filters active)
- Result count text + Grid/Map toggle

**Results area:**
- Loading state: 8 skeleton cards (pulse animation)
- Empty state: search icon + "No exact matches" heading + "Clear all filters" link
- Results: grid of `NfsPropertyCard` — 4 columns on xl, 3 on lg, 2 on sm
- Map mode: full-width `NfsSearchMap` (600px height) with price-label markers

**URL params read on mount:** `query`, `dates` (split on comma → check_in, check_out), `adults`, `city`

**Data it uses:**
- `nfs_properties` WHERE `listing_status = 'listed'` + optional filters (query, city, minGuests, minPrice, maxPrice, propertyType)

---

### NfsPropertyCard (component)

**Used in:** NfsSearch, NfsMainLanding (featured section), NfsWlSearch

**Layout:**
- Square image (aspect-square). Photo carousel with prev/next arrows (appear on hover). Dots for multiple images.
- Heart/favourite toggle (top-right corner of image). Fills red when hearted.
- Below image: title + star rating or "New" badge (row)
- Location (city, country)
- Room summary (X beds · X baths)
- Price per night (`£X / night`) — bold
- Clicking card → navigates to `/property/:id`

**Data fields used from `nfs_properties`:**
- `images` (array), `public_title`, `city`, `country`, `base_rate_amount`, `base_rate_currency`, `room_counts` (for beds/baths), `id`

---

### NfsPropertyView

**Route:** `/property/:id`
**Purpose:** Guest property detail page — all info + booking widget

**Layout:** Single column on mobile, two-column on desktop (content left, booking widget right sidebar)

**Sections:**
1. **Back button** — goes to `/search`
2. **`NfsPhotoGallery`** — read-only mode (described below)
3. **Title + location** (city, country) + star rating
4. **Quick stats bar:** max guests · bedrooms · bathrooms · size (m²)
5. **Description** — full text
6. **Amenities** — icon + label grid. Group by category if possible.
7. **House rules** — check-in time, check-out time, cancellation policy, extra rules
8. **Location map** — `NfsPropertyMap` (Google Maps, property pin)
9. **Sidebar (right):** `NfsBookingWidget`

**Data it uses:**
- Single `nfs_properties` row by ID, must be `listing_status = 'listed'`
- `nfs_reservations` for availability blocking (via pricing/availability hook)

---

### NfsPhotoGallery (component, read-only mode)

**Used in:** NfsPropertyView

**Hero layout (desktop):**
- Left (3/5 width): large cover photo
- Right (2/5 width): 2×2 grid of next 4 photos
- Last grid cell shows `+N` overlay when total photos > 5
- "View all X photos" button (bottom-right corner)

**Lightbox (on photo click or "View all"):**
- Full-screen overlay
- `embla-carousel-react` for swiping
- Prev/Next arrow buttons
- Keyboard nav: Esc closes, ← → change photo
- Counter: "3 / 12"
- Caption text (if any)
- Thumbnail strip at bottom

**Photo ordering:** `is_cover = true` first, then by `order` field ascending.

---

### NfsBookingWidget (component)

**Used in:** NfsPropertyView (right sidebar), NfsWlProperty

**Sections:**
- Price display: `£X / night`
- Date range picker: Check-in | Check-out (inline calendar)
- Guests selector: adults + children counter (popup)
- Availability check / blocked dates display
- Promo code input (with apply button, shows discount feedback)
- **Pricing breakdown:**
  - `£X × N nights = £Y`
  - Cleaning fee: `£Z`
  - Discounts (weekly/monthly if applicable)
  - Promo discount
  - **Total: £T**
- "Reserve" / "Book Now" button
  - On click: saves `nfs_booking_intent` to sessionStorage, redirects to `/checkout`
  - Intent includes: propertyId, checkIn, checkOut, adults, children, operatorDomain, bookingSource, expiresAt (30 min)

**Booking intent sessionStorage key:** `nfs_booking_intent`

---

### NfsCheckoutPage

**Route:** `/checkout`
**Purpose:** Guest details form + payment initiation

**Flow:**
1. Reads `nfs_booking_intent` from sessionStorage. If missing → redirect to home.
2. Fetches property + calculates price breakdown.
3. Shows guest form + price summary.

**Form fields:**
- First name, Last name
- Email address
- Phone number
- Special requests (textarea)
- Promo code input (optional, with "Apply" button)
- Terms & conditions checkbox ("I agree to the house rules and cancellation policy")

**Price summary (right sidebar or below form):**
- Property thumbnail + title
- Check-in → Check-out dates
- X guests
- Nightly breakdown (same as widget)
- Total

**On submit:**
1. Creates `nfs_reservations` row (status = 'pending')
2. Creates Stripe Checkout session (via Edge Function `nfs-stripe-checkout`)
3. Redirects to Stripe-hosted checkout
4. Stripe redirects back to `/payment/success?session_id=X&reservation_id=Y`

Before Stripe redirect: saves `nfs_last_reservation` to sessionStorage with full booking summary.

---

### NfsPaymentSuccess

**Route:** `/payment/success`
**Purpose:** Booking confirmation page

**Reads:** `nfs_last_reservation` from sessionStorage (removes it after reading). Falls back to `reservation_id` URL param.

**Shows (if sessionStorage data available):**
- Green checkmark icon
- "Booking Confirmed!" heading
- Personalised message: "Hi [first name], your reservation is confirmed. A confirmation was sent to [email]."
- Card with:
  - Property cover image
  - Property title + location
  - Check-in → Check-out dates (formatted) + "N nights"
  - Guest count
  - Total paid
  - Reservation ID (monospace)
- "View Booking Details" button → `/booking?id=X&email=Y`
- "Browse More Properties" button → `/search`

---

### NfsPaymentCancel

**Route:** `/payment/cancel`
**Purpose:** Stripe checkout cancelled

**Shows:**
- Warning icon
- "Booking not completed" heading
- "Your payment was cancelled. No charge was made."
- "Try again" button → back to the property

---

### NfsGuestBookingLookup

**Route:** `/booking`
**Purpose:** Guest can find their existing reservation(s) without logging in

**Form:**
- Email address input
- Search button

**Results:**
- List of reservations matching the email
- Each shows: property title, dates, status badge, total amount
- "View Details" link for each

**Detail view (expanded or separate):**
- Full reservation: property info, dates, guest count, price breakdown, payment status
- Actions (if reservation allows): Cancel request

---

### NfsOperatorDashboard

**Route:** `/nfstay`
**Auth:** Operator required. Redirects to `/nfstay/onboarding` if `onboarding_step !== 'completed'`.

**Sections:**
- Greeting: "Welcome back, [first_name]"
- Quick stats row: Total Properties · Active Reservations · Pending Reservations · Total Revenue (this month)
- Quick action cards:
  - Properties → `/nfstay/properties`
  - Reservations → `/nfstay/reservations`
  - Settings → `/nfstay/settings`
  - Create Reservation → `/nfstay/create-reservation`

---

### NfsOnboarding

**Route:** `/nfstay/onboarding`
**Purpose:** 8-step wizard to set up operator account

**Step list:**

| # | Key | What it collects |
|---|-----|-----------------|
| 1 | `account_setup` | First name, Last name, confirm email |
| 2 | `persona` | Radio: "I'm a property owner" or "I'm a property manager" |
| 3 | `usage_intent` | Radio: Direct booking only / Vacation rental / Booking widget / Undecided |
| 4 | `business` | Brand name, Legal name, desired subdomain |
| 5 | `landing_page` | Hero headline, hero subheadline, hero photo upload |
| 6 | `website_customization` | Logo upload, accent color picker, favicon upload |
| 7 | `contact_info` | Contact email, phone, WhatsApp, Telegram |
| 8 | `payment_methods` | Connect Stripe (OAuth button) — can skip |

**UI pattern:**
- Progress bar or step dots at top
- Back / Next / Skip buttons
- Each step saves immediately on Next (no draft lost if they close)
- On last step completion → redirect to `/nfstay` (dashboard)

**Data saved to:** `nfs_operators` row (one column per step's data)

---

### NfsProperties

**Route:** `/nfstay/properties`

**Header:**
- "Properties" heading + listing count
- "Add Property" button → `/nfstay/properties/new`

**Filter bar:**
- Status chips: All | Listed | Unlisted | Archived | Draft
- Search input (filter by title, address, city)

**Property list:**
- Each row/card shows:
  - Thumbnail (cover image)
  - Title (public_title or internal_title)
  - Location (city, country)
  - Status badge (colour-coded)
  - Base rate (£X/night)
  - Last updated date
  - Edit link → `/nfstay/properties/:id`
  - Checkbox for bulk select

**Bulk action toolbar (shows when items selected):**
- List (set listing_status = 'listed')
- Unlist (set listing_status = 'unlisted')
- Archive (set listing_status = 'archived')
- Count of selected

---

### NfsPropertyNew

**Route:** `/nfstay/properties/new`
**Purpose:** 10-step property creation wizard

**Steps:**

| # | Component | What it collects |
|---|-----------|-----------------|
| 1 | `StepPropertyBasics` | property_type, rental_type, accommodation_type, size |
| 2 | `StepLocation` | address (Places autocomplete), city, state, country, postal_code, lat, lng |
| 3 | `StepGuestsAndRooms` | max_guests, allow_children, room_counts (bedrooms, bathrooms, beds per room) |
| 4 | `StepPhotos` | Upload photos, set cover photo, reorder, captions |
| 5 | `StepAmenities` | Toggle checkboxes: WiFi, Pool, Parking, Kitchen, AC, Washer, etc. |
| 6 | `StepDescription` | public_title, description (rich text or textarea) |
| 7 | `StepHouseRules` | check_in_time, check_out_time, max_pets, cancellation_policy, rules |
| 8 | `StepAvailability` | availability_window, advance_notice, minimum_stay, blocked_date_ranges |
| 9 | `StepPricing` | base_rate_currency, base_rate_amount, cleaning_fee, weekly_discount, monthly_discount |
| 10 | `StepReview` | Summary of all fields, "Publish" button sets listing_status to 'listed' |

**Flow:**
- Creates a draft property on mount (ID assigned immediately)
- Each step auto-saves to `nfs_properties`
- Can navigate back/forward freely
- Step progress stored in `completed_steps[]` and `current_step`

---

### NfsPropertyDetail

**Route:** `/nfstay/properties/:id`
**Purpose:** Edit existing property

**Tab structure:**

| Tab | Content |
|-----|---------|
| Overview | Status toggle (Listed/Unlisted), quick stats, delete button |
| Details | All wizard fields editable inline (property type, location, guests, amenities, description, rules) |
| Photos | `NfsPhotoUpload` — drag-drop, reorder, cover select, delete |
| Availability | `PropertyCalendars` — blocked dates, minimum stay, advance notice |
| Rates | Base rate, cleaning fee, discounts, custom daily rates |
| Calendar Sync | iCal inbound/outbound URLs — `NfsICalSync` component |
| Hospitable | Connect Hospitable, sync status, manual sync button — `NfsHospitablePanel` |
| Payments | Stripe Connect status for this property's earnings |

---

### NfsReservations

**Route:** `/nfstay/reservations`

**Header:**
- "Reservations" heading + count
- "Create Reservation" button → `/nfstay/create-reservation`

**Filter bar:**
- Search input (guest name, email, reservation ID)
- Status dropdown: All | Pending | Confirmed | Cancelled | Completed | No Show | Expired
- Property filter dropdown (operator's properties)
- View toggle: List | Calendar

**List view:**
- Each row/card: `NfsReservationCard`
  - Guest name + email
  - Property name
  - Check-in → Check-out dates
  - Guests count
  - Status badge
  - Total amount
  - Click → `/nfstay/reservations/:id`

**Calendar view:**
- `NfsCalendarView`
- Month grid with reservation blocks colour-coded by status
- Click reservation block → `/nfstay/reservations/:id`

---

### NfsReservationDetail

**Route:** `/nfstay/reservations/:id`

**Header:** Back button + "Reservation #[short_id]" + status badge

**Sections:**

1. **Guest info:** Name, email, phone, address, city, country
2. **Booking details:** Property name (link), check-in date+time, check-out date+time, N nights
3. **Guests:** X adults, X children, X infants, X pets
4. **Guest message** (if any)
5. **Pricing breakdown:** Nightly rate × nights, cleaning fee, discounts, promo, total
6. **Payment:** Payment status badge, Stripe charge ID, amount paid, currency
7. **Status management:** Dropdown to change status (pending → confirmed, cancelled, completed, no_show, expired) + Save button
8. **Refund section** (if payment_status = 'paid'): Refund amount input + reason + confirm
9. **Timeline/history:** Status change log (from Hospitable or manual)
10. **Actions:** Send email to guest button, Export button

---

### NfsCreateReservation

**Route:** `/nfstay/create-reservation`
**Purpose:** Operator manually creates a reservation (e.g. phone booking)

**Form sections:**

1. **Property** — dropdown of operator's listed properties
2. **Dates** — check-in date + time, check-out date + time
3. **Guest info** — first name, last name, email, phone
4. **Guests** — adults, children, infants, pets
5. **Extras** — guest message, add-ons, custom fees
6. **Pricing** — shows calculated total (read-only), with override option
7. **Status** — dropdown: confirmed (default), pending
8. **Notes** — internal notes field

**On submit:** Creates `nfs_reservations` row. Success → redirect to `/nfstay/reservations/:id`.

---

### NfsOperatorSettings

**Route:** `/nfstay/settings`
**Layout:** Tab bar at top, content below

**Tabs:**

| Tab | Component | Fields |
|-----|-----------|--------|
| Profile | `SettingsProfile` | first_name, last_name, persona_type, listings_count |
| Contact | `SettingsContact` | contact_email, contact_phone, contact_whatsapp, contact_telegram |
| Branding | `SettingsBranding` | logo_url upload, accent_color picker, favicon_url upload, brand_name |
| Social | `SettingsSocial` | social_twitter, social_instagram, social_facebook, social_tiktok, social_youtube, google_business_url, airbnb_url |
| Promo Codes | `NfsPromoCodeManager` | List + create/edit/delete promo codes |
| Stripe | `SettingsStripe` | Stripe Connect status, connect button, earnings summary, disconnect button |
| Hospitable | `SettingsHospitable` | Connection status, connect/disconnect, sync stats, manual sync button |
| Domain | `SettingsDomain` | subdomain (nfstay.app), custom_domain input, DNS instructions, verify button |
| Analytics | `SettingsAnalytics` | google_analytics_id, meta_pixel_id, meta_title, meta_description |
| Landing Page | (in Branding or separate) | hero_photo, hero_headline, hero_subheadline, about_bio, about_photo, faqs editor |
| Account | (basic) | Change email, change password, invite team members |

---

### NfsAnalytics

**Route:** `/nfstay/analytics`

**Controls:**
- Time range selector: 7 days | 30 days | 90 days

**Stat cards (4 across):**
1. Page Views (total)
2. Property Views (total)
3. Bookings Started (checkout page hits)
4. Conversion Rate (bookings ÷ property views, %)

**Chart:**
- Daily Activity bar chart — X axis = date, Y axis = event count
- Stacked or grouped by event type

**Property breakdown table:**
- Each listed property: views, booking starts, conversion, revenue

---

### NfsAnalytics

**Route:** `/nfstay/analytics`
*(described above)*

---

## White-Label Pages

### NfsWlLanding

**Route:** `/` on operator subdomain or custom domain

**Sections:**

1. **Hero** — operator's `hero_photo` as background. `hero_headline` and `hero_subheadline` text. Search form (searches operator's properties only). Accent color applied to button.
2. **About** — operator's `about_photo` + `about_bio` text.
3. **Properties** — grid of the operator's `listing_status = 'listed'` properties.
4. **FAQs** — accordion from operator's `faqs` JSONB array.
5. **Contact** — links to `contact_phone`, `contact_whatsapp`, `contact_email`.

**Branding applied throughout:**
- `accent_color` on buttons, links, highlights
- `logo_url` in header
- `brand_name` as site name
- `favicon_url` as page icon

---

### NfsWlSearch

**Route:** `/search` on white-label domain
**Same as `NfsSearch` but:**
- Only shows this operator's properties
- Header uses operator branding (`NfsWhiteLabelLayout`)
- Search scoped by `operator_id`

---

### NfsWlProperty

**Route:** `/property/:id` on white-label domain
**Same as `NfsPropertyView` but:**
- Layout uses operator branding
- Booking widget `operatorDomain` field set to operator's domain
- `booking_source = 'white_label'` in reservation

---

### NfsWlPaymentSuccess / NfsWlPaymentCancel

**Same as main site versions but wrapped in `NfsWhiteLabelLayout` with operator branding.**

---

## Shared Components Summary

| Component | Used in |
|-----------|---------|
| `NfsPropertyCard` | Search, Landing, WL Search |
| `NfsPhotoGallery` | PropertyView, WL Property |
| `NfsPhotoUpload` | PropertyDetail (admin edit), PropertyNew wizard |
| `NfsBookingWidget` | PropertyView, WL Property |
| `NfsCheckoutPage` | Shared (main + WL) |
| `NfsSearchMap` | Search (map mode) |
| `NfsPropertyMap` | PropertyView (location section) |
| `NfsHeroSearch` | MainLanding |
| `NfsPopularDestinations` | MainLanding |
| `NfsPromoCodeInput` | BookingWidget, CheckoutPage |
| `NfsPromoCodeManager` | Settings → Promo Codes tab |
| `NfsCalendarView` | Reservations (calendar mode) |
| `NfsReservationCard` | Reservations list |
| `PropertyCalendars` | PropertyDetail → Availability tab |
| `NfsPlacesAutocomplete` | PropertyNew Step 2, HeroSearch |
| `NfsOperatorGuard` | All /nfstay/* routes |

---

## Key sessionStorage Keys

| Key | Set by | Read by | Content |
|-----|--------|---------|---------|
| `nfs_booking_intent` | `NfsBookingWidget` on "Reserve" | `NfsCheckoutPage` on mount | `{ propertyId, checkIn, checkOut, adults, children, operatorDomain, bookingSource, expiresAt }` |
| `nfs_last_reservation` | `NfsCheckoutPage` before Stripe redirect | `NfsPaymentSuccess` on mount | Full reservation summary for confirmation display |

---

## Data Hooks Summary

| Hook | Returns | Fetches from |
|------|---------|-------------|
| `useNfsOperator()` | `{ operator, loading, error, refetch }` | `nfs_operators` WHERE `profile_id = auth.uid()` |
| `useNfsProperties()` | `{ properties[], loading, error }` | `nfs_properties` WHERE `operator_id = operator.id` |
| `useNfsProperty(id)` | `{ property, loading, error }` | `nfs_properties` single row |
| `useNfsPropertySearch()` | `{ results[], loading, error, search(params) }` | `nfs_properties` WHERE `listing_status = 'listed'` + filters |
| `useNfsReservations(filters?)` | `{ reservations[], loading, error }` | `nfs_reservations` WHERE `operator_id = operator.id` |
| `useNfsReservation(id)` | `{ reservation, loading, error }` | `nfs_reservations` single row |
| `useNfsReservationMutation()` | `{ create, update, updateStatus, cancel }` | Mutates `nfs_reservations` |
| `useNfsPropertyMutation()` | `{ create, update, delete, bulkStatus }` | Mutates `nfs_properties` |
| `useNfsPricing(property, dates, guests)` | `{ pricing, promoDiscount, setPromoDiscount }` | Calculated client-side |
| `useNfsStripeAccount()` | `{ account, loading, error }` | `nfs_stripe_accounts` |
| `useNfsStripeConnect()` | `{ connect, loading }` | Edge fn `nfs-stripe-connect-oauth` |
| `useNfsStripeCheckout()` | `{ createSession, loading }` | Edge fn `nfs-stripe-checkout` |
| `useNfsWhiteLabel()` | `{ isWhiteLabel, isMainSite, operator, loading }` | Domain check + `nfs_operators` |
| `useNfsAnalyticsSummary(days)` | `{ summary, loading }` | `nfs_analytics` |
| `useNfsPromoCode()` | `{ promoCodes[], create, update, delete }` | `nfs_promo_codes` |
| `useNfsAvailability(propertyId, dates)` | `{ available, blockedDates }` | `nfs_reservations` for date conflicts |
| `useNfsImageUpload()` | `{ upload, uploading, error }` | Supabase Storage bucket `nfs-images` |
| `useNfsOperatorUpdate()` | `{ update, loading, error }` | Mutates `nfs_operators` |
| `useNfsOnboarding()` | `{ step, save, complete }` | Mutates `nfs_operators.onboarding_step` |
