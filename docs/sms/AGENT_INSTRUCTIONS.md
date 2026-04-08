# SMS Inbox — Agent Instructions

> This file is the operating manual for any AI agent working on the SMS Inbox module.
> Read this BEFORE touching any SMS code.

## Hotkey

```
You are the nfstay SMS Inbox Co-Pilot.

PROJECT: SMS Inbox module inside hub.nfstay.com
LOCATION: src/features/sms/ (87 files, fully isolated)
ROUTES: /sms/* (inbox, pipeline, contacts, automations, campaigns, templates, numbers, settings, dashboard)
PLAN: docs/NFSTAY_INBOX_PLAN.md (v2, audit-hardened)
STATUS: docs/sms/STATUS.md
ARCHITECTURE: docs/sms/ARCHITECTURE.md
CHANGELOG: docs/CHANGELOG.md
```

## Rules

### Isolation (NON-NEGOTIABLE)
- All SMS tables prefixed `sms_*` — never overlap with marketplace tables
- All edge functions prefixed `sms-*` or `wa-*` — never touch marketplace functions
- SMS feature imports ONLY from `@/components/ui/*`, `@/lib/utils`, `@/hooks/*`, `core/`
- NEVER import from other features (deals, crm, inquiry, etc.)
- NEVER touch frozen zones (invest/*, nfstay/*, revolut-*, vite.config.ts, main.tsx)

### Coding Standards
- Every change via PR — no direct push to main
- `npx tsc --noEmit` — zero errors before every commit
- `npm run build` — must pass before every commit
- Every feature must actually work — no decorative UI
- Log every change in `docs/CHANGELOG.md`
- Update `docs/sms/STATUS.md` when status changes
- Brand colors only: #1E9A80, #FFFFFF, #1A1A1A, #6B7280, #9CA3AF, #E5E7EB, #EF4444, #F59E0B
- WhatsApp green exception: #25D366 for WhatsApp-specific elements
- Icons: lucide-react only
- Components: shadcn/ui from `@/components/ui/*` only

### Database
- Explicit column selects — no `select('*')`
- All tables have RLS (admin emails only for v1)
- `channel` column on sms_numbers, sms_messages, sms_conversations ('sms' | 'whatsapp')
- `twilio_sid` column stores both Twilio SIDs and WhatsApp wamids

### Edge Functions
- Deploy via `./scripts/deploy-function.sh <name>`
- Requires `SUPABASE_ACCESS_TOKEN` env var
- Always `--no-verify-jwt` (config.toml is source of truth)
- SMS functions use TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN
- WhatsApp functions use META_WHATSAPP_TOKEN + META_APP_SECRET + META_VERIFY_TOKEN
- OPENAI_API_KEY for AI responses

### Automation Engine
- Turn-based: ONE reply per user message
- 5-second debounce before processing
- Per-conversation toggle (automation_enabled on sms_conversations)
- Manual reply detection: auto-suspend if human replied
- Flow completion: STOP node → status='completed', no more auto-replies
- Loop guard: 60s cooldown per automation + conversation
- Conversation state tracked in sms_automation_state

### Testing
- SMS: send real message to +447380308316, check sms_messages table
- WhatsApp: pending Meta App Review approval
- Verify via psql: `export PGPASSWORD="NFsTay2026db" && psql "postgresql://postgres:NFsTay2026db@db.asazddtvjvmckouxcmmo.supabase.co:5432/postgres"`

## Agent Routing

| Agent | Domain |
|---|---|
| Dimitri | Edge functions, Twilio integration, webhook security, database, Meta API |
| Mario | UI wiring, real-time subscriptions, campaign logic, flow editor |
| Scarlett | Docs, CHANGELOG, plan updates, cleanup |

## Key Files

| File | Purpose |
|---|---|
| `src/features/sms/layout/SmsLayout.tsx` | Layout with sidebar |
| `src/features/sms/layout/SmsSidebar.tsx` | Navigation sidebar |
| `src/features/sms/pages/SmsInboxPage.tsx` | Main inbox page |
| `src/features/sms/pages/SmsFlowEditorPage.tsx` | Flow editor |
| `src/features/sms/components/automations/FlowContext.tsx` | Flow state management |
| `src/features/sms/components/automations/NodeWrapper.tsx` | Universal node renderer |
| `src/features/sms/hooks/useConversations.ts` | Conversations query + real-time |
| `src/features/sms/hooks/useMessages.ts` | Messages query + real-time |
| `src/features/sms/hooks/useSendMessage.ts` | Send SMS via edge function |
| `supabase/functions/sms-webhook-incoming/index.ts` | Inbound SMS webhook |
| `supabase/functions/sms-automation-run/index.ts` | Automation execution engine |
| `supabase/functions/wa-webhook-incoming/index.ts` | Inbound WhatsApp webhook |
| `supabase/functions/wa-send/index.ts` | Send WhatsApp messages |
| `supabase/migrations/20260407_sms_inbox_tables.sql` | Main migration |
