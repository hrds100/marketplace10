# n8n Workflow Reference

> Last updated: 2026-04-01.
> The marketplace inquiry flow is admin-gated. See `docs/QUICK_LIST_FLOW.md` for the canonical lead flow
> and `docs/N8N_WHATSAPP_WORKFLOW.md` for workflow details.

## Marketplace Inquiry (admin-gated)

Tenant WhatsApp inquiries go to Admin > Outreach > Tenant Requests first.
The landlord is NOT contacted automatically. Admin releases the lead.

| Workflow | n8n ID | Webhook | Purpose |
|----------|--------|---------|---------|
| Inbound WhatsApp Inquiry | `IvXzbcqzv5bKtu01` | /webhook/inbox-new-inquiry | Parses inbound tenant message, calls receive-tenant-whatsapp edge function |

## Inbox Messaging (post-claim, existing threads only)

These fire from ChatWindow.tsx for conversations that already exist. Not part of the marketplace lead flow.

| Workflow | n8n ID | Webhook | Purpose |
|----------|--------|---------|---------|
| New Message | `J6hWjodwJlqXHme1` | /webhook/inbox-new-message | Operator sends message in thread -> WhatsApp to landlord |
| Landlord Replied | `BrwfLUE2LPj9jovR` | /webhook/inbox-landlord-replied | Landlord replies in thread -> WhatsApp to tenant |
| Tenant Message | `UBuNLDn0mO0md39Y` | /webhook/inbox-tenant-message | General tenant notification |
| Tier Update | `wsDjAdpWnjqnO7ML` | /webhook/ghl-payment-success | GHL payment -> tier upgrade |

## GHL Setup

- **API key:** stored in n8n credential store (never in repo)
- **Location ID:** `eFBsWXY3BmWDGIRez13x`

### WhatsApp Templates
| Template | Purpose |
|----------|---------|
| `nfstay_new_inquiry` | Tenant auto-reply confirmation |
| `nfstay_new_message` | Follow-up message notification |
| `nfstay_landlord_replied` | Landlord replied notification |
| `nfstay_tenant_new_message` | General tenant notification |

### Custom Fields
| Field | Key | ID |
|-------|-----|-----|
| Property Reference | `contact.property_reference` | `Z0thvOTyoO2KxTMt5sP8` |
| Magic Link URL | `contact.magic_link_url` | `gWb4evAKLWCK0y8RHp32` |
| First Contact Sent | `contact.first_contact_sent` | `QIc7FR6U3OGNEhdk7LoY` |

## Troubleshooting
- **Webhook returns 404**: workflow is not activated in n8n
- **GHL returns 401**: API key expired - update in n8n credential store
- **WhatsApp not received**: check GHL template is approved by Meta
- **Contact not found**: phone must be in GHL contacts (ghl-enroll creates it automatically now)
