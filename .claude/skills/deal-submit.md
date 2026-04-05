---
name: deal-submit
description: >
  Use when: list a deal, submit property, AI description generation,
  "listing form broken", ListADealPage, MyListingsPanel, PhotoUpload,
  "AI not generating", "photo upload failed", property submission
---
SCOPE: src/features/deal-submit/*
READ-ONLY: core/database/client.ts, core/integrations/openai.ts
FORBIDDEN: all other features, frozen paths

DIAGNOSE FIRST: OpenAI key → ai-description function logs → config.toml → then code

WORKFLOW: diagnose → read → PLAN → approve → execute → test

NOTE: AI description calls ai-description edge function directly.
NOTE: Airbnb pricing calls airbnb-pricing edge function directly.

TESTS: deal-submit + smoke
BLAST RADIUS: MEDIUM (writes to properties table)
REFS: docs/rebuild/contracts/properties.md
