# Inbox System - LOCKED RULES

## DO NOT BREAK - Critical Flow

```
Operator clicks "Inquire Now" → useInquiry creates thread (NO auto-message)
  → ChatEmptyState shows earnings promo ("You could earn £X/month")
  → Operator types first message → ChatWindow.handleSend()
  → Message saved to chat_messages → Realtime delivers to both sides
  → n8n webhook fires → GHL contact found/created → WhatsApp sent
```

## Invariants - Never Change These

1. **useInquiry.ts** must NOT auto-send messages. The operator writes their own first message.
2. **useInquiry.ts** must check if user is the landlord (`submitted_by === user.id`) and find their LANDLORD thread, never create an operator thread for them.
3. **Supabase Realtime** must be enabled for `chat_messages` AND `chat_threads`. Without it, messages don't appear live.
4. **InboxInquiryPanel.tsx** outer div must be `h-full` (not `h-auto`) or the right panel won't scroll.
5. **ChatWindow.tsx** scroll uses `messagesContainerRef.current.scrollTop = scrollHeight` (not scrollIntoView).
6. **Phone numbers** must be validated as UK E.164 format: `+44` followed by exactly 10 digits starting with `7`. Invalid numbers cause WhatsApp delivery failure.

## WhatsApp Notification Pipeline

```
ChatWindow.handleSend()
  → POST n8n /webhook/inbox-new-message (operator→landlord)
  → POST n8n /webhook/inbox-landlord-replied (landlord→operator)
    → n8n searches GHL contact by phone
    → If not found: creates GHL contact (handles duplicate error via meta.contactId)
    → Sets magic link custom field
    → Enrolls in GHL workflow
    → GHL sends WhatsApp template
```

### n8n Workflow IDs (do not change)
- `J6hWjodwJlqXHme1` - NFsTay New Message (operator→landlord)
- `BrwfLUE2LPj9jovR` - NFsTay Landlord Replied (landlord→operator)

### GHL Workflow IDs (do not change)
- `67250bfa-e1fc-4201-8bca-08c384a4a31d` - 1-landlord_enquiry (first contact)
- `0eb4395c-e493-43dc-be97-6c4455b5c7c4` - 2 Tenant to Landlord (subsequent)
- `9b826037-0562-4e10-9bd8-d9d488b719b6` - 3 Landlord to Tenant

### GHL Location
- Location ID: `eFBsWXY3BmWDGIRez13x`
- WhatsApp from: `+44 7476 368123`
- PIT token: `REDACTED_GHL_PIT_TOKEN`

## What Breaks WhatsApp
- Invalid phone number format (not E.164, wrong digit count)
- Phone not registered on WhatsApp
- GHL contact not found AND create fails without extracting meta.contactId
- Supabase Realtime disabled for chat tables
