---
name: university
description: >
  Use when: university, academy, lessons, modules, AI chat, XP, achievements,
  "lesson not loading", "AI chat broken", UniversityPage, LessonPage,
  ModuleOverviewPage, useAIChat, "can't see modules", education
---
SCOPE: src/features/university/*
READ-ONLY: core/database/client.ts, core/integrations/openai.ts
FORBIDDEN: all other features, frozen paths

DIAGNOSE FIRST: ai-chat function logs → OpenAI key → module data → then code

WORKFLOW: diagnose → read → PLAN → approve → execute → test

NOTE: AI chat calls n8n (to be replaced with ai-chat edge function in Phase 2).
NOTE: Tables: modules, lessons, user_progress (university owns all three).

TESTS: university + smoke
BLAST RADIUS: LOW (feature-local — owns its own tables)
