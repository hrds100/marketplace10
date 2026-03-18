# Investment Module — Payout Flow

> Complete payout system documentation. Crypto (immediate) and Bank (weekly via Revolut).

---

## Two Payout Types

| Type | Speed | Method | Approval |
|------|-------|--------|----------|
| **Crypto** | Immediate | On-chain (USDC, STAY, LP) | None — automatic |
| **Bank Transfer** | Weekly (Tuesday) | Revolut Business API | Hugo Face ID in Revolut app |

---

## Crypto Payout Flow (Immediate)

```
User clicks "Claim" → selects USDC, STAY Token, or LP Token
    ↓
USDC: Rent contract withdrawRent(propertyId) → USDC sent to user wallet
STAY: withdrawRent() → swap USDC→STAY via PancakeSwap → STAY to wallet
LP:   withdrawRent() → create LP pair → stake in Farm → LP tokens deposited
    ↓
Transaction confirmed on-chain
    ↓
inv_payouts updated: status = 'claimed', tx_hash = '0x...'
    ↓
User sees confirmation immediately
```

No admin involvement. No batch. Instant.

---

## Bank Payout Flow (Weekly via Revolut)

### Step-by-step:

**MONDAY (or any day):**

1. User opens Payouts page → sees claimable amount
2. Clicks "Claim" → selects "Bank Transfer"
3. **First time only:** modal shows bank details form
   - GBP: Account Name, Sort Code (XX-XX-XX), Account Number (8 digits)
   - EUR: Account Name, IBAN, BIC/SWIFT
   - Saved to `user_bank_accounts` table
   - WhatsApp + email confirmation sent to user
4. Edge Function `submit-payout-claim`:
   - Validates bank details exist
   - Calculates amount server-side (NEVER from frontend)
   - Checks UNIQUE(user_id, week_ref) — rejects if already claimed this week
   - Creates row in `payout_claims` (status: pending)
   - Logs to `payout_audit_log` (event: claim_submitted)
5. User sees: "Your claim has been submitted. Payouts are processed every Tuesday."

**TUESDAY 05:00 AM UK TIME (automatic):**

6. n8n cron fires: `inv-tuesday-payout-batch`
7. Queries all `payout_claims` WHERE status = 'pending' AND week_ref = current week
8. If zero claims → workflow ends, logs "No claims this week"
9. For each new user (no revolut_counterparty_id):
   - Registers with Revolut: POST /counterparty
   - Saves counterparty_id + account_id to `user_bank_accounts`
10. Builds Revolut payment draft:
    - POST /payment-drafts
    - All claims in one batch
    - Separate GBP and EUR payments
    - Each payment references: "NFsTay Payout 2026-W12"
11. Updates all claims: status → 'processing', saves draft_id
12. Logs to `payout_audit_log` (event: batch_sent)
13. Sends WhatsApp to Hugo:
    ```
    NFsTay Payout Batch Submitted ✅
    Week: 2026-W12
    Payees: 15
    GBP Total: £4,230
    EUR Total: €890
    Largest: £420 → John Smith

    👉 Open Revolut app → Review → Approve with Face ID
    ```

**TUESDAY MORNING (Hugo action):**

14. Hugo reads WhatsApp
15. Opens Revolut Business app
16. Reviews the payment list
17. Approves with Face ID
18. Revolut releases all payments

**SAME DAY (automatic):**

19. GBP: Faster Payments — arrives same day
20. EUR: SEPA — arrives next business day
21. Revolut fires webhook for each completed/failed transaction
22. Edge Function `revolut-webhook`:
    - Verifies HMAC-SHA256 signature
    - On TRANSACTION_COMPLETED:
      - Updates `payout_claims`: status → 'paid', paid_at = now()
      - Logs to `payout_audit_log` (event: payment_completed)
      - Sends WhatsApp to user: "Your NFsTay payout of £420 has arrived ✅"
    - On TRANSACTION_FAILED:
      - Updates `payout_claims`: status → 'failed'
      - Logs to `payout_audit_log` (event: payment_failed)
      - Sends WhatsApp to Hugo: "⚠️ Payout failed for John Smith — £420"

---

## Who Gets Paid via Bank

| User Type | Source of Amount | Calculation |
|-----------|-----------------|-------------|
| **Investor** | `inv_payouts` WHERE status = 'claimable' | (monthly_rent / total_shares) × user_shares |
| **Affiliate** | `aff_commissions` WHERE status = 'claimable' | gross_amount × commission_rate |
| **Subscriber** | Platform credits (if applicable) | Admin-defined |

All amounts calculated server-side in Edge Functions. Never from frontend.

---

## Commission Holdback

Affiliate commissions have a **14-day holdback** before becoming claimable.

```
Day 0: User referred by agent subscribes → commission created (status: pending)
Day 14: Commission becomes claimable (status: claimable)
Next Tuesday: Agent can claim via bank or crypto
```

Investment rental income has **no holdback** — claimable as soon as rent is deposited by admin.

---

## Bank Details Security

| Rule | Why |
|------|-----|
| Users can only see their own bank details | RLS: auth.uid() = user_id |
| Users can only edit if not yet verified | UPDATE allowed only when is_verified = false |
| Bank details lock after first successful payout | is_verified = true, no more edits |
| Admin can unlock bank details | Service role only |
| WhatsApp confirmation on save | Fraud alert if someone else adds details |
| All changes logged | payout_audit_log captures every event |

---

## Revolut API Reference

| Endpoint | Method | When Used |
|----------|--------|-----------|
| `/counterparty` | POST | First payout — register user's bank with Revolut |
| `/payment-drafts` | POST | Tuesday batch — create draft with all claims |
| Webhook handler | POST (incoming) | After Revolut processes each payment |

**Production:** `https://b2b.revolut.com/api/1.0`
**Sandbox:** `https://sandbox-b2b.revolut.com/api/1.0`

---

## Edge Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `submit-payout-claim` | User clicks Claim (bank) | Validate, calculate, create claim |
| `save-bank-details` | User saves bank form | Validate format, save, notify |
| `revolut-webhook` | Revolut POST | Verify HMAC, update status, notify |

---

## If Something Goes Wrong

| Problem | Who Gets Notified | Resolution |
|---------|-------------------|------------|
| Payment fails | Hugo (WhatsApp) | Check Revolut dashboard, re-trigger manually |
| Webhook signature invalid | Logged in payout_audit_log | Investigate — possible attack |
| User claims twice in one week | Blocked by UNIQUE constraint | Automatic — user sees error message |
| n8n cron doesn't fire | Hugo (check n8n dashboard) | Manual trigger or fix cron |
| Revolut API down on Tuesday | Batch fails, claims stay 'pending' | Re-run next day or manually |
| User entered wrong bank details | Bank details locked | Admin unlocks, user re-enters |

---

*For database schema details, see `docs/invest/DATABASE.md`.*
*For n8n workflow specs, see `docs/invest/INTEGRATIONS.md`.*
*For system architecture, see `docs/invest/ARCHITECTURE.md`.*
