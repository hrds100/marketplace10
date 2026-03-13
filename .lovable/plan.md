

# NFsTay Proptech Marketplace MVP — Implementation Plan

This is a large-scale rebuild touching nearly every page. Here's the phased plan organized by priority and dependency.

---

## Phase 1: Supabase Database Setup

Create all tables via migrations:

```text
┌─────────────────┐  ┌──────────────────┐  ┌───────────────┐
│ profiles        │  │ properties       │  │ crm_deals     │
│ (linked to      │  │ (all listings)   │  │ (per-user     │
│  auth.users)    │  │                  │  │  pipeline)    │
├─────────────────┤  ├──────────────────┤  ├───────────────┤
│ id (FK auth)    │  │ id uuid PK       │  │ id uuid PK   │
│ name            │  │ name             │  │ user_id FK    │
│ email           │  │ city, postcode   │  │ property_id   │
│ whatsapp        │  │ rent_monthly     │  │ stage         │
│ photo_url       │  │ profit_est       │  │ archived bool │
│ samcart_cust_id │  │ beds, type       │  │ outsider_lead │
└─────────────────┘  │ status           │  │ whatsapp      │
                     │ landlord_wa      │  │ email, notes  │
┌─────────────────┐  │ description      │  │ photo_url     │
│ user_roles      │  │ photos text[]    │  └───────────────┘
│ (security)      │  │ featured bool    │
├─────────────────┤  │ days_ago int     │  ┌───────────────┐
│ user_id FK      │  └──────────────────┘  │ subscriptions │
│ role (enum)     │                        │ user_id FK    │
└─────────────────┘  ┌──────────────────┐  │ samcart_id    │
                     │ lessons          │  │ tier (enum)   │
                     │ id, title        │  │ status        │
                     │ content, order   │  └───────────────┘
                     └──────────────────┘
```

- Enable RLS on all tables with appropriate policies
- Seed `properties` table with existing mock data (~30 listings)
- Create `has_role()` security definer function for admin checks

## Phase 2: Auth & Signup Flow

**Files**: `SignUp.tsx`, `SignIn.tsx`, new `src/hooks/useAuth.ts`

- Add WhatsApp phone field to signup form
- Add "WhatsApp required for OTP verification" notice
- Add terms checkbox (required)
- Wire to `supabase.auth.signUp()` → auto-create profile via DB trigger
- Protected route wrapper redirecting unauthenticated users to `/signin`
- Session persistence via `onAuthStateChange`

## Phase 3: Homepage Updates

**File**: `LandingPage.tsx`

- University section: add "🎓 Powered by GPT-4.1 AI" green badge with graduation cap icon
- Add text: "15yr operator knowledge, 100+ properties trained in AI"
- Footer: add Company / Privacy Policy / Terms of Service links (placeholder pages)
- All CTA buttons already route to `/signup` ✓

## Phase 4: Deals Page — Live Data

**File**: `DealsPage.tsx`, `PropertyCard.tsx`

- Replace mock `listings` import with Supabase query (`useQuery` + `supabase.from('properties').select()`)
- Header: "UK-wide · {realCount} properties live" from DB count
- "3 new deals in Manchester today" alert → click filters to Manchester + last 7 days
- Property age badges: Green (0-7d), Orange (7-14d), Gray (14d+) based on `created_at`
- Card profit line: "£680 profit · Airbnb verified ✓" — verified links to `airbnb.co.uk/s/{city}` search

## Phase 5: CRM Page Enhancements

**File**: `CRMPage.tsx`

- Archive button (📦) on every deal card — already partially built, ensure visible
- "Add your own deal" form: add "🔖 Outsider Lead" badge toggle, photo upload field, WhatsApp + email fields
- Deals sourced from Deals page: show WhatsApp contact button linking to `wa.me/{landlord_whatsapp}`
- Connect CRM to Supabase `crm_deals` table (per-user, RLS protected)

## Phase 6: Admin Panel

**Files**: `AdminListings.tsx`, `AdminUsers.tsx`, `AdminDashboard.tsx`, new `AdminLessons.tsx`

- Admin access gated by `has_role(auth.uid(), 'admin')` check
- Edit any property: inline edit or modal form
- Edit users: view/suspend/delete with Supabase admin calls
- CSV import: file upload → parse CSV → bulk insert into `properties` (30+ at once)
- WhatsApp buttons: `wa.me/{whatsapp}` link on every user/property row
- New admin lessons page: CRUD for university lesson content

## Phase 7: Payments (SamCart Integration)

- "Inquire Now" payment gate → redirect to SamCart checkout URL
- Three tiers: £47/mo, £997 lifetime, £597/yr downsell
- Store `samcart_customer_id` on profile after redirect back
- Subscription status check before allowing deal contact

## Summary of Files Changed

| Area | Files |
|------|-------|
| Database | New Supabase migrations (6+ tables) |
| Auth | `SignUp.tsx`, `SignIn.tsx`, new `useAuth.ts`, new `ProtectedRoute.tsx` |
| Homepage | `LandingPage.tsx` |
| Deals | `DealsPage.tsx`, `PropertyCard.tsx` |
| CRM | `CRMPage.tsx` |
| Admin | `AdminListings.tsx`, `AdminUsers.tsx`, `AdminDashboard.tsx`, new `AdminLessons.tsx` |
| Payments | `InquiryPopup.tsx`, new payment config |
| Data | `mockData.ts` (kept as fallback), new Supabase client queries |

## Approach

This is too large for a single implementation pass. I'll build it in the phases above, starting with **Phase 1 (database) + Phase 2 (auth) + Phase 3 (homepage)** first, then proceeding through subsequent phases. Each phase will be testable before moving to the next.

**Prerequisite**: You need Lovable Cloud (Supabase) enabled for the database and auth features. If not already connected, I'll set that up first.

