# Investment Module — Domain Terms

> Canonical terminology for the investment module. Use these terms consistently in all code, docs, and prompts.

---

## Actors

| Term | Definition | Database |
|------|-----------|----------|
| **Investor** | A user who buys shares in a property | `profiles` (shared) + `inv_shareholdings` |
| **Agent / Affiliate** | A user who refers others and earns commission | `aff_profiles` |
| **Admin** | Hugo or authorized admin who manages the platform | `profiles.role = 'admin'` |
| **Property Manager** | The entity managing the physical property (initially nfstay) | Stored in `inv_properties.manager` |

## Investment Concepts

| Term | Definition |
|------|-----------|
| **Share** | A fractional ownership unit of a property. Priced in USD. Tracked on-chain (ERC1155). |
| **Holding** | A user's shares in a specific property. Multiple holdings = portfolio. |
| **Portfolio** | All properties a user holds shares in. |
| **Share Price** | USD price per share. Set by admin. e.g. $100/share. |
| **Annual Yield** | Expected annual return percentage. e.g. 12.4% APY. |
| **Monthly Rent** | Total rental income the property generates per month. |
| **Monthly Yield** | Investor's share of monthly rent: `(monthlyRent / totalShares) × userShares` |

## Governance

| Term | Definition |
|------|-----------|
| **Proposal** | A suggested action on a property (renovation, management change, pricing). Created by any shareholder. |
| **Vote** | Yes/No decision on a proposal. Weight = number of shares owned. |
| **Quorum** | Minimum votes needed for a proposal to be valid. |
| **Voting Period** | 30 days from proposal creation. |

## Boost

| Term | Definition |
|------|-----------|
| **Boost APR** | A paid upgrade that increases a user's yield on a specific property. |
| **Boosted APR** | The enhanced yield rate after boosting. Typically 1.5× base APR. |
| **STAY Token** | nfstay's platform token (ERC20). Used for boosting and farm rewards. |
| **Cost of Booster** | USDC amount required to activate a boost. |
| **Stay Earned** | STAY tokens earned from having an active boost. Claimable. |

## Commission / Affiliate

| Term | Definition |
|------|-----------|
| **Referral Code** | Unique code per agent (e.g. 'HUGO2026'). Stored in `aff_profiles.referral_code`. |
| **Subscription Commission** | 40% of subscription payment. Triggered by GHL webhook. |
| **Investment Commission (First)** | 5% of first share purchase amount. Tracked on-chain. |
| **Investment Commission (Recurring)** | 2% of rental income (profits). Calculated monthly. |
| **Commission Override** | Admin can set custom rates per-user or globally. Stored in `aff_commission_settings`. |
| **Holdback Period** | 14 days between earning and claiming a commission. Configurable. |
| **Claim** | The action of withdrawing earned commission. Same flow as investor rent claims. |

## Payouts

| Term | Definition |
|------|-----------|
| **Claimable** | Payout is ready to withdraw (holdback period passed). |
| **Claimed** | User initiated withdrawal. Transaction pending. |
| **Paid** | Funds delivered (USDC sent, bank transfer completed). |
| **Bank Transfer** | Payout to user's bank account worldwide (200+ countries via Revolut). Weekly Tuesday batch, Hugo approves via Face ID. Uses local rails (UK/EU/US) or SWIFT (international). |
| **USDC Payout** | Direct USDC transfer from treasury to user's wallet. |

## Rank System

| Properties | Rank Name |
|-----------|-----------|
| 0 | Noobie |
| 1+ | Deal Rookie |
| 3+ | Cashflow Builder |
| 5+ | Portfolio Boss |
| 10+ | Empire Builder |
| 15+ | Property Titan |

## Status Labels

| Status | Meaning |
|--------|---------|
| **Open** | Property accepting new share purchases |
| **Funded** | All shares sold |
| **Earning** | Holding is generating rental income |
| **Not Boosted** | APR boost not activated |
| **Active** (proposal) | Voting is open |
| **Approved** (proposal) | Proposal passed with majority + quorum |
| **Rejected** (proposal) | Proposal failed |
