# nfstay — Architecture

## Folder Structure
```
src/
  components/     # Shared UI components (PropertyCard, InquiryPanel, MyListingsPanel, PhotoUpload)
  data/           # Static data (universityData, mockData for faqItems/CRM_STAGES)
  hooks/          # React hooks (useAuth, useUserTier, useFavourites, useUniversityProgress, useAIChat, usePropertyImage)
  integrations/   # Supabase client + generated types
  layouts/        # DashboardLayout, AdminLayout
  lib/            # Utility modules (ghl.ts, n8n.ts, pexels.ts, propertyImage.ts)
  pages/          # Route-level components
    admin/        # Admin panel pages
  App.tsx         # Router + providers
```

## Auth Flow
1. User signs up via `SignUp.tsx` → Supabase Auth `signUp()` → creates auth.users row
2. Profile row created in `profiles` table (via ProtectedRoute upsert if trigger missed)
3. Phone OTP verification via n8n webhook → `profiles.whatsapp_verified = true`
4. Admin emails hardcoded in `useAuth.ts` (`ADMIN_EMAILS` array) → sets `isAdmin` flag from JWT
5. `AdminGuard` component wraps `/admin/*` routes, checks `isAdmin`
6. `ProtectedRoute` wraps `/dashboard/*` routes, checks `whatsapp_verified` (admin bypasses)

## Data Flow
```
Supabase DB → useQuery (react-query) → Page component → Child components
                                     ↑
                                     └── useMemo for filtering/sorting
```
- All DB reads use `@tanstack/react-query` with query keys for caching
- Writes use direct `supabase.from().insert/update/delete()`
- Realtime subscriptions used in MyListingsPanel for live status updates

## Tier System
| Tier | Value | Unlocks |
|------|-------|---------|
| Free | `'free'` or `null` | Browse deals (public), University, CRM |
| Monthly | `'monthly'` | + Inquire (WhatsApp to landlord), full deal access |
| Annual | `'yearly'` | Same as monthly, annual billing |
| Lifetime | `'lifetime'` | Same, one-time payment |

Tier is stored in `profiles.tier`. Checked via `useUserTier()` hook + `isPaidTier()` helper.
- Free users clicking "Inquire Now" → GHL checkout funnel (iframe in InquiryPanel)
- Paid users clicking "Inquire Now" → WhatsApp message to landlord

## Route Structure
### Public (no auth)
- `/` — Landing page
- `/signin`, `/signup`, `/verify-otp`, `/forgot-password`
- `/privacy`, `/terms`
- `/deals/:id` — Deal detail (public but requires auth for actions)

### Protected (auth required, OTP verified)
- `/dashboard/deals` — Browse live deals
- `/dashboard/crm` — CRM pipeline
- `/dashboard/university` — Academy modules
- `/dashboard/list-a-deal` — Submit + My Listings
- `/dashboard/favourites` — Saved deals
- `/dashboard/settings` — Profile, security, membership, notifications
- `/dashboard/affiliates` — Referral program

### Admin (isAdmin required)
- `/admin/*` — Dashboard, Listings, Users, Submissions, Notifications, University, Pricing, FAQ, Affiliates, Settings

## Key Patterns
- **Single InquiryPanel**: rendered once per page via `createPortal` to `document.body`, never inside cards
- **Accordion form**: ListADealPage uses `AccordionSection` components with `Set<string>` for multi-open state
- **CRM as Supabase kanban**: `crm_deals` table with `stage` column, drag-drop updates via `supabase.update()`
- **Image resolution**: `usePropertyImage` hook → sync placeholder → async Pexels fetch → DB cache
- **Non-blocking webhooks**: all n8n calls use `AbortController` with 10-15s timeout, never block UI
