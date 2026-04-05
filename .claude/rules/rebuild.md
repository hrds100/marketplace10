# Rebuild Discipline — Auto-loaded every session

## Plan Before Code
No code changes without a PLAN block first:
```
PLAN:
  files_to_change: [list]
  contracts_touched: [list]
  forbidden_paths_checked: frozen/ → not touched ✅
  blast_radius: LOW | MEDIUM | HIGH | CORE_CHANGE
  tests_required: [list]
```

## Diagnostic Before Code
Before editing code, verify the problem is in code:
1. Check logs (edge function errors)
2. Check external services (GHL, Resend — are tokens valid?)
3. Check config (verify_jwt, env vars)
4. Check runtime (can you reproduce?)
5. Only if confirmed in code → proceed to PLAN

## Session Capsule Discipline
- Load the relevant skill from .claude/skills/ before starting
- Stay within the skill's SCOPE — no cross-feature edits
- If task requires touching files outside scope → STOP and report to Hugo

## Feature-to-Feature Import Ban
Features never import each other. Only from core/.
```
features/X/ → core/*     ✅
features/X/ → features/Y/ ❌ FORBIDDEN
```

## Shared Table Rules
- select('*') is FORBIDDEN on shared tables
- Use explicit column lists
- Check table ownership in CLAUDE.md before writing
- Schema changes require compatibility plan

## Edge Function Rules
- Source of truth: supabase/config.toml
- Deploy via: scripts/deploy-function.sh
- Always --no-verify-jwt
- After deploy: verify function responds (not 401)
