---
name: payment
description: >
  Use when: payment, subscription, tier upgrade, PaymentSheet, paywall,
  "payment not working", "tier not updating", GHL payment funnel,
  useUserTier, "stuck on free tier", membership
---
SCOPE: src/features/payment/*
READ-ONLY: core/database/client.ts, core/integrations/ghl.ts
FORBIDDEN: all other features, frozen paths

DIAGNOSE FIRST: GHL funnel → tier in profiles table → useUserTier hook → then code

WORKFLOW: diagnose → read → PLAN → approve → execute → test

NOTE: PaymentSheet has hardcoded n8n aff-commission call (to be replaced in Phase 2).
NOTE: useUserTier uses Realtime subscription on profiles.tier.

TESTS: payment + smoke
BLAST RADIUS: MEDIUM (writes to profiles.tier, reads by all features)
