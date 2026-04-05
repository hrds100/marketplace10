---
name: admin-deals
description: >
  Use when: admin deals, admin listings, quick list, AI pricing,
  "admin deals not loading", AdminDeals, AdminQuickList,
  "AI pricing broken", airbnb-pricing, admin property management
---
SCOPE: src/features/admin-deals/*, supabase/functions/ai-parse-listing/
READ-ONLY: core/database/client.ts, core/integrations/openai.ts
FORBIDDEN: all other features, frozen paths

DIAGNOSE FIRST: OpenAI key → ai-parse-listing logs → properties data → then code

WORKFLOW: diagnose → read → PLAN → approve → execute → test

NOTE: AdminQuickList + AdminDeals call airbnb-pricing edge function directly.
NOTE: AdminDeals gets a simplified read-only PropertyCard (not the deals one).

TESTS: admin-deals + smoke
BLAST RADIUS: MEDIUM (writes to properties table)
