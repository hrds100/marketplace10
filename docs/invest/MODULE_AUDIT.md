# Investment Module — Current State Audit

> What exists, what's mock, what's real, what's missing. Updated as work progresses.

---

## Last Updated: 2026-03-19

---

## Frontend Pages

| Page | Route | Status | Data Source |
|------|-------|--------|------------|
| Marketplace | /dashboard/invest/marketplace | UI complete | Hybrid (Supabase first, mock fallback) |
| Portfolio | /dashboard/invest/portfolio | UI complete | Mock |
| Proposals | /dashboard/invest/proposals | UI complete | Mock |
| Payouts | /dashboard/invest/payouts | UI complete | Mock |
| Become An Agent | /dashboard/affiliates | UI complete | Partial real data (aff_profiles exists) |

## Admin Pages

| Page | Route | Status | Data Source |
|------|-------|--------|------------|
| AdminInvestDashboard | /admin/invest | UI complete | Real (stats wired to Supabase queries) |
| AdminInvestProperties | /admin/invest/properties | UI complete | Real (full CRUD wired to Supabase) |
| AdminInvestCommissionSettings | /admin/invest/commissions | UI complete | Real (global rates wired to Supabase) |
| Other admin invest pages | various | UI complete | Mock data |

## Frontend Hooks & Utilities

| File | Status | Notes |
|------|--------|-------|
| useInvestData.ts | Created | 20+ React Query hooks for all invest tables |
| useWallet.ts | Created | Particle Network placeholder/stub |

## UI Features Completed

### Marketplace
- [x] Property detail with image carousel
- [x] JV Partnership explainer (expandable, with finger animation)
- [x] Investment widget (dollar input, share calculation, card/crypto toggle)
- [x] Payment method images (Visa, MC, USDC, BNB)
- [x] TSA checkbox (custom styled)
- [x] Profit calculator (5 chart versions)
- [x] Recent activity table (mock data)
- [x] Documents section (2-column, green hover)
- [x] Agent referral link (split layout)

### Portfolio
- [x] Rank system (Noobie → Property Titan)
- [x] Rank badge in page title
- [x] Portfolio Summary card (3 metrics + ROI progress bar)
- [x] Monthly Earnings chart (horizontal bars)
- [x] Your Journey milestone ladder
- [x] Holdings cards (always expanded, image left)
- [x] Boost APR card (matching reference design)
- [x] Action buttons (View, Buy More, Submit Proposal, Cast Vote)
- [x] Achievements section (8 badges, 2 unlocked)

### Proposals
- [x] Active proposals with voting UI
- [x] Past proposals with results
- [x] Vote confirmation dialog
- [x] Property images on proposal cards
- [x] Submit Proposal modal with property selector
- [x] Vote No in gray (not red)
- [x] Sidebar command layout with filter

### Payouts
- [x] Sidebar with summary + quick claim
- [x] Claimable payouts with property images
- [x] Claim modal (4 methods: Bank, USDC, STAY, LP)
- [x] 3-step flow (choose → processing → success)
- [x] History table with status badges
- [x] Amount + badge + claim aligned horizontally

### Become An Agent
- [x] Earnings calculator (subscriptions + JV deals)
- [x] Leaderboard (top 10 agents)
- [x] Agent dashboard (stats, link, chart, activity)
- [x] Sharing kit (WhatsApp, email templates)
- [x] Payout section (bank, PayPal, other)
- [x] Commission rates display

---

## What's NOT Wired (Mock/Placeholder)

| Feature | Current State | Needs |
|---------|--------------|-------|
| Holdings | Hardcoded 2 properties | Wire to Supabase inv_shareholdings via useInvestData hooks |
| Orders | No live order flow | Wire inv-process-order edge function + payment integration |
| Payouts (user-facing) | Hardcoded 6 entries | Wire to Supabase inv_payouts + submit-payout-claim edge function |
| Proposals | Hardcoded 2 active + 3 past | Wire to Supabase inv_proposals + voting hooks |
| Votes | useState only (resets on reload) | Wire to Supabase inv_votes |
| Boost | Static card with fake data | Blockchain booster contract integration |
| Referral tracking | No tracking | ?ref=CODE → profiles.referred_by (column exists) |
| Notifications | None | n8n + Resend email + WhatsApp |
| Portfolio page data | Mock | Wire useInvestData hooks to real shareholdings/payouts |
| Payouts page data | Mock | Wire useInvestData hooks to real payout records |
| Proposals page data | Mock | Wire useInvestData hooks to real proposals/votes |
| Rank system | Derived from mock holdings count | Derived from real inv_shareholdings count |
| Other admin invest pages | Mock data | Wire remaining admin pages to Supabase |

---

## Blockchain Status

| Feature | Contract | Status |
|---------|----------|--------|
| Share purchases | RWA Marketplace | Deployed, working on app.nfstay.com |
| Rent distribution | Rent contract | Deployed, working |
| Voting | Voting contract | Deployed, working |
| Boost APR | Booster contract | Deployed, working |
| Farm/Staking | Farm contract | Deployed, working |
| The Graph indexing | 4 subgraphs | Deployed, indexing |

All contracts are on BNB Chain mainnet. No changes needed. We only build frontend integrations.

---

## Database Status

ALL 14 tables created with Row Level Security (RLS) enabled.

| Table | Status |
|-------|--------|
| inv_properties | Created + RLS |
| inv_shareholdings | Created + RLS |
| inv_orders | Created + RLS |
| inv_payouts | Created + RLS |
| inv_proposals | Created + RLS |
| inv_votes | Created + RLS |
| inv_boost_status | Created + RLS |
| inv_documents | Created + RLS |
| inv_activity_log | Created + RLS |
| aff_profiles | Created + RLS |
| aff_commissions | Created + RLS |
| aff_commission_settings | Created + RLS |
| aff_events | Created + RLS |
| aff_payout_requests | Created + RLS |

### Profile Columns Added
- `wallet_address` added to profiles
- `referred_by` added to profiles

### Seed Data
- 1 property seeded (inv_properties)
- 3 global commission rates seeded (aff_commission_settings)

---

## Edge Function Status

| Function | Status | Notes |
|----------|--------|-------|
| inv-process-order | Created | Handles share purchase order processing |
| submit-payout-claim | Created | User-initiated payout claim submission |
| revolut-webhook | Created | Receives Revolut payment callbacks |
| save-bank-details | Created | Stores user bank details for payouts |

---

## n8n Workflow Status

| Workflow | Status |
|----------|--------|
| inv-tuesday-payout-batch | JSON export created |
| inv-commission-subscription | JSON export created |
| inv-share-purchase | Not created |
| inv-rent-sync | Not created |
| inv-proposal-sync | Not created |
| inv-boost-sync | Not created |
| inv-notify-email | Not created |
| inv-notify-whatsapp | Not created |
