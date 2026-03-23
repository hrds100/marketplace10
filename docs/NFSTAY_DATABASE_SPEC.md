# nfstay - Database Spec
*Exact Supabase table/column names the frontend touches. Backend wires to these.*

---

## Rules

- All nfstay tables use the `nfs_` prefix
- They live in the `public` schema alongside existing tables
- Do NOT add columns to `profiles` or any existing table
- nfstay inserts into the existing `notifications` table (no schema change needed)
- All tables have `created_at` and `updated_at` (auto-set by triggers)

---

## Shared Tables (Already Exist - Read Only for nfstay)

| Table | How nfstay uses it |
|-------|-------------------|
| `profiles` | `nfs_operators.profile_id` references `profiles.id`. No new columns. |
| `auth.users` | Supabase Auth - same login system. Not touched directly. |
| `notifications` | nfstay INSERTS into this when bookings are confirmed, cancelled, etc. |

---

## New Tables

---

### `nfs_operators`

One row per operator account. Created after first sign-in when operator completes step 1 of onboarding.

```sql
CREATE TABLE nfs_operators (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id                  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Identity
  first_name                  TEXT,
  last_name                   TEXT,

  -- Persona
  persona_type                TEXT CHECK (persona_type IN ('owner', 'property_manager')),
  listings_count              INTEGER DEFAULT 0,

  -- Business
  brand_name                  TEXT,
  legal_name                  TEXT,
  subdomain                   TEXT UNIQUE,

  -- Domain
  primary_domain_type         TEXT DEFAULT 'subdomain' CHECK (primary_domain_type IN ('subdomain', 'custom')),
  custom_domain               TEXT,
  custom_domain_verified      BOOLEAN DEFAULT false,
  custom_domain_dns_verified  BOOLEAN DEFAULT false,
  custom_domain_dns_method    TEXT,
  custom_domain_dns_checked_at TIMESTAMPTZ,
  custom_domain_cf            JSONB DEFAULT '{}',

  -- Branding
  accent_color                TEXT,
  logo_url                    TEXT,
  logo_alt                    TEXT,
  favicon_url                 TEXT,

  -- Landing Page
  landing_page_enabled        BOOLEAN DEFAULT true,
  hero_photo                  TEXT,
  hero_headline               TEXT,
  hero_subheadline            TEXT,
  about_bio                   TEXT,
  about_photo                 TEXT,
  faqs                        JSONB DEFAULT '[]',   -- [{ question, answer }]

  -- Contact
  contact_email               TEXT,
  contact_phone               TEXT,
  contact_whatsapp            TEXT,
  contact_telegram            TEXT,

  -- External / Social
  google_business_url         TEXT,
  airbnb_url                  TEXT,
  social_twitter              TEXT,
  social_instagram            TEXT,
  social_facebook             TEXT,
  social_tiktok               TEXT,
  social_youtube              TEXT,

  -- Analytics / SEO
  google_analytics_id         TEXT,
  meta_pixel_id               TEXT,
  meta_title                  TEXT,
  meta_description            TEXT,

  -- Payment
  fees_options_enabled        BOOLEAN DEFAULT false,

  -- Onboarding
  onboarding_step             TEXT DEFAULT 'account_setup'
                                CHECK (onboarding_step IN (
                                  'account_setup','persona','usage_intent','business',
                                  'landing_page','website_customization','contact_info',
                                  'payment_methods','completed')),
  onboarding_completed_steps  TEXT[] DEFAULT '{}',
  onboarding_skipped_steps    TEXT[] DEFAULT '{}',
  onboarding_preference       TEXT CHECK (onboarding_preference IN (
                                'create_from_scratch','import_from_airbnb',
                                'import_from_pms','need_advice')),
  usage_intent                TEXT CHECK (usage_intent IN (
                                'direct_booking','vacation_rental',
                                'booking_widget','undecided')),
  onboarding_updated_at       TIMESTAMPTZ DEFAULT now(),

  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now(),

  UNIQUE(profile_id)
);
```

**RLS:**
- Operator can SELECT/UPDATE their own row (`profile_id = auth.uid()`)
- Service role (n8n, edge functions) bypasses RLS
- No public read access

---

### `nfs_stripe_accounts`

One row per operator. Stores Stripe Connect OAuth state and earnings. Kept separate from `nfs_operators` to keep Stripe data clean.

```sql
CREATE TABLE nfs_stripe_accounts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id             UUID NOT NULL REFERENCES nfs_operators(id) ON DELETE CASCADE,

  -- Stripe Connect
  connect_account_id      TEXT,
  access_token            TEXT,
  refresh_token           TEXT,
  stripe_user_id          TEXT,
  stripe_publishable_key  TEXT,

  -- OAuth handshake state (temporary)
  oauth_state             TEXT,
  oauth_code_verifier     TEXT,

  -- Account status
  connection_status       TEXT DEFAULT '',
  account_status          TEXT DEFAULT 'pending',
  details_submitted       BOOLEAN DEFAULT false,
  payouts_enabled         BOOLEAN DEFAULT false,
  charges_enabled         BOOLEAN DEFAULT false,
  currently_due           TEXT[] DEFAULT '{}',
  past_due                TEXT[] DEFAULT '{}',

  -- Platform fee config
  platform_fee_pct        NUMERIC(5,2) DEFAULT 3.0,
  stripe_fee_pct          NUMERIC(5,2) DEFAULT 2.9,
  stripe_fee_fixed        INTEGER DEFAULT 30,       -- cents

  -- Earnings (updated by webhook)
  total_earned            NUMERIC DEFAULT 0,
  total_platform_fees     NUMERIC DEFAULT 0,
  total_transferred       NUMERIC DEFAULT 0,
  total_paid_out          NUMERIC DEFAULT 0,
  pending_amount          NUMERIC DEFAULT 0,
  last_payout_date        TIMESTAMPTZ,
  last_payout_amount      NUMERIC,

  -- Lifecycle
  connected_at            TIMESTAMPTZ,
  disconnected_at         TIMESTAMPTZ,
  onboarding_completed    BOOLEAN DEFAULT false,
  last_error              JSONB,

  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);
```

**RLS:** Operator can read own row. Only service role writes (via Stripe webhook edge function).

---

### `nfs_operator_users`

Team members per operator. One operator can invite multiple users (editor, affiliate role).

```sql
CREATE TABLE nfs_operator_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id),
  operator_id UUID NOT NULL REFERENCES nfs_operators(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'affiliate')),
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  invited_by  UUID REFERENCES profiles(id),
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),

  UNIQUE(profile_id, operator_id)
);
```

**RLS:** Operator admin can read/insert/update rows for their `operator_id`.

---

### `nfs_properties`

One row per property listing. Created as a draft, published when wizard is completed.

```sql
CREATE TABLE nfs_properties (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id                 UUID NOT NULL REFERENCES nfs_operators(id) ON DELETE CASCADE,

  -- Wizard state
  status                      TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  listing_status              TEXT DEFAULT 'draft'
                                CHECK (listing_status IN ('listed', 'unlisted', 'archived', 'draft')),
  source                      TEXT DEFAULT 'nfstay' CHECK (source IN ('airbnb', 'nfstay')),
  current_step                TEXT DEFAULT 'propertyBasics',
  completed_steps             TEXT[] DEFAULT '{}',

  -- Basics (wizard step 1)
  property_type               TEXT,         -- e.g. 'house', 'apartment', 'villa'
  rental_type                 TEXT,         -- e.g. 'entire_place', 'private_room'
  accommodation_type          TEXT,
  size_value                  NUMERIC,
  size_unit                   TEXT,         -- 'sqm' or 'sqft'

  -- Location (wizard step 2)
  address                     TEXT,
  city                        TEXT,
  state                       TEXT,
  country                     TEXT,
  postal_code                 TEXT,
  street                      TEXT,
  lat                         NUMERIC,
  lng                         NUMERIC,
  timezone                    TEXT,

  -- Guests & Rooms (wizard step 3)
  max_guests                  INTEGER,
  allow_children              BOOLEAN DEFAULT false,
  room_counts                 JSONB DEFAULT '[]',
  -- room_counts shape: [{ type: 'bedroom'|'bathroom'|'bed', count: number }]
  room_sections               JSONB DEFAULT '[]',
  -- room_sections shape: [{ name, beds: [{ type, count }] }]

  -- Photos (wizard step 4)
  images                      JSONB DEFAULT '[]',
  -- images shape: [{ url, caption, order, is_cover }]

  -- Amenities (wizard step 5)
  amenities                   JSONB DEFAULT '{}',
  -- amenities shape: { wifi: true, pool: false, parking: true, ... }

  -- Description (wizard step 6)
  public_title                TEXT,
  internal_title              TEXT,
  description                 TEXT,

  -- House Rules (wizard step 7)
  check_in_time               TEXT,         -- e.g. '15:00'
  check_out_time              TEXT,         -- e.g. '11:00'
  max_pets                    INTEGER,
  rules                       TEXT,
  cancellation_policy         TEXT,         -- e.g. 'flexible', 'moderate', 'strict'

  -- Availability (wizard step 8)
  availability_window         TEXT DEFAULT '2_years',
  advance_notice              INTEGER DEFAULT 0,   -- days before check-in
  minimum_stay                INTEGER DEFAULT 1,   -- nights
  date_ranges                 JSONB DEFAULT '[]',  -- available windows
  blocked_date_ranges         JSONB DEFAULT '[]',  -- [{start, end, reason}]

  -- iCal (wizard step 8 or separate tab)
  inbound_calendars           JSONB DEFAULT '[]',  -- [{url, name, lastSync, status}]
  outbound_calendar_url       TEXT,

  -- Fees & Taxes (wizard step 9)
  cleaning_fee                JSONB DEFAULT '{"enabled": false}',
  -- cleaning_fee shape: { enabled, amount, currency, type: 'per_stay'|'per_night' }
  extra_guest_fee             JSONB DEFAULT '{"enabled": false}',
  custom_fees                 JSONB DEFAULT '[]',
  custom_taxes                JSONB DEFAULT '[]',

  -- Discounts (wizard step 9)
  weekly_discount             JSONB DEFAULT '{"enabled": false}',
  -- shape: { enabled, type: 'percentage'|'fixed', value }
  monthly_discount            JSONB DEFAULT '{"enabled": false}',

  -- Rates (wizard step 9)
  base_rate_currency          TEXT DEFAULT 'USD',
  base_rate_amount            NUMERIC DEFAULT 100,
  daily_rates                 JSONB DEFAULT '{}',  -- { "2026-03-15": 150, ... }
  custom_rates                JSONB DEFAULT '[]',
  synced_rate_modifier        JSONB,

  -- Hospitable sync (populated by n8n)
  hospitable_property_id      TEXT,
  hospitable_connected        BOOLEAN DEFAULT false,
  hospitable_last_sync_at     TIMESTAMPTZ,
  hospitable_sync_status      TEXT DEFAULT 'pending',
  hospitable_connection_id    TEXT,
  hospitable_customer_id      TEXT,
  hospitable_platform_mappings JSONB DEFAULT '[]',

  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_nfs_properties_operator   ON nfs_properties(operator_id);
CREATE INDEX idx_nfs_properties_listing    ON nfs_properties(listing_status);
CREATE INDEX idx_nfs_properties_location   ON nfs_properties(city, country);
CREATE INDEX idx_nfs_properties_search     ON nfs_properties
  USING GIN (to_tsvector('english',
    coalesce(public_title,'') || ' ' ||
    coalesce(description,'') || ' ' ||
    coalesce(city,'') || ' ' ||
    coalesce(country,'')
  ));
```

**RLS:**
```sql
-- Operators see their own properties
CREATE POLICY "operator_own_properties" ON nfs_properties
  FOR ALL USING (
    operator_id IN (SELECT id FROM nfs_operators WHERE profile_id = auth.uid())
  );

-- Travelers can read listed properties (public)
CREATE POLICY "public_listed_properties" ON nfs_properties
  FOR SELECT USING (listing_status = 'listed');
```

---

### `nfs_reservations`

One row per booking. Created by: guest checkout flow, operator manual creation, or Hospitable sync.

```sql
CREATE TABLE nfs_reservations (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id                 UUID NOT NULL REFERENCES nfs_properties(id),
  operator_id                 UUID REFERENCES nfs_operators(id),
  created_by                  UUID REFERENCES profiles(id),   -- NULL if guest checkout

  -- Guest info
  guest_email                 TEXT,
  guest_first_name            TEXT,
  guest_last_name             TEXT,
  guest_phone                 TEXT,
  guest_address               TEXT,
  guest_city                  TEXT,
  guest_country               TEXT,

  -- Booking
  booking_source              TEXT DEFAULT 'operator_direct'
                                CHECK (booking_source IN (
                                  'main_platform', 'white_label', 'operator_direct')),
  operator_domain             TEXT,           -- the domain used when booking (for white-label)
  check_in                    DATE NOT NULL,
  check_out                   DATE NOT NULL,
  check_in_time               TEXT NOT NULL,  -- e.g. '15:00'
  check_out_time              TEXT NOT NULL,  -- e.g. '11:00'
  guest_message               TEXT DEFAULT '',
  status                      TEXT DEFAULT 'pending'
                                CHECK (status IN (
                                  'pending','confirmed','cancelled',
                                  'completed','no_show','expired')),

  -- Guests
  adults                      INTEGER DEFAULT 1,
  children                    INTEGER DEFAULT 0,
  infants                     INTEGER DEFAULT 0,
  pets                        INTEGER DEFAULT 0,

  -- Pricing
  total_amount                NUMERIC NOT NULL,
  discounts                   JSONB DEFAULT '[]',
  add_ons                     JSONB DEFAULT '[]',
  custom_fees                 JSONB DEFAULT '[]',
  synced_rate_modifier        JSONB,
  expiration                  JSONB,
  block_dates                 BOOLEAN DEFAULT false,

  -- Payment
  payment_status              TEXT DEFAULT 'pending'
                                CHECK (payment_status IN (
                                  'pending','paid','partially_refunded','refunded','failed')),
  stripe_charge_id            TEXT,
  stripe_payment_intent_id    TEXT,
  stripe_transfer_id          TEXT,
  stripe_refund_id            TEXT,
  payment_currency            TEXT DEFAULT 'USD',
  payment_amounts             JSONB DEFAULT '{}',
  payment_fee_breakdown       JSONB DEFAULT '[]',
  payment_processed_at        TIMESTAMPTZ,
  refund_amount               NUMERIC,
  refund_status               TEXT,
  refund_reason               TEXT,
  refund_at                   TIMESTAMPTZ,
  promo_code                  TEXT,
  promo_discount_amount       NUMERIC,

  -- Guest session (for unauthenticated guest lookup)
  guest_token                 TEXT,
  is_linked_to_user           BOOLEAN DEFAULT false,
  linked_at                   TIMESTAMPTZ,

  -- Hospitable (populated by n8n if synced from Airbnb)
  hospitable_reservation_id   TEXT,
  hospitable_platform         TEXT,
  hospitable_platform_id      TEXT,
  hospitable_connection_id    TEXT,
  hospitable_status           TEXT,
  hospitable_financials       JSONB,
  hospitable_status_history   JSONB DEFAULT '[]',
  hospitable_last_sync_at     TIMESTAMPTZ,

  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_nfs_reservations_property    ON nfs_reservations(property_id, status);
CREATE INDEX idx_nfs_reservations_dates       ON nfs_reservations(check_in, check_out);
CREATE INDEX idx_nfs_reservations_guest       ON nfs_reservations(guest_email);
CREATE INDEX idx_nfs_reservations_operator    ON nfs_reservations(operator_id);
CREATE INDEX idx_nfs_reservations_hospitable  ON nfs_reservations(hospitable_reservation_id);
CREATE INDEX idx_nfs_reservations_token       ON nfs_reservations(guest_token);
```

**RLS:**
```sql
-- Operators see reservations for their properties
CREATE POLICY "operator_reservations" ON nfs_reservations
  FOR ALL USING (
    operator_id IN (SELECT id FROM nfs_operators WHERE profile_id = auth.uid())
  );

-- Guests can read their own reservation by token (unauthenticated lookup)
-- Handled via edge function or service role - not direct RLS
```

---

### `nfs_promo_codes`

Discount codes created by operators, validated at checkout.

```sql
CREATE TABLE nfs_promo_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id   UUID NOT NULL REFERENCES nfs_operators(id) ON DELETE CASCADE,
  name          TEXT,
  code          TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
  value         NUMERIC NOT NULL CHECK (value >= 0),
  currency      TEXT CHECK (currency IN ('USD', 'EUR', 'GBP')),
  valid_from    TIMESTAMPTZ,
  valid_to      TIMESTAMPTZ,
  limited_uses  BOOLEAN DEFAULT false,
  max_uses      INTEGER,
  current_uses  INTEGER DEFAULT 0,
  status        TEXT DEFAULT 'active'
                  CHECK (status IN ('active', 'expired', 'inactive', 'draft')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

**RLS:** Operator can read/write own codes. Public can read `code` + `value` for validation (via edge function or service role).

---

### `nfs_hospitable_connections`

One row per Hospitable OAuth connection per operator.

```sql
CREATE TABLE nfs_hospitable_connections (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id              UUID NOT NULL REFERENCES profiles(id),
  operator_id             UUID NOT NULL REFERENCES nfs_operators(id) ON DELETE CASCADE,

  hospitable_customer_id  TEXT NOT NULL,
  hospitable_connection_id TEXT,
  channel_info            JSONB DEFAULT '{}',

  auth_code               TEXT,
  auth_code_expires_at    TIMESTAMPTZ,

  status                  TEXT DEFAULT 'pending'
                            CHECK (status IN ('pending', 'connected', 'disconnected', 'failed')),
  is_active               BOOLEAN DEFAULT true,
  connected_at            TIMESTAMPTZ,
  disconnected_at         TIMESTAMPTZ,

  last_sync_at            TIMESTAMPTZ DEFAULT now(),
  sync_status             TEXT DEFAULT 'pending'
                            CHECK (sync_status IN ('pending', 'syncing', 'completed', 'failed')),

  user_metadata           JSONB DEFAULT '{}',
  connected_platforms     JSONB DEFAULT '[]',
  total_properties        INTEGER DEFAULT 0,
  total_reservations      INTEGER DEFAULT 0,
  last_sync_results       JSONB DEFAULT '{}',
  sync_progress           JSONB DEFAULT '{}',

  health_status           TEXT DEFAULT 'healthy'
                            CHECK (health_status IN ('healthy', 'warning', 'error')),
  last_health_check       TIMESTAMPTZ,
  last_sync_error         TEXT,
  last_error              JSONB,

  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);
```

---

### `nfs_analytics`

Event tracking. Populated by edge function called from frontend on page/property/booking events.

```sql
CREATE TABLE nfs_analytics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id     UUID NOT NULL REFERENCES nfs_operators(id),
  property_id     UUID REFERENCES nfs_properties(id),
  event_type      TEXT NOT NULL,
  -- event_type values: 'page_view', 'property_view', 'booking_start', 'booking_complete'

  -- Page context
  user_agent      TEXT,
  ip_address      TEXT,
  referrer        TEXT,
  session_id      TEXT,
  device_type     TEXT,    -- 'mobile', 'desktop', 'tablet'
  view_source     TEXT DEFAULT 'direct',

  -- Booking context (for booking events)
  reservation_id  UUID REFERENCES nfs_reservations(id),
  booking_data    JSONB DEFAULT '{}',

  timestamp       TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_nfs_analytics_operator  ON nfs_analytics(operator_id, event_type, timestamp DESC);
CREATE INDEX idx_nfs_analytics_property  ON nfs_analytics(property_id, event_type, timestamp DESC);
```

**RLS:** Operators can SELECT their own events. INSERT via service role (edge function) only.

---

### `nfs_webhook_events`

Idempotency log for Stripe and Hospitable webhooks.

```sql
CREATE TABLE nfs_webhook_events (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  source            TEXT NOT NULL CHECK (source IN ('stripe', 'stripe_connect', 'hospitable')),
  external_event_id TEXT NOT NULL UNIQUE,   -- e.g. Stripe event ID
  event_type        TEXT NOT NULL,
  processed         BOOLEAN DEFAULT false,
  success           BOOLEAN,
  error             TEXT,
  data              JSONB NOT NULL,
  processed_at      TIMESTAMPTZ,
  retry_count       INTEGER DEFAULT 0,
  last_retry_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_nfs_webhook_lookup  ON nfs_webhook_events(external_event_id);
CREATE INDEX idx_nfs_webhook_retry   ON nfs_webhook_events(processed, success)
  WHERE processed = true AND success = false;
```

**RLS:** Service role only. No frontend reads.

---

### `nfs_auth_tokens`

Magic link / invite tokens. Row deleted (or expires) after use.

```sql
CREATE TABLE nfs_auth_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  token       TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('verification', 'passwordless', 'invitation')),
  operator_id UUID REFERENCES nfs_operators(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 hour')
);

CREATE INDEX idx_nfs_auth_tokens_email  ON nfs_auth_tokens(email);
CREATE INDEX idx_nfs_auth_tokens_token  ON nfs_auth_tokens(token);
```

**RLS:** Service role only. Verified via edge function.

---

### `nfs_guest_sessions`

Lets unauthenticated guests access their reservations by token (set in cookie/localStorage at checkout).

```sql
CREATE TABLE nfs_guest_sessions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token                TEXT NOT NULL UNIQUE,
  session_data         JSONB DEFAULT '{}',
  linked_reservations  UUID[] DEFAULT '{}',
  linked_user_id       UUID REFERENCES profiles(id),
  linked_at            TIMESTAMPTZ,
  expires_at           TIMESTAMPTZ NOT NULL,
  created_at           TIMESTAMPTZ DEFAULT now()
);
```

**RLS:** Service role creates. Guest reads via edge function (token-based, not auth.uid()).

---

## Entity Relationships

```
profiles (EXISTING)
  │
  ├── nfs_operators          1:1   (profile_id → profiles.id)
  │     │
  │     ├── nfs_stripe_accounts     1:1   (operator_id)
  │     ├── nfs_operator_users      1:many (operator_id)
  │     ├── nfs_promo_codes         1:many (operator_id)
  │     ├── nfs_hospitable_connections 1:many (operator_id)
  │     ├── nfs_analytics           1:many (operator_id)
  │     │
  │     └── nfs_properties          1:many (operator_id)
  │           │
  │           ├── nfs_reservations  1:many (property_id)
  │           │     └── nfs_analytics (reservation_id FK optional)
  │           └── nfs_analytics     (property_id FK optional)
  │
  ├── nfs_operator_users     many:many bridge (profile_id + operator_id)
  └── nfs_guest_sessions     (linked_user_id → profiles.id, optional)

nfs_webhook_events           standalone (no FK - stores raw data)
nfs_auth_tokens              (operator_id → nfs_operators, optional)
```

---

## Supabase Storage Buckets

| Bucket | Contents | Access |
|--------|----------|--------|
| `nfs-images` | Property photos | Public read, operator write (via SDK) |
| `nfs-branding` | Operator logos, favicons, hero photos | Public read, operator write |

Upload path convention:
- Property images: `nfs-images/{operator_id}/{property_id}/{filename}`
- Branding: `nfs-branding/{operator_id}/{filename}`

---

## Edge Functions

| Function name | Trigger | What it does |
|---------------|---------|-------------|
| `nfs-stripe-checkout` | Frontend POST | Creates Stripe Checkout session, returns URL |
| `nfs-stripe-connect-oauth` | Frontend POST | Initiates Stripe Connect OAuth flow |
| `nfs-stripe-webhook` | Stripe POST | Verifies signature, updates `nfs_reservations` + `nfs_stripe_accounts`, writes `nfs_webhook_events` |
| `nfs-hospitable-webhook` | Hospitable POST | Verifies signature, enqueues to n8n webhook URL, writes `nfs_webhook_events` |
| `nfs-ical-feed` | Public GET | Generates `.ics` calendar for a property |
| `nfs-domain-check` | Frontend GET | Resolves white-label domain → operator |
| `nfs-email-send` | Internal POST | Sends transactional email via Resend |

---

## JSONB Field Shapes

### `nfs_properties.images`
```json
[
  { "url": "https://...", "caption": "Living room", "order": 0, "is_cover": true },
  { "url": "https://...", "caption": "", "order": 1, "is_cover": false }
]
```

### `nfs_properties.room_counts`
```json
[
  { "type": "bedroom", "count": 3 },
  { "type": "bathroom", "count": 2 },
  { "type": "bed", "count": 4 }
]
```

### `nfs_properties.amenities`
```json
{
  "wifi": true,
  "pool": false,
  "parking": true,
  "kitchen": true,
  "air_conditioning": true,
  "washer": false,
  "dryer": false,
  "tv": true,
  "gym": false,
  "elevator": false,
  "balcony": true,
  "bbq": false,
  "hot_tub": false,
  "beach_access": false,
  "ski_in_out": false,
  "ev_charger": false,
  "baby_cot": false,
  "high_chair": false,
  "smoke_alarm": true,
  "carbon_monoxide_alarm": true,
  "fire_extinguisher": false,
  "first_aid_kit": false
}
```

### `nfs_properties.cleaning_fee`
```json
{ "enabled": true, "amount": 50, "currency": "GBP", "type": "per_stay" }
```

### `nfs_properties.weekly_discount`
```json
{ "enabled": true, "type": "percentage", "value": 10 }
```

### `nfs_properties.inbound_calendars`
```json
[
  {
    "url": "https://www.airbnb.com/calendar/ical/12345.ics",
    "name": "Airbnb",
    "last_sync": "2026-03-15T12:00:00Z",
    "status": "ok"
  }
]
```

### `nfs_operators.faqs`
```json
[
  { "question": "What is your cancellation policy?", "answer": "Flexible - full refund if cancelled 24 hours before check-in." },
  { "question": "Is parking available?", "answer": "Yes, free on-site parking for all guests." }
]
```

### `nfs_reservations.payment_amounts`
```json
{
  "subtotal": 700,
  "cleaning_fee": 50,
  "promo_discount": -70,
  "platform_fee": 22,
  "total": 702
}
```

### `nfs_reservations.payment_fee_breakdown`
```json
[
  { "type": "platform_fee", "label": "nfstay service fee", "amount": 22 },
  { "type": "stripe_fee", "label": "Payment processing", "amount": 20.36 }
]
```

---

## Key Column Lookup - "What query fetches X?"

| UI need | Table | Filter |
|---------|-------|--------|
| Operator's own profile | `nfs_operators` | `profile_id = auth.uid()` |
| All listed properties (public search) | `nfs_properties` | `listing_status = 'listed'` |
| Single property detail | `nfs_properties` | `id = :id AND listing_status = 'listed'` |
| Operator's own properties | `nfs_properties` | `operator_id = :operator_id` |
| Operator's reservations | `nfs_reservations` | `operator_id = :operator_id ORDER BY check_in DESC` |
| Reservations for a property | `nfs_reservations` | `property_id = :property_id AND status IN ('confirmed','pending')` |
| Availability check (is date blocked?) | `nfs_reservations` | `property_id = :id AND check_in < :check_out AND check_out > :check_in AND status NOT IN ('cancelled','expired')` |
| Guest lookup by email | `nfs_reservations` | `guest_email = :email` |
| Guest lookup by token | `nfs_reservations` | `guest_token = :token` |
| Operator's promo codes | `nfs_promo_codes` | `operator_id = :id AND status = 'active'` |
| Validate promo code | `nfs_promo_codes` | `code = :code AND status = 'active' AND (valid_to IS NULL OR valid_to > now())` |
| Analytics summary | `nfs_analytics` | `operator_id = :id AND timestamp > now() - INTERVAL ':days days'` GROUP BY `event_type` |
| White-label domain lookup | `nfs_operators` | `subdomain = :subdomain` OR `custom_domain = :domain` |
| Stripe account status | `nfs_stripe_accounts` | `operator_id = :id` |
| Hospitable connection | `nfs_hospitable_connections` | `operator_id = :id AND is_active = true` |
