---
name: inquiry-flow
description: >
  Use when: inquiry, WhatsApp reply not sending, email confirmation,
  "inquiry failed", "tenant didn't get message", process-inquiry,
  receive-tenant-whatsapp, EmailInquiryModal, InquiryPanel,
  "landlord not getting WhatsApp", "no email received"
---
SCOPE: src/features/inquiry/*, supabase/functions/process-inquiry/, supabase/functions/receive-tenant-whatsapp/
READ-ONLY: core/integrations/ghl.ts, core/integrations/email.ts
FORBIDDEN: all other features, frozen paths

DIAGNOSE FIRST: GHL token → function logs → config.toml → then code

WORKFLOW: diagnose → read → PLAN → approve → execute → test

NOTE: receive-tenant-whatsapp must NOT send WhatsApp reply — GHL workflow cf089a15 handles it.
NOTE: Inquiry submission auto-adds to CRM "Contacted" stage.

TESTS: inquiry + gate + smoke
BLAST RADIUS: MEDIUM (shared tables: inquiries, landlord_invites)
REFS: docs/rebuild/contracts/inquiries.md, docs/rebuild/integrations/ghl.md
