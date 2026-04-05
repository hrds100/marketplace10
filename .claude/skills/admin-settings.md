---
name: admin-settings
description: >
  Use when: admin settings, AI model selector, email templates,
  notification settings, "admin settings not saving", AdminSettings,
  ai_settings table, email_templates table
---
SCOPE: src/features/admin-settings/*
READ-ONLY: core/database/client.ts
FORBIDDEN: all other features, frozen paths

DIAGNOSE FIRST: Supabase query → RLS policies → then code

WORKFLOW: diagnose → read → PLAN → approve → execute → test

NOTE: ai_settings table controls which OpenAI model each AI task uses.
NOTE: email_templates and notification_settings read by send-email edge function.

TESTS: admin-settings + smoke
BLAST RADIUS: MEDIUM (settings affect AI + email behavior globally)
