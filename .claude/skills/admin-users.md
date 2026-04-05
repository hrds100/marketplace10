---
name: admin-users
description: >
  Use when: admin users page, user management, delete user, edit user,
  "admin users not loading", AdminUsers, hard-delete-user,
  "registration date missing", user list, admin user table
---
SCOPE: src/features/admin-users/*, supabase/functions/hard-delete-user/
READ-ONLY: core/database/client.ts, core/auth/useAuth.ts
FORBIDDEN: all other features, frozen paths

DIAGNOSE FIRST: Supabase query → RLS policies → function logs → then code

WORKFLOW: diagnose → read → PLAN → approve → execute → test

NOTE: hard-delete-user removes auth user + profile. Destructive — admin only.

TESTS: admin-users + smoke
BLAST RADIUS: MEDIUM (reads/deletes from shared profiles table)
