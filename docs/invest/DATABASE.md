# Investment Module — Database Schema

> All Supabase tables for the investment module. Prefixed `inv_` (investment) and `aff_` (affiliate). Shared infrastructure tables (user_bank_accounts, payout_claims, payout_audit_log) are unprefixed.

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

---

## Shared Infrastructure Tables

### user_bank_accounts
Bank details for payouts via Revolut. Supports worldwide payouts (200+ countries via SWIFT).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PRIMARY KEY DEFAULT gen_random_uuid() | |
| user_id | UUID REFERENCES auth.users(id) NOT NULL | |
| currency | TEXT NOT NULL | GBP, EUR, USD, BRL, THB, NGN, etc. — any Revolut-supported currency |
| account_name | TEXT NOT NULL | Full legal name on the bank account |
| account_number | TEXT | UK (8 digits), US (up to 17 digits), or local account number |
| sort_code | TEXT | UK only — 6 digits (XX-XX-XX) |
| routing_number | TEXT | US only — 9 digits (ABA routing) |
| iban | TEXT | EU / international — up to 34 chars |
| bic | TEXT | SWIFT/BIC code — 8 or 11 chars (required for international SWIFT) |
| bank_name | TEXT | Name of the bank (helps Revolut route correctly) |
| bank_country | TEXT NOT NULL | ISO 2-letter code (GB, US, BR, TH, NG, etc.) |
| bank_address | TEXT | Optional — some countries require for SWIFT |
| revolut_counterparty_id | TEXT | Populated after Revolut registration |
| revolut_counterparty_account_id | TEXT | Returned alongside counterparty_id |
| is_verified | BOOLEAN DEFAULT false | Set true after first successful payout |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| updated_at | TIMESTAMPTZ DEFAULT now() | |

**Country-specific required fields:**

| Region | Required fields |
|--------|----------------|
| UK | account_name, account_number, sort_code, bank_country=GB |
| EU / SEPA | account_name, iban, bic, bank_country |
| US | account_name, account_number, routing_number, bank_country=US |
| International (SWIFT) | account_name, iban OR account_number, bic, bank_name, bank_country |

**Notes:**
- Revolut sends via the fastest rail available: local rails for UK/EU/US, SWIFT for everywhere else
- Currency is what the partner wants to receive in — Revolut auto-converts from GBP if needed
- bank_address is only required for some SWIFT corridors (Revolut will error if missing — save and retry)

### payout_claims
Unified payout claims for all user types. Processed in weekly Revolut batch.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PRIMARY KEY DEFAULT gen_random_uuid() | |
| user_id | UUID REFERENCES auth.users(id) NOT NULL | |
| user_type | TEXT NOT NULL CHECK (user_type IN ('investor', 'affiliate', 'subscriber')) | |
| amount_entitled | NUMERIC NOT NULL | ALWAYS calculated server-side |
| currency | TEXT NOT NULL | GBP, EUR, USD, or any Revolut-supported currency |
| bank_account_id | UUID REFERENCES user_bank_accounts(id) | |
| status | TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')) | |
| week_ref | TEXT NOT NULL | ISO week format: "2026-W12" |
| revolut_payment_draft_id | TEXT | Set when batch is sent |
| revolut_transaction_id | TEXT | For idempotency |
| claimed_at | TIMESTAMPTZ DEFAULT now() | |
| paid_at | TIMESTAMPTZ | |
| notes | TEXT | |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| UNIQUE(user_id, week_ref) | | One claim per user per week |

### payout_audit_log
Immutable audit trail for all payout events.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PRIMARY KEY DEFAULT gen_random_uuid() | |
| claim_id | UUID REFERENCES payout_claims(id) | |
| user_id | UUID REFERENCES auth.users(id) | |
| event_type | TEXT NOT NULL | claim_submitted, bank_details_added, batch_sent, payment_completed, payment_failed, webhook_received, security_rejected |
| old_status | TEXT | |
| new_status | TEXT | |
| performed_by | TEXT | 'user', 'system', 'founder', 'revolut_webhook' |
| metadata | JSONB | Context: amount, IP, etc. |
| ip_address | TEXT | |
| created_at | TIMESTAMPTZ DEFAULT now() | |

---

## Profiles Table Note

The shared `profiles` table needs a new column added:
- `wallet_address TEXT` — user's crypto wallet address for on-chain payouts

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
| user_bank_accounts | SELECT | auth.uid() = user_id |
| user_bank_accounts | INSERT | auth.uid() = user_id |
| user_bank_accounts | UPDATE | auth.uid() = user_id AND is_verified = false |
| user_bank_accounts | DELETE | Service role only |
| payout_claims | SELECT | auth.uid() = user_id |
| payout_claims | INSERT | auth.uid() = user_id |
| payout_claims | UPDATE | Service role only |
| payout_claims | DELETE | None |
| payout_audit_log | SELECT | Service role only |
| payout_audit_log | INSERT | Service role only |
| payout_audit_log | UPDATE | None |
| payout_audit_log | DELETE | None |
