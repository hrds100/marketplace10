# Deploy Safety

## Pre-Deploy Checklist
Before every push to main:

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run test` passes
- [ ] `npm run build` succeeds locally
- [ ] No `.env` file committed (check `git status`)

## Env Var Checklist
All must be set in Vercel → hugos-projects-f8cc36a8 → marketplace10 → Settings → Environment Variables:

| Variable | Required | Set? |
|----------|----------|------|
| VITE_SUPABASE_URL | Yes | ✅ |
| VITE_SUPABASE_PUBLISHABLE_KEY | Yes | ✅ |
| VITE_SUPABASE_PROJECT_ID | No | ✅ |
| VITE_N8N_WEBHOOK_URL | Yes | ✅ |
| VITE_GHL_FUNNEL_URL | Yes | ✅ |
| VITE_PEXELS_API_KEY | Yes | ✅ |
| VITE_SENTRY_DSN | No | ⬜ (optional) |

**If any required var is missing, the app will blank-screen in production.**
Vite injects `VITE_*` at build time — they cannot be added after deploy.

## Preview Deploy Validation
Vercel creates a preview URL for every commit. Before merging:

1. Open the preview URL (shown in Vercel dashboard or GitHub PR comment)
2. Check: landing page loads
3. Check: sign in works
4. Check: /dashboard/deals shows content
5. Check: browser console has no red errors

## Rollback Procedure
If production is broken after a deploy:

1. Go to: https://vercel.com/hugos-projects-f8cc36a8/marketplace10/deployments
2. Find the last working deployment (green "Ready" badge, before the broken one)
3. Click the three-dot menu (⋯) on that deployment
4. Click **"Promote to Production"**
5. Takes effect in ~10 seconds — no rebuild needed

## Post-Deploy Smoke Test
After every production deploy, verify:

- [ ] https://hub.nfstay.com loads (not blank screen)
- [ ] https://hub.nfstay.com/api/health returns `{"status":"ok"}`
- [ ] Sign in with admin account works
- [ ] /dashboard/deals shows deals or empty state (not error)
- [ ] /admin/submissions loads for admin user
- [ ] Browser console: no uncaught exceptions
