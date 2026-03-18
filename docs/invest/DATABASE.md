# Investment Module — Database Schema

> All Supabase tables for the investment module. Prefixed `inv_` (investment) and `aff_` (affiliate).

---

## Investment Tables

### inv_properties
Investment property listings managed by admin.

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PRIMARY KEY | |
| title | TEXT NOT NULL | e.g. "Seseh Beachfront Villa" |
| location | TEXT NOT NULL | e.g. "Seseh, Bali" |
| country | TEXT | |
| image | TEXT | Primary image URL |
| images | TEXT[] | Additional image URLs |
| price_per_share | NUMERIC NOT NULL | USD per share |
| total_shares | INTEGER NOT NULL | Total available shares |
| shares_sold | INTEGER DEFAULT 0 | Shares sold so far |
| annual_yield | NUMERIC | Expected annual yield % |
| monthly_rent | NUMERIC | Total monthly rental income |
| property_value | NUMERIC | Total property value |
| status | TEXT DEFAULT 'open' | open, funded, closed |
| type | TEXT | Villa, Apartment, Residence |
| bedrooms | INTEGER | |
| bathrooms | INTEGER | |
| area | INTEGER | Square meters |
| description | TEXT | |
| highlights | TEXT[] | Key selling points |
| documents | TEXT[] | Document names/URLs |
| occupancy_rate | INTEGER | % |
| year_built | INTEGER | |
| blockchain_property_id | INTEGER | On-chain property ID |
| created_by | UUID REFERENCES profiles(id) | Admin who created |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| updated_at | TIMESTAMPTZ DEFAULT now() | |

### inv_shareholdings
Who owns shares in what property.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PRIMARY KEY DEFAULT gen_random_uuid() | |
| user_id | UUID REFERENCES profiles(id) NOT NULL | |
| property_id | INTEGER REFERENCES inv_properties(id) NOT NULL | |
| shares_owned | INTEGER NOT NULL | |
| invested_amount | NUMERIC NOT NULL | Total USD invested |
| current_value | NUMERIC | Current market value |
| total_earned | NUMERIC DEFAULT 0 | Total rent earned |
| last_payout_date | DATE | |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| updated_at | TIMESTAMPTZ DEFAULT now() | |
| UNIQUE(user_id, property_id) | | One row per user per property |

### inv_orders
Share purchase orders.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PRIMARY KEY DEFAULT gen_random_uuid() | |
| user_id | UUID REFERENCES profiles(id) NOT NULL | |
| property_id | INTEGER REFERENCES inv_properties(id) NOT NULL | |
| shares_requested | INTEGER NOT NULL | |
| amount_paid | NUMERIC NOT NULL | USD |
| payment_method | TEXT | 'card', 'crypto_usdc', 'crypto_bnb' |
| agent_id | UUID REFERENCES profiles(id) | Referring agent |
| status | TEXT DEFAULT 'pending' | pending, completed, refunded |
| tx_hash | TEXT | Blockchain transaction hash |
| external_order_id | TEXT | SamCart/GHL order ID |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| updated_at | TIMESTAMPTZ DEFAULT now() | |

### inv_payouts
Rental income payouts per user per property per period.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PRIMARY KEY DEFAULT gen_random_uuid() | |
| user_id | UUID REFERENCES profiles(id) NOT NULL | |
| property_id | INTEGER REFERENCES inv_properties(id) NOT NULL | |
| period_date | DATE NOT NULL | Month this payout covers |
| shares_owned | INTEGER | Shares at time of payout |
| amount | NUMERIC NOT NULL | USD amount |
| status | TEXT DEFAULT 'pending' | pending, claimable, claimed, paid |
| claim_method | TEXT | bank_transfer, usdc, stay_token, lp_token |
| tx_hash | TEXT | |
| claimed_at | TIMESTAMPTZ | |
| paid_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ DEFAULT now() | |

### inv_proposals
Governance proposals for properties.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PRIMARY KEY DEFAULT gen_random_uuid() | |
| property_id | INTEGER REFERENCES inv_properties(id) NOT NULL | |
| proposer_id | UUID REFERENCES profiles(id) NOT NULL | |
| title | TEXT NOT NULL | |
| description | TEXT NOT NULL | |
| type | TEXT NOT NULL | Renovation, Management, Pricing, Distribution, Strategy |
| votes_yes | INTEGER DEFAULT 0 | |
| votes_no | INTEGER DEFAULT 0 | |
| total_eligible_votes | INTEGER | Total shares for this property |
| quorum | INTEGER | Minimum votes needed |
| starts_at | TIMESTAMPTZ DEFAULT now() | |
| ends_at | TIMESTAMPTZ | Default: starts_at + 30 days |
| result | TEXT | approved, rejected, null if active |
| blockchain_proposal_id | INTEGER | On-chain proposal ID |
| created_at | TIMESTAMPTZ DEFAULT now() | |

### inv_votes
Individual votes on proposals.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PRIMARY KEY DEFAULT gen_random_uuid() | |
| proposal_id | UUID REFERENCES inv_proposals(id) NOT NULL | |
| user_id | UUID REFERENCES profiles(id) NOT NULL | |
| choice | TEXT NOT NULL | 'yes' or 'no' |
| shares_weight | INTEGER | Votes weighted by shares |
| tx_hash | TEXT | On-chain vote hash |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| UNIQUE(proposal_id, user_id) | | One vote per user per proposal |

### inv_boost_status
Boost state per user per property.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PRIMARY KEY DEFAULT gen_random_uuid() | |
| user_id | UUID REFERENCES profiles(id) NOT NULL | |
| property_id | INTEGER REFERENCES inv_properties(id) NOT NULL | |
| is_boosted | BOOLEAN DEFAULT false | |
| boosted_apr | NUMERIC | Enhanced APR % |
| base_apr | NUMERIC | Original APR % |
| boost_cost_usdc | NUMERIC | Cost paid |
| stay_earned | NUMERIC DEFAULT 0 | STAY tokens earned |
| boosted_at | TIMESTAMPTZ | |
| expires_at | TIMESTAMPTZ | |
| UNIQUE(user_id, property_id) | | |

---

## Affiliate Tables

### aff_profiles
Agent/affiliate profiles.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PRIMARY KEY DEFAULT gen_random_uuid() | |
| user_id | UUID REFERENCES profiles(id) UNIQUE NOT NULL | |
| referral_code | TEXT UNIQUE NOT NULL | e.g. 'HUGO2026' |
| full_name | TEXT | |
| tier | TEXT DEFAULT 'standard' | standard, silver, gold, diamond |
| total_earned | NUMERIC DEFAULT 0 | |
| total_claimed | NUMERIC DEFAULT 0 | |
| pending_balance | NUMERIC DEFAULT 0 | |
| link_clicks | INTEGER DEFAULT 0 | |
| signups | INTEGER DEFAULT 0 | |
| paid_users | INTEGER DEFAULT 0 | |
| payout_method | TEXT | 'bank', 'paypal', 'usdc' |
| payout_details | JSONB | Bank details / PayPal email / wallet |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| updated_at | TIMESTAMPTZ DEFAULT now() | |

### aff_commissions
Commission ledger — all commission entries from all sources.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PRIMARY KEY DEFAULT gen_random_uuid() | |
| affiliate_id | UUID REFERENCES aff_profiles(id) NOT NULL | |
| source | TEXT NOT NULL | 'subscription', 'investment_first', 'investment_recurring' |
| source_id | TEXT NOT NULL | GHL payment ID or on-chain tx hash |
| referred_user_id | UUID REFERENCES profiles(id) | |
| property_id | INTEGER REFERENCES inv_properties(id) | Null for subscriptions |
| gross_amount | NUMERIC NOT NULL | Base amount the commission is calculated on |
| commission_rate | NUMERIC NOT NULL | Rate applied (e.g. 0.40, 0.05, 0.02) |
| commission_amount | NUMERIC NOT NULL | Calculated commission |
| currency | TEXT DEFAULT 'USD' | |
| status | TEXT DEFAULT 'pending' | pending, claimable, claimed, paid |
| claimable_at | TIMESTAMPTZ | When holdback expires |
| claimed_at | TIMESTAMPTZ | |
| paid_at | TIMESTAMPTZ | |
| claim_method | TEXT | bank_transfer, usdc, stay_token, lp_token |
| tx_hash | TEXT | For crypto payouts |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| UNIQUE(source, source_id) | | Prevent double-crediting |

### aff_commission_settings
Admin-configurable commission rates (global + per-user overrides).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PRIMARY KEY DEFAULT gen_random_uuid() | |
| user_id | UUID REFERENCES profiles(id) | NULL = global default |
| commission_type | TEXT NOT NULL | 'subscription', 'investment_first', 'investment_recurring' |
| rate | NUMERIC NOT NULL | e.g. 0.40 for 40% |
| set_by | UUID REFERENCES profiles(id) | Admin who set it |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| updated_at | TIMESTAMPTZ DEFAULT now() | |
| UNIQUE(user_id, commission_type) | | One rate per user per type |

### aff_events
Activity tracking for affiliate dashboard.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PRIMARY KEY DEFAULT gen_random_uuid() | |
| affiliate_id | UUID REFERENCES aff_profiles(id) NOT NULL | |
| event_type | TEXT NOT NULL | 'click', 'signup', 'payment', 'payout_requested', 'payout_paid' |
| metadata | JSONB | Additional event data |
| created_at | TIMESTAMPTZ DEFAULT now() | |

### aff_payout_requests
Payout requests from agents.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PRIMARY KEY DEFAULT gen_random_uuid() | |
| affiliate_id | UUID REFERENCES aff_profiles(id) NOT NULL | |
| amount | NUMERIC NOT NULL | |
| method | TEXT NOT NULL | 'bank', 'paypal', 'usdc' |
| details | JSONB | Bank/PayPal/wallet details |
| status | TEXT DEFAULT 'pending' | pending, processing, paid, rejected |
| processed_by | UUID REFERENCES profiles(id) | Admin |
| processed_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ DEFAULT now() | |

---

## RLS Policies (to be created)

| Table | Policy | Rule |
|-------|--------|------|
| inv_properties | SELECT | All authenticated users |
| inv_properties | INSERT/UPDATE/DELETE | Admin only |
| inv_shareholdings | SELECT | Own rows only (user_id = auth.uid()) |
| inv_orders | SELECT | Own rows only |
| inv_orders | INSERT | Authenticated |
| inv_payouts | SELECT | Own rows only |
| inv_proposals | SELECT | All authenticated |
| inv_proposals | INSERT | Authenticated (must own shares) |
| inv_votes | SELECT | Own rows only |
| inv_votes | INSERT | Authenticated (must own shares) |
| aff_profiles | SELECT | Own row only |
| aff_profiles | INSERT | Authenticated |
| aff_commissions | SELECT | Own rows only (via affiliate_id join) |
| aff_commission_settings | SELECT/UPDATE | Admin only |
| aff_events | SELECT | Own rows only |
| aff_payout_requests | SELECT | Own rows only |
| aff_payout_requests | INSERT | Authenticated agent |
