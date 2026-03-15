# n8n WhatsApp Notification Workflows

## WORKFLOW 1: inbox-new-inquiry
**Webhook path:** `/webhook/inbox-new-inquiry`
**Trigger:** POST from NFsTay when operator sends FIRST message in a thread

### Payload received:
```json
{
  "thread_id": "uuid",
  "property_title": "Manchester · 2-bed flat",
  "property_city": "Manchester",
  "sender_name": "Hugo Souza",
  "is_masked": false,
  "mask_type": "none",
  "landlord_id": "uuid"
}
```

### Nodes:
1. **Webhook (POST)** — receives payload above
2. **GHL — Update Contact**: set custom field `contact.property_reference` = `{{property_title}}` on the landlord contact (lookup by landlord_id → profiles → phone → GHL contact)
3. **GHL — Send WhatsApp Template**: template name = `nfstay_new_inquiry`, to = landlord phone number, variables: `{{1}}` = First Name, button URL variable = `contact.magic_link_url`
4. **End**

---

## WORKFLOW 2: inbox-new-message
**Webhook path:** `/webhook/inbox-new-message`
**Trigger:** POST from NFsTay on every SUBSEQUENT message (not the first)

### Payload received:
```json
{
  "thread_id": "uuid",
  "property_title": "Manchester · 2-bed flat",
  "property_city": "Manchester",
  "sender_name": "Hugo Souza",
  "is_masked": true,
  "mask_type": "phone",
  "landlord_id": "uuid"
}
```

### Nodes:
1. **Webhook (POST)** — receives payload above
2. **GHL — Update Contact**: set `contact.property_reference` = `{{property_title}}`
3. **GHL — Send WhatsApp Template**: template name = `nfstay_new_message`, variables: `{{1}}` = First Name, button URL variable = `contact.magic_link_url`
4. **End**

---

## Quick Test Setup
Clone the existing OTP verification workflow in n8n. Replace the OTP send node with a GHL Send WhatsApp Template node. Point it at `nfstay_new_inquiry`. This lets you test the full pipeline immediately without building from scratch.

## GHL Custom Fields (already created)
| Field | ID | Key |
|-------|-----|-----|
| Property Reference | `Z0thvOTyoO2KxTMt5sP8` | `contact.property_reference` |
| Magic Link URL | `gWb4evAKLWCK0y8RHp32` | `contact.magic_link_url` |

## GHL WhatsApp Number
- Phone: `07676 368123`
- Name: NFsTay
- Quality: Green
