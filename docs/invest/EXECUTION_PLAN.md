# Investment Module - Execution Plan

> End-to-end implementation sequence. What to build, in what order, with dependencies.

---

## Pre-Requisites

Before Phase 1:
1. Create branch: `feature/invest-wiring`
2. All 12 docs in `docs/invest/` committed
3. Hugo confirms database schema (docs/invest/DATABASE.md)
4. Hugo confirms commission rates (40% sub, 5% first, 2% recurring)

---

## Phase 1: Foundation

### Step 1.1: Create Supabase tables
- Run CREATE TABLE for all 12 tables (inv_ + aff_)
- Add RLS policies per DATABASE.md
- Verify with Supabase MCP

### Step 1.2: Seed investment properties
- Insert 3 properties from the existing mock data
- Include blockchain_property_id linking to on-chain properties
- Verify: SELECT * FROM inv_properties returns 3 rows

### Step 1.3: Wire Marketplace page
- Replace mockProperties[0] with useQuery to Supabase inv_properties
- Keep investMockData.ts as fallback during development
- Property detail loads from real data
- Images, description, highlights, documents all from DB

### Step 1.4: Wire Portfolio page
- Replace mockPortfolio.holdings with useQuery to inv_shareholdings
- Join with inv_properties for property details
- Rank system derives from real holding count
- Monthly earnings from inv_payouts

### Step 1.5: Admin Investment Properties page
- Create src/pages/admin/invest/AdminInvestProperties.tsx
- CRUD for inv_properties
- Columns: title, location, price/share, total shares, sold, status
- Add/Edit modal
- Register route in App.tsx under /admin

### Step 1.6: Update navigation
- Add "Investment" section to admin sidebar
- Link to new admin pages

---

## Phase 2: Purchase Flow

### Step 2.1: Referral tracking
- When user arrives with ?ref=CODE, save to localStorage + profiles.referred_by
- On share purchase, include agent_id in inv_orders

### Step 2.2: Payment integration
- Card: GHL funnel or Stripe checkout session
- Crypto: ethers.js + Particle wallet → sendPrimaryShares on-chain
- Create inv-share-purchase n8n workflow

### Step 2.3: Order management
- Write to inv_orders on purchase
- Update inv_shareholdings on completion
- Update inv_properties.shares_sold

### Step 2.4: Admin Orders page
- List all orders with filters (status, property, date)
- Manual complete for pending orders
- View order details

### Step 2.5: Purchase notifications
- Email to buyer: confirmation with details
- Email to agent: "Your referral just invested"
- WhatsApp to buyer: confirmation

---

## Phase 3: Payouts + Claims

### Step 3.1: Rent sync workflow
- n8n cron (daily): poll rent contract for available rent
- Calculate per-user amounts
- Write to inv_payouts

### Step 3.2: Wire Payouts page
- Replace mockPayouts with useQuery to inv_payouts
- Show claimable vs history

### Step 3.3: Claim flow integration
- Bank: record request, admin processes manually
- USDC: treasury wallet sends USDC to user
- STAY: swap USDC to STAY via router
- LP: create LP + stake in farm

### Step 3.4: Admin Payouts page
- List all payout requests
- Approve/reject
- Mark as paid
- Filter by status, user, property

---

## Phase 4: Commissions

### Step 4.1: Subscription commission workflow
- GHL payment webhook → n8n aff-commission-subscription
- Look up agent by referral code
- Get rate from aff_commission_settings (user-specific or global default)
- Write to aff_commissions with 14-day claimable_at

### Step 4.2: Investment commission workflow
- The Graph poll → n8n inv-commission-investment
- Detect new share purchases with agent
- Calculate 5% first purchase / 2% recurring
- Write to aff_commissions

### Step 4.3: Commission Settings admin page
- Set global defaults (40%, 5%, 2%)
- Per-user overrides
- All changes log to admin_audit_log

### Step 4.4: Commission ledger admin page
- View all commissions across all agents
- Filter by agent, type, status, date
- Search by name/code

### Step 4.5: Wire affiliate claim flow
- Same modal as investor claims
- Queries aff_commissions WHERE status = 'claimable'

### Step 4.6: Wire AffiliatesPage to real data
- Replace mock leaderboard with real aff_profiles query
- Replace mock stats with real aff_events aggregation
- Replace mock activity with real aff_events

---

## Phase 5: Governance

### Step 5.1: Proposals from Supabase
- Replace mockProposals with useQuery to inv_proposals
- Sync from blockchain via inv-proposal-sync n8n workflow

### Step 5.2: Voting
- Write votes to inv_votes
- Optional: also cast vote on-chain
- Update proposal vote counts

### Step 5.3: Proposal creation
- Submit Proposal modal writes to inv_proposals
- Optional: also create on-chain proposal (costs STAY tokens)
- Notifications to all shareholders

### Step 5.4: Admin Proposals page
- View all proposals
- Moderate (close early, remove spam)

---

## Phase 6: Boost + Farm

### Step 6.1: Boost status sync
- n8n cron: poll booster contract → write inv_boost_status

### Step 6.2: Boost purchase
- Frontend: wallet signs boost transaction
- Update inv_boost_status

### Step 6.3: Boost reward claiming
- Frontend: wallet signs claimRewards transaction
- Update inv_boost_status.stay_earned

### Step 6.4: Admin Boost management
- View all boost statuses
- Admin-boost a user (boostOnBehalfOf)

---

## Phase 7: Admin + Polish

### Step 7.1: Investment Dashboard
- Total invested across all properties
- Total shareholders
- Total payouts distributed
- Monthly revenue chart
- Recent activity feed

### Step 7.2: Shareholders view
- All users with shares
- Filter by property
- Total shares, value, earnings per user

### Step 7.3: Search + filters
- Text search on all admin pages
- Date range filters
- Status filters
- Export CSV

### Step 7.4: Notification audit
- Verify every event in the notification matrix fires correctly
- Test email delivery
- Test WhatsApp delivery

### Step 7.5: Polish
- Loading states (React Query)
- Error states
- Empty states ("No properties yet")
- Mobile responsive
- Pagination on all lists

---

## Dependencies

```
Phase 1 ─── no dependencies
Phase 2 ─── depends on Phase 1 (tables exist)
Phase 3 ─── depends on Phase 2 (shareholdings exist)
Phase 4 ─── depends on Phase 2 (referrals tracked)
Phase 5 ─── depends on Phase 1 (properties + shareholdings)
Phase 6 ─── depends on Phase 1 (properties + shareholdings)
Phase 7 ─── depends on all previous phases
```
