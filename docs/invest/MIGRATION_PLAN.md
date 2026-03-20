# Investment Module Migration Plan

> Port legacy app.nfstay.com investment features into hub.nfstay.com.
> Copy proven logic. Keep our UI. No reinvention.

## Principle

Everything that works in legacy gets ported verbatim. The only changes are:
- Next.js → React + Vite + TypeScript
- MongoDB → Supabase
- Backend routes → Supabase Edge Functions + n8n
- UI components → shadcn/ui (our existing design)

## What stays unchanged
- Our auth (Supabase + Google social login + WhatsApp OTP)
- Our admin panel (Supabase CRUD for properties, orders, commissions)
- Our database schema (inv_ / aff_ prefixed tables)
- Our n8n workflows
- Our bank transfer / Revolut payout system
- Our notification system (WhatsApp + email via GHL + n8n)

---

## Phase 0 — Foundation (Wallet + Provider)

| Legacy Source | Our Target | Status |
|--------------|-----------|--------|
| `ParticleConnectkit.jsx` | `ParticleProvider.tsx` | Shipped (AuthCoreContextProvider) |
| `useEthereum()` from authkit | `useBlockchain.ts` | Shipped |
| `utils/abis.js` (full Solidity ABIs) | `lib/contractAbis.ts` | Needs update (human-readable → full) |
| `config.js` (addresses, RPC, Graph) | `lib/particle.ts` | Already matches |
| Particle wallet embed UI (Buy/Receive/Wallet modal) | `ParticleProvider.tsx` wallet plugin | Not yet ported |

**Test gate:** Successfully sign and execute one on-chain transaction (withdrawRent).

---

## Phase 1 — Payouts (Rent Claiming)

| Legacy Source | Our Target |
|--------------|-----------|
| `payouts/rentalYieldModal.js` | `InvestPayoutsPage.tsx` ClaimModal |
| `utils/claim.jsx` (multi-step executor) | Inline in ClaimModal |
| `NfstayContext.withdrawRent()` | `useBlockchain.claimRent()` |
| `claim.jsx` STAY steps (0-2) | `useBlockchain.buyStayTokens()` |
| `claim.jsx` LP steps (0-5) | `useBlockchain.buyLpTokens()` |
| `subgraphHelper.js` rent queries | `usePayoutsWithBlockchain.ts` |
| `payouts/congratulation.js` | Success step in ClaimModal |

---

## Phase 2 — Portfolio

| Legacy Source | Our Target |
|--------------|-----------|
| `NfstayContext.getShareCount()` | `useBlockchain.getShareBalance()` |
| `portfolio/currentApr.js` | InvestPortfolioPage APR display |
| `portfolio/boostedApr.js` | InvestPortfolioPage boosted display |
| `NfstayContext.handleBoost()` | `useBlockchain.boostApr()` |
| `portfolio/stayEarned.js` | `useBlockchain.claimBoostRewards()` |
| `NfstayContext.handleAddToFarm()` | Farm staking (new) |
| `NfstayContext.getBalances()` | Token balance display |
| `subgraphHelper.js` boost queries | Portfolio data hook |

---

## Phase 3 — Proposals (Voting)

| Legacy Source | Our Target |
|--------------|-----------|
| `subgraphHelper.js` voting queries | InvestProposalsPage data |
| `NfstayContext.getProposalDetails()` | `useBlockchain.getProposalDetails()` |
| `NfstayContext.handleVote()` | `useBlockchain.castVote()` |
| Proposal list + detail UI | Restyle existing page |

---

## Phase 4 — Marketplace (Buy Shares)

| Legacy Source | Our Target |
|--------------|-----------|
| `details/payment.js` (card + crypto) | InvestMarketplacePage purchase flow |
| `NfstayContext.handlePurchase()` | `useBlockchain.buyShares()` |
| SamCart checkout iframe | SamCart redirect (already wired) |
| `subgraphHelper.js` purchase events | Activity feed |
| Property details | Supabase `inv_properties` (admin-managed) |

---

## Phase 5 — Agent Dashboard

| Legacy Source | Our Target |
|--------------|-----------|
| `agentHub/agent.js` | Become An Agent page |
| `agentHub/analytics.js` | Agent analytics section |
| `agentHub/properties.js` | Referral link per property |
| `agentHub/revenue.js` | Revenue display |
| `agentHub/recentTransaction.js` | Transaction history |
| `agentHub/agentPerformanceFee.js` | Commission display |
| `subgraphHelper.js` agent queries | Agent data hooks |

---

## Phase 6 — Admin Enhancements

| What | Status |
|------|--------|
| Property CRUD + photos | Already built |
| Rent distribution (addRent) | Port from legacy admin |
| Order management | Already built |
| Commission settings | Already built |
| Wallet change permission | Already built |

---

## Execution Order

```
Phase 0 → test one tx → if pass:
  Phase 1 (Payouts) → test all 3 claim options →
  Phase 2 (Portfolio) → test balances + boost →
  Phase 3 (Proposals) → test vote →
  Phase 4 (Marketplace) → test buy →
  Phase 5 (Agent) → test commission tracking →
  Phase 6 (Admin) → final QA
```

Each phase: audit legacy → port logic → restyle to our UI → test on hub.nfstay.com → next phase.

---

## Key Legacy Files

| File | Lines | Contains |
|------|-------|----------|
| `frontend/src/context/NfstayContext.jsx` | 1475 | ALL contract functions |
| `frontend/src/context/ParticleConnectkit.jsx` | 76 | Particle provider setup |
| `frontend/src/context/subgraphHelper.js` | ~500 | ALL Graph queries |
| `frontend/src/utils/abis.js` | ~2100 | ALL contract ABIs |
| `frontend/src/utils/claim.jsx` | 389 | Multi-step claim executor |
| `frontend/src/config.js` | 130 | Addresses, RPC, config |
| `frontend/src/context/helper.js` | ~200 | Utility functions |

---

*Last updated: 2026-03-20*
