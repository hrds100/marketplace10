---
name: gate-admin
description: >
  Use when: the gate, admin outreach, releasing inquiry, landlord notification,
  "landlord not getting WhatsApp", "release not working", AdminOutreach,
  ghl-enroll, "assign lead", "warm outreach", "cold outreach",
  admin release button, NDA release
---
SCOPE: src/features/admin-gate/*, supabase/functions/ghl-enroll/
READ-ONLY: core/integrations/ghl.ts, core/integrations/email.ts
FORBIDDEN: all other features, frozen paths

DIAGNOSE FIRST: GHL token → workflow ID → function logs → custom fields → then code

WORKFLOW: diagnose → read → PLAN → approve → execute → test

GHL WORKFLOWS:
- Cold outreach: workflow 67250bfa
- Warm outreach: workflow 0eb4395c
- Custom fields: Z0thvOTyoO2KxTMt5sP8 (property ref), gWb4evAKLWCK0y8RHp32 (magic link)

TESTS: gate + inquiry + smoke
BLAST RADIUS: MEDIUM (reads inquiries, writes notifications)
REFS: docs/rebuild/integrations/ghl.md, docs/rebuild/REBUILD_PLAN.md section 2
