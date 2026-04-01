# n8n WhatsApp Workflows - Marketplace Lead Flow

> Last updated: 2026-04-01. The old automatic landlord-notification flow
> (inbox-new-inquiry, inbox-new-message triggering landlord WhatsApp on every
> tenant message) is replaced by the admin-gated flow described here.

## Current flow: admin-gated tenant inquiry

```
Tenant clicks WhatsApp on deal card/detail/panel
  -> wa.me opens with short message (link + 5-char ref, NO UUID)
  -> Message sent to NFsTay WhatsApp (+44 7476 368123)
  -> GHL receives inbound message
  -> n8n webhook fires (inbox-new-inquiry or ghl-inbound-whatsapp)
  -> n8n calls receive-tenant-whatsapp edge function
  -> Edge function creates exactly one inquiry row (idempotent: dedup by tenant_phone + property_id within 5 min)
  -> Inquiry appears in Admin > Outreach > Tenant Requests
  -> Landlord receives NOTHING yet
  -> Admin chooses: NDA, NDA + Claim, or Direct
  -> Only then is the landlord contacted via GHL workflow
```

## WORKFLOW: Inbound WhatsApp Inquiry (n8n)

**n8n workflow ID:** `IvXzbcqzv5bKtu01`
**Webhook paths:** `/webhook/inbox-new-inquiry` and `/webhook/ghl-inbound-whatsapp`

### What it does:
1. Receives inbound tenant WhatsApp message from GHL
2. Parses property link, reference number, and contact details
3. Calls `receive-tenant-whatsapp` edge function to create inquiry
4. Sends tenant auto-reply confirmation via GHL

### What it does NOT do:
- Does NOT notify the landlord
- Does NOT enroll the landlord in any GHL workflow
- Does NOT send any WhatsApp to the lister

## WORKFLOW: Landlord Outreach (admin-triggered via ghl-enroll)

**Edge function:** `ghl-enroll`
**Triggered by:** Admin clicking NDA/NDA+Claim in Outreach > Tenant Requests

### What it does:
1. Searches GHL for landlord contact by phone (multiple format variants)
2. Creates GHL contact if not found
3. Removes contact from workflow (if already enrolled), waits 1.5s
4. Re-enrolls in the selected GHL workflow

### GHL Workflow IDs:
| Workflow | ID | Use |
|----------|-----|-----|
| Cold outreach (first contact) | `67250bfa-e1fc-4201-8bca-08c384a4a31d` | Landlord Activation tab |
| NDA/warm (tenant lead release) | `0eb4395c-e493-43dc-be97-6c4455b5c7c4` | Tenant Requests NDA/NDA+Claim |

## WORKFLOW: Inbox messaging (post-claim, ongoing)

These workflows handle in-app messaging notifications AFTER a landlord has claimed their account and a conversation thread exists. They are separate from the marketplace lead flow.

| Webhook | Purpose | Notifies |
|---------|---------|----------|
| `/webhook/inbox-new-message` | Operator sends message in thread | Landlord (WhatsApp) |
| `/webhook/inbox-landlord-replied` | Landlord sends reply in thread | Tenant (WhatsApp) |

These are NOT part of the marketplace inquiry flow. They fire only from ChatWindow.tsx for existing threads.

## WORKFLOW: Poll GHL for Inbound Inquiries (admin-gated)

**n8n workflow ID:** `ReoIHnniLpB632Ir`
**Schedule:** Every 2 minutes
**Created:** 2026-04-01

### Why this exists
The GHL trigger workflow (`11117c1a` "inbox-new-inquiry") is published but does NOT
forward inbound WhatsApp message bodies to n8n. The GHL API does not support editing
workflow internals, so this polling workflow bypasses the broken trigger entirely.

### What it does:
1. Polls GHL conversations API every 2 minutes
2. Filters for inbound WhatsApp messages from the last 3 minutes containing "nfstay"
3. Calls `receive-tenant-whatsapp` edge function for each match
4. Edge function handles dedup (5-min window) and creates inquiry row

### What it does NOT do:
- Does NOT notify the landlord
- Does NOT send any auto-reply (GHL handles this via its trigger workflow)
- Does NOT enroll anyone in GHL workflows

## Known GHL auto-reply text issue

GHL workflow `11117c1a` ("inbox-new-inquiry") auto-replies with:
"We've passed your enquiry to the Landlord or Agent, they'll reach out to you shortly."
This is slightly misleading (landlord is NOT contacted until admin release).
A second GHL workflow `cf089a15` ("5 - inbox-new-inquiry") was created 2026-04-01
as a potential replacement. To fix: disable the old 11117c1a in GHL dashboard,
or edit its reply text.

## Deactivated workflows (2026-04-01)

These old workflows bypassed the admin gate and auto-contacted the landlord.
They were deactivated on 2026-04-01. Do NOT reactivate them.

| n8n ID | Name | Why deactivated |
|--------|------|----------------|
| `ydrMC0qsOeaFxbsL` | Poll Inbound WhatsApp Inquiries | Polled GHL every 30s, created duplicate inquiries via REST API, auto-sent landlord WhatsApp, auto-sent old tenant reply ("We've passed your enquiry to the Landlord") |
| `pZ6EOZ1fkj1WcDXs` | Inquiry Lister WhatsApp v5 | Auto-enrolled landlord in GHL workflow on every inquiry. Called by the poll workflow above. |

## Tenant Inquiry Auto-Reply text (verified 2026-04-01)

Workflow `YMjVISVnUb7AxqXU` (webhook: `/inquiry-tenant-reply`) sends:
"Your inquiry has been received and is being reviewed by the NFsTay team.
The [Landlord/Agent] will be in touch once the review is complete."
This text is correct for the admin-gated flow. This workflow only fires
for email inquiries via `process-inquiry` (not for WhatsApp).

The main inbound WhatsApp workflow (`IvXzbcqzv5bKtu01`) has its own auto-reply:
"Your inquiry has been received and is being reviewed. We will get back to you shortly."

## GHL Custom Fields
| Field | ID | Key |
|-------|-----|-----|
| Property Reference | `Z0thvOTyoO2KxTMt5sP8` | `contact.property_reference` |
| Magic Link URL | `gWb4evAKLWCK0y8RHp32` | `contact.magic_link_url` |
| First Contact Sent | `QIc7FR6U3OGNEhdk7LoY` | `contact.first_contact_sent` |

## GHL WhatsApp Number
- Phone: `07676 368123` (+44 7476 368123)
- Name: nfstay
- Quality: Green
