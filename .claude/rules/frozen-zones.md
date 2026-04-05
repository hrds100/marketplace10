# Frozen Zones — Auto-loaded when frozen paths are referenced

NEVER modify these paths without Hugo's explicit approval:

## Investment (frontend + edge functions)
- src/pages/invest/*
- src/pages/admin/invest/*
- supabase/functions/inv-*
- supabase/functions/revolut-*
- supabase/functions/submit-payout-claim/
- supabase/functions/save-bank-details/

## nfstay Booking (frontend + edge functions)
- src/pages/admin/nfstay/*
- src/pages/BookingSitePage.tsx
- supabase/functions/nfs-*

## Build System
- vite.config.ts (Particle + WASM + polyfills — fragile)
- src/main.tsx (import order critical)

## Auto-generated (use tooling only)
- src/core/database/types.ts (supabase gen types)
- src/components/ui/* (npx shadcn-ui@latest add)

## Enforcement
- CI check: any diff touching frozen paths → CI FAILS unless FROZEN_APPROVED label
- feature-map.json: frozen paths marked locked: true
- No exceptions. No bypasses. Fix the issue or don't merge.
