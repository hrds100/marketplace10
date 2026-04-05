---
name: crm
description: >
  Use when: CRM pipeline, kanban board, deal stages, drag and drop,
  "CRM not loading", "stages not saving", CRMPage, pipeline,
  "leads tab", "my leads", crm_deals, pipeline_stages
---
SCOPE: src/features/crm/*
READ-ONLY: core/database/client.ts
FORBIDDEN: all other features, frozen paths

DIAGNOSE FIRST: Supabase query → RLS policies → then code

WORKFLOW: diagnose → read → PLAN → approve → execute → test

NOTE: notifyCrmStageMove() is DELETED — CRM stages save to DB only, no notification.
NOTE: CRM reads from crm_deals and pipeline_stages tables (CRM owns both).

TESTS: crm + smoke
BLAST RADIUS: LOW (feature-local — owns its own tables)
