# Legacy Investment Module Port — Migration Plan

> Approved 2026-03-20. This is the single execution plan for porting all investment features from legacy app.nfstay.com into hub.nfstay.com.

---

## Principle

**Port the proven engine. Keep our shell.**

Every contract call, every subgraph query, every wallet interaction comes from legacy verbatim. Our UI, auth, admin panel, and database layer stay.

---

## Hard Rules (learned from 2026-03-20 incident)

1. **All work on `feature/invest-wiring` branch** — never push to main
2. **Vercel preview URL for every push** — verify before merge
3. **One phase at a time** — test each before starting next
4. **Do not touch `vite.config.ts`** — `@particle-network/authkit@2.1.1` ships React 19 internally; bundler config changes expose the conflict and crash the app
5. **Do not install new Particle packages** — authkit@2.1.1 is what works; connectkit and others conflict
6. **Do not modify `package.json` dependencies** without verifying the build loads in a browser first
7. **Every change must be tested on a preview URL before merge**

---

## What We Bring From Legacy

| From Legacy | File | What It Does |
|---|---|---|
| Contract interactions | `nfstayContext.jsx` | All contract functions: buy, sell, claim, vote, boost, farm |
| Graph queries | `subgraphHelper.js` | All 17 subgraph queries: sales, rent, commissions, proposals, leaderboards |
| Claim flow | `claim.jsx` | Multi-step: USDC → approve → STAY or LP → farm |
| Config | `config.js` | Contract addresses, Graph endpoints, Particle credentials |
| ABIs | `abis.js` | Full Solidity ABIs for all 11 contracts |
| Utilities | `helper.js` | Wei conversion, encoding, formatting |
| Agent hub | `agentHub/*` | Commission tracking, analytics, performance fees |
| Payouts | `payouts/*` | Rent claim modal with 3 crypto options |
| Portfolio | `portfolio/*` | Boost APR, STAY rewards, LP staking |

## What Stays (Our Shell)

| Keep | Why |
|---|---|
| React + Vite + TypeScript | Our stack |
| Supabase (not MongoDB) | Our database |
| shadcn/ui components | Our design system |
| Auth (Supabase + Particle social + WhatsApp OTP) | Our auth flow |
| Admin panel | Our property management |
| n8n workflows | Our automation |
| Bank transfer / Revolut payouts | New feature not in legacy |

---

## User Flows (all cloned from legacy)

### Flow 1 — Sign Up & Get a Wallet

```
User clicks Google on hub.nfstay.com
→ Google login screen appears
→ User signs in with Google
→ Particle creates an invisible wallet (same wallet as app.nfstay.com)
→ Wallet address saved to profile
→ User lands on dashboard
```

**Result:** Same wallet `0xAA884...` on both sites.

### Flow 2 — Buy Shares with Card

```
User goes to Marketplace
→ Sees Pembroke Place (real blockchain data)
→ Types $500, clicks "Invest with Card"
→ SamCart payment page opens
→ User pays
→ SamCart webhook → backend → sendPrimaryShares() on-chain
→ Shares appear in wallet
→ Visible on Portfolio page
```

### Flow 3 — Buy Shares with Crypto (USDC)

```
User goes to Marketplace
→ Types $500, clicks "Invest with Crypto"
→ Wallet popup: approve USDC
→ Confirms → smart contract transfers USDC, gives shares
→ Shares in wallet
```

### Flow 4 — Claim Rent (Payout)

```
User goes to Payouts
→ Sees "Pembroke Place — $0.56 available"
→ Clicks "Claim"
→ Modal with 4 options:
    Bank Transfer → Revolut batch next Tuesday
    USDC → straight to wallet
    STAY Token → withdraw USDC, swap to STAY
    LP Token → withdraw USDC, create LP, stake
→ User picks, confirms in wallet
→ Money moves
```

### Flow 5 — Vote on a Proposal

```
User goes to Proposals
→ Sees active proposal
→ Clicks "Vote Yes" or "Vote No"
→ Wallet popup: sign vote
→ Vote recorded on-chain (weighted by shares)
```

### Flow 6 — Boost APR

```
User goes to Portfolio
→ Sees "Boost APR" button
→ Clicks → pays USDC fee
→ Yield increases
→ STAY rewards accumulate
→ "Claim Rewards" → STAY to wallet
```

### Flow 7 — Agent Commissions

```
Agent shares referral link
→ New user signs up + buys shares
→ Agent earns 5% (first purchase) + 2% (ongoing rent)
→ Agent Dashboard shows commissions
→ "Claim" → same 4 payout options
```

---

## Phases

### Phase 0 — Signing Fix
- Fix Particle MPC signing so `withdrawRent()` works
- Must work before anything else
- **Gate:** One successful on-chain transaction from hub.nfstay.com

### Phase 1 — Payouts (Claim Rent)
- Port `claim.jsx` multi-step flow
- All 4 methods: Bank, USDC, STAY, LP
- Real data from Rent contract + The Graph
- **Gate:** Successfully claim $0.56 from Pembroke Place

### Phase 2 — Portfolio
- Port share balances, boost APR, STAY rewards, LP staking
- From `nfstayContext.jsx` boost/farm functions
- **Gate:** See real share balance, boost APR, claim rewards

### Phase 3 — Proposals (Voting)
- Port governance voting
- From `subgraphHelper.js` proposal queries
- **Gate:** Cast a vote and see it recorded

### Phase 4 — Marketplace (Buy Shares)
- Port crypto purchase flow
- SamCart card flow already wired
- **Gate:** Buy 1 share with USDC

### Phase 5 — Agent Dashboard
- Port commission tracking, analytics, referral system
- From `subgraphHelper.js` agent/commission queries
- **Gate:** See real commission data for whitelisted agent

---

## Execution Method

```
For each phase:
  1. Audit legacy implementation (read, don't copy)
  2. Write adapted code for our stack (TypeScript, Supabase, shadcn/ui)
  3. Build locally — must pass
  4. Push to feature/invest-wiring
  5. Get Vercel preview URL
  6. Test on preview URL
  7. Hugo confirms
  8. Merge to main
  9. Verify on hub.nfstay.com
  10. Move to next phase
```

---

## What Changes vs Legacy

| | Legacy (app.nfstay.com) | New (hub.nfstay.com) |
|---|---|---|
| Look & feel | Old design | New shadcn/ui design |
| Wallet | Same | Same |
| Contracts | Same | Same |
| Shares | Same | Same |
| Money | Same | Same |
| Sign in | Google only | Google + WhatsApp + Email |
| Admin | Basic | Full property management |
| Bank payouts | Not available | New — Revolut weekly batch |

---

*Every arrow, every wallet popup, every dollar — identical to legacy. We're putting a new coat of paint on a running engine.*
