# NFStay — Database Schema

> Complete schema reference for all NFStay tables. Single source of truth.
> All NFStay tables use the `nfs_` prefix. All live in the `public` schema alongside marketplace10 tables.

---

## 1. TABLE INVENTORY

| Table | Purpose | Owner | RLS |
|-------|---------|-------|-----|
| `nfs_operators` | Operator accounts, branding, onboarding, settings | NFStay | ON |
| `nfs_stripe_accounts` | Stripe Connect data per operator | NFStay | ON |
| `nfs_operator_users` | Multi-user access (team members) | NFStay | ON |
| `nfs_properties` | Vacation rental listings | NFStay | ON |
| `nfs_reservations` | Bookings and payment records | NFStay | ON |
| `nfs_promo_codes` | Discount codes | NFStay | ON |
| `nfs_hospitable_connections` | Hospitable OAuth + sync state | NFStay | ON |
| `nfs_analytics` | Page views and booking events | NFStay | ON |
| `nfs_webhook_events` | Webhook idempotency (Stripe/Hospitable) | NFStay | ON |
| `nfs_auth_tokens` | Magic links and invitation tokens | NFStay | ON |
| `nfs_guest_sessions` | Anonymous guest session tracking | NFStay | ON |

### Shared tables (READ-ONLY for NFStay)

| Table | How NFStay uses it | Writes? |
|-------|-------------------|---------|
| `profiles` | Read `id`, `name`, `email` for auth context | **NO** — never write or add columns |
| `notifications` | INSERT notification rows for operators/travelers | **INSERT only** — never modify schema |

---

## 2. NEVER TOUCH WITHOUT APPROVAL

These structures must **never** be modified for NFStay purposes without explicit Hugo approval:

1. **`profiles` table** — owned by marketplace10. NFStay reads only.
2. **`auth.users`** — owned by Supabase. Managed by Supabase Auth.
3. **Any existing marketplace10 table** — `properties`, `crm_deals`, `chat_threads`, `chat_messages`, `modules`, `lessons`, etc.
4. **Existing RLS policies on marketplace10 tables**
5. **The `notifications` table schema** — NFStay may INSERT rows but never ALTER the table.

---

## 3. SCHEMA DEFINITIONS

### nfs_operators

```sql
CREATE TABLE nfs_operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Identity
  first_name TEXT,
  last_name TEXT,
  persona_type TEXT CHECK (persona_type IN ('owner', 'property_manager')),
  listings_count INTEGER DEFAULT 0,

  -- Business
  brand_name TEXT,
  legal_name TEXT,
  subdomain TEXT UNIQUE,

  -- Website / Custom Domain
  primary_domain_type TEXT DEFAULT 'subdomain' CHECK (primary_domain_type IN ('subdomain', 'custom')),
  custom_domain TEXT,
  custom_domain_verified BOOLEAN DEFAULT false,
  custom_domain_dns_verified BOOLEAN DEFAULT false,
  custom_domain_dns_method TEXT,
  custom_domain_dns_checked_at TIMESTAMPTZ,
  custom_domain_cf JSONB DEFAULT '{}',

  -- Branding
  accent_color TEXT,
  logo_url TEXT,
  logo_alt TEXT,
  favicon_url TEXT,

  -- Landing Page
  landing_page_enabled BOOLEAN DEFAULT true,
  hero_photo TEXT,
  hero_headline TEXT,
  hero_subheadline TEXT,
  about_bio TEXT,
  about_photo TEXT,
  faqs JSONB DEFAULT '[]',

  -- Contact
  contact_email TEXT,
  contact_phone TEXT,
  contact_whatsapp TEXT,
  contact_telegram TEXT,

  -- External Accounts
  google_business_url TEXT,
  airbnb_url TEXT,
  social_twitter TEXT,
  social_instagram TEXT,
  social_facebook TEXT,
  social_tiktok TEXT,
  social_youtube TEXT,

  -- Analytics / SEO
  google_analytics_id TEXT,
  meta_pixel_id TEXT,
  meta_title TEXT,
  meta_description TEXT,

  -- Payment Settings
  fees_options_enabled BOOLEAN DEFAULT false,

  -- Onboarding
  onboarding_step TEXT DEFAULT 'account_setup'
    CHECK (onboarding_step IN ('account_setup','persona','usage_intent','business',
           'landing_page','website_customization','contact_info','payment_methods','completed')),
  onboarding_completed_steps TEXT[] DEFAULT '{}',
  onboarding_skipped_steps TEXT[] DEFAULT '{}',
  onboarding_preference TEXT CHECK (onboarding_preference IN
    ('create_from_scratch','import_from_airbnb','import_from_pms','need_advice')),
  usage_intent TEXT CHECK (usage_intent IN ('direct_booking','vacation_rental','booking_widget','undecided')),
  onboarding_updated_at TIMESTAMPTZ DEFAULT now(),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS:**
- Operator reads/updates own row: `profile_id = auth.uid()`
- Service role: full access (for webhooks, n8n)
- Public: no access

---

### nfs_stripe_accounts

```sql
CREATE TABLE nfs_stripe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES nfs_operators(id) ON DELETE CASCADE,

  connect_account_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  stripe_user_id TEXT,
  stripe_publishable_key TEXT,
  oauth_state TEXT,
  oauth_code_verifier TEXT,

  connection_status TEXT DEFAULT '',
  account_status TEXT DEFAULT 'pending',
  details_submitted BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  charges_enabled BOOLEAN DEFAULT false,
  currently_due TEXT[] DEFAULT '{}',
  past_due TEXT[] DEFAULT '{}',

  platform_fee_pct NUMERIC(5,2) DEFAULT 3.0,
  stripe_fee_pct NUMERIC(5,2) DEFAULT 2.9,
  stripe_fee_fixed INTEGER DEFAULT 30,

  total_earned NUMERIC DEFAULT 0,
  total_platform_fees NUMERIC DEFAULT 0,
  total_transferred NUMERIC DEFAULT 0,
  total_paid_out NUMERIC DEFAULT 0,
  pending_amount NUMERIC DEFAULT 0,
  last_payout_date TIMESTAMPTZ,
  last_payout_amount NUMERIC,

  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  onboarding_completed BOOLEAN DEFAULT false,
  last_error JSONB,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS:**
- Operator reads/updates own: `operator_id IN (SELECT id FROM nfs_operators WHERE profile_id = auth.uid())`
- Service role: full access

---

### nfs_operator_users

```sql
CREATE TABLE nfs_operator_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  operator_id UUID NOT NULL REFERENCES nfs_operators(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'affiliate')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  invited_by UUID REFERENCES profiles(id),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, operator_id)
);
```

**RLS:**
- Team members see their operator's users: `operator_id IN (SELECT operator_id FROM nfs_operator_users WHERE profile_id = auth.uid())`
- Service role: full access

---

### nfs_properties

```sql
CREATE TABLE nfs_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES nfs_operators(id) ON DELETE CASCADE,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  listing_status TEXT DEFAULT 'draft' CHECK (listing_status IN ('listed', 'unlisted', 'archived', 'draft')),
  source TEXT DEFAULT 'nfstay' CHECK (source IN ('airbnb', 'nfstay')),
  current_step TEXT DEFAULT 'propertyBasics',
  completed_steps TEXT[] DEFAULT '{}',

  -- Basics
  property_type TEXT,
  rental_type TEXT,
  accommodation_type TEXT,
  size_value NUMERIC,
  size_unit TEXT,

  -- Location
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  street TEXT,
  lat NUMERIC,
  lng NUMERIC,
  timezone TEXT,

  -- Guest / Rooms
  max_guests INTEGER,
  allow_children BOOLEAN DEFAULT false,
  room_counts JSONB DEFAULT '[]',
  room_sections JSONB DEFAULT '[]',

  -- Photos
  images JSONB DEFAULT '[]',

  -- Amenities
  amenities JSONB DEFAULT '{}',

  -- Description
  public_title TEXT,
  internal_title TEXT,
  description TEXT,

  -- House Rules
  check_in_time TEXT,
  check_out_time TEXT,
  max_pets INTEGER,
  rules TEXT,
  cancellation_policy TEXT,

  -- Availability
  availability_window TEXT DEFAULT '2_years',
  advance_notice INTEGER DEFAULT 0,
  minimum_stay INTEGER DEFAULT 1,
  date_ranges JSONB DEFAULT '[]',
  blocked_date_ranges JSONB DEFAULT '[]',

  -- iCal
  inbound_calendars JSONB DEFAULT '[]',
  outbound_calendar_url TEXT,

  -- Fees & Taxes
  cleaning_fee JSONB DEFAULT '{"enabled": false}',
  extra_guest_fee JSONB DEFAULT '{"enabled": false}',
  custom_fees JSONB DEFAULT '[]',
  custom_taxes JSONB DEFAULT '[]',

  -- Discounts
  weekly_discount JSONB DEFAULT '{"enabled": false}',
  monthly_discount JSONB DEFAULT '{"enabled": false}',

  -- Rates
  base_rate_currency TEXT DEFAULT 'USD',
  base_rate_amount NUMERIC DEFAULT 100,
  daily_rates JSONB DEFAULT '{}',
  custom_rates JSONB DEFAULT '[]',
  synced_rate_modifier JSONB,

  -- Hospitable
  hospitable_property_id TEXT,
  hospitable_connected BOOLEAN DEFAULT false,
  hospitable_last_sync_at TIMESTAMPTZ,
  hospitable_sync_status TEXT DEFAULT 'pending',
  hospitable_connection_id TEXT,
  hospitable_customer_id TEXT,
  hospitable_platform_mappings JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_nfs_properties_operator ON nfs_properties(operator_id);
CREATE INDEX idx_nfs_properties_listing ON nfs_properties(listing_status);
CREATE INDEX idx_nfs_properties_location ON nfs_properties(city, country);
CREATE INDEX idx_nfs_properties_search ON nfs_properties
  USING GIN (to_tsvector('english', coalesce(public_title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(address,'')));
```

**RLS:**
- Operator manages own properties: `operator_id IN (SELECT id FROM nfs_operators WHERE profile_id = auth.uid())`
- Public reads listed properties: `listing_status = 'listed'` (SELECT only)
- Service role: full access

---

### nfs_reservations

```sql
CREATE TABLE nfs_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES nfs_properties(id),
  operator_id UUID REFERENCES nfs_operators(id),
  created_by UUID REFERENCES profiles(id),

  guest_email TEXT,
  guest_first_name TEXT,
  guest_last_name TEXT,
  guest_phone TEXT,
  guest_address TEXT,
  guest_city TEXT,
  guest_country TEXT,

  booking_source TEXT DEFAULT 'operator_direct'
    CHECK (booking_source IN ('main_platform', 'white_label', 'operator_direct')),
  operator_domain TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  check_in_time TEXT NOT NULL,
  check_out_time TEXT NOT NULL,
  guest_message TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',

  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  infants INTEGER DEFAULT 0,
  pets INTEGER DEFAULT 0,

  total_amount NUMERIC NOT NULL,
  discounts JSONB DEFAULT '[]',
  add_ons JSONB DEFAULT '[]',
  custom_fees JSONB DEFAULT '[]',
  synced_rate_modifier JSONB,
  expiration JSONB,
  block_dates BOOLEAN DEFAULT false,

  -- Payment
  payment_status TEXT DEFAULT 'pending',
  stripe_charge_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  stripe_refund_id TEXT,
  payment_currency TEXT DEFAULT 'USD',
  payment_amounts JSONB DEFAULT '{}',
  payment_fee_breakdown JSONB DEFAULT '[]',
  payment_processed_at TIMESTAMPTZ,
  refund_amount NUMERIC,
  refund_status TEXT,
  refund_reason TEXT,
  refund_at TIMESTAMPTZ,
  promo_code TEXT,
  promo_discount_amount NUMERIC,

  -- Guest session
  guest_token TEXT,
  is_linked_to_user BOOLEAN DEFAULT false,
  linked_at TIMESTAMPTZ,

  -- Hospitable
  hospitable_reservation_id TEXT,
  hospitable_platform TEXT,
  hospitable_platform_id TEXT,
  hospitable_connection_id TEXT,
  hospitable_status TEXT,
  hospitable_financials JSONB,
  hospitable_status_history JSONB DEFAULT '[]',
  hospitable_last_sync_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_nfs_reservations_property ON nfs_reservations(property_id, status);
CREATE INDEX idx_nfs_reservations_dates ON nfs_reservations(check_in, check_out);
CREATE INDEX idx_nfs_reservations_guest ON nfs_reservations(guest_email);
CREATE INDEX idx_nfs_reservations_operator ON nfs_reservations(operator_id);
CREATE INDEX idx_nfs_reservations_hospitable ON nfs_reservations(hospitable_reservation_id);
```

**RLS:**
- Operator manages reservations for their properties
- Traveler reads own reservations: `created_by = auth.uid() OR guest_email = (SELECT email FROM profiles WHERE id = auth.uid())`
- Service role: full access

---

### nfs_promo_codes

```sql
CREATE TABLE nfs_promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES nfs_operators(id) ON DELETE CASCADE,
  name TEXT,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
  value NUMERIC NOT NULL CHECK (value >= 0),
  currency TEXT CHECK (currency IN ('USD', 'EUR', 'GBP')),
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  limited_uses BOOLEAN DEFAULT false,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'inactive', 'draft')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### nfs_hospitable_connections

```sql
CREATE TABLE nfs_hospitable_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  operator_id UUID NOT NULL REFERENCES nfs_operators(id) ON DELETE CASCADE,
  hospitable_customer_id TEXT NOT NULL,
  hospitable_connection_id TEXT,
  channel_info JSONB DEFAULT '{}',
  auth_code TEXT,
  auth_code_expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'disconnected', 'failed')),
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ DEFAULT now(),
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'completed', 'failed')),
  user_metadata JSONB DEFAULT '{}',
  connected_platforms JSONB DEFAULT '[]',
  total_properties INTEGER DEFAULT 0,
  total_reservations INTEGER DEFAULT 0,
  last_sync_results JSONB DEFAULT '{}',
  sync_progress JSONB DEFAULT '{}',
  health_status TEXT DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'warning', 'error')),
  last_health_check TIMESTAMPTZ,
  last_sync_error TEXT,
  last_error JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### nfs_analytics

```sql
CREATE TABLE nfs_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES nfs_operators(id),
  property_id UUID REFERENCES nfs_properties(id),
  event_type TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  referrer TEXT,
  session_id TEXT,
  device_type TEXT,
  view_source TEXT DEFAULT 'direct',
  reservation_id UUID REFERENCES nfs_reservations(id),
  booking_data JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_nfs_analytics_operator ON nfs_analytics(operator_id, event_type, timestamp DESC);
CREATE INDEX idx_nfs_analytics_property ON nfs_analytics(property_id, event_type, timestamp DESC);
```

---

### nfs_webhook_events

```sql
CREATE TABLE nfs_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('stripe', 'stripe_connect', 'hospitable')),
  external_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed BOOLEAN DEFAULT false,
  success BOOLEAN,
  error TEXT,
  data JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_nfs_webhook_events_lookup ON nfs_webhook_events(external_event_id);
```

---

### nfs_auth_tokens

```sql
CREATE TABLE nfs_auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('verification', 'passwordless', 'invitation')),
  operator_id UUID REFERENCES nfs_operators(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 hour')
);
```

---

### nfs_guest_sessions

```sql
CREATE TABLE nfs_guest_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  session_data JSONB DEFAULT '{}',
  linked_reservations UUID[] DEFAULT '{}',
  linked_user_id UUID REFERENCES profiles(id),
  linked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. NAMING CONVENTIONS

- All tables: `nfs_` prefix, snake_case
- All columns: snake_case
- JSONB for nested/array data that doesn't need relational queries
- UUID primary keys everywhere
- `created_at` and `updated_at` on every table
- Foreign keys use `_id` suffix: `operator_id`, `property_id`, `profile_id`

## 5. MIGRATION RULES

1. All migrations go in `supabase/migrations/` (same as marketplace10)
2. Migration files are timestamped: `YYYYMMDDHHMMSS_nfs_description.sql`
3. Include `nfs_` in the migration filename for easy identification
4. Always include RLS policies in the same migration as the table
5. Never modify existing marketplace10 migrations
6. Test migrations locally before pushing: `npx supabase db reset`

## 6. RLS POLICY PATTERN

Every `nfs_` table follows this pattern:

```sql
ALTER TABLE nfs_[table] ENABLE ROW LEVEL SECURITY;

-- Operator manages own data
CREATE POLICY "nfs_[table]_operator_access" ON nfs_[table]
  FOR ALL USING (
    operator_id IN (
      SELECT id FROM nfs_operators WHERE profile_id = auth.uid()
    )
  );

-- Service role bypasses RLS automatically (for webhooks, n8n, Edge Functions)

-- Public read (only for traveler-facing tables like nfs_properties)
CREATE POLICY "nfs_[table]_public_read" ON nfs_[table]
  FOR SELECT USING (listing_status = 'listed');
```

---

## Shared with marketplace10

- **`profiles` table** is the auth bridge. NFStay reads `profiles.id` to link to `nfs_operators.profile_id`. NFStay never writes to or modifies `profiles`.
- **`notifications` table** accepts INSERTs from NFStay for operator/traveler notifications.
- **Supabase project** is shared — same database, same RLS engine, same connection.
- **Migration folder** is shared — NFStay migrations coexist with marketplace10 migrations (prefixed for clarity).

---

*End of NFStay Database Schema.*
