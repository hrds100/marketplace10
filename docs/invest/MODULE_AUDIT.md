# Investment Module — Current State Audit

> Single source of truth for what's built, what's live, what's missing.
> If this doc answers your question, don't ask the team.

---

## Last Updated: 2026-03-19 08:00 UTC

---

## Quick Answer: What's Missing?

Only **2 items** remain:

| Item | Status | Blocker |
|------|--------|---------|
| SamCart API key | Waiting | Email sent to support@samcart.com — they must reply with the key |
| Particle wallet creation | Deferred | SDK alpha breaks Vite build. JWT infrastructure ready. Needs stable SDK or server-side approach |

**Everything else is built, deployed, and live.**

---

## Frontend Pages (5/5 complete)

| Page | Route | Status | Data Source |
|------|-------|--------|------------|
| Marketplace | `/dashboard/invest/marketplace` | ✅ Live | Supabase `inv_properties` (mock fallback) |
| Portfolio | `/dashboard/invest/portfolio` | ✅ Live | Supabase `inv_shareholdings` (mock fallback) |
| Proposals | `/dashboard/invest/proposals` | ✅ Live | Supabase `inv_proposals` (mock fallback) |
| Payouts | `/dashboard/invest/payouts` | ✅ Live | Supabase `inv_payouts` (mock fallback) |
| Become An Agent | `/dashboard/affiliates` | ✅ Live | Partial real data (existing `aff_profiles`) |

---

## Admin Pages (9/9 complete)

| Page | Route | Status | Data Source |
|------|-------|--------|------------|
| Dashboard | `/admin/invest` | ✅ Live | Real Supabase queries |
| Properties | `/admin/invest/properties` | ✅ Live | Full CRUD on `inv_properties` |
| Commission Settings | `/admin/invest/commissions` | ✅ Live | Real rates from `aff_commission_settings` |
| Orders | `/admin/invest/orders` | ✅ Built | Hook ready (shows data when orders exist) |
| Shareholders | `/admin/invest/shareholders` | ✅ Built | Hook ready |
| Commissions | `/admin/invest/commissions-list` | ✅ Built | Hook ready |
| Payouts | `/admin/invest/payouts` | ✅ Built | Hook ready |
| Proposals | `/admin/invest/proposals` | ✅ Built | Hook ready |
| Boost | `/admin/invest/boost` | ✅ Built | Hook ready |

Admin workspace selector at `/admin` — 3 workspaces: Marketplace / Investments / Booking Site.

---

## Supabase Database (16 tables — ALL created with RLS)

| Table | Status | Seed Data |
|-------|--------|-----------|
| `inv_properties` | ✅ Created + RLS | 1 property (Seseh Beachfront Villa) |
| `inv_orders` | ✅ Created + RLS | 1 test order ($100, Hugo) |
| `inv_shareholdings` | ✅ Created + RLS | 1 holding (Hugo, 1 share) |
| `inv_payouts` | ✅ Created + RLS | Empty (no rent deposited yet) |
| `inv_proposals` | ✅ Created + RLS | Empty |
| `inv_votes` | ✅ Created + RLS | Empty |
| `inv_boost_status` | ✅ Created + RLS | Empty |
| `aff_profiles` | ✅ Created + RLS | Empty |
| `aff_commissions` | ✅ Created + RLS | Empty |
| `aff_commission_settings` | ✅ Created + RLS | 3 defaults: sub 40%, invest 5%, recurring 2% |
| `aff_events` | ✅ Created + RLS | Empty |
| `user_bank_accounts` | ✅ Created + RLS | Empty |
| `payout_claims` | ✅ Created + RLS | Empty |
| `payout_audit_log` | ✅ Created + RLS | Has entries (webhook tests) |
| `affiliate_profiles` | ✅ Pre-existing | From marketplace module |
| `affiliate_events` | ✅ Pre-existing | From marketplace module |

### Profile Columns Added
- `wallet_address` — stores user's blockchain wallet
- `referred_by` — stores referral code from signup

---

## Edge Functions (7 deployed — ALL ACTIVE)

| Function | Status | Purpose |
|----------|--------|---------|
| `inv-process-order` | ✅ ACTIVE | Share purchase processing (card + crypto) |
| `inv-samcart-webhook` | ✅ ACTIVE | Receives SamCart checkout/refund webhooks |
| `submit-payout-claim` | ✅ ACTIVE | User submits bank transfer claim |
| `save-bank-details` | ✅ ACTIVE | Validates + saves bank details |
| `revolut-webhook` | ✅ ACTIVE | Receives Revolut payment callbacks (HMAC verified) |
| `revolut-token-refresh` | ✅ ACTIVE | Refreshes Revolut access token (JWT + refresh token) |
| `particle-jwks` | ✅ ACTIVE | Serves RSA public key for Particle JWT verification |
| `particle-generate-jwt` | ✅ ACTIVE | Signs JWT for Particle wallet creation |

---

## n8n Workflows (5 imported)

| Workflow | Status | Purpose |
|----------|--------|---------|
| NFsTay -- Revolut Token Refresh | ✅ ACTIVE | 30-min cron refreshes Revolut access token |
| NFsTay -- Investment Notifications | ✅ ACTIVE | Receives notification events |
| NFsTay -- Investment WhatsApp Notifications | ✅ ACTIVE | Triggers GHL workflow for WhatsApp |
| NFsTay -- Tuesday Payout Batch | ⏸️ INACTIVE | Weekly Revolut batch (activate when first payout needed) |
| NFsTay -- Subscription Commission | ⏸️ INACTIVE | GHL subscription → commission (activate when ready) |

---

## External Integrations

### Revolut Business API ✅ CONNECTED (Production)
- Certificate uploaded + access enabled
- Client ID: `t3OyVM3sjDcv8oWwUU5FcLQQNOUbcdpi74-zRiBQQ-E`
- JWT auth working, tokens auto-refreshing
- GBP account: `9e512c4e-ebe5-4389-a20f-5e3be3a912a6` (nfstay shares)
- EUR account: `9b79fd27-befa-4d79-a4e9-0e5f5b4fe03c`
- Webhook registered for payment events
- 23 accounts accessible

### SamCart ✅ WEBHOOK CONFIGURED (API key missing)
- Webhook URL: `https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/inv-samcart-webhook`
- 2 rules: Checkout Charged + Product Refunded (product-specific for hub.com.investment)
- Legacy webhook ("Notify URL 1") untouched — still serves app.nfstay.com
- ❌ **SAMCART_API_KEY not received yet** — email sent to support@samcart.com

### GHL (GoHighLevel) ✅ CONNECTED
- Location: `eFBsWXY3BmWDGIRez13x` (NFsTay)
- PIT token: `pit-28d63a20-4d9f-46bc-aaa3-26556d8b518f`
- Investment workflow: `75b14201-f492-44e9-a6e8-4423842fa07e`
- WhatsApp notifications working (tested with Hugo's contact)
- Hugo's GHL contact ID: `bXRhraG8yIBwrmCtzfyB`

### Particle Network ⚠️ PARTIAL
- **Project:** NFsTay Investment (new, separate from legacy)
- Project ID: `470629ca-91af-45fa-a52b-62ed2adf9ef0`
- Client Key: `cTHFOA18eAs4iRrkgn8lG1QARC8HFkkv5jeYQPc1`
- Server Key: `su4XYbQ46MNcuVDBYJn5dBhxqA5zXCXRRfyZrbF0`
- App ID: `a82d525c-85da-4786-a0ed-e4cf110c8377` (Web, domain: hub.nfstay.com)
- JWKS endpoint deployed + configured in Particle dashboard
- JWT generator deployed
- ❌ **Client SDK (`@particle-network/connectkit` / `authkit`) breaks Vite build** — alpha version incompatibility
- `ParticleProvider` is a pass-through wrapper (no-op) to prevent app crash
- Wallet creation deferred to when stable SDK is available or server-side API approach

### The Graph ✅ DEPLOYED + INDEXING
- Voting: `https://api.studio.thegraph.com/query/95498/votingnfstay/version/latest`
- Shares: `https://api.studio.thegraph.com/query/95498/shares/version/latest`

---

## Blockchain Integration

### Smart Contract Addresses (BNB Chain Mainnet)

| Contract | Address | Status |
|----------|---------|--------|
| RWA Token | `0x9D60e725dD24B42a5132076AE8F99E3a8e0e5B93` | ✅ Verified |
| Marketplace | `0x16ea61dA946f1e5032EB3Bab2c05E5A26e6809A1` | ✅ Verified |
| Rent | `0x0BD1356Cd38BB0fd73aD0027D4B0E50E0a6AE1D2` | ✅ Verified |
| Voting | `0xfD0F8de0e0eCd1BFb35143C8F0698Ec48E4a90Ac` | ✅ Verified |
| Booster | `0xF19c06f5C5627BEBe98Ac6C1BB19B9C12cE0B328` | ✅ Verified |
| USDC | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` | ✅ Standard BEP-20 |
| STAY | `0x52b3E7c59e4Ccb66cdE3a3a42414263BBaf0f2d0` | ✅ NFsTay token |
| ROCK | `0xa2AC3e8f4F1b6e7C7f7bCe3F5bA9C1FdF0aE6E2a` | ✅ Governance token |
| Admin Treasury | `0xE1F532A57Fd6a1d3af3Ec8E268249d6B6cEe3df6` | ✅ Multisig |

### ABIs
All contract ABIs in `src/lib/contractAbis.ts`.

### Blockchain Hook
`src/hooks/useBlockchain.ts` — all read/write functions:
- `purchaseShares(propertyId, shares)` → approve USDC + sendPrimaryShares
- `claimRent(propertyId)` → withdrawRent
- `vote(proposalId, choice)` → vote on Voting contract
- `boost(propertyId)` → boost on Booster contract
- `claimRewards(propertyId)` → claim STAY rewards
- `getShareBalance(propertyId)` → read-only balance
- `getRentDetails(propertyId)` → read-only rent info
- `getBoostDetails(propertyId)` → read-only boost status

### Blockchain → UI Wiring Status
- ✅ "Secure Your Shares" button → calls `purchaseShares()`
- ✅ "Claim" (USDC) → calls `claimRent()`
- ✅ "Vote Yes/No" → calls `vote()`
- ✅ "Boost APR" → calls `boost()`
- ✅ "Claim" (STAY rewards) → calls `claimRewards()`
- ⚠️ Read functions exist but don't yet populate UI (pages show Supabase/mock data, not on-chain reads)

---

## Supabase Secrets (ALL stored)

| Secret | Status |
|--------|--------|
| `REVOLUT_CLIENT_ID` | ✅ |
| `REVOLUT_PRIVATE_KEY` | ✅ |
| `REVOLUT_REDIRECT_URI` | ✅ |
| `REVOLUT_ISS` | ✅ |
| `REVOLUT_ACCESS_TOKEN` | ✅ (auto-refreshing) |
| `REVOLUT_REFRESH_TOKEN` | ✅ |
| `REVOLUT_ACCOUNT_ID_GBP` | ✅ |
| `REVOLUT_ACCOUNT_ID_EUR` | ✅ |
| `REVOLUT_WEBHOOK_SECRET` | ✅ |
| `GHL_PIT_TOKEN` | ✅ |
| `GHL_LOCATION_ID` | ✅ |
| `GHL_INVEST_WORKFLOW_ID` | ✅ |
| `PARTICLE_JWT_PRIVATE_KEY` | ✅ |
| `PARTICLE_PROJECT_ID` | ✅ |
| `PARTICLE_SERVER_KEY` | ✅ |
| `RESEND_API_KEY` | ✅ |
| `NFS_RESEND_API_KEY` | ✅ |
| `SAMCART_API_KEY` | ❌ MISSING — waiting for SamCart support |

---

## Frontend Hooks & Utilities

| File | Status | Notes |
|------|--------|-------|
| `src/hooks/useInvestData.ts` | ✅ | 20+ React Query hooks for all invest tables |
| `src/hooks/useWallet.ts` | ✅ | Wallet connect (MetaMask fallback, Particle deferred) |
| `src/hooks/useCryptoPurchase.ts` | ✅ | Full crypto purchase flow |
| `src/hooks/useBlockchain.ts` | ✅ | All smart contract read/write calls |
| `src/lib/particle.ts` | ✅ | Contract addresses, ABIs, config, subgraph endpoints |
| `src/lib/contractAbis.ts` | ✅ | All 8 contract ABIs |
| `src/lib/notifications.ts` | ✅ | GHL notification helper |
| `src/lib/csvExport.ts` | ✅ | CSV export for admin tables |
| `src/lib/searchFilter.ts` | ✅ | Search/filter for admin pages |
| `src/data/investMockData.ts` | ✅ | Mock data (kept as fallback, never deleted) |
| `src/components/ParticleProvider.tsx` | ✅ | Pass-through wrapper (SDK removed due to Vite crash) |
| `src/components/BankDetailsForm.tsx` | ✅ | GBP/EUR bank details form |

---

## Commission System

| Type | Default Rate | Source | Admin Override |
|------|-------------|--------|---------------|
| Subscription | 40% | GHL webhook → n8n → `aff_commissions` | ✅ Per-user + global |
| First Investment | 5% | SamCart webhook → `aff_commissions` | ✅ Per-user + global |
| Recurring (Rental Income) | 2% | Rent events → `aff_commissions` | ✅ Per-user + global |

Rates stored in `aff_commission_settings` — never hardcoded. Admin can change global rates and per-user overrides.

---

## Payout System

### Crypto Claims (Instant)
- User clicks "Claim" → selects USDC/STAY/LP → on-chain transaction → instant

### Bank Transfer Claims (Weekly)
- User clicks "Claim" → selects Bank Transfer → `payout_claims` row created (status: pending)
- Tuesday 05:00 AM UK → n8n batch collects all pending claims
- n8n registers counterparties with Revolut (if new)
- n8n creates payment draft in Revolut
- Hugo approves in Revolut app (Face ID)
- Revolut sends payments (UK Faster Payments / SEPA)
- Revolut webhook updates claim to "paid"
- WhatsApp notification sent to user

---

## Migration (Legacy → Hub)

Legacy users (app.nfstay.com) who already own shares:
- Their shares are on-chain tied to their OLD wallet address
- They must connect their old wallet manually in Settings to see holdings
- No automatic migration possible (Particle social login doesn't share emails)
- Settings page has "Connect Existing Wallet" for legacy users

---

## Documentation (14 files)

| Doc | Purpose |
|-----|---------|
| `AGENT_INVESTMENT_INSTRUCTIONS.md` | Master protocol — references all docs |
| `HOTKEYS.md` | Agent prompt template |
| `DOMAIN.md` | Terminology dictionary |
| `DATABASE.md` | All table schemas + RLS |
| `ARCHITECTURE.md` | System map |
| `PHASES.md` | 7-phase build plan |
| `INTEGRATIONS.md` | All integrations + n8n workflows |
| `ACCEPTANCE.md` | BDD scenarios |
| `STACK.md` | Contract addresses, env vars |
| `BOUNDARIES.md` | What's untouchable |
| `MODULE_AUDIT.md` | This file — current state |
| `EXECUTION_PLAN.md` | Implementation sequence |
| `PAYOUT_FLOW.md` | Crypto + bank payout details |
| `USER_JOURNEY.md` | Simple English flows |

---

## Branch Policy

All work on feature branches. Never push to main directly. Hugo merges when ready.

Current: everything merged to main. No active feature branches.
