# SamCart Purchase Flow — Architecture Documentation

> **Status:** LOCKED — Working as of 2026-03-25. Do not restructure without reading this.

## Overview

When a user buys shares with a credit card via SamCart, the flow is:

```
Browser                     SamCart                      Edge Function (inv-samcart-webhook)
───────                     ───────                      ──────────────────────────────────
1. User clicks "Pay by Card"
2. SamCart checkout opens
3. User enters card details
4. Payment processed ──────→ 5. SamCart fires webhook POST
                                                         6. Verify order with SamCart API
                                                         7. Look up user by email
                                                         8. Map product name → property_id
                                                         9. Create inv_orders row (status: pending)
                                                        10. Resolve affiliate (referred_by + previous_codes)
                                                        11. Create aff_commissions via createCommission()
                                                        12. Update aff_profiles stats
                                                        13. Send 3 emails (buyer, admin, agent)
                                                        14. Create 3 notifications (buyer, admin, agent)
                                                        15. Send n8n notification (WhatsApp)
                                                        16. Write payout_audit_log
                                                        17. Return success
```

**Note:** Shares are NOT sent on-chain by the webhook. Orders stay `status: pending` until admin approves via `inv-approve-order`, which calls `sendPrimaryShares` on the smart contract.

## Two Code Paths (Legacy API vs Direct Payload)

The webhook handles two SamCart formats:

| Path | When | How it identifies the user |
|------|------|---------------------------|
| **Legacy API** (lines 134-550) | SamCart sends order ID only | Calls SamCart API to get customer email, then looks up profiles |
| **Direct Payload** (lines 560-960) | SamCart sends full customer data | Reads email from payload directly |

Both paths end up in the same logic: create order → resolve agent → create commission → send emails → send notifications.

## Key Files

| File | Purpose |
|------|---------|
| `supabase/functions/inv-samcart-webhook/index.ts` | Webhook handler — all server-side logic |
| `supabase/functions/inv-approve-order/index.ts` | Admin approval — sends shares on-chain |
| `supabase/functions/send-email/index.ts` | Email templates (buyer, admin, agent) |
| `src/pages/admin/invest/AdminInvestOrders.tsx` | Admin UI — approve/reject orders |

## Critical Details

### Affiliate Resolution (3-step fallback)
1. Check SamCart custom field `agent_code` → lookup `aff_profiles.referral_code`
2. Check SamCart phone field `agentWallet` → lookup wallet address
3. **Fallback:** Check buyer's `profiles.referred_by` → lookup `aff_profiles.referral_code` (with `previous_codes` array fallback)

### Commission Creation (createCommission function, line 1002)
- Looks up or auto-creates `aff_profiles` for the agent
- Gets commission rate from `aff_commission_settings` (user-specific → global → 5% default)
- Creates `aff_commissions` row with 14-day holdback (`claimable_at`)
- Updates `aff_profiles.total_earned`, `pending_balance`, `paid_users`

### Email Triggers (3 emails per purchase)
| Email | Type | Recipient |
|-------|------|-----------|
| Buyer confirmation | `inv-purchase-buyer` | Customer email |
| Admin notification | `inv-purchase-admin` | hugo@nfstay.com + chris@nfstay.com |
| Agent commission | `inv-purchase-agent` | Agent's email (if referred) |

### Notification Triggers (3 notifications per purchase)
| Notification | Type | Recipient |
|-------------|------|-----------|
| Buyer | `purchase_confirmed` | user_id = buyer |
| Admin | `purchase_confirmed` | user_id = null (admin feed) |
| Agent | `commission_earned` | user_id = agent |

### Order Status Flow
```
SamCart webhook → pending
Admin approves → inv-approve-order → sendPrimaryShares on-chain → completed
Admin rejects → rejected
```

### Admin Approval (inv-approve-order)
1. Fetches buyer's wallet address from profiles
2. Fetches agent's wallet address (if agent_id exists)
3. Calls `sendPrimaryShares(recipientWallet, agentWallet, propertyId, shares)` on marketplace contract
4. Updates `inv_orders.status = 'completed'` with `tx_hash`
5. Upserts `inv_shareholdings` (shares_owned, invested_amount)
6. Updates `inv_properties.shares_sold`
7. Writes to `payout_audit_log`

## SamCart Configuration

- **Webhook URL:** `https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/inv-samcart-webhook`
- **JWT verification:** Disabled (verify_jwt = false)
- **Custom fields sent by SamCart:**
  - `propertyId` — maps to inv_properties
  - `recipient` — buyer's wallet address
  - `investAmountUsd` — amount in USD
  - `agent_code` — optional referral code

## Comparison with Crypto Flow

| Aspect | SamCart | Crypto |
|--------|--------|--------|
| Trigger | SamCart webhook POST | Browser fetch after tx.wait() |
| Edge function | `inv-samcart-webhook` | `inv-crypto-confirm` |
| Auth | No JWT (webhook) | No JWT (service role) |
| On-chain execution | Admin approves later (inv-approve-order) | Immediate (user signs tx) |
| Order initial status | `pending` | `completed` |
| Commission logic | `createCommission()` | `createCommission()` (same) |
| Emails | 3 (buyer, admin, agent) | 3 (buyer, admin, agent) |

## DO NOT

- Change the webhook URL in SamCart without updating the edge function
- Modify `createCommission()` without testing both SamCart AND crypto paths
- Remove the SamCart API verification step (prevents fake webhooks)
- Change the order status flow (pending → completed requires admin approval)
- Bypass admin approval — shares must NOT be sent on-chain without explicit approval
- Touch `inv-approve-order` without understanding the Gnosis Safe migration plan (see Security Incident Guide)

## Testing

- **SamCart test:** Make a $1 purchase on the SamCart checkout page
- **Verify in admin:** `/admin/invest/orders` shows new pending order
- **Verify affiliate:** `/dashboard/affiliates` shows commission for referrer
- **Verify emails:** Check hugo@nfstay.com and chris@nfstay.com inboxes
- **Approve order:** Click approve in admin → verify shares sent on-chain
