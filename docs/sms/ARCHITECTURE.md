# SMS Inbox — Architecture

## Database Tables (18 tables, all sms_* prefixed)

| Table | Purpose | Key columns |
|---|---|---|
| `sms_numbers` | Connected phone numbers (SMS + WhatsApp) | phone_number, channel, is_default, twilio_sid |
| `sms_contacts` | People we message | phone_number, display_name, pipeline_stage_id, opted_out |
| `sms_labels` | Canonical label definitions | name, colour, position |
| `sms_contact_labels` | Many-to-many contact ↔ label | contact_id, label_id |
| `sms_messages` | Every message sent/received | twilio_sid (unique), body, direction, status, channel |
| `sms_conversations` | One per contact+number pair | contact_id, number_id, unread_count, channel, automation_enabled |
| `sms_internal_notes` | Team notes on conversations | conversation_id, author_id, body |
| `sms_templates` | SMS message templates | name, body, category |
| `sms_automations` | AI flow definitions | flow_json (JSONB), trigger_type, is_active |
| `sms_automation_state` | Tracks position in flow per conversation | conversation_id, automation_id, current_node_id, status |
| `sms_automation_runs` | Execution log per automation run | automation_id, conversation_id, status, current_node_id |
| `sms_automation_step_runs` | Per-node execution log | run_id, node_id, node_type, status |
| `sms_scheduled_tasks` | Delayed messages + follow-up steps | type, execute_at, status |
| `sms_campaigns` | Bulk send campaigns | name, message_body, status, sent_count, automation_id |
| `sms_campaign_recipients` | Per-recipient tracking | campaign_id, contact_id, status |
| `sms_opt_outs` | Numbers that texted STOP | phone_number, reason |
| `sms_pipeline_stages` | Kanban column definitions | name, colour, position |
| `sms_quick_replies` | One-click reply shortcuts | label, body, position |

## Edge Functions (9 deployed)

### SMS (Twilio)
| Function | Purpose |
|---|---|
| `sms-webhook-incoming` | Receives inbound SMS from Twilio. Validates signature (HMAC-SHA1), handles opt-outs, stores messages, upserts conversations, triggers automations. |
| `sms-webhook-status` | Receives delivery status callbacks from Twilio (sent/delivered/failed/undelivered). |
| `sms-send` | Sends outbound SMS via Twilio API. Checks opt-out, stores message, updates conversation. |
| `sms-bulk-send` | Processes campaigns: rate-limited (1 msg/sec/number), number rotation, opt-out skip. |
| `sms-ai-respond` | Calls OpenAI for AI replies. Supports pathway classification (inline classifier with edge labels). Model fallback if unavailable. |
| `sms-automation-run` | Turn-based flow execution engine. 5s debounce, one reply per message, state tracking, manual reply detection. |

### WhatsApp (Meta Cloud API)
| Function | Purpose |
|---|---|
| `wa-webhook-incoming` | Receives WhatsApp messages from Meta. GET for verification, POST for messages + status updates. HMAC-SHA256 signature validation. |
| `wa-send` | Sends WhatsApp messages via Meta Graph API. Text + template messages. |
| `wa-templates` | CRUD for WhatsApp message templates via Meta API. List, create, delete. |

## Real-Time Architecture

```
Inbound SMS → Twilio webhook → sms-webhook-incoming → Supabase
Inbound WhatsApp → Meta webhook → wa-webhook-incoming → Supabase
                                                          │
                                                    Supabase Realtime
                                                          │
                                                    React UI (instant)
```

## Flow Editor (agencfront-style)

- **One universal NodeWrapper** renders all 7 node types
- **FlowContext** (React Context) holds all state + CRUD
- **Custom edges** with inline labels + pathway conditions
- **AI Flow Builder** — describe in English, GPT-4o generates full flow
- **Turn-based execution** — one reply per message, 5s debounce

### Node Types
| Type | Purpose |
|---|---|
| DEFAULT | AI response node — prompt + model + temperature |
| STOP_CONVERSATION | End the conversation |
| FOLLOW_UP | Timed sequence of messages |
| TRANSFER | Hand off to human agent |
| LABEL | Auto-tag the contact |
| MOVE_STAGE | Move contact in pipeline |
| WEBHOOK | Call external URL |

## RLS Policies

All `sms_*` tables have RLS enabled. Admin-only access for:
- admin@hub.nfstay.com
- hugo@nfstay.com
- hugodesouzax@gmail.com
- hugords100@gmail.com
- hugo24eu@gmail.com
