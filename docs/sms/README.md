# SMS Inbox Module — Complete Documentation

> Location: `src/features/sms/` inside hub.nfstay.com
> Routes: `/sms/*`
> Live: hub.nfstay.com/sms/inbox

---

## What It Is

A full-featured SMS + WhatsApp messaging inbox built into hub.nfstay.com. Send and receive SMS via Twilio, WhatsApp via Meta Cloud API. AI-powered conversation automation with visual flow builder. Bulk campaigns, contact management, kanban pipeline, templates.

## Architecture

```
hub.nfstay.com/sms/*
  │
  ├── Inbox (/sms/inbox)           — WhatsApp-style split-panel conversations
  ├── Pipeline (/sms/pipeline)     — Kanban board for lead stages
  ├── Contacts (/sms/contacts)     — Contact list + CSV import
  ├── Automations (/sms/automations) — AI flow list + visual editor
  ├── Campaigns (/sms/campaigns)   — Bulk send campaigns
  ├── Templates (/sms/templates)   — SMS + WhatsApp templates
  ├── Numbers (/sms/numbers)       — Phone number management
  ├── Settings (/sms/settings)     — Labels, stages, quick replies, integrations
  └── Dashboard (/sms/dashboard)   — Message stats + charts
```

## Stack

- **Frontend:** React + TypeScript + Tailwind + shadcn/ui
- **Database:** Supabase (18 tables, all `sms_*` prefixed)
- **SMS:** Twilio Messages API
- **WhatsApp:** Meta Cloud API (Graph API v25.0)
- **AI:** OpenAI (GPT-5.4 Mini default, configurable per node)
- **Flow Editor:** React Flow (@xyflow/react) with agencfront-style architecture
- **Real-time:** Supabase Realtime subscriptions
- **State:** React Query (@tanstack/react-query) + React Context

## Isolation

The SMS module is completely isolated from the marketplace:
- All database tables prefixed `sms_*`
- All edge functions prefixed `sms-*` or `wa-*`
- Imports only from `@/components/ui/*`, `@/lib/utils`, `@/hooks/*`
- Never imports from other features (deals, crm, inquiry, etc.)
- Never touches frozen zones (invest, nfstay booking, vite.config, main.tsx)

## File Count

- **87 TypeScript/React files** in `src/features/sms/`
- **9 edge functions** deployed
- **18 database tables** live in Supabase
