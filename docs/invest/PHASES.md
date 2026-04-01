# Investment Module - Build Phases

> Step-by-step implementation plan. Each phase is self-contained and testable.

---

## Phase 1: Foundation (Week 1-2)
**Goal:** Database + property display from real data

- [ ] Create all inv_ and aff_ Supabase tables with RLS
- [ ] Seed inv_properties with 3 real properties
- [ ] Wire Marketplace page to Supabase (replace mockProperties)
- [ ] Wire Portfolio page to real inv_shareholdings (read-only)
- [ ] Admin: Investment Properties CRUD page
- [ ] Create a feature branch for this investment task

**Acceptance:** Properties load from Supabase. Admin can add/edit. Portfolio shows real holdings (empty for now).

---

## Phase 2: Purchase Flow (Week 3-4)
**Goal:** Users can buy shares

- [ ] Wire share purchase: card (GHL funnel) + crypto (wallet → contract)
- [ ] Referral tracking: ?ref=CODE → stored in profiles.referred_by
- [ ] n8n workflow: inv-share-purchase (webhook → order → blockchain → confirm)
- [ ] Wire inv_orders table
- [ ] Wire inv_shareholdings updates on purchase
- [ ] Admin: Orders management page
- [ ] Email notification: purchase confirmation

**Acceptance:** User buys shares → order created → shares tracked → agent recorded.

---

## Phase 3: Payouts + Claims (Week 5-6)
**Goal:** Investors receive and claim rental income

- [ ] n8n workflow: inv-rent-sync (daily poll rent contract → update inv_payouts)
- [ ] Wire Payouts page to real inv_payouts
- [ ] Wire claim modal to real methods (bank + USDC + STAY + LP)
- [ ] Wire payout processing via n8n
- [ ] Email + WhatsApp notifications for claim events
- [ ] Admin: Payouts management page

**Acceptance:** Claimable payouts appear. User claims → payout processed → status updates.

---

## Phase 4: Commissions (Week 7-8)
**Goal:** Agent commissions tracked and claimable

- [ ] Wire subscription commission: GHL webhook → n8n aff-commission-subscription → aff_commissions
- [ ] Wire investment commission: The Graph → n8n inv-commission-investment → aff_commissions
- [ ] 14-day holdback logic
- [ ] Admin: Commission Settings page (global + per-user override)
- [ ] Admin: Commission ledger view
- [ ] Affiliate claim flow (same modal as investor)
- [ ] Wire AffiliatesPage to real data
- [ ] Email + WhatsApp: commission earned, commission claimable

**Acceptance:** Agent refers user → user buys/subscribes → commission appears → claimable after 14 days → agent claims.

---

## Phase 5: Governance (Week 9)
**Goal:** Proposals and voting work

- [ ] Wire Proposals page to Supabase inv_proposals
- [ ] Wire voting (store in inv_votes + optional on-chain)
- [ ] Wire proposal creation from Portfolio card
- [ ] Submit Proposal modal with property selector
- [ ] Notifications: new proposal, voting reminder, result
- [ ] Admin: Proposals moderation page

**Acceptance:** User creates proposal → shareholders notified → votes cast → result determined.

---

## Phase 6: Boost + Farm (Week 10)
**Goal:** APR boosting works

- [ ] Wire boost status from blockchain booster contract
- [ ] Wire boost purchase flow (USDC → booster contract)
- [ ] Wire boost reward claiming (STAY tokens)
- [ ] Wire Portfolio Boost card to real data
- [ ] Admin: Boost management (admin-boost a user)

**Acceptance:** User boosts → APR increases → STAY earned → claimable.

---

## Phase 7: Admin + Polish (Week 11-12)
**Goal:** Complete admin panel + end-to-end polish

- [ ] Admin Investment Dashboard (stats overview)
- [ ] Admin Shareholders view
- [ ] Search + filters on all admin pages
- [ ] CSV export for orders, commissions, payouts
- [ ] End-to-end notification audit (all events covered)
- [ ] Loading states, error states, empty states on all pages
- [ ] Mobile responsive check on all invest pages
- [ ] Performance: React Query caching, pagination

**Acceptance:** Admin has full visibility + control. All notifications fire. All pages handle edge cases.
