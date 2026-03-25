# Crypto Purchase Flow — Architecture Documentation

> **Status:** LOCKED — Working as of 2026-03-25. Do not restructure without reading this.

## Overview

When a user buys shares with crypto (USDC on BNB Chain), the flow is:

```
Browser                          Blockchain                    Edge Function
───────                          ──────────                    ─────────────
1. User clicks "Secure"
2. USDC.approve() ──────────────→ Approve tx confirms
3. marketplace.buyShares() ─────→ Buy tx confirms
4. tx.wait() resolves
5. fetch() inv-crypto-confirm ──────────────────────────────→ 6. Look up user by wallet
                                                              7. Map blockchain_property_id → DB id
                                                              8. Create inv_orders row
                                                              9. Resolve affiliate (referred_by)
                                                             10. Create aff_commissions
                                                             11. Update aff_profiles stats
                                                             12. Send 3 emails (buyer, admin, agent)
                                                             13. Create 3 notifications
                                                             14. Write audit log
                                                             15. Return { success, order_id }
←───────────────────────────────────────────────────────────
16. queryClient.invalidateQueries()
17. Show celebration overlay
```

## Why Server-Side (Not Client-Side)

The Particle wallet signing process **drops the Supabase auth session**. After `tx.wait()`:
- `supabase.auth.getUser()` returns null
- `supabase.functions.invoke()` attaches the expired token → gateway rejects
- Any client-side Supabase insert silently fails (RLS requires `auth.uid()`)

The edge function uses **service role** — no auth session needed.

## Key Files

| File | Purpose |
|------|---------|
| `src/hooks/useBlockchain.ts` | Browser-side: blockchain tx + fetch to edge function |
| `supabase/functions/inv-crypto-confirm/index.ts` | Server-side: all DB writes, emails, notifications |
| `e2e/inv-crypto-confirm.spec.ts` | Playwright regression tests (3 tests) |

## Critical Details

### Property ID Mapping
- Browser sends `property.blockchain_property_id` (e.g. `1`)
- Edge function maps to `inv_properties.id` (e.g. `2`) via:
  ```sql
  SELECT id FROM inv_properties WHERE blockchain_property_id = $1
  ```
- Fallback: tries direct `id` match if no blockchain mapping found

### CORS Headers
The edge function must include:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
Access-Control-Allow-Methods: POST, OPTIONS
```
Without `Access-Control-Allow-Methods`, browser preflight blocks the POST.

### Deduplication
- Edge function checks `inv_orders.tx_hash` before inserting
- Same tx_hash called twice returns `{ success: true, deduplicated: true }`
- Safe to retry

### Raw fetch (Not SDK invoke)
```typescript
// CORRECT — raw fetch, no auth token
const confirmRes = await fetch(`${supabaseUrl}/functions/v1/inv-crypto-confirm`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tx_hash, wallet_address, property_id, shares, amount }),
});

// WRONG — SDK attaches expired auth token
await supabase.functions.invoke('inv-crypto-confirm', { body: { ... } });
```

### Affiliate Resolution
1. Look up buyer's `profiles.referred_by`
2. Find agent in `aff_profiles.referral_code`
3. Fallback: check `aff_profiles.previous_codes` array (for renamed codes)

## Comparison with SamCart Flow

| Aspect | SamCart | Crypto |
|--------|--------|--------|
| Trigger | SamCart webhook POST | Browser fetch after tx.wait() |
| Edge function | `inv-samcart-webhook` | `inv-crypto-confirm` |
| Auth | No JWT (webhook) | No JWT (service role) |
| Order creation | Server-side | Server-side |
| Commission | `createCommission()` | `createCommission()` (same logic) |
| Emails | 3 (buyer, admin, agent) | 3 (buyer, admin, agent) |
| Notifications | 3 (buyer, admin, agent) | 3 (buyer, admin, agent) |

## DO NOT

- Move DB writes back to client-side `useBlockchain.ts`
- Use `supabase.functions.invoke()` instead of raw `fetch()`
- Use `supabase.auth.getUser()` after `tx.wait()`
- Remove `Access-Control-Allow-Methods` from CORS headers
- Send `inv_properties.id` directly from browser (always send `blockchain_property_id`)
