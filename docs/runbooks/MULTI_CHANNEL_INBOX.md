# Multi-Channel Inbox — SMS + WhatsApp + Email

> **Status:** PR 60 (schema only) — 2026-04-27. PR 61 wires WhatsApp send/receive. PR 62 wires Email. PR 63 adds the channel picker UI. PR 64 adds the Settings → Channels tab.
> **Owner:** Hugo. Build approved 2026-04-27.

## What this is

Today the CRM inbox at `/crm/inbox` only sends + receives **SMS via Twilio**. After this build, the same inbox handles three channels in one thread:

- **SMS** — Twilio (existing, unchanged)
- **WhatsApp** — Wazzup24 personal-WhatsApp gateway ($15/mo per channel, no template approval needed because it's not Meta WABA)
- **Email** — Resend, on a new `inbox.nfstay.com` subdomain so existing `nfstay.com` mail isn't disturbed

The agent picks SMS / WhatsApp / Email from a small radio next to the Send button. The thread is shared per contact — a reply on any channel lands in the same conversation.

## Architecture

```
                  wk_contacts.phone / .email
                          │
       ┌──────────────────┼──────────────────┐
       ▼                  ▼                  ▼
   ┌───────┐          ┌───────┐          ┌───────┐
   │  SMS  │          │WhatsApp│         │ Email │
   │Twilio │          │Wazzup24│         │Resend │
   └───┬───┘          └───┬───┘          └───┬───┘
       │                  │                  │
   ┌───┴────┐         ┌───┴────┐         ┌───┴────┐
   │wk-sms- │         │wazzup- │         │wk-     │
   │send    │         │send    │         │email-  │
   │wk-sms- │         │wazzup- │         │send    │
   │incoming│         │webhook │         │wk-     │
   └───┬────┘         └───┬────┘         │email-  │
       │                  │              │webhook │
       │                  │              └───┬────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          ▼
                  wk_sms_messages
              channel ∈ {sms, whatsapp, email}
                          │
                          ▼
              ┌────────────────────────┐
              │  /crm/inbox            │
              │  Channel radio + same  │
              │  template picker for   │
              │  all three channels    │
              └────────────────────────┘
```

## Schema (PR 60)

### `wk_sms_messages` — additions

| Column | Type | Default | Purpose |
|---|---|---|---|
| `channel` | `text` | `'sms'` | sms · whatsapp · email |
| `external_id` | `text` | NULL | Twilio MessageSid for sms · Wazzup messageId (UUID) for whatsapp · Resend email_id (UUID) for email. Composite UNIQUE with `channel` for idempotent webhooks |
| `subject` | `text` | NULL | Email subject (NULL for sms/whatsapp) |

`twilio_sid` stays for one release cycle as a deprecated mirror. PR 65 drops it.

### `wk_numbers` — additions

| Column | Type | Default | Purpose |
|---|---|---|---|
| `channel` | `text` | `'sms'` | sms · whatsapp · email |
| `provider` | `text` | `'twilio'` | twilio · wazzup · resend |
| `external_id` | `text` | NULL | Twilio number SID for sms · Wazzup channelId UUID for whatsapp · Resend domain id for email |
| `is_active` | `boolean` | `true` | Admin toggle (Settings → Channels). When `false`, dialer + senders skip the row |

WhatsApp channels become rows here on first sync from `wazzup-send` — they're indistinguishable from a Twilio number row except that `channel='whatsapp' provider='wazzup'`. Existing campaign-assignment via `wk_campaign_numbers` works unchanged.

### `wk_sms_templates` — addition

| Column | Type | Default | Purpose |
|---|---|---|---|
| `channel` | `text` | NULL | NULL = universal · else single-channel template |

Email templates need a non-empty `subject` (validated client-side; no schema change for that).

### `wk_channel_credentials` — new table

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid | PK |
| `provider` | text | `twilio` / `wazzup` / `resend` |
| `label` | text | Free-text admin label, e.g. `"Wazzup primary"` |
| `secret` | text | The shared secret. Never returned to the frontend (Settings UI shows only a masked preview + Rotate button). Edge fns read via service role |
| `meta` | jsonb | Connection details: Wazzup channelIds, Resend domain id, etc. |
| `last_seen_at` | timestamptz | Last successful provider contact |
| `is_connected` | boolean | Provider reports active (e.g. Wazzup channel state='active'). UI green badge |

**RLS:** admin-only (gated by JWT email = `hugo@nfstay.com` / `admin@hub.nfstay.com`). Same pattern as `inv_*` and `aff_*` tables.

## Wazzup24 — what we know

- **API key (Hugo's account):** stored in memory at `~/.claude/projects/-Users-hugo-marketplace10/memory/reference_wazzup24_credentials.md`
- **Already-paired channels (verified 2026-04-27):**
  - `441618189073` — Manchester landline
  - `447487589933` — UK mobile
  - `447868778292` — UK mobile
- **Send endpoint:** `POST https://api.wazzup24.com/v3/message` with `{ channelId, chatId (digits-only), chatType: 'whatsapp', text, crmMessageId }`
- **Webhook config:** `PATCH https://api.wazzup24.com/v3/webhooks` with `{ webhooksUri, subscriptions: ['messages','statuses'] }`. Test handshake = POST `{"test": true}`, expecting HTTP 200 within 30s
- **Channels endpoint:** `GET https://api.wazzup24.com/v3/channels` → returns `[{ channelId, transport, plainId, state }]`

### Webhook signature — known unknown

Public Wazzup docs **do not specify a signature scheme**. Hugo's call (2026-04-27): build without strict signature verification, **defence in depth via**:
1. RLS: webhook can only INSERT into `wk_sms_messages` via service role (never directly from frontend).
2. `crmMessageId` round-trip: outbound includes a UUID; inbound echoes it. Mismatched IDs are dropped.
3. `wazzup-webhook` rejects payloads where `channelId` is not a known `wk_numbers.external_id` row.

We may add HMAC verification later if Wazzup support confirms a scheme.

## Resend — what we know

- **Inbound IS supported** (launched 2026). Webhook event type is `email.received`.
- **DNS:** add MX record for **`inbox.nfstay.com`** (subdomain). Existing `nfstay.com` outbound stays untouched.
- **Webhook payload:** does NOT include the body. We get `email_id` and metadata, then call `GET /api/v1/emails/{id}` to fetch html + text. Adds ~200ms per inbound email.
- **Signature:** HMAC-SHA256 via Svix headers (`svix-id`, `svix-timestamp`, `svix-signature`). Verified against the raw request body (not parsed JSON).
- **Pricing:** inbound is free across all tiers. Free tier covers 3,000 emails/mo · 100/day.

## What to read before changing this code

- `supabase/functions/wk-sms-send/index.ts` — reference outbound pattern
- `supabase/functions/wk-sms-incoming/index.ts` — reference inbound + HMAC pattern
- `supabase/functions/send-email/index.ts` — existing Resend outbound integration
- `supabase/migrations/20260430000015_smsv2_wk_sms_messages.sql` — original SMS-only message table
- `supabase/migrations/20260430000025_smsv2_multi_channel.sql` — this PR
- `src/features/smsv2/pages/InboxPage.tsx` — already realtime-subscribed; channel-icon polish only
- `src/features/smsv2/components/contacts/ContactSmsModal.tsx` — channel-radio target

## Out of scope

- Multi-account Wazzup (more than one tenant on one Wazzup login).
- Telegram + Instagram channels via Wazzup — supported by them but not on Hugo's list.
- Email attachments (Resend stores them 24h — needs pull-to-Supabase-Storage on receipt; later PR).
- Channel-specific quick replies / canned attachments.
- Cleanup of dead Meta WhatsApp edge fns (`wa-send`, `wa-templates`, `wa-webhook-incoming`) — they're still referenced by the legacy `/sms` (marketplace) module via `src/features/sms/hooks/useWhatsappTemplates.ts`. Tracked separately.

## How to verify multi-channel inbox is healthy

After all five PRs ship:

1. `/crm/contacts` → click a contact → Send Message → SMS works (existing baseline).
2. Send Message → switch to WhatsApp → message lands on the test phone.
3. Reply from the test phone → appears in the same `/crm/inbox` thread within ~2s.
4. Send Message → switch to Email → enter subject + body → email lands.
5. Reply to the email → comes back into the same thread via Resend webhook.
6. `/crm/settings` → Channels tab → all three providers show green "Connected" badge.
