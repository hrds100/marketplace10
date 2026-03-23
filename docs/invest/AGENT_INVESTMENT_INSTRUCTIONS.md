# Investment Module — AI Agent Instructions

> Single source of truth for all Investment/JV module work. Read FIRST. Every session. No exceptions.

---

## 1. SCOPE

This document governs ALL work on the Investment/JV module inside marketplace10.

The investment module includes:
- 5 user-facing pages: Marketplace, Portfolio, Proposals, Payouts, Become An Agent
- Investment properties (share-based fractional ownership)
- Blockchain integration (BNB Chain smart contracts, The Graph indexing)
- Commission system (subscription 40% + investment 5%/2%)
- Admin panel extensions for investment management
- Notifications (email + WhatsApp) for investment events
- Boost APR system
- Governance voting

**This module is NOT isolated like nfstay booking.** It lives in the existing `src/pages/invest/` directory, uses the existing sidebar/layout, and extends the existing admin panel. However, it has its own Supabase tables (prefixed `inv_` and `aff_`) and its own n8n workflows (prefixed `inv-` and `aff-`).

---

## 2. DOCUMENT INDEX (14 docs)

All documentation lives in `docs/invest/`. Before any task, read this file PLUS the task-specific docs.

### Complete file list

| # | File | Purpose |
|---|------|---------|
| 1 | **AGENT_INVESTMENT_INSTRUCTIONS.md** | This file — master protocol, hard rules, commission rules, changelog |
| 2 | **HOTKEYS.md** | Copy-paste hotkey prompt for the coding agent |
| 3 | **DOMAIN.md** | Investment terminology dictionary (actors, concepts, ranks, statuses) |
| 4 | **DATABASE.md** | All table schemas (7 inv_ + 4 aff_ + 3 shared) with RLS policies |
| 5 | **ARCHITECTURE.md** | System map: blockchain ↔ Supabase ↔ n8n ↔ frontend, data flows |
| 6 | **PHASES.md** | 7-phase build plan with acceptance criteria per phase |
| 7 | **INTEGRATIONS.md** | 11 n8n workflows, Revolut API, notification matrix, contract functions |
| 8 | **ACCEPTANCE.md** | BDD Given/When/Then scenarios for every feature |
| 9 | **STACK.md** | Contract addresses, wallets, Graph endpoints, APIs, Revolut, env vars |
| 10 | **BOUNDARIES.md** | What invest owns, what's shared, what must never be touched |
| 11 | **MODULE_AUDIT.md** | Current state snapshot — what's built, what's mock, what's missing |
| 12 | **EXECUTION_PLAN.md** | Step-by-step implementation sequence with dependencies |
| 13 | **PAYOUT_FLOW.md** | Complete crypto + bank payout documentation (Revolut weekly batch) |
| 14 | **USER_JOURNEY.md** | Every flow explained in simple English with emojis (non-technical) |
| 15 | **WALLET_ARCHITECTURE.md** | Wallet creation flow, MPC security model, recovery procedures, backup map |

### Which docs to read per task

| Task type | Also read |
|-----------|-----------|
| **Always** | This file + `BOUNDARIES.md` |
| Database / schema / RLS | + `DATABASE.md` |
| Blockchain / contracts / The Graph | + `STACK.md` + `INTEGRATIONS.md` |
| Commission / affiliate logic | + `DOMAIN.md` + `DATABASE.md` |
| Specific page wiring | + `ARCHITECTURE.md` + `PHASES.md` |
| Admin features | + `DATABASE.md` + `BOUNDARIES.md` |
| Payout / claim / Revolut | + `PAYOUT_FLOW.md` + `INTEGRATIONS.md` |
| Notifications | + `INTEGRATIONS.md` |
| Wallet / Particle / auth / recovery | + `WALLET_ARCHITECTURE.md` + `STACK.md` |
| Feature acceptance | + `ACCEPTANCE.md` |
| Full picture / planning | + `MODULE_AUDIT.md` + `EXECUTION_PLAN.md` + `USER_JOURNEY.md` |
| Understanding what exists | + `MODULE_AUDIT.md` |
| Non-technical overview | + `USER_JOURNEY.md` |

---

## 2b. LEGACY REFERENCE CODEBASE

The original nfstay blockchain app (the working version on app.nfstay.com) lives at:

**Local path:** `/Users/hugo/Downloads/AI Folder/openclaw/nfstay-org/`
**GitHub:** `https://github.com/nfstay-Organization/nfstay`

This is the **reference implementation** — all smart contract interactions, ABIs, subgraph queries, wallet connection, boost/farm logic, agent commission tracking, and rent claiming are working in this codebase. When building the investment module, **always check how the legacy app does it first** before writing new code.

### Key reference files

| File | What it contains |
|------|-----------------|
| `frontend/src/config.js` | All contract addresses, Graph endpoints, Particle credentials, API URLs |
| `frontend/src/context/nfstayContext.jsx` | ALL contract interaction functions (buy, sell, boost, vote, claim, withdraw, balances) |
| `frontend/src/context/subgraphHelper.js` | ALL Graph queries (sales, commissions, rent, proposals, agents, leaderboard) |
| `frontend/src/utils/abis.js` | ALL contract ABIs (marketplace, RWA, voting, rent, booster, farm, router, ERC20) |
| `frontend/src/context/helper.js` | Utility functions (encoding, formatting, validation) |
| `frontend/src/app/portfolio/` | Boost UI: currentApr.js, boostedApr.js, boostedCheckout.js, stayEarned.js, congrats.js |
| `frontend/src/app/agentHub/` | Agent dashboard: agent.js, analytics.js, properties.js, revenue.js, recentTransaction.js, agentPerformanceFee.js |
| `frontend/src/app/payouts/` | Payout UI: rentalYieldModal.js (claim flow with 3 options), offRamp.js (Transak fiat off-ramp) |
| `frontend/src/app/details/payment.js` | Share purchase flow: amount input, card/crypto toggle, SamCart iframe, approval flow |
| `frontend/src/app/admin/` | Admin panel: orders, subscriptions, rewards, commissions, boost control, rent distribution, notifications |
| `backend/routes/samcartRoute.js` | SamCart webhook handler: receives payment → extracts wallet/property → calls sendPrimaryShares on-chain |
| `backend/routes/adminRoute.js` | Admin functions: complete-order, update-order |
| `backend/models/` | MongoDB models: user, order, subscription, reward |

**Rule:** When implementing any blockchain feature, first read how the legacy app does it, then adapt for our stack (React + Supabase instead of Next.js + MongoDB). The contract calls and ABIs are identical — only the frontend framework and database differ.

---

## 3. HARD RULES (Investment-Specific)

All rules from `docs/AGENT_INSTRUCTIONS.md` apply. These are ADDITIONAL rules for investment work:

1. **Never modify blockchain smart contracts.** The contracts are deployed on BNB Chain and immutable. We interact with them via ethers.js calls from the frontend.
2. **Never expose private keys.** All wallet operations happen client-side via Particle Network wallet connection.
3. **All investment tables use the `inv_` prefix.** All affiliate tables use the `aff_` prefix.
4. **All investment n8n workflows use the `inv-` prefix.** All affiliate workflows use the `aff-` prefix.
5. **Commission rates are admin-configurable.** Never hardcode commission percentages — always read from `aff_commission_settings` table.
6. **The admin wallet holds treasury funds.** Address: `0xE1F532A57Fd6a1d3af3Ec8E268249d6B6cEe3df6`
7. **All admin actions in the investment module must log to `admin_audit_log`.** Same rule as marketplace10.
8. **Payouts have a 14-day holdback.** Commissions become claimable 14 days after earning. This is configurable by admin.
9. **The Graph is the source of truth for on-chain data.** Never query the blockchain directly for historical data — use The Graph subgraph endpoints.
10. **Mock data files stay until real data is wired.** Don't delete `investMockData.ts` — components fall back to it during development.
11. **Bank payouts go through Revolut.** Weekly batch every Tuesday at 05:00 AM UK time. Hugo approves via Revolut Face ID. Never bypass the approval step.
12. **Payout amounts are always server-side calculated.** Never accept claim amounts from the frontend. Edge Function calculates from source tables.
13. **Playwright e2e test is mandatory before marking DONE.** After every fix or feature, write a Playwright test that verifies the change works, run it with `npx playwright test`, and include the pass/fail result in the report. No exceptions. Do not claim something is "working" or "fixed" without a passing Playwright test.
13. **One bank claim per user per week.** Enforced by UNIQUE(user_id, week_ref) constraint.
14. **Bank details are locked after first successful payout.** Users cannot change bank details after is_verified = true without admin intervention.
15. **Always update `docs/COMMUNICATIONS.md`** when adding, removing, or changing any email, WhatsApp, or in-app notification. Same commit. No exceptions.

---

## 3b. CRITICAL BUILD RULES (Learned from 2026-03-22 incident)

These rules exist because breaking them crashed the entire app for all users.

16. **NEVER modify `vite.config.ts` unless you are 100% certain it won't break the build.** The Particle SDK, node polyfills, WASM loader, and React resolution are all fragile. Adding resolve.alias entries for React 18 caused a TextEncoder crash that blanked the entire site.

17. **NEVER modify `src/main.tsx` entry point.** The import order and polyfill setup are critical. ES module imports are hoisted — inline code before `import` does NOT run first.

18. **NEVER use `sed` to inject code into React/TypeScript files.** It creates malformed merges (duplicate hooks, broken syntax) that crash the entire app. Always use proper file editing tools.

19. **If the site goes blank (white page on all routes), check these in order:**
    - `vite.config.ts` — was `resolve.alias` changed? Revert it.
    - `src/main.tsx` — was it modified? Revert it.
    - `src/layouts/AdminLayout.tsx` — are all lucide-react icon imports present? Missing icons = `ReferenceError` = blank page.
    - `src/App.tsx` — are all imported components' files present? Missing file = crash.
    - Run `git show <last-working-commit>:vite.config.ts` and `git show <last-working-commit>:src/main.tsx` to compare.

20. **The known working state of `vite.config.ts` has NO React 18 resolve aliases.** The site works without them. Do not add `"react": path.resolve(...)` aliases — they break the node polyfills plugin and cause `TextEncoder is not a constructor`.

21. **Before pushing ANY change to main, verify the build passes AND the app renders.** Run `npm run build` and check for errors. A passing build does NOT guarantee the app renders — runtime crashes (missing imports, duplicate hooks) are not caught by the build.

22. **After any merge from another branch, always diff the critical files:**
    ```bash
    git diff <before-merge>..HEAD -- vite.config.ts src/main.tsx src/App.tsx src/layouts/AdminLayout.tsx
    ```
    If any of these changed unexpectedly, investigate before pushing.

---

## 4. COMMISSION SYSTEM RULES

### Subscription Commissions (off-chain)
- Default rate: 40% of subscription payment
- Source: GHL webhook → n8n workflow → `aff_commissions` table
- Admin can override globally or per-user via `aff_commission_settings`

### Investment Commissions (on-chain origin)
- First purchase: 5% of investment amount
- Recurring: 2% of rental income (profits)
- Source: The Graph events → n8n workflow → `aff_commissions` table
- Admin can override globally or per-user

### Claim Flow
- Affiliates claim commissions using the SAME modal as investors claim rent
- Methods: Bank Transfer, USDC, STAY Token, LP Token
- 14-day holdback before claimable (configurable)
- All claims logged in `aff_commissions` with status progression: pending → claimable → claimed → paid

---

## 5. FEATURE BRANCH

All investment wiring work happens on: `feature/invest-wiring`
Never push directly to main. Hugo merges when ready.

---

## 6. CHANGELOG

| Date | Change | Docs Updated |
|------|--------|-------------|
| 2026-03-18 | Initial creation — all 12 docs | All |
| 2026-03-18 | Added Revolut payout system — 3 new tables, removed aff_payout_requests, Tuesday batch workflow, 3 Edge Functions | DATABASE.md, INTEGRATIONS.md, ARCHITECTURE.md, STACK.md, AGENT_INVESTMENT_INSTRUCTIONS.md |
| 2026-03-18 | Added PAYOUT_FLOW.md — complete crypto + bank payout documentation | PAYOUT_FLOW.md |
| 2026-03-18 | Added USER_JOURNEY.md — simple English overview of every flow | USER_JOURNEY.md |
| 2026-03-18 | Updated document index to list all 14 docs + added legacy reference codebase section | AGENT_INVESTMENT_INSTRUCTIONS.md |

---

*For the main project rules, see `docs/AGENT_INSTRUCTIONS.md`.*
*For boundaries, see `docs/invest/BOUNDARIES.md`.*
