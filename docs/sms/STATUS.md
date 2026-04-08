# SMS Inbox — Current Status (as of 2026-04-09)

## What's DONE and LIVE

### Phase 1: UI ✅
- 10 pages built and deployed at hub.nfstay.com/sms/*
- Responsive design, nfstay brand colors
- All pages wired to real Supabase data

### Phase 2: Backend ✅
- 18 database tables created with RLS
- Twilio webhook configured: +447380308316 → sms-webhook-incoming
- SMS send/receive working end-to-end (tested and confirmed by Hugo)
- Real-time: new messages appear instantly via Supabase subscriptions
- Contact auto-creation on first inbound message
- Opt-out handling (STOP/UNSUBSCRIBE keywords)
- Delivery status tracking (sent/delivered/failed/undelivered)

### Phase 3: AI Automation ✅
- Flow editor with 7 node types (agencfront-style)
- Turn-based execution: one reply per user message, 5s debounce
- Smart pathway routing: AI evaluates which edge to follow
- AI Flow Builder: describe in English → GPT generates full flow
- Per-conversation automation toggle (not global)
- Manual reply detection: bot auto-suspends if human replied
- Flow completion: STOP node → no more auto-replies
- Conversation state tracking per contact
- Lead counts per automation + per node
- Global prompt applies to all AI response nodes
- Model selector: GPT-5.4 Nano/Mini, GPT-5, GPT-4o (with fallback)

### Phase 4: Bulk Campaigns ✅
- Campaign creation wizard (7 steps)
- CSV upload with duplicate detection
- Rate-limited sending (1 msg/sec/number)
- Number rotation for bulk sends
- Opt-out enforcement (skips opted-out contacts)
- Campaign-linked automations

### WhatsApp Integration (in progress)
- ✅ Meta Cloud API edge functions built + deployed (wa-webhook-incoming, wa-send, wa-templates)
- ✅ Webhook configured in Meta Developer Console
- ✅ Channel column on all tables (sms/whatsapp)
- ✅ WhatsApp template management UI (20 starter templates, create/list/delete)
- ✅ Channel indicators in UI (green W badge for WhatsApp)
- ⏳ Meta App Review — submitted, in review
- ❌ Can't send real WhatsApp messages until App Review is approved
- ❌ Need to add a real phone number after approval

## What's LEFT TO DO

### Immediate (after Meta App Review approval)
1. Add real phone number for WhatsApp in Meta console
2. Record 2 videos for App Review (sending message + creating template)
3. Test end-to-end WhatsApp message
4. Send first WhatsApp from inbox

### Phase 5: Polish
1. Browser notifications for new messages
2. sms-process-scheduled edge function (cron for follow-up delay nodes)
3. Clean up unused mock data files
4. Reporting/analytics improvements on dashboard

### Future
1. Meta OAuth flow — "Connect WhatsApp" button for multi-account support
2. WhatsApp interactive messages (buttons, lists)
3. WhatsApp read receipts (blue ticks)
4. 24-hour messaging window enforcement (template messages outside window)
5. Channel-specific opt-outs
6. Team member roles (agent vs admin access)

## Credentials (stored in Claude Code memory)

| Service | Location |
|---|---|
| Twilio Account SID + Auth Token | reference_twilio_credentials.md |
| Twilio Number | +447380308316 (SID: PN97458554bdb49120783d133ef2102a81) |
| Meta App (Agencin) | reference_meta_app.md |
| Meta WhatsApp Token | reference_meta_whatsapp_token.md |
| Meta WABA ID + Phone Number ID | reference_meta_whatsapp_ids.md |
| OpenAI API Key | reference_openai_key.md |
| Supabase credentials | supabase_credentials.md |

## Live Stats

- 38 messages in database
- 1 contact
- 4 automations created
- 18 database tables
- 9 edge functions deployed
