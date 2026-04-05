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

NOTE: AI description calls n8n (to be replaced with ai-description edge function in Phase 2).
NOTE: Airbnb pricing calls n8n (to be replaced with airbnb-pricing edge function in Phase 2).

TESTS: deal-submit + smoke
BLAST RADIUS: MEDIUM (writes to properties table)
REFS: docs/rebuild/contracts/properties.md
