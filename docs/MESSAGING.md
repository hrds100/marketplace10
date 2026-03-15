# NFsTay — Messaging & Inbox Feature Spec
_Last updated: 2026-03-15_

> **Both Claude and Perplexity must read this before touching anything in `src/pages/InboxPage.tsx`, `src/components/inbox/`, or any `chat_*` Supabase table.**

---

## 1. VISION

A clean, bright, Airbnb-style inbox where operators (rent-to-rent operators / serviced accommodation managers) and landlords/agents communicate inside NFsTay. Every conversation is anchored to a specific property deal. NFsTay is the source of truth — WhatsApp is notifications only.

**UX reference:** Airbnb Messages (airbnb.co.uk/hosting/messages) — clone the layout as closely as possible.

---

## 2. LAYOUT (Airbnb clone)

```
┌─────────────────────────────────────────────────────────────────┐
│ LEFT PANEL (320px)  │  CENTRE PANEL (flex)  │  RIGHT PANEL (320px) │
│                     │                       │                      │
│ Messages        🔍⚙️ │  [Thread name]    >   │  Inquiry Details  ✕  │
│ [All] [Unread]      │  ─────────────────    │                      │
│                     │                       │  [Property image]    │
│ 🏠 Property Title   │  [msg bubble left]    │  Property Title      │
│ Last message...     │                       │  City · Postcode     │
│ Yesterday           │  [msg bubble right]   │  Est. profit: £XXX   │
│                     │                       │                      │
│ 💬 NFsTay Support   │  [system notice]      │  Operator info       │
│ Do you need help?   │                       │  Joined NFsTay: date │
│ Ongoing             │  Write a message...   │                      │
│                     │  [+] [⊡]        [→]  │  [Sign Agreement]    │
└─────────────────────┴───────────────────────┴──────────────────────┘
```

### Left Panel
- Header: "Messages" title + 🔍 search + ⚙️ settings gear
- Filter pills: **All** | **Unread**
- Thread list items:
  - Property square thumbnail (40px) or initial avatar fallback
  - Property title (bold, truncated)
  - Last message preview (truncated, 1 line)
  - Timestamp (relative: Yesterday, Friday, etc.)
  - Property subtitle (city · listing ref)
  - Unread dot indicator
  - Hover: `•••` context menu → Mark as unread / Star / Archive
- NFsTay Support thread always pinned at top with Airbnb-style logo avatar
- Settings gear dropdown: Manage quick replies / Suggested replies / Archived / Give feedback

### Centre Panel
- Thread header: contact name/property title + `>` arrow to expand details
- Messages:
  - **Operator (you)**: dark bubble, right-aligned
  - **Landlord/agent**: white bubble with border, left-aligned
  - **System notices**: centred grey text (e.g. "Hugo sent an inquiry · 12 Mar")
  - Timestamp shown above message groups (not every message)
- Input bar (bottom):
  - `+` attach button
  - `⊡` quick replies button → opens Quick Replies modal
  - Text input: "Write a message..."
  - `→` send button (active only when text present)
- Quick Replies modal: list of template cards, click to insert into input
- Messaging settings modal: triggered by ⚙️ gear

### Right Panel
- "Inquiry Details" header with `✕` close
- Small square property image (top)
- Property title bold
- City, postcode, estimated profit
- Operator info section
- Joined NFsTay date
- **Before agreement signed:** `[Sign Agreement]` CTA button prominent
- **After agreement signed:** phone + email revealed, agreement timestamp shown
- Phase 2: profit calculator, CRM pipeline stage, viewing info

---

## 3. NAV PLACEMENT

Inbox sits in the **left sidebar navigation between Deals and CRM**.

```
🏠 Deals
💬 Inbox  ← new
📊 CRM
```

Use a clean inbox/chat icon (not emoji in production — use a Lucide icon e.g. `MessageSquare`).
Route: `/inbox` and `/inbox/:threadId`

---

## 4. DATABASE SCHEMA

```sql
-- Thread per property inquiry
create table chat_threads (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  operator_id uuid references profiles(id),
  landlord_id uuid references profiles(id),
  status text default 'active', -- active | archived | support
  terms_accepted boolean default false,
  terms_accepted_at timestamptz,
  created_at timestamptz default now()
);

-- Individual messages
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references chat_threads(id) on delete cascade,
  sender_id uuid references profiles(id),
  body text not null,
  body_original text, -- pre-AI-filter version (stored for audit only, never shown)
  is_masked boolean default false,
  message_type text default 'text', -- text | image | system
  created_at timestamptz default now()
);

-- Landlord magic link invites
create table landlord_invites (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references chat_threads(id),
  phone text,
  magic_token text unique,
  used boolean default false,
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- Agreement acceptances (fee protection)
create table agreement_acceptances (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references chat_threads(id),
  landlord_id uuid references profiles(id),
  accepted_at timestamptz default now(),
  ip_address text,
  metadata jsonb
);

-- WhatsApp notification log
create table whatsapp_notifications (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references chat_threads(id),
  recipient_phone text,
  direction text, -- operator_to_landlord | landlord_to_operator
  status text, -- sent | failed
  sent_at timestamptz default now()
);

-- Saved message templates (quick replies)
create table message_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  title text,
  body text,
  created_at timestamptz default now()
);
```

### RLS Rules
- `chat_threads`: user can read/write only if they are `operator_id` OR `landlord_id`
- `chat_messages`: user can read only if they belong to the thread
- `chat_messages`: user can insert only as themselves (`sender_id = auth.uid()`)
- `agreement_acceptances`: insert only, no update/delete
- `landlord_invites`: service role only (n8n)
- `message_templates`: user owns their own templates

---

## 5. REALTIME

Use **Supabase Realtime** on `chat_messages` table.

```ts
supabase
  .channel(`thread:${threadId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages',
    filter: `thread_id=eq.${threadId}`
  }, (payload) => {
    // append new message to UI instantly
  })
  .subscribe()
```

This gives the "messages appear automatically" modern feel without polling.

---

## 6. AI CONTACT FILTER

Every outbound message goes through an AI filter **before** being saved to DB.

### Operator → Landlord flow:
1. Operator types message and hits send
2. Frontend sends message body to Supabase Edge Function `filter-message`
3. Edge function calls AI (fastest available — use `gpt-4o-mini` or `claude-haiku`) with prompt:
   > "You are a contact detail filter. Remove any phone numbers, email addresses, WhatsApp numbers, physical addresses, or any attempt to bypass contact protection (including written-out numbers like 'oh eight one two'). Replace removed content with [contact hidden]. Return the cleaned message only."
4. Cleaned message saved to `chat_messages.body`, original saved to `body_original` (audit only, never shown)
5. Landlord sees cleaned version seamlessly — never knows it was filtered

### Landlord → Operator flow (blocked until agreement signed):
1. If `terms_accepted = false` on the thread:
   - AI scans message for contact details
   - If detected: message is **NOT saved**, landlord sees:
     > "Message couldn't be sent. [Sign Agreement to unlock direct contact →]"
   - Inline button triggers agreement modal
2. If `terms_accepted = true`: message flows freely, no blocking

---

## 7. AGREEMENT FLOW

1. Button in right sidebar or blocked-message prompt: "Sign Agreement"
2. Modal opens with text:
   > "If you proceed to sign a lease with this operator for this property within 12 months of this introduction, you agree to pay NFsTay an introduction fee of £250."
3. Checkbox: "I agree to the above terms"
4. On accept:
   - `agreement_acceptances` row inserted (with timestamp + thread metadata)
   - `chat_threads.terms_accepted` flipped to `true`
   - Right sidebar updates: phone/email revealed
   - Thread unlocked — messages flow freely

---

## 8. WHATSAPP NOTIFICATIONS (via n8n)

### Trigger: operator sends message
1. Message saved to DB
2. App POSTs to n8n: `POST /webhook/inbox-operator-message`
   - payload: `{ thread_id, property_title, operator_name, message_preview, landlord_phone }`
3. n8n sends WhatsApp marketing message to landlord:
   > "You have a new inquiry on [property] from [operator]. Reply here: [magic link]"
4. `whatsapp_notifications` row logged

### Trigger: landlord sends message
1. Message saved to DB
2. App POSTs to n8n: `POST /webhook/inbox-landlord-message`
   - payload: `{ thread_id, property_title, landlord_name, message_preview, operator_phone }`
3. n8n sends WhatsApp to operator

### Magic link flow
- Link format: `https://hub.nfstay.com/inbox?token=[magic_token]`
- App reads `token` param on load
- Looks up `landlord_invites` table → finds `thread_id`
- Auto-navigates to `/inbox/[thread_id]`
- Marks invite as `used = true`

---

## 9. QUICK REPLIES

- Stored in `message_templates` table per user
- `⊡` button in input bar opens Quick Replies modal
- Modal lists all user's templates as clickable cards
- Click inserts template text into input (does not auto-send)
- Settings gear → "Manage quick replies" → CRUD interface for templates
- Default seed templates on first use:
  - "Thanks for your inquiry! I'd love to arrange a viewing."
  - "Could you tell me more about the property?"
  - "I'm very interested. What's the best time to speak?"

---

## 10. SUPPORT CHAT

- Always pinned as first thread in left panel
- Thread type = `support` (not linked to a property)
- Avatar: NFsTay logo
- Label: "NFsTay Support" + "Ongoing"
- Phase 1: messages go to admin notification system (existing `notifications` table)
- Phase 2: dedicated support agent dashboard

---

## 11. MVP SCOPE (ship everything in one go)

Claude should implement ALL of the following in one complete pass:

### UI (dummy data first, then wire up)
- [x] `/inbox` route + `InboxPage.tsx`
- [x] Left panel: thread list, expandable search, filter pills, support thread pinned
- [x] Centre panel: chat bubbles, date grouping, system notices, input bar with send
- [x] Right panel: property details, profit, agreement CTA, landlord details, next steps
- [x] Quick replies modal (full CRUD: add, edit, delete with inline confirmation)
- [x] Messaging settings modal (gear) — UI stub
- [x] Thread context menu (hover ••• → Mark unread / Star / Archive with icons)
- [x] Empty state (MessageSquare icon + "Select a conversation")
- [x] Mobile: full-screen chat (left panel hides, back button shown)
- [x] Nav: Inbox between Deals and CRM with `MessageSquare` icon
- [x] Sidebar-responsive layout (full-bleed, no gap on collapse)

### Backend (not started — all UI uses dummy data)
- [ ] All 6 DB tables created with RLS
- [ ] Supabase Realtime wired on `chat_messages`
- [ ] `filter-message` Edge Function (AI contact filter)
- [ ] Agreement acceptance flow + AgreementModal.tsx
- [ ] Magic link handler on `/inbox?token=`
- [ ] n8n webhooks: `inbox-operator-message` + `inbox-landlord-message`
- [ ] Quick replies CRUD persisted to `message_templates` table
- [ ] Support thread auto-created on first inbox load

### Current component tree
```
src/pages/InboxPage.tsx                    ← main page (3-panel layout)
src/components/inbox/
  types.ts                                 ← Thread, Message, QuickReply interfaces
  dummyData.ts                             ← 4 threads, messages, 4 quick replies
  ThreadList.tsx                           ← left panel: search, filters, pinned support
  ThreadItem.tsx                           ← thread row: avatar, preview, context menu
  ChatWindow.tsx                           ← centre: bubbles, date groups, input bar
  MessageBubble.tsx                        ← dark/white/system bubble rendering
  InboxInquiryPanel.tsx                    ← right: property, profit, agreement, checklist
  QuickRepliesModal.tsx                    ← CRUD quick reply templates
  MessagingSettingsModal.tsx               ← settings dropdown (UI stub)
```

### Dummy data → Supabase mapping
| Dummy field | Supabase table.column |
|-------------|----------------------|
| Thread.id | chat_threads.id |
| Thread.propertyTitle | properties.name (via chat_threads.property_id) |
| Thread.contactName | profiles.name (via chat_threads.landlord_id) |
| Thread.termsAccepted | chat_threads.terms_accepted |
| Message.body | chat_messages.body |
| Message.senderId | chat_messages.sender_id |
| QuickReply.title/body | message_templates.title/body |

### If Claude gets stuck on anything:
- List it at the end of the output report under `⚠️ ISSUES`
- Do not stop mid-build — complete everything possible, flag blockers at the end
- Hugo and Perplexity will unblock and continue

---

## 12. WHAT NOT TO BUILD (Phase 2)
- Image attachments in chat
- Suggested replies (AI-generated)
- Star/favourite threads
- Read receipts
- Typing indicators
- Full landlord onboarding wizard
- Admin messaging dashboard
- Profit calculator in right sidebar
- Viewing/appointment scheduling

---

## 13. FILES CLAUDE WILL CREATE/MODIFY

```
src/pages/InboxPage.tsx            ← main page
src/components/inbox/
  ThreadList.tsx                   ← left panel
  ThreadItem.tsx                   ← single thread row
  ChatWindow.tsx                   ← centre panel
  MessageBubble.tsx                ← individual message
  InquiryPanel.tsx                 ← right panel
  QuickRepliesModal.tsx            ← quick replies
  MessagingSettingsModal.tsx       ← settings dropdown
  AgreementModal.tsx               ← fee agreement
  SupportThread.tsx                ← support pinned thread
src/hooks/
  useMessages.ts                   ← Supabase Realtime hook
  useThreads.ts                    ← thread list hook
  useQuickReplies.ts               ← template CRUD
supabase/migrations/
  YYYYMMDD_messaging.sql           ← all 6 tables + RLS
supabase/functions/
  filter-message/index.ts          ← AI filter edge function
App.tsx                            ← add /inbox route
src/components/Layout.tsx          ← add Inbox to nav
```

---

## 14. ENV VARS NEEDED

| Var | Purpose |
|-----|---------|
| `VITE_AI_FILTER_MODEL` | Optional — defaults to fastest available. Set to `gpt-4o-mini` or leave blank |
| `OPENAI_API_KEY py` | Supabase secret for Edge Function AI filter |

---

## 15. DESIGN TOKENS (from Airbnb screenshots)

- Background: white `#FFFFFF`
- Thread list selected: light grey `bg-gray-50`
- Operator bubble: dark `bg-gray-900 text-white` rounded-2xl
- Landlord bubble: white `bg-white border border-gray-200` rounded-2xl
- System notice: `text-gray-400 text-sm text-center`
- Input bar: `border-t border-gray-200 bg-white`
- Right panel: white with subtle left border
- Font: existing app font (Inter)
- All spacing: 4px/8px grid only
