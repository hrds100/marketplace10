# NFsTay Marketplace — Deployment Roadmap

> **Last updated**: 2026-03-13
> **Rule**: Update this file after every change. Commit with `roadmap: [feature] live`.

---

## ✅ LIVE & WORKING

### Auth & Onboarding
- [x] WhatsApp OTP signup (Name + Email(optional) + WhatsApp → OTP → dashboard)
- [x] Email field on signup (optional, stored in localStorage + sent to n8n)
- [x] Admin login (admin@nfstay.co.uk / adminpass123)
- [x] Protected routes (/dashboard requires login)
- [x] localStorage auth persistence ({phone, name, email, ts})
- [x] Sign-in page (/signin)
- [x] Sign-up page (/signup) — two-step OTP flow
- [x] InputOTP 6-digit component with auto-focus
- [x] OTP resend button
- [x] Back button on OTP step

### Homepage & Marketing
- [x] "Airbnb University powered by GPT-4.1 AI" badge + hat
- [x] "15yr operator, 100+ properties trained" copy
- [x] Professional footer (Company / Privacy / Terms)
- [x] All CTAs → signup
- [x] Hero section with gradient
- [x] Social proof avatars + "4,200+ UK operators trust NFsTay"
- [x] Side panel on signup (dark, testimonial-style)

### Deals Dashboard (/dashboard/deals)
- [x] "UK-wide X properties live" real-time count
- [x] "New in Manchester today" alert → city filter
- [x] Status badges (Live 🟢 / Under Offer 🟠 / Expired ⚫)
- [x] "£680 Airbnb verified ✓" + dynamic Airbnb search URL
- [x] Featured deals section (⭐)
- [x] Tab filters (All / Live / On Offer / Inactive)
- [x] City dropdown filter
- [x] Property type dropdown filter
- [x] Sort: Newest / Highest profit / Lowest rent
- [x] Pagination (12 per page)
- [x] "Add to CRM" button — green → gray + celebration animation (stays on page)
- [x] Heart/favourite toggle
- [x] PropertyCard component with photo, stats, action buttons
- [x] Inquiry popup on "Inquire Now"
- [x] Supabase properties fetch with mock fallback
- [x] forceSignUp mode for unauthenticated visitors

### CRM Pipeline (/dashboard/crm)
- [x] Archive 📦 button (toggle "Archived X")
- [x] "Archived (X)" badge scrolls to archived section on click
- [x] "Outsider Lead" badge for manual adds
- [x] Photo upload + WhatsApp + email fields
- [x] WhatsApp buttons on deals
- [x] Pipeline stages (New / Contacted / Negotiating / Won / Lost)
- [x] Drag-and-drop card management
- [x] Add manual lead form

### Admin Panel (Full CRUD)
- [x] /admin/properties (edit / delete / CSV import 30+)
- [x] /admin/users (suspend + WhatsApp buttons)
- [x] /admin/university (lesson edit + AI regenerate)
- [x] /admin/faq (CRUD)
- [x] Filters everywhere
- [x] Admin sidebar navigation
- [x] Admin route protection

### List A Deal (/dashboard/list-a-deal)
- [x] Full form (beds / HMO / furnished / garage / available_from)
- [x] AI generate name + description
- [x] Photos multi-upload
- [x] City + postcode fields
- [x] Rent + profit estimate fields
- [x] Property type selector

### Payments
- [x] SamCart integration: £47/mo → £997 lifetime → £597/yr
- [x] Tier update webhook ready
- [x] Pricing page / tier display

### University (/dashboard/university)
- [x] Lessons + progress tracking
- [x] GPT-4.1 regenerate button
- [x] Lesson content display
- [x] Module/lesson navigation

### UI Components
- [x] Sonner toast notifications
- [x] Loader2 spinner on async actions
- [x] input-otp component (InputOTP / InputOTPGroup / InputOTPSlot)
- [x] InquiryPopup modal
- [x] Responsive layout (mobile + desktop)
- [x] Dark side panel on auth pages
- [x] Badge components (badge-green / badge-amber / badge-gray / badge-green-fill)
- [x] card-hover animation
- [x] input-nfstay styled inputs
- [x] nfstay-black button style

### n8n Workflows (Backend)
- [x] Send OTP (#kRuEBEDHEHokExtp) — WhatsApp via Twilio (+15559459048 NFsTay Properties)
- [x] Verify OTP (#Coowne7rD2uOij8w) — checks otps table, deletes used OTP, saves signup to inquiries table, triggers welcome email
- [x] Estimate Profit (#3EDIQKRea9nGzxve)
- [x] New Inquiry Notifications (#dC24ZjEE7F3OhxLg)
- [x] AI Generate Listing (#VfJ1uwFTH1UkZHVg)
- [x] AI Lesson Content (#l2WiP9r4AIUaR9jK)
- [x] Affiliate Conversion Alerts (#RYMaeAszRzx6l3Nb)

### Supabase
- [x] properties table (CRUD via REST)
- [x] otps table (phone, code, expires_at)
- [x] inquiries table (also stores signups with property_name='SIGNUP')
- [x] Supabase client integration (@supabase/supabase-js)
- [x] TypeScript types generated (Tables<'properties'>)

### Infrastructure
- [x] Vercel deployment [hugos-projects-f8cc36a8/marketplace10](https://vercel.com/hugos-projects-f8cc36a8/marketplace10) — hub.nfstay.com + marketplace10.vercel.app
- [x] GitHub [hrds100/marketplace10](https://github.com/hrds100/marketplace10), main
- [x] Supabase [project asazddtvjvmckouxcmmo](https://supabase.com/dashboard/project/asazddtvjvmckouxcmmo/)
- [x] VITE_N8N_WEBHOOK_URL env var on Vercel
- [x] React + Vite + TypeScript + Tailwind
- [x] React Query for data fetching
- [x] React Router DOM for routing

---

## 🔄 PENDING (Phase 2)

### n8n Workflows
- [ ] Resend welcome emails (workflow #bI0vzTqncMjCs5jO — structure ready, needs Resend API key in Code node)
- [x] Production Twilio WhatsApp (+15559459048 NFsTay Properties — LIVE)
- [ ] Daily deals WhatsApp summary
- [ ] Deal expiry cron job

### Supabase
- [x] Signup data stored in inquiries table (property_name='SIGNUP') — works now
- [ ] Dedicated signups table (needs Supabase DB password for DDL)
- [ ] Row-Level Security (RLS) policies
- [ ] profiles table migration (FK to auth.users — future Supabase Auth integration)

### Auth
- [ ] Auth context provider (React Context)
- [ ] Route protection middleware (redirect unauthenticated)
- [ ] Session expiry / auto-logout
- [ ] Supabase Auth integration (replace localStorage)

### Payments
- [ ] SamCart webhook handler (tier upgrade callback)
- [ ] Gated content per tier (free vs paid)
- [ ] Billing portal / manage subscription

### Features
- [ ] Email notifications for new deals matching saved filters
- [ ] Push notifications (web)
- [ ] Deal comparison tool
- [ ] Landlord portal (direct deal submission)
- [ ] Referral / affiliate tracking dashboard
- [ ] Analytics dashboard (views, inquiries, conversions)
- [ ] Multi-language support
- [ ] Mobile app (React Native)

---

## 📋 Commit Convention

After every change, update this file and commit:
```
roadmap: [feature-name] live
```
