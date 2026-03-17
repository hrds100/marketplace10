# NFStay — Webhooks & Background Jobs

> Every webhook endpoint and background job in NFStay. What triggers them, what they do, and where they run.

---

## 1. WEBHOOK ENDPOINTS

### Stripe Platform Webhook

| Field | Value |
|-------|-------|
| **URL** | `https://[supabase-url]/functions/v1/nfs-stripe-webhook` |
| **Method** | POST |
| **System** | Supabase Edge Function |
| **Auth** | Stripe signature verification (`STRIPE_WEBHOOK_SECRET`) |
| **Idempotency** | Checks `nfs_webhook_events.external_event_id` before processing |

**Events handled:**

| Event | Action |
|-------|--------|
| `payment_intent.succeeded` | Update `nfs_reservations` status to confirmed, record payment details |
| `payment_intent.payment_failed` | Update reservation payment status, log failure |
| `charge.succeeded` | Record charge details in analytics |
| `charge.refunded` | Update reservation refund status |
| `charge.dispute.created` | Flag reservation, notify operator |
| `refund.created` / `refund.updated` | Update refund tracking |
| `payout.paid` | Update operator earnings |
| `payout.failed` | Notify operator of failed payout |
| `transfer.created` | Record transfer to operator |
| `application_fee.created` | Record platform fee |

---

### Stripe Connect Webhook

| Field | Value |
|-------|-------|
| **URL** | `https://[supabase-url]/functions/v1/nfs-stripe-connect-webhook` |
| **Method** | POST |
| **System** | Supabase Edge Function |
| **Auth** | Stripe signature verification (`STRIPE_CONNECT_WEBHOOK_SECRET`) |

**Events handled:**

| Event | Action |
|-------|--------|
| `account.updated` | Update `nfs_stripe_accounts` status, capabilities |
| `capability.updated` | Update account capabilities |
| `payout.paid` | Trigger n8n `nfs-payout-notification` |
| `payout.failed` | Trigger n8n `nfs-payout-notification` (failure) |

---

### Hospitable Webhook

| Field | Value |
|-------|-------|
| **URL** | `https://n8n.srv886554.hstgr.cloud/webhook/nfs-hospitable-webhook` |
| **Method** | POST |
| **System** | n8n webhook node |
| **Auth** | `x-hospitable-signature` header verification |

**Events handled:**

| Event type | n8n workflow triggered | Action |
|-----------|----------------------|--------|
| Listing created/updated | `nfs-hospitable-listing-sync` | Upsert `nfs_properties` |
| Listing deleted | `nfs-hospitable-listing-sync` | Archive property |
| Reservation created/updated | `nfs-hospitable-reservation-sync` | Upsert `nfs_reservations` |
| Reservation cancelled | `nfs-hospitable-reservation-sync` | Update status |
| Calendar changed | `nfs-hospitable-listing-sync` | Update blocked dates |

---

## 2. n8n WORKFLOWS

### Hospitable Sync Workflows

| Workflow | Trigger | What it does | Critical? |
|----------|---------|-------------|-----------|
| `nfs-hospitable-init-sync` | Webhook (from Edge Function after OAuth) | Paginate Hospitable API, sync all listings + reservations for new connection | Yes |
| `nfs-hospitable-listing-sync` | Webhook (from Hospitable) | Process individual listing change events | Yes |
| `nfs-hospitable-reservation-sync` | Webhook (from Hospitable) | Process reservation change events | Yes |
| `nfs-hospitable-manual-sync` | Webhook (from operator UI button) | Full resync for an operator | Yes |
| `nfs-hospitable-retry` | Cron (every 30 min) | Query `nfs_hospitable_connections` for failed syncs, retry | Yes |

### Scheduled Jobs

| Workflow | Trigger | What it does | Critical? |
|----------|---------|-------------|-----------|
| `nfs-ical-sync` | Cron (every 4 hours) | Fetch external iCal feeds from `nfs_properties.inbound_calendars`, parse, update blocked dates | Medium |
| `nfs-cleanup-expired` | Cron (daily) | Delete expired `nfs_auth_tokens` and `nfs_guest_sessions` | Low |

### Notification Workflows

| Workflow | Trigger | What it does | Critical? |
|----------|---------|-------------|-----------|
| `nfs-booking-notification` | Supabase webhook (on `nfs_reservations` INSERT with status=confirmed) | Send booking confirmation email via Resend | Medium |
| `nfs-payout-notification` | Stripe Connect webhook relay (from Edge Function) | Send payout success/failure email | Low |

---

## 3. EDGE FUNCTION REFERENCE

| Function | Trigger | Purpose |
|----------|---------|---------|
| `nfs-stripe-webhook` | POST from Stripe | Handle platform payment events |
| `nfs-stripe-connect-webhook` | POST from Stripe | Handle Connect account events |
| `nfs-stripe-checkout` | POST from frontend | Create Stripe Checkout session |
| `nfs-stripe-connect-oauth` | GET/POST from frontend/Stripe | Handle Connect OAuth flow |
| `nfs-hospitable-oauth` | GET/POST from frontend/Hospitable | Handle Hospitable OAuth flow |
| `nfs-ical-feed` | GET (public) | Generate ICS calendar for a property |
| `nfs-email-send` | POST (internal) | Send email via Resend |
| `nfs-domain-verify` | POST from frontend | Check DNS for custom domain |
| `nfs-pricing-calculate` | POST from frontend | Calculate reservation pricing |

---

## 4. WEBHOOK FLOW DIAGRAMS

### Stripe Payment Flow

```
Traveler clicks "Book" →
  Frontend calls nfs-stripe-checkout Edge Function →
    Edge Function creates Stripe Checkout Session →
      Traveler completes payment on Stripe →
        Stripe sends webhook to nfs-stripe-webhook →
          Edge Function verifies signature →
            Checks nfs_webhook_events for duplicate →
              Updates nfs_reservations (status: confirmed) →
                Inserts nfs_analytics event →
                  n8n nfs-booking-notification sends email
```

### Hospitable Sync Flow

```
Operator connects Hospitable →
  Edge Function nfs-hospitable-oauth handles OAuth →
    Stores connection in nfs_hospitable_connections →
      Triggers n8n nfs-hospitable-init-sync →
        n8n paginates Hospitable API →
          Upserts nfs_properties + nfs_reservations →
            Updates sync progress in nfs_hospitable_connections

Ongoing:
  Hospitable sends webhook →
    n8n nfs-hospitable-webhook receives →
      Routes to listing-sync or reservation-sync workflow →
        Upserts affected records
```

---

## Shared with marketplace10

- **n8n instance** is shared. NFStay workflows coexist with marketplace10 workflows. All NFStay workflows use the `nfs-` prefix.
- **Supabase Edge Functions** are deployed to the same project. NFStay functions use the `nfs-` prefix.
- **No shared webhook endpoints.** All NFStay webhooks are separate from marketplace10 webhooks.

---

*End of NFStay Webhooks.*
