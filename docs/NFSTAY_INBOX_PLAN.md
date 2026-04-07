# nfstay-inbox — Full Build Plan (v2, audit-hardened)

> Standalone SMS inbox app for internal use
> Stack: React + Vite + TypeScript + Tailwind + Supabase + React Flow + Twilio + OpenAI
> Domain: inbox.nfstay.com
> Repo: nfstay-inbox (separate from marketplace10)

---

## Build Order

**Phase 1 — UI only (no backend).** Every screen built with mock data. Hugo approves the look and feel before any wiring.

**Phase 2 — Database + edge functions.** Supabase tables (with RLS), Twilio webhooks, real-time subscriptions, idempotency, opt-out compliance.

**Phase 3 — AI automation.** React Flow builder, OpenAI integration, flow execution engine with job scheduling, loop guards, execution logging.

**Phase 4 — Bulk sends + CSV.** Upload lists, duplicate detection, campaign management, rate-limited queue, opt-out enforcement.

**Phase 5 — Polish.** Notifications, reporting, future integrations.

---

## Isolation Rules

| Layer | How it stays independent |
|---|---|
| Repo | `nfstay-inbox` — own Git repo, own codebase |
| Deploy | Own Vercel project → `inbox.nfstay.com` |
| Database | Same Supabase project (logical isolation), ALL tables prefixed `sms_` — zero overlap with marketplace tables |
| Auth | Supabase auth (same admin login), no dependency on marketplace logic |
| Edge functions | Prefixed `sms-*` — never touch marketplace functions |
| Env vars | Own `.env` with Twilio + OpenAI keys — marketplace never sees them |
| Code | Zero imports from marketplace. Own components, hooks, utils |
| Design | Same nfstay design tokens (green `#1E9A80`, Inter font, etc.) for brand consistency |

**If inbox goes down → marketplace untouched. If marketplace goes down → inbox keeps working.**

Note: this is logical isolation (same Supabase project, separate tables). If we ever need full isolation (separate Supabase project), we migrate the `sms_*` tables. The prefixed naming makes this straightforward.

### Future integration hook
The `sms_contacts` table has an optional `external_id` column (nullable UUID). Later, this can link to `profiles.id` from the marketplace or bookingsite — no foreign key, no dependency. When you want to integrate, you populate that field. Until then, it does nothing.

---

## Pages & Screens

### 1. Inbox (main screen) — `/`

Split layout like WhatsApp Desktop:

```
┌──────────────────────────────────────────────────────┐
│  [Search]  [Filter ▼]  [+ New Message]               │
├─────────────────┬────────────────────────────────────┤
│ Conversation    │  Conversation Detail                │
│ List (left)     │  (right)                            │
│                 │                                     │
│ 🔴 John Smith  │  John Smith  +44 7911 234567        │
│    "Hey, is th..│  ──────────────────────────         │
│    2 min ago    │  [10:30] Hey, is the flat...        │
│                 │  [10:32] Hi John! Yes it's...  ✓✓  │
│ Maria Lopez     │  [10:45] Great, can I view...       │
│    "Thanks for" │  [10:46] Of course! When...    ✓✓  │
│    15 min ago   │                                     │
│                 │  ┌─────────────────────────────┐    │
│ Ahmed Khan      │  │ Type a message...    [Send]  │    │
│    "STOP"       │  └─────────────────────────────┘    │
│    1 hour ago   │                                     │
├─────────────────┤  [Templates ▼] [Quick Reply ▼]     │
│ Labels:         │  [📎 Attach]  [⏰ Schedule]         │
│ [All] [Hot Lead]│                                     │
│ [Waiting] [VIP] ├────────────────────────────────────┤
│                 │  ℹ️ Contact Info (collapsible)       │
│ Numbers:        │  Name: John Smith                   │
│ [All] [+44...]  │  Labels: Hot Lead, London           │
│ [+1...]         │  Stage: Contacted                   │
│                 │  Notes: Interested in 2-bed...      │
│ Status:         │  Internal note: [Add note]          │
│ [Inbox] [Archive│  ──────────────────────────         │
│  d] [All]       │  Assigned to: Hugo                  │
└─────────────────┴────────────────────────────────────┘
```

**Left panel — Conversation list:**
- Each row: contact name (or phone number if no name), last message preview, timestamp, unread badge
- **Unread conversations: bold text, red dot, sorted to top**
- Filter by: label, phone number (which Twilio number), status (inbox/archived)
- Search by name, phone number, message content
- Right-click menu: Archive, Delete, Mark unread, Add label, Assign

**Right panel — Conversation detail:**
- Message bubbles (incoming left, outgoing right)
- Delivery status icons per message: ✓ sent, ✓✓ delivered, ❌ failed (red), ⚠️ undelivered (orange)
- Failed/undelivered messages highlighted, shown at top of thread
- Compose box at bottom with send button
- Template picker dropdown
- Quick reply buttons (configurable)
- Attach file button (MMS — uploads to Supabase Storage)
- Schedule send button (sets `scheduled_at` on message)
- Collapsible contact info sidebar on the right

**Top bar:**
- Search (global)
- Filter dropdown (labels, numbers, date range)
- New message button (opens compose with number picker)
- Which Twilio number you're viewing (switchable)

### 2. Kanban Pipeline — `/pipeline`

```
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│   New    │ Contacted│ Waiting  │ Hot Lead │  Closed  │
│  (12)    │   (5)    │   (8)    │   (3)    │  (24)    │
├──────────┼──────────┼──────────┼──────────┼──────────┤
│┌────────┐│┌────────┐│┌────────┐│┌────────┐│┌────────┐│
││John S. ││Maria L.│││Ahmed K.│││Lisa P. │││Tom W.  ││
││+44 791.││+44 782.│││+44 770.│││+1 555..│││+44 798.││
││Hot Lead││Waiting  │││VIP     │││Hot Lead│││        ││
││2m ago  ││15m ago  │││1h ago  │││3h ago  │││1d ago  ││
│└────────┘│└────────┘│└────────┘│└────────┘│└────────┘│
│┌────────┐│          │┌────────┐│          │          │
││Sara M. ││          ││Dev P.  ││          │          │
││+44 755.││          ││+44 791.││          │          │
│└────────┘│          │└────────┘│          │          │
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

- Drag and drop cards between columns
- Each card: name, phone, labels, last message time, unread indicator
- Click card → opens conversation in inbox view
- Custom columns: Hugo can rename, add, remove, reorder stages via Settings
- Filter by label, number, date

### 3. Contacts — `/contacts`

```
┌──────────────────────────────────────────────────────┐
│  Contacts          [Search]  [+ Add]  [Import CSV]   │
├──────────────────────────────────────────────────────┤
│  Name          Phone           Labels     Last Msg   │
│  ─────────────────────────────────────────────────── │
│  John Smith    +44 7911 234567 Hot Lead   2 min ago  │
│  Maria Lopez   +44 7822 345678 Waiting    15 min ago │
│  Ahmed Khan    +44 7703 456789 VIP        1 hour ago │
│  Lisa Parker   +1 555 123 4567 Hot Lead   3 hours    │
├──────────────────────────────────────────────────────┤
│  Showing 1-50 of 234    [< Prev]  [Next >]           │
└──────────────────────────────────────────────────────┘
```

- Add contact manually (name + phone + labels)
- Edit contact inline
- Delete contact (with confirmation)
- Import CSV (see bulk section below)
- Export contacts as CSV
- Click name → opens conversation

### 4. AI Automation Builder — `/automations`

**Flow list page:**

```
┌──────────────────────────────────────────────────────┐
│  Automations       [+ New Flow]                       │
├──────────────────────────────────────────────────────┤
│  Name              Trigger         Status   Last Run  │
│  ─────────────────────────────────────────────────── │
│  Welcome Flow      New message     🟢 Active  2h ago  │
│  After Hours       Time: 6PM-9AM  🟢 Active  5h ago  │
│  Property Inquiry  Keyword: "rent" ⚪ Off     1d ago  │
└──────────────────────────────────────────────────────┘
```

Note: STOP/STOPALL/UNSUBSCRIBE opt-out handling is hardcoded in the webhook — not an automation. It runs before any automation logic. This is a legal requirement (UK Ofcom / US CTIA).

**Flow editor page** (`/automations/:id`):

React Flow canvas with these node types:

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│  📩 Trigger  │────▶│  🤖 AI Response  │────▶│  🏷️ Label    │
│  New message │     │  Model: GPT-4o  │     │  "Contacted" │
│  on +44 791..│     │  Prompt: "You   │     └──────────────┘
└─────────────┘     │  are a helpful  │
                    │  property..."   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  ❓ Condition    │
                    │  If contains    │
                    │  "viewing"      │
                    ├────────┬────────┤
                    │  Yes   │   No   │
                    └───┬────┴────┬───┘
                        │         │
               ┌────────▼──┐  ┌──▼─────────┐
               │ 🧑 Transfer│  │ ⏰ Delay    │
               │ To: Hugo  │  │ Wait: 30min│
               └───────────┘  └──┬─────────┘
                                 │
                        ┌────────▼────────┐
                        │  🤖 AI Response  │
                        │  "Thanks for    │
                        │  your interest" │
                        └─────────────────┘
```

**Node types (agencfront-style, one NodeWrapper renders all):**

| Node | Icon | Border Color | Config fields |
|---|---|---|---|
| **DEFAULT** | MessageSquare | #1E9A80 | AI prompt OR exact text, delay (minutes), model temperature |
| **STOP_CONVERSATION** | CircleStop | #EF4444 | Final message prompt/text (terminal node, no outgoing edges) |
| **FOLLOW_UP** | Clock | #F59E0B | Timed steps: each step has name, wait duration, prompt/text |
| **TRANSFER** | UserPlus | #6B7280 | Assign to team member |
| **LABEL** | Tag | #1E9A80 | Auto-tag contact with a label from `sms_labels` |
| **MOVE_STAGE** | ArrowRightLeft | #1E9A80 | Move contact to pipeline stage from `sms_pipeline_stages` |
| **WEBHOOK** | Globe | #1A1A1A | URL, HTTP method (GET/POST/PUT) |

**Flow editor architecture (rebuilt from agencfront patterns):**
- **One universal NodeWrapper** — renders all node types via config map (not 9 separate files)
- **FlowContext** — React Context holds all state: nodes, edges, editing state, global prompt, CRUD functions
- **Custom edges with labels** — inline pathway labels on edges, click to edit
- **Edge editing sidebar** — slide-in panel: pathway label, description, conditions (CONTAIN/EQUALS/etc with AND/OR logic)
- **Add node panel** — slide-in panel with grid of 7 node types to add
- **Edit node popup** — Dialog modal on double-click: full node config with type switching
- **Global prompt** — system-wide AI prompt, applies to all DEFAULT nodes
- **Auto-save indicator** in top bar
- Save flow (serialized to JSON → Supabase)
- Toggle flow on/off
- Duplicate node via NodeToolbar

**Infinite loop guard:** `sms_automation_runs` tracks every execution. If same automation + same conversation fires within 60 seconds, the second run is blocked and logged as "loop detected".

### 5. Bulk Send / Campaigns — `/campaigns`

**Campaign list:**

```
┌──────────────────────────────────────────────────────┐
│  Campaigns         [+ New Campaign]                   │
├──────────────────────────────────────────────────────┤
│  Name           Recipients  Status     Sent  Delivered│
│  ─────────────────────────────────────────────────── │
│  March Promo     1,234      ✅ Complete  1234  1198   │
│  Viewing Remind  89         📨 Sending   45    42    │
│  Welcome Batch   500        ⏰ Scheduled -     -     │
└──────────────────────────────────────────────────────┘
```

**New campaign flow:**

1. **Name the campaign** — e.g. "April Property Update"
2. **Select recipients:**
   - Pick from existing contacts (filter by label/stage)
   - OR upload CSV file
3. **CSV upload:**
   - Accepts: `name, phone` (minimum) + optional `labels, notes` columns
   - Preview first 10 rows before importing
   - **Duplicate detection:** checks phone number against existing contacts
   - Shows: "Found 23 duplicates — [Skip duplicates] [Import anyway] [Review each]"
   - Names the batch (e.g. "April CSV Upload") for later reference
4. **Compose message:**
   - Write message or pick template
   - Variables: `{name}`, `{phone}` auto-replaced per recipient
   - Character count + segment count (SMS is 160 chars per segment)
5. **Select sending number** — pick which Twilio number(s), or enable rotation
6. **Opt-out toggle** — ON: appends "Reply STOP to unsubscribe" / OFF: no footer (per-campaign choice)
7. **Schedule or send now**
8. **Review + confirm** — shows total recipients, estimated cost, sends preview to Hugo's number

**Compliance:** Bulk send ALWAYS skips contacts where `opted_out = true` or phone exists in `sms_opt_outs`. Skipped contacts logged as status `"skipped_opt_out"` in `sms_campaign_recipients`.

**Number rotation for bulk:**
- If 3 numbers connected and sending 300 messages: 100 from each number
- Round-robin distribution
- Rate-limited: 1 msg/sec per long-code number (Twilio limit). Queue processes accordingly.
- If a number hits rate limit, automatically shifts to next

### 6. Templates — `/templates`

```
┌──────────────────────────────────────────────────────┐
│  Templates         [+ New Template]                   │
├──────────────────────────────────────────────────────┤
│  Name              Category      Last Used            │
│  ─────────────────────────────────────────────────── │
│  Welcome           Greeting      2 hours ago          │
│  Property Available Response     1 day ago            │
│  Viewing Confirm   Scheduling    3 days ago           │
│  Follow Up         Nurture       1 week ago           │
└──────────────────────────────────────────────────────┘
```

- Create/edit templates with `{name}` variables
- Categorise templates
- Use in: manual replies, bulk campaigns, AI automation nodes

### 7. Numbers — `/numbers`

```
┌──────────────────────────────────────────────────────┐
│  Phone Numbers     [+ Connect Number]                 │
├──────────────────────────────────────────────────────┤
│  Number            Label        Messages   Status     │
│  ─────────────────────────────────────────────────── │
│  +44 7911 234567   Main UK      1,234      🟢 Active  │
│  +44 7822 345678   Backup UK    456        🟢 Active  │
│  +1 555 123 4567   US Number    89         🟢 Active  │
└──────────────────────────────────────────────────────┘
```

- Connect new Twilio number (enter number + Twilio SID)
- Label each number (e.g. "Main UK", "Campaigns Only")
- See message stats per number
- Set default number for outbound
- Configure webhook URL per number (auto-generated)

### 8. Settings — `/settings`

- **Profile:** Name, email
- **Team members:** Add/remove users, set roles (admin/agent) — v1 is Hugo only, structure supports more later
- **Quick replies:** Manage list of one-click responses
- **Pipeline stages:** Add/rename/reorder/delete kanban columns
- **Labels:** Manage label names and colours (backed by `sms_labels` table)
- **Opt-out list:** View numbers that texted STOP — never send to these
- **Integrations:** Twilio connection status, OpenAI connection status (keys stored in env vars / Supabase secrets)
- **Notifications:** Browser notification preferences
- **Danger zone:** Delete account data

### 9. Dashboard / Overview — `/dashboard`

Simple stats page:
- Messages today (sent / received)
- Unread conversations count
- Active automations count
- Delivery rate (% delivered)
- Response time (average)
- Chart: messages per day (last 30 days)

---

## Database Tables (all prefixed `sms_`)

### `sms_numbers`
```
id              uuid    PK
twilio_sid      text    Twilio phone number SID
phone_number    text    E.164 format (+447911234567)
label           text    "Main UK", "Campaigns Only"
is_default      boolean default outbound number
webhook_url     text    auto-generated edge function URL
created_at      timestamptz
```

### `sms_contacts`
```
id              uuid    PK
phone_number    text    UNIQUE, E.164 format
display_name    text    nullable
notes           text    internal notes
pipeline_stage_id uuid  FK → sms_pipeline_stages (nullable)
assigned_to     uuid    FK → auth.users (nullable)
external_id     uuid    nullable — future link to marketplace profiles
opted_out       boolean default false
batch_name      text    nullable — which CSV import they came from
created_at      timestamptz
updated_at      timestamptz
```

### `sms_labels`
```
id              uuid    PK
name            text    UNIQUE — "Hot Lead", "VIP", etc.
colour          text    hex colour for display
position        integer sort order
created_at      timestamptz
```

### `sms_contact_labels`
```
id              uuid    PK
contact_id      uuid    FK → sms_contacts
label_id        uuid    FK → sms_labels
UNIQUE(contact_id, label_id)
created_at      timestamptz
```

### `sms_messages`
```
id              uuid    PK
twilio_sid      text    UNIQUE — idempotency key, prevents duplicate webhook inserts
from_number     text    E.164
to_number       text    E.164
body            text    message content
direction       text    "inbound" | "outbound"
status          text    "scheduled" | "queued" | "sent" | "delivered" | "undelivered" | "failed" | "received"
media_urls      text[]  MMS attachment URLs (nullable)
number_id       uuid    FK → sms_numbers (which of our numbers)
contact_id      uuid    FK → sms_contacts
campaign_id     uuid    FK → sms_campaigns (nullable)
error_code      text    Twilio error code if failed (nullable)
error_message   text    Human-readable error from Twilio (nullable)
scheduled_at    timestamptz nullable — for scheduled individual messages
created_at      timestamptz
```

### `sms_conversations`
```
id              uuid    PK
contact_id      uuid    FK → sms_contacts
number_id       uuid    FK → sms_numbers (which of our numbers this thread is on)
last_message_at timestamptz
last_message_preview text    first 100 chars
unread_count    integer default 0
is_archived     boolean default false
is_locked_by    uuid    nullable — advisory collision detection
locked_at       timestamptz nullable — lock expires after 30 seconds
UNIQUE(contact_id, number_id) — same contact + different number = separate threads
created_at      timestamptz
```

### `sms_internal_notes`
```
id              uuid    PK
conversation_id uuid    FK → sms_conversations
author_id       uuid    FK → auth.users
body            text
created_at      timestamptz
```

### `sms_templates`
```
id              uuid    PK
name            text
body            text    supports {name}, {phone} variables
category        text    nullable
created_at      timestamptz
updated_at      timestamptz
```

### `sms_automations`
```
id              uuid    PK
name            text
description     text    nullable
flow_json       jsonb   React Flow serialized state (nodes + edges)
trigger_type    text    "new_message" | "keyword" | "time_based"
trigger_config  jsonb   { keywords: [], numbers: [], time_range: {} }
is_active       boolean default false
last_run_at     timestamptz nullable
run_count       integer default 0
created_at      timestamptz
updated_at      timestamptz
```

### `sms_automation_runs`
```
id              uuid    PK
automation_id   uuid    FK → sms_automations
conversation_id uuid    FK → sms_conversations
message_id      uuid    FK → sms_messages (the triggering message)
status          text    "running" | "completed" | "failed" | "loop_blocked"
started_at      timestamptz
completed_at    timestamptz nullable
error           text    nullable
created_at      timestamptz
```

### `sms_automation_step_runs`
```
id              uuid    PK
run_id          uuid    FK → sms_automation_runs
node_id         text    React Flow node ID
node_type       text    "ai_response" | "condition" | "delay" | "label" | "transfer" | "template" | "webhook" | "move_stage"
status          text    "pending" | "running" | "completed" | "failed" | "skipped"
input_data      jsonb   what was passed to this node
output_data     jsonb   what this node produced
error           text    nullable
created_at      timestamptz
```

### `sms_scheduled_tasks`
```
id              uuid    PK
type            text    "delay_node" | "scheduled_message" | "scheduled_campaign"
reference_id    uuid    the automation_run / message / campaign this belongs to
node_id         text    nullable — for delay nodes, which node to resume
execute_at      timestamptz when to execute
status          text    "pending" | "processing" | "completed" | "failed"
attempts        integer default 0
last_error      text    nullable
created_at      timestamptz
```
Polled by a 1-minute cron job. Picks up rows where `execute_at <= now()` and `status = 'pending'`.

### `sms_campaigns`
```
id              uuid    PK
name            text
batch_name      text    nullable — links to CSV import batch
message_body    text    template with {name} variables
number_ids      uuid[]  which Twilio numbers to use
rotation        boolean use number rotation
include_opt_out boolean append opt-out message
status          text    "draft" | "scheduled" | "sending" | "complete" | "cancelled"
scheduled_at    timestamptz nullable
total_recipients integer
sent_count      integer default 0
delivered_count integer default 0
failed_count    integer default 0
skipped_count   integer default 0 — opted-out contacts
created_at      timestamptz
```

### `sms_campaign_recipients`
```
id              uuid    PK
campaign_id     uuid    FK → sms_campaigns
contact_id      uuid    FK → sms_contacts
message_id      uuid    FK → sms_messages (nullable, set after send)
status          text    "pending" | "sent" | "delivered" | "failed" | "skipped_opt_out"
sent_at         timestamptz nullable
```

### `sms_opt_outs`
```
id              uuid    PK
phone_number    text    UNIQUE
reason          text    "user_requested" | "keyword_stop"
created_at      timestamptz
```

### `sms_pipeline_stages`
```
id              uuid    PK
name            text    "New", "Contacted", etc.
position        integer sort order
colour          text    hex colour for kanban column header
created_at      timestamptz
```

### `sms_quick_replies`
```
id              uuid    PK
label           text    button text
body            text    message to send
position        integer sort order
created_at      timestamptz
```

**Total: 16 tables** (was 11, added: `sms_labels`, `sms_contact_labels`, `sms_automation_runs`, `sms_automation_step_runs`, `sms_scheduled_tasks`)

---

## RLS Policies (Phase 2)

All `sms_*` tables will have RLS enabled. v1 policy (Hugo only):

```sql
-- All sms_ tables: only authenticated admin can read/write
CREATE POLICY "admin_all" ON sms_[table]
  FOR ALL
  USING (auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com'))
  WITH CHECK (auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com'));
```

When team members are added later, we create role-based policies (owner/admin/agent) with per-table permissions. The structure supports this — `assigned_to` on contacts and `author_id` on notes already reference `auth.users`.

---

## Edge Functions (all prefixed `sms-`)

| Function | Trigger | What it does |
|---|---|---|
| `sms-webhook-incoming` | Twilio webhook (POST) | **Validates Twilio signature (HMAC-SHA1)**. Checks STOP/STOPALL/UNSUBSCRIBE keywords FIRST (hardcoded opt-out, legal requirement). Then: stores in `sms_messages` (idempotent via UNIQUE twilio_sid), updates conversation, triggers automation engine. |
| `sms-webhook-status` | Twilio status callback (POST) | **Validates Twilio signature.** Updates message delivery status (sent → delivered / undelivered / failed) + error_code + error_message. |
| `sms-send` | App calls it | Sends one SMS/MMS via Twilio API, stores in `sms_messages`. Handles media upload from Supabase Storage. |
| `sms-bulk-send` | App calls it | Processes campaign: **skips opted-out contacts**, rate-limits at 1 msg/sec/number, rotates numbers, updates campaign stats. |
| `sms-ai-respond` | Called by automation engine | Takes system prompt + message + model → calls OpenAI → returns AI reply |
| `sms-automation-run` | Called by `sms-webhook-incoming` | Loads active automations, checks triggers, **checks loop guard (60s cooldown per conversation)**, walks the flow graph, executes nodes, logs to `sms_automation_runs` + `sms_automation_step_runs`. |
| `sms-csv-import` | App calls it | Parses CSV, detects duplicates, creates contacts, returns report |
| `sms-process-scheduled` | 1-minute cron | Picks up `sms_scheduled_tasks` where `execute_at <= now()`, processes delays/scheduled messages/scheduled campaigns. |

---

## How AI Automation Executes

1. Incoming message arrives at `sms-webhook-incoming`
2. **Validate Twilio signature** — reject if invalid
3. **Check opt-out keywords** (STOP, STOPALL, UNSUBSCRIBE) — if match: insert to `sms_opt_outs`, set contact `opted_out = true`, auto-reply "You have been unsubscribed", STOP (no further processing)
4. **Idempotency check** — if `twilio_sid` already exists in `sms_messages`, skip (duplicate webhook)
5. Message stored in DB, conversation updated
6. Edge function calls `sms-automation-run` with the message
7. Automation engine loads all active automations
8. For each automation, checks if trigger matches (keyword, number, time)
9. **Loop guard** — checks `sms_automation_runs` for same automation + conversation in last 60 seconds. If found, logs "loop_blocked" and stops.
10. If match and no loop: walks the flow graph node by node:
    - **AI Response** → calls `sms-ai-respond` → sends reply via `sms-send`
    - **Condition** → evaluates, follows yes/no branch
    - **Delay** → inserts row into `sms_scheduled_tasks` with `execute_at` = now + delay duration. 1-minute cron picks it up later and resumes the flow.
    - **Label** → inserts into `sms_contact_labels`
    - **Transfer** → sets `assigned_to` on contact, stops automation
    - **Move Stage** → updates `pipeline_stage_id` on contact
    - **Template** → resolves variables, sends via `sms-send`
    - **Webhook** → POSTs to external URL
11. Each step logged in `sms_automation_step_runs`

---

## Real-Time Architecture

```
Incoming SMS
    │
    ▼
Twilio ──webhook──▶ sms-webhook-incoming (edge function)
                        │
                        ├──▶ Validate Twilio signature
                        ├──▶ Check opt-out keywords (STOP etc.)
                        ├──▶ Idempotency check (UNIQUE twilio_sid)
                        ├──▶ INSERT into sms_messages
                        ├──▶ UPSERT sms_conversations (last_message, unread_count++)
                        ├──▶ Trigger sms-automation-run (if automations active)
                        │
                        ▼
                    Supabase Realtime
                        │
                        ▼
                    React UI (subscribed to sms_messages + sms_conversations)
                        │
                        ▼
                    New message appears instantly + browser notification
```

No polling needed. Supabase real-time subscriptions push new rows to the UI the moment they're inserted.

---

## Phase 1 Deliverables (UI ONLY — mock data)

These screens built with hardcoded mock data, fully interactive, nfstay design:

1. Inbox — conversation list + message thread + compose + schedule send
2. Kanban — drag and drop pipeline
3. Contacts — list + add + edit + CSV upload UI
4. Automations list — flow list with on/off toggles
5. Automation editor — React Flow canvas with all 9 node types
6. Campaigns — list + new campaign wizard (8 steps including opt-out toggle)
7. Templates — list + create/edit
8. Numbers — list + connect
9. Settings — all sections including labels manager
10. Dashboard — stats + chart

**Hugo reviews and approves the UI before Phase 2 begins.**

---

## Tech Dependencies

| Package | Purpose |
|---|---|
| react + react-dom | UI framework |
| vite | Build tool |
| typescript | Type safety |
| tailwindcss | Styling (nfstay design tokens) |
| @supabase/supabase-js | Database + auth + real-time |
| reactflow | Automation flow builder |
| react-router-dom | Routing |
| lucide-react | Icons |
| @dnd-kit/core | Kanban drag and drop |
| @dnd-kit/sortable | Sortable containers for kanban |
| @dnd-kit/utilities | DnD helper utilities |
| recharts | Dashboard charts |
| papaparse | CSV parsing |
| date-fns | Date formatting |
| sonner | Toast notifications |
| zustand | State management for flow editor |

---

## Design Tokens (matching nfstay brand)

- Primary: `#1E9A80` (nfstay green)
- Background: `#F3F3EE` (off-white)
- Cards: `#FFFFFF` with `1px solid #E5E7EB`
- Text: `#1A1A1A` (headings), `#6B7280` (body), `#9CA3AF` (muted)
- Font: Inter (all weights)
- Border radius: 12-16px (cards), 10px (inputs), 14px (buttons)
- Shadows: `rgba(0,0,0,0.08) 0 4px 24px -2px`
- Status colours: red `#EF4444` for failed/unread, orange `#F59E0B` for undelivered, green `#1E9A80` for delivered/active, grey `#9CA3AF` for muted

---

## Supabase Storage

One bucket: `sms-attachments`
- Used for outbound MMS: Hugo attaches an image → uploaded to Storage → URL passed to Twilio `MediaUrl` parameter
- Inbound MMS: Twilio provides media URLs directly, stored in `sms_messages.media_urls`

---

## What This Plan Does NOT Include (future)

- WhatsApp Business API integration (different from SMS — separate project)
- Email inbox (out of scope)
- Voice calls
- Multi-tenant SaaS (only nfstay team uses this)
- Public API for third parties
- Mobile app (responsive web only)
- Full-text search indexes (ILIKE is fine for v1 volume, add trigram indexes if needed later)
- Formal role-based access control (v1 is Hugo only, add roles when team members join)
