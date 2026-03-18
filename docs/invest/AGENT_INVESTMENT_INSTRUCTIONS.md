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

**This module is NOT isolated like NFStay booking.** It lives in the existing `src/pages/invest/` directory, uses the existing sidebar/layout, and extends the existing admin panel. However, it has its own Supabase tables (prefixed `inv_` and `aff_`) and its own n8n workflows (prefixed `inv-` and `aff-`).

---

## 2. DOCUMENT INDEX

Before any task, read this file PLUS the task-specific docs:

| Task type | Also read |
|-----------|-----------|
| **Always** | This file + `docs/invest/BOUNDARIES.md` |
| Database / schema / RLS | + `docs/invest/DATABASE.md` |
| Blockchain / contracts / The Graph | + `docs/invest/STACK.md` + `docs/invest/INTEGRATIONS.md` |
| Commission / affiliate logic | + `docs/invest/DOMAIN.md` + `docs/invest/DATABASE.md` |
| Specific page wiring | + `docs/invest/ARCHITECTURE.md` + `docs/invest/PHASES.md` |
| Admin features | + `docs/invest/DATABASE.md` + `docs/invest/BOUNDARIES.md` |
| Notifications | + `docs/invest/INTEGRATIONS.md` |
| Feature acceptance | + `docs/invest/ACCEPTANCE.md` |
| Full picture / planning | + `docs/invest/MODULE_AUDIT.md` + `docs/invest/EXECUTION_PLAN.md` |

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
13. **One bank claim per user per week.** Enforced by UNIQUE(user_id, week_ref) constraint.
14. **Bank details are locked after first successful payout.** Users cannot change bank details after is_verified = true without admin intervention.

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
| 2026-03-18 | Added Revolut payout system — 3 new tables (user_bank_accounts, payout_claims, payout_audit_log), removed aff_payout_requests, added Tuesday batch workflow, added 3 Edge Functions | DATABASE.md, INTEGRATIONS.md, ARCHITECTURE.md, STACK.md, AGENT_INVESTMENT_INSTRUCTIONS.md |

---

*For the main project rules, see `docs/AGENT_INSTRUCTIONS.md`.*
*For boundaries, see `docs/invest/BOUNDARIES.md`.*
