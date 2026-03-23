# Investment Module - Architecture

> How the pieces connect. What handles what. Where data lives.

---

## System Overview

```
USER (Browser)
    │
    ├── React Frontend (hub.nfstay.com)
    │   ├── Invest pages (src/pages/invest/)
    │   ├── Admin pages (src/pages/admin/invest/)
    │   └── Affiliates page (src/pages/AffiliatesPage.tsx)
    │
    ├── Wallet (Particle Network)
    │   └── Signs blockchain transactions
    │
    ├── Blockchain (BNB Chain)
    │   ├── Buy shares → RWA Marketplace contract
    │   ├── Claim rent → Rent contract
    │   ├── Vote → Voting contract
    │   ├── Boost → Booster contract
    │   └── All events indexed by The Graph
    │
    ├── Supabase (Database + Auth)
    │   ├── inv_* tables (investment data)
    │   ├── aff_* tables (commission data)
    │   ├── Shared tables (user_bank_accounts, payout_claims, payout_audit_log)
    │   ├── profiles (shared user identity)
    │   └── RLS policies per table
    │
    └── n8n (Automation)
        ├── inv-* workflows (investment events)
        ├── aff-* workflows (commission processing)
        └── Notifications (email + WhatsApp)
```

---

## What Handles What

| Responsibility | System | Why |
|---------------|--------|-----|
| Share ownership tracking | Blockchain (RWA contract) | Immutable, trustless |
| Share purchase execution | Blockchain (via frontend wallet) | On-chain transaction |
| Rent distribution | Blockchain (Rent contract) | On-chain, per-share calculation |
| Voting | Blockchain (Voting contract) | On-chain governance |
| Boost APR | Blockchain (Booster contract) | On-chain reward multiplier |
| Investment property metadata | Supabase (`inv_properties`) | Mutable, admin-managed |
| Order tracking | Supabase (`inv_orders`) | Off-chain records of purchases |
| Commission calculation | n8n + Supabase | Off-chain, complex rates |
| Commission storage | Supabase (`aff_commissions`) | Ledger with status tracking |
| Commission rate settings | Supabase (`aff_commission_settings`) | Admin-configurable |
| Referral tracking | Supabase (`aff_profiles` + `profiles.referred_by`) | Off-chain attribution |
| Payout processing | n8n + treasury wallet | Hybrid: USDC on-chain, bank off-chain |
| Bank payout claims | Supabase (`payout_claims`) | Weekly batch via Revolut |
| Bank account storage | Supabase (`user_bank_accounts`) | Counterparty details for Revolut |
| Payout audit trail | Supabase (`payout_audit_log`) | Immutable event log |
| Email notifications | n8n + Resend | Off-chain |
| WhatsApp notifications | n8n | Off-chain |
| Historical on-chain data | The Graph (4 subgraphs) | Indexed blockchain events |
| User authentication | Supabase Auth (shared) | Same as marketplace10 |
| Admin management | React admin pages + Supabase | Standard CRUD |

---

## Data Flow: Share Purchase

```
1. User enters amount on Marketplace page
2. Frontend calculates shares: floor(amount / pricePerShare)
3. User selects payment: Card or Crypto
4. IF Card: redirect to GHL/payment processor → webhook to n8n
5. IF Crypto: wallet signs transaction → sendPrimaryShares() on-chain
6. On-chain event: PrimarySaleStatus emitted
7. The Graph indexes the event
8. n8n workflow (inv-commission-investment) picks up the event
9. n8n calculates agent commission (5% first purchase)
10. n8n writes to aff_commissions (status: pending, claimable_at: +14 days)
11. n8n sends notification: email + WhatsApp to buyer + agent
12. Frontend updates via Supabase query
```

---

## Data Flow: Commission Claim

```
1. Agent opens Payouts page
2. Frontend queries aff_commissions WHERE status = 'claimable'
3. Agent clicks "Claim" → modal opens
4. Agent selects method: Bank Transfer / USDC / STAY / LP
5. IF Bank: n8n records claim, admin manually processes
6. IF USDC: n8n triggers treasury.transfer(agentWallet, amount)
7. aff_commissions status: claimable → claimed → paid
8. Notification sent to agent (confirmation)
```

---

## Data Flow: Rent Payout

```
1. Admin deposits monthly rent into Rent contract (addRent)
2. Rent contract calculates per-share amount
3. n8n (inv-rent-sync) polls rent contract status daily
4. Writes claimable amounts to inv_payouts for each shareholder
5. User opens Payouts page, sees claimable amount
6. User claims → same modal as commission claims
7. IF USDC: withdrawRent(propertyId) on-chain → USDC to user
8. IF Bank: n8n records, admin processes manually
```

---

## Data Flow: Bank Payout (Weekly)

```
1. User clicks "Claim" → selects "Bank Transfer"
2. If no bank details → modal shows BankDetailsForm first
3. Edge Function (submit-payout-claim) validates + calculates amount server-side
4. Claim saved in payout_claims (status: pending)
5. Tuesday 05:00 AM: n8n cron fires (inv-tuesday-payout-batch)
6. n8n queries all pending claims for current week
7. For new users: registers counterparty with Revolut API
8. n8n creates Revolut payment draft (all claims in one batch)
9. Claims updated to status: processing
10. Hugo receives WhatsApp: "Batch ready - X claims, £Y total"
11. Hugo opens Revolut app → reviews → approves with Face ID
12. Revolut processes payments (Faster Payments GBP / SEPA EUR)
13. Revolut webhook fires → Edge Function (revolut-webhook)
14. HMAC verified → claims updated to status: paid
15. Users receive WhatsApp: "Your payout of £X has arrived"
```

---

## Admin Capabilities

| Admin Action | Where | Effect |
|-------------|-------|--------|
| Add/edit investment properties | Admin > Investment Properties | CRUD on inv_properties |
| View all orders | Admin > Orders | Read inv_orders |
| Complete pending orders | Admin > Orders | Trigger on-chain share transfer |
| View all shareholders | Admin > Shareholders | Read inv_shareholdings |
| Set global commission rate | Admin > Commission Settings | Write aff_commission_settings |
| Override per-user rate | Admin > Commission Settings | Write aff_commission_settings with user_id |
| Approve/reject payouts | Admin > Payouts | Update aff_commissions / inv_payouts |
| Approve weekly payout batch | Revolut app (Face ID) | Releases bank transfers |
| View payout audit log | Admin > Payouts | Full history of all payout events |
| Boost a user's property | Admin > Boost Management | Call booster contract |
| Moderate proposals | Admin > Proposals | Update inv_proposals |
| Send notifications | Admin > Notifications | Trigger n8n workflow |
| Search users | Admin > any page | Filter by name/email/wallet/code |
| Export data | Admin > any page | CSV download |
