---
name: settings
description: >
  Use when: settings page, profile edit, password change, notification preferences,
  "settings not saving", SettingsPage, "payout settings",
  "can't update profile", user preferences
---
SCOPE: src/features/settings/*
READ-ONLY: core/auth/useAuth.ts, core/database/client.ts
FORBIDDEN: all other features, frozen paths

DIAGNOSE FIRST: Supabase query → RLS policies → then code

WORKFLOW: diagnose → read → PLAN → approve → execute → test

NOTE: Settings page intentionally skips wallet auto-creation.
NOTE: Writes to profiles table (auth owner) — coordinate with auth.

TESTS: settings + smoke
BLAST RADIUS: MEDIUM (writes to shared profiles table)
