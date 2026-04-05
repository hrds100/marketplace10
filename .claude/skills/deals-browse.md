---
name: deals-browse
description: >
  Use when: deals page, property cards, filters, search, favourites,
  "deals not loading", "properties not showing", DealsPage, PropertyCard,
  property images, Pexels photos, Google Maps, DealsMap,
  "can't see properties", "filter not working"
---
SCOPE: src/features/deals/*
READ-ONLY: core/database/client.ts, core/integrations/pexels.ts, core/integrations/maps.ts
FORBIDDEN: all other features, frozen paths

DIAGNOSE FIRST: Supabase query → RLS policies → image loading → then code

WORKFLOW: diagnose → read → PLAN → approve → execute → test

NOTE: PropertyCard lives in features/deals/ (has domain logic — NOT in core).
NOTE: JV properties inject via useInvestProperties() — DO NOT break this.
NOTE: DealsPageV2 is the current file name (rename to DealsPage in Phase 1).

TESTS: deals + smoke
BLAST RADIUS: LOW (feature-local unless touching properties table)
REFS: docs/rebuild/contracts/properties.md
