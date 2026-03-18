# Investment Module — Current State Audit

> What exists, what's mock, what's real, what's missing. Updated as work progresses.

---

## Last Updated: 2026-03-18

---

## Frontend Pages

| Page | Route | Status | Data Source |
|------|-------|--------|------------|
| Marketplace | /dashboard/invest/marketplace | UI complete | Mock (investMockData.ts) |
| Portfolio | /dashboard/invest/portfolio | UI complete | Mock |
| Proposals | /dashboard/invest/proposals | UI complete | Mock |
| Payouts | /dashboard/invest/payouts | UI complete | Mock |
| Become An Agent | /dashboard/affiliates | UI complete | Partial real data (aff_profiles exists) |

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
| Properties | Hardcoded in investMockData.ts | Supabase inv_properties |
| Holdings | Hardcoded 2 properties | Supabase inv_shareholdings |
| Orders | No order flow | Supabase inv_orders + payment integration |
| Payouts | Hardcoded 6 entries | Supabase inv_payouts + rent contract sync |
| Proposals | Hardcoded 2 active + 3 past | Supabase inv_proposals + voting |
| Votes | useState only (resets on reload) | Supabase inv_votes |
| Boost | Static card with fake data | Blockchain booster contract integration |
| Commissions | No real tracking | Supabase aff_commissions + n8n workflows |
| Referral tracking | No tracking | ?ref=CODE → profiles.referred_by |
| Notifications | None | n8n + Resend email + WhatsApp |
| Admin (invest) | No invest-specific admin pages | New admin pages needed |
| Commission settings | No UI | New admin page needed |
| Rank system | Derived from mock holdings count | Derived from real inv_shareholdings count |

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

| Table | Status |
|-------|--------|
| inv_properties | Not created |
| inv_shareholdings | Not created |
| inv_orders | Not created |
| inv_payouts | Not created |
| inv_proposals | Not created |
| inv_votes | Not created |
| inv_boost_status | Not created |
| aff_profiles | Not created (AffiliatesPage uses mock) |
| aff_commissions | Not created |
| aff_commission_settings | Not created |
| aff_events | Not created |
| aff_payout_requests | Not created |

---

## n8n Workflow Status

| Workflow | Status |
|----------|--------|
| inv-share-purchase | Not created |
| inv-commission-investment | Not created |
| inv-rent-sync | Not created |
| inv-payout-process | Not created |
| inv-proposal-sync | Not created |
| inv-boost-sync | Not created |
| aff-commission-subscription | Not created |
| aff-payout-batch | Not created |
| inv-notify-email | Not created |
| inv-notify-whatsapp | Not created |
