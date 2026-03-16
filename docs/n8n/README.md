# n8n Workflow Import Guide

## Files
| File | Workflow | Webhook Path | Notifies |
|------|----------|-------------|----------|
| workflow-1-new-inquiry.json | NFsTay — New Inquiry | /webhook/inbox-new-inquiry | Landlord |
| workflow-2-new-message.json | NFsTay — New Message | /webhook/inbox-new-message | Landlord |
| workflow-3-landlord-replied.json | NFsTay — Landlord Replied | /webhook/inbox-landlord-replied | Tenant |
| workflow-4-tenant-message.json | NFsTay — Tenant New Message | /webhook/inbox-tenant-message | Tenant |
| **workflow-test-echo.json** | **Test Echo (all 4)** | All 4 paths | Logs only |

## Quick Start — Test First
1. Import `workflow-test-echo.json` into n8n
2. Activate it
3. Send a message in the NFsTay inbox
4. Check n8n execution log — you should see the payload logged with `status: ok`
5. Check browser console — you should see `[NFsTay webhook] ✅ fired successfully`
6. Once confirmed working, deactivate test workflow and import the real 4 workflows

## How to Import

1. Open n8n at https://n8n.srv886554.hstgr.cloud
2. Click **+ New Workflow**
3. Click the **three-dot menu** (top right) → **Import from JSON**
4. Paste the contents of each JSON file
5. The GHL API key (`pit-ad222803-150e-48db-b907-4508ac46f2e5`) is already embedded in the HTTP Request headers
6. **Activate** each workflow (toggle at the top)
7. Test by sending a message in the NFsTay inbox and watching the n8n execution log

## GHL WhatsApp Templates Required
These templates must exist in GHL before the workflows will send messages:

| Template ID | Purpose |
|-------------|---------|
| `nfstay_new_inquiry` | First message from tenant to landlord |
| `nfstay_new_message` | Follow-up message from tenant |
| `nfstay_landlord_replied` | Landlord replied — notify tenant |
| `nfstay_tenant_new_message` | General tenant notification |

## GHL Custom Fields
| Field | Key | ID |
|-------|-----|-----|
| Property Reference | `contact.property_reference` | `Z0thvOTyoO2KxTMt5sP8` |
| Magic Link URL | `contact.magic_link_url` | `gWb4evAKLWCK0y8RHp32` |

## Troubleshooting
- **Webhook returns 404**: workflow is not activated — toggle it on
- **GHL returns 401**: API key expired or invalid
- **WhatsApp not received**: check GHL template is approved by Meta
- **Contact not found**: landlord_id/operator_id must match a GHL contact ID
