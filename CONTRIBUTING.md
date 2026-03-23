# Contributing to nfstay

## Local Setup
1. Clone: `git clone https://github.com/hrds100/marketplace10`
2. Install: `npm install`
3. Copy env: `cp .env.example .env` (fill in values from Vercel dashboard)
4. Run: `npm run dev` → http://localhost:8080

## Branch Strategy
- `main` → production (auto-deploys to hub.nfstay.com via Vercel)
- All changes go directly to main (solo project)

## Commit Conventions
- `feat:` new feature
- `fix:` bug fix
- `chore:` cleanup, refactor, deps
- `docs:` documentation only

## Testing
- Before pushing: `npx tsc --noEmit` (zero TypeScript errors)
- Manual testing on https://hub.nfstay.com after deploy

## Key Files
- `src/App.tsx` - Router + providers
- `src/hooks/useAuth.ts` - Auth state + admin detection
- `src/lib/ghl.ts` - GHL products, tier helpers
- `src/lib/n8n.ts` - All n8n webhook functions
- `src/lib/pexels.ts` - Pexels photo API
- `src/integrations/supabase/client.ts` - Supabase client init
- `src/integrations/supabase/types.ts` - Generated DB types

## AI Handover
If an AI is taking over this codebase, read in this order:
1. `docs/STACK.md` - services, URLs, IDs
2. `docs/ARCHITECTURE.md` - how the app is structured
3. `docs/DATABASE.md` - Supabase schema
4. `docs/INTEGRATIONS.md` - n8n, GHL, Pexels
5. `docs/CHANGELOG.md` - what was recently changed
6. `docs/ENV.md` - environment variables
