# Investment Module Audit Report
Date: 2026-03-24

## Dashboard Fix
What was changed: The "Recent Activity" section on AdminInvestDashboard now shows date/time (e.g. "24 Mar 2026, 14:30"), user name, email, and WhatsApp for each completed order. Previously it only showed a truncated user_id and a relative timestamp.

Files modified:
- `src/pages/admin/invest/AdminInvestDashboard.tsx` - Activity feed UI updated to show user details
- `src/hooks/useInvestData.ts` - Profiles query in `useInvestOrders` now fetches `name` and `whatsapp`
- `src/lib/invest/mergeOrderBuyerEmails.ts` - Merge function now attaches `user_name` and `user_whatsapp` to orders

TypeScript: PASS (zero errors)

---

## Page-by-Page Audit

### InvestMarketplacePage.tsx
Data: REAL - properties from Supabase `inv_properties`, blockchain activity from The Graph subgraph
Issues:
- `console.error` at line 378 for buy failures - acceptable (error logging)
- `fetchRecentPurchases()` queries The Graph for real on-chain data - good
- Buy flow uses `useBlockchain().buyShares` which calls the live Marketplace contract
- SamCart prefill params generated via `buildSamcartPrefillParams` for card payments
Missing: None - page is fully wired with real data, loading states, and empty states

### InvestPortfolioPage.tsx
Data: REAL + BLOCKCHAIN - holdings from Supabase merged with on-chain balances via `usePortfolioWithBlockchain`
Issues:
- Rank system uses hardcoded thresholds (0, 1, 3, 5, 10, 15) - acceptable as these are product constants, not DB config
- `boostCost` uses a hardcoded property ID of 1 (`boosterContract.getBoostAmount(address, 1)`) - only works for property 1
- Monthly earnings chart merges blockchain withdrawals + Supabase `payout_claims` - good hybrid approach
Missing:
- "Early Investor" achievement is always `unlocked: false` - never gets set to true
- Boost cost reads only property ID 1 - should be dynamic per property

### InvestProposalsPage.tsx
Data: REAL + BLOCKCHAIN - proposals from Supabase + The Graph voting contract
Issues:
- `console.error` at line 346 for on-chain proposal submission failure - acceptable
- Confetti colors include non-brand colors (#FFD700, #FF6B6B, etc.) - but this is decorative celebration UI, not brand elements
- `useProposalsFromGraph` merges on-chain proposals with Supabase proposals - good
- Vote mutation updates count client-side via select-then-update pattern (race condition possible with concurrent voters)
Missing: None - dual-source (Supabase + blockchain) voting is fully wired

### InvestPayoutsPage.tsx
Data: REAL + BLOCKCHAIN - payouts from `usePayoutsWithBlockchain` (merges Supabase + on-chain rent data)
Issues: None significant
- Bank transfer claim calls `supabase.functions.invoke('submit-payout-claim')` - real Edge Function
- USDC/STAY/LP claims use `useBlockchain()` write functions (real contract calls)
- 4 claim methods: Bank Transfer, USDC, STAY Token, LP Token - all wired
- PancakeSwap URLs are hardcoded but correct (STAY token and LP pair addresses match `lib/particle.ts`)
Missing: None - claim flow is complete with all 4 methods, bank details form, and success/error states

### AdminInvestDashboard.tsx (after fix)
Data: REAL - stats computed from `useInvestOrders`, `useAllShareholders`, `useAllPayoutClaims`, `useInvestProperties`
Issues: None after fix
Missing: Quick Actions buttons show "Navigating..." badge but don't actually navigate anywhere - they need `onClick` handlers with router navigation

### AdminInvestProperties.tsx
Data: REAL - CRUD operations against `inv_properties` table with image/doc upload to Supabase Storage
Issues: None
- Full create/edit/delete with image gallery, document uploads, highlights
- Status colors for open/funded/closed
Missing: No delete confirmation dialog - delete happens immediately (risky)

### AdminInvestOrders.tsx
Data: REAL - orders from `useInvestOrders` (Supabase `inv_orders` joined with profiles)
Issues: None
- Complete/refund/edit actions with inline editing
- CSV export, search, status filter, property filter
- Loading state and error state present
Missing: None - fully functional admin orders page

### AdminInvestPayouts.tsx
Data: REAL + BLOCKCHAIN - merges Supabase `payout_claims` with The Graph `rentWithdrawns`
Issues:
- `useState(() => { ... })` at line 78 - this is incorrect usage of `useState` as an initializer with side effects. Should be `useEffect`. The profiles fetch may not execute reliably.
- Live USD-to-GBP rate fetch from `open.er-api.com` has no AbortController timeout
Missing:
- Manual "Trigger Weekly Batch" button exists but actual batch processing logic is not shown

### AdminInvestCommissions.tsx
Data: REAL - from `useAllCommissions` (Supabase `aff_commissions` joined with `aff_profiles`)
Issues: None
- Stats computed from real data (total, pending, claimable, paid)
- Filters: source, status, agent search, date range
- CSV export
Missing: None - fully wired to real data

### AdminInvestShareholders.tsx
Data: REAL + BLOCKCHAIN - The Graph purchases + on-chain RWA balances + rent contract + profiles
Issues:
- **BUG**: `CONTRACTS.RWA_TOKEN` used at line 97 but `CONTRACTS` is NOT imported. Only `SUBGRAPHS` is imported from `@/lib/particle`. This will cause a `ReferenceError` at runtime when the on-chain balance check executes. The `try/catch` will silently swallow it, falling back to Graph shares only.
- Hardcoded RPC URL (`https://bnb-mainnet.g.alchemy.com/v2/...`) at lines 95, 130 - should come from config
- Hardcoded rent contract address at line 131 (`0x5880FABeafDD228f0d8bc70Ebb2bb79971100C89`) - should use `CONTRACTS.RENT`
- Inline editing of name/admin_label saves to profiles - good
Missing: None functionally, but the CONTRACTS import bug means on-chain balances are never used

### AdminInvestCommissionSettings.tsx
Data: MIXED - global rates from DB (`aff_commission_settings`), agent overrides are HARDCODED MOCK
Issues:
- **MOCK DATA**: `initialAgents` array (lines 44-49) contains hardcoded mock agents (Hugo Souza, John Smith, Sarah Chen, Ahmed Ali, Maria Garcia). This is not loaded from Supabase.
- **MOCK DATA**: `allUsers` array (lines 52-58) contains hardcoded mock user list for the "Add Override" dropdown. Should query profiles table.
- Global rate save works correctly - uses `useUpdateCommissionRate` which writes to `aff_commission_settings`
- Override save correctly upserts to `aff_commission_settings` with `user_id` + `commission_type` composite
Missing:
- Agent override list should be loaded from DB (query `aff_commission_settings` WHERE `user_id IS NOT NULL`)
- User dropdown for "Add Override" should query real profiles

### AdminTestConsole.tsx
Data: REAL - reads wallet from profile, checks blockchain state, creates real `payout_claims` rows
Issues: None - properly uses callStatic for dry-run testing
Missing: None - comprehensive test console for all investment flows

### AdminInvestProposals.tsx
Data: REAL BLOCKCHAIN - reads directly from Voting contract on BNB Chain
Issues: None - iterates proposal IDs 1-20, decodes descriptions, computes status
Missing: None

### AdminInvestBoost.tsx
Data: REAL - reads from `inv_boost_status` table, boost/claim via `useBlockchain()`
Issues:
- User column shows truncated `user_id` (line 47: `r.user_id?.slice(0, 8)`) instead of user name
- Email shows `'--'` hardcoded (line 48) - not fetched from profiles
Missing: Should join with profiles to show user name/email

### AdminEndpoints.tsx
Data: HARDCODED but CORRECT - contract addresses match `lib/particle.ts` CONTRACTS object
Issues: None - addresses are intentionally displayed as reference
- Includes live health checks against each contract via RPC
Missing: None - this is a reference/status page

---

## Commission System
- Global rates source: FROM DB (`aff_commission_settings` via `useCommissionSettings` hook)
- Per-agent overrides source: HARDCODED MOCK (initial state is mock data, saves go to DB but initial load is fake)
- Tracking: Working for global rates. Per-agent override display is mock - DB writes work but read-back on page load shows hardcoded list.

## Smart Contracts
- Addresses: FROM CONFIG (`src/lib/particle.ts` CONTRACTS object) - used consistently in hooks
- Exception: `AdminInvestShareholders.tsx` has a missing CONTRACTS import (line 97) and hardcodes the rent contract address (line 131)
- ABIs: MATCH CONTRACTS - extracted from legacy app, all functions referenced in hooks are present in `contractAbis.ts`
- Subgraph endpoints: FROM CONFIG (`src/lib/particle.ts` SUBGRAPHS object)

## Notifications
- `src/lib/notifications.ts` sends notifications via n8n webhook + GHL fallback + Supabase in-app notifications
- GHL bearer token is hardcoded in the fallback path (line 29) - should be env var
- 10 notification types covered: purchase, rent, commission, payout, proposal, bank, boost

## Console.log Statements
- `useBlockchain.ts`: ~20 console.log/error statements for transaction debugging - many are valuable for debugging blockchain transactions but `console.log` calls at lines 60, 62, 276, 283, 289, 296, 304, 306, 315, 485, 584, 598, 613 should be removed or converted to a debug utility for production
- `InvestMarketplacePage.tsx`: 1 console.error (line 378) - acceptable
- `InvestProposalsPage.tsx`: 1 console.error (line 346) - acceptable
- Admin pages: clean - no console.log statements

---

## Critical Issues

1. **AdminInvestShareholders.tsx - Missing CONTRACTS import** (line 97): `CONTRACTS.RWA_TOKEN` is referenced but never imported. The on-chain balance check silently fails, meaning shareholders page always shows Graph share counts instead of real on-chain balances. Fix: add `CONTRACTS` to the import from `@/lib/particle`.

2. **AdminInvestCommissionSettings.tsx - Mock agent overrides** (lines 44-58): The agent override list and user dropdown are hardcoded arrays. Global rates are real (from DB), but per-agent overrides show fake data on initial load. Saves work but the list never refreshes from DB.

3. **AdminInvestPayouts.tsx - Incorrect useState usage** (line 78): `useState(() => { ... })` with an async side effect is not the correct pattern. The profile fetch for the credit dropdown may not execute. Should be `useEffect`.

4. **notifications.ts - Hardcoded GHL bearer token** (line 29): `REDACTED_GHL_PIT_TOKEN` is hardcoded instead of using an env var.

## Medium Issues

5. **AdminInvestShareholders.tsx - Hardcoded contract addresses** (line 131): Rent contract address is hardcoded as a string literal instead of using `CONTRACTS.RENT`.

6. **AdminInvestBoost.tsx - No user details** (lines 47-48): Shows truncated user_id and hardcoded '--' for email instead of fetching from profiles.

7. **AdminInvestDashboard.tsx - Quick Actions don't navigate**: Buttons show "Navigating..." but have no actual router navigation.

8. **InvestPortfolioPage.tsx - Boost cost hardcoded to property 1**: `boosterContract.getBoostAmount(address, 1)` always checks property ID 1.

9. **useBlockchain.ts - Excessive console.log**: ~15 debug log statements that should be removed or gated behind a debug flag for production.

---

## Verdict
**NOT READY for production** - 4 critical issues need fixing:
1. Missing CONTRACTS import causes silent data degradation on shareholders page
2. Mock agent overrides in commission settings show fake data to admin
3. Incorrect useState pattern may cause payouts admin to not load user dropdown
4. Hardcoded GHL token in notifications

The core user-facing investment flows (marketplace buy, portfolio, payouts, proposals) are fully wired with real blockchain + Supabase data and are functional. The admin panel has the issues listed above. The smart contract integration is solid with proper ABIs matching deployed contracts.
