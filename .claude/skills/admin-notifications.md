---
name: admin-notifications
description: >
  Use when: admin notifications, send notification to all users,
  "notifications not sending", AdminNotifications, notification bell,
  "bell not updating", broadcast notification, admin + user split
---
SCOPE: src/features/admin-notifications/*
READ-ONLY: core/database/client.ts, core/ui/NotificationBell.tsx
FORBIDDEN: all other features, frozen paths

DIAGNOSE FIRST: Supabase Realtime → notifications table → RLS → then code

WORKFLOW: diagnose → read → PLAN → approve → execute → test

NOTE: notifications table is a shared bus — any feature may INSERT.
NOTE: NotificationBell lives in core/ui/ (used by both layouts).

TESTS: admin-notifications + smoke
BLAST RADIUS: MEDIUM (writes to shared notifications table)
