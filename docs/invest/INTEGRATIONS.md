# Investment Module — Integrations

> Every external system, n8n workflow, notification, and webhook for the investment module.

---

## n8n Workflows

| # | Name | Prefix | Trigger | Action |
|---|------|--------|---------|--------|
| 1 | inv-share-purchase | inv- | Webhook (payment processor) | Create order → call blockchain → update Supabase → notify |
| 2 | inv-commission-investment | inv- | The Graph poll (cron 5min) | Detect new PrimarySaleStatus → calculate 5%/2% → write aff_commissions |
| 3 | inv-rent-sync | inv- | Cron (daily 6am) | Poll rent contract → write inv_payouts with claimable amounts |
| 4 | inv-payout-process | inv- | Webhook (user claims) | Process claim: USDC transfer / bank record |
| 5 | inv-proposal-sync | inv- | The Graph poll (cron 15min) | Sync proposals + votes to inv_proposals/inv_votes |
| 6 | inv-boost-sync | inv- | The Graph poll (cron 15min) | Sync boost status to inv_boost_status |
| 7 | aff-commission-subscription | aff- | GHL webhook (payment received) | Look up affiliate → calculate rate → write aff_commissions |
| 8 | aff-payout-batch | aff- | Cron (every Tuesday 10am) | Process pending affiliate payout requests |
| 9 | inv-notify-email | inv- | Internal trigger | Send email via Resend |
| 10 | inv-notify-whatsapp | inv- | Internal trigger | Send WhatsApp via n8n |
| 11 | inv-tuesday-payout-batch | inv- | Cron (Tuesday 05:00 UK) | Query pending claims → register counterparties → create Revolut payment draft → notify Hugo |

---

## Notification Matrix

| Event | Email | WhatsApp | In-App |
|-------|:-----:|:--------:|:------:|
| Share purchased | Buyer + Agent | Buyer | Both |
| Rent available to claim | Investor | Investor | Investor |
| Rent claimed | Investor | — | Investor |
| Commission earned | Agent | Agent | Agent |
| Commission claimable (14d) | Agent | — | Agent |
| Payout processed | User | User | User |
| New proposal created | All shareholders | — | All |
| Proposal ending soon (2d) | All shareholders | — | All |
| Proposal result | All shareholders | All | All |
| Boost activated | User | — | User |
| Agent payout sent | Agent | Agent | Agent |
| Admin: new order pending | Admin | Admin | Admin |
| Admin: payout request | Admin | Admin | Admin |
| Bank details saved | — | User | — |
| Payout batch ready for approval | — | Admin (Hugo) | — |
| Bank payout completed | — | User | User |
| Bank payout failed | — | Admin (Hugo) | — |

---

## GHL Integration

| What | How |
|------|-----|
| Subscription payments | GHL processes payments. Webhook fires to n8n aff-commission-subscription |
| Card purchases for shares | May use GHL funnel (same as subscription flow) |

---

## Revolut Business API

Supports worldwide payouts to 200+ countries via local rails (UK Faster Payments, SEPA, ACH) and SWIFT.

| Item | Details |
|------|---------|
| Production URL | `https://b2b.revolut.com/api/1.0` |
| Sandbox URL | `https://sandbox-b2b.revolut.com/api/1.0` |
| Auth | Bearer token (`REVOLUT_API_KEY`) |
| Webhook verification | HMAC-SHA256 with `REVOLUT_WEBHOOK_SECRET` |
| Supported currencies | GBP, EUR, USD, and 25+ others |
| Payment rails | Faster Payments (UK), SEPA (EU), ACH/Wire (US), SWIFT (international) |
| Delivery time | Same day (local) to 1-5 days (SWIFT) |

### Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /counterparty | Register a user's bank account as a Revolut counterparty |
| POST | /payment-drafts | Create a batch payment draft for Hugo to approve |
| — | Webhook handler | Receives payment status updates from Revolut |

### Edge Functions

| Function | Purpose |
|----------|---------|
| submit-payout-claim | Validates claim, calculates amount server-side, writes to payout_claims |
| save-bank-details | Saves user bank details to user_bank_accounts |
| revolut-webhook | Receives Revolut webhook, verifies HMAC, updates claim statuses |

---

## Commission Claim Methods

- **Crypto claims (USDC / STAY / LP):** Immediate, on-chain. Treasury wallet sends directly to user wallet.
- **Bank claims:** Go through the weekly Revolut batch. Processed every Tuesday at 05:00 AM UK time. Hugo approves via Revolut Face ID before funds are released.

---

## Blockchain Integration Points

| Action | Contract | Function |
|--------|----------|----------|
| Buy shares | RWA Marketplace | `sendPrimaryShares(recipient, agent, propertyId, shares)` |
| Claim rent | Rent | `withdrawRent(propertyId)` |
| Create proposal | Voting | `addProposal(propertyId, encodedDescription)` |
| Cast vote | Voting | `vote(proposalId, direction)` |
| Boost APR | Booster | `boost(propertyId)` |
| Claim boost rewards | Booster | `claimRewards(propertyId)` |
| Check eligibility | Rent | `isEligibleForRent(propertyId, address)` |
| Get property details | RWA Marketplace | `getPropertyDetails(propertyId)` |
| Get user shares | RWA Token | `balanceOf(address, propertyId)` |
