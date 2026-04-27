# Multi-Channel Inbox — SMS + WhatsApp + Email

> **Status:** PRs 60–64 + 668 shipped 2026-04-27. Live config: SMS via Twilio (✓ operational), WhatsApp via Wazzup24 on `+447868778292` (✓ outbound rejected by tariff — see notes), Email via Resend on `mail.nfstay.com` (outbound ✓, inbound pending DNS cleanup).
> **Owner:** Hugo. Build approved + deployed 2026-04-27.

## What this is

The CRM inbox at `/crm/inbox` mixes three channels in one thread:

- **SMS** — Twilio (existing, unchanged)
- **WhatsApp** — Wazzup24 personal-WhatsApp gateway, $15/mo on the START tariff (no template approval — not Meta WABA). Hugo is currently on the **INBOX tariff** which is reply-only; outbound initiations are rejected with `MESSAGES_NOT_TEXT_FIRST`. Upgrade to START / PRO at wazzup24.com to enable initiating.
- **Email** — Resend on `mail.nfstay.com` (NOT `inbox.nfstay.com` — that earlier plan was abandoned in favour of using the existing verified subdomain). `elijah@mail.nfstay.com` and `georgia@mail.nfstay.com` are the seeded send-from addresses.

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

## Resend — current live setup (2026-04-27)

- **Verified domain:** `mail.nfstay.com` (id `75a81681-a84d-4b8f-acbe-304e3a612dc2`). Capabilities: `sending=enabled`, `receiving=enabled`. Status: `partially_verified` (see DNS notes below).
- **Webhook:** id `8fd2944f-3a4a-46ca-aa51-89c16abcdc86`, endpoint `https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/wk-email-webhook`, events `["email.received"]`, status `enabled`.
- **Webhook payload:** metadata only (no body). `wk-email-webhook` follows up with `GET /api/v1/emails/{id}` to fetch html + text. Adds ~200ms per inbound.
- **Signature:** HMAC-SHA256 via Svix headers. Secret stored as Supabase Edge Function secret `RESEND_WEBHOOK_SECRET` (whsec_-prefixed). Verified against the raw request body in `wk-email-webhook`.
- **API keys (separate Resend keys, same NFsTay org):**
  - `RESEND_API_KEY` (Supabase secret) → full-access key, used by `send-email`, `wk-email-send`, and `wk-email-webhook` for body fetch.
  - A second restricted "send-only" key is also available (`re_6hZYZm69_…`) but unused after the switch to the full-access key.

### DNS state on `mail.nfstay.com` (the inbound blocker)

`dig MX mail.nfstay.com` currently returns:

```
0 mxa.mailgun.org.
10 mxb.mailgun.org.
0 inbound-smtp.ap-northeast-1.amazonaws.com.
```

**Conflict.** A previous Mailgun setup left `mxa.mailgun.org` and `mxb.mailgun.org` on the record. Resend's inbound expects ONLY `inbound-smtp.ap-northeast-1.amazonaws.com` at priority 10 (currently set at priority 0). Until the Mailgun records are removed (and ideally Resend's set to priority 10 to match the docs), Resend keeps reporting the receiving record as `pending` and inbound emails go to Mailgun half the time.

**To fix:** at the DNS provider, on `mail.nfstay.com`:
1. Delete `MX 0 mxa.mailgun.org` and `MX 10 mxb.mailgun.org`.
2. Change the Resend MX from priority 0 → priority 10 (or leave as 0 — works once Mailgun is gone, but priority 10 matches Resend's docs).
3. Wait for DNS TTL (~5–60 min) and call `POST https://api.resend.com/domains/75a81681…/verify`.

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

1. `/crm/contacts` → click a contact → Send Message → SMS works (Twilio, baseline).
2. Send Message → switch to WhatsApp → if Wazzup tariff is START or above, message lands on the test phone. If on INBOX tariff, the picker now surfaces `Wazzup 400: Can't write by first on inbox tariff` (PR 668 fix).
3. Reply from the test phone → appears in the same `/crm/inbox` thread within ~2s (works even on INBOX tariff via the 24-hour reply window).
4. Send Message → switch to Email → pick "From: elijah@mail.nfstay.com" → enter subject + body → email lands at the recipient. Verified end-to-end 2026-04-27 (Resend id `d6cc050d-ad1e-4b21-8d54-19b33be5cb55`).
5. **Inbound email pending the DNS Mailgun-conflict fix above.** Once cleared, replies to elijah@/georgia@ will hit `wk-email-webhook` and land in `wk_sms_messages` with `direction='inbound'`.
6. `/crm/settings` → Channels tab → SMS / WhatsApp / Email each show their "Connected" badge.
