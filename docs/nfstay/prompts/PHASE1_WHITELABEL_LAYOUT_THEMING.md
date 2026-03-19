# Phase 1 Execution Prompt — White-Label Layout + Theming

> For coding agents (Claude Code / Cursor). Do not execute without reading BOUNDARIES.md first.

---

## CONTEXT

You are working on the NFStay module within marketplace10. Read these files BEFORE writing any code:
- `docs/nfstay/BOUNDARIES.md` — what you can/cannot touch
- `docs/nfstay/VPS_SOURCE_REFERENCE.md` — the target UI reference

**Stack**: React 18 + Vite + React Router + Tailwind CSS + Lucide icons + shadcn/ui
**NOT Next.js** — no `usePathname`, `next/image`, `next/link`, or App Router patterns. Use `react-router-dom` equivalents.

**Safe zone**: Only modify files in `src/pages/nfstay/`, `src/components/nfstay/`, `src/hooks/nfstay/`, `src/lib/nfstay/`.

---

## OBJECTIVE

Rebuild the NFStay white-label layout (navbar + footer) and add a dynamic theming system to visually match the VPS `nfstay.app`. **Preserve all existing data fetching hooks and Supabase queries — only change the visual presentation layer.**

---

## TASK 1: Dynamic Theming Hook

Create `src/hooks/nfstay/use-nfs-white-label-theme.ts`

This hook injects dynamic CSS that overrides Tailwind color classes with the operator's `accent_color`. Port the logic from the VPS `useWhiteLabelTheme` hook (documented in `VPS_SOURCE_REFERENCE.md`):

```
Inputs: operator.accent_color (hex string, default #6366f1)
Behavior:
- Calculate lighter/darker variants of accent color (+30 lighter, +80 very light, -20 darker)
- Calculate auto-contrast text color (black/white based on luminance threshold 150)
- Inject a <style> tag with id "nfs-white-label-theme" into <head>
- Override these Tailwind class patterns within `.nfs-wl-themed`:
  - .bg-blue-600, .bg-purple-600 → accent color
  - .text-blue-600, .text-purple-600 → accent color
  - .border-blue-600, .border-purple-200 → accent/light variants
  - .bg-blue-100, .bg-purple-100 → very light variant
  - .text-blue-700, .text-purple-700 → accent color
  - .bg-green-600 → lighter variant
  - hover:bg-blue-700, hover:bg-purple-700 → darker variant
  - focus:ring-blue-500, focus:ring-purple-500 → accent color
  - focus:border-blue-500, focus:border-purple-500 → accent color
  - .bg-gray-900 → accent color
  - Gradient: .bg-primary-gradient → accent color
  - Gradient faint: .bg-primary-gradient-faint → very light to very light
  - Auto-contrast: .bg-primary-auto { background: accent; color: auto-contrast }
  - Button: .btn-primary-auto { background: accent; color: auto-contrast; border: darker }
  - Currency modal overrides
- Clean up the <style> tag on unmount
- Return { isThemeReady: boolean }
```

Color utility functions needed:
```typescript
function lightenColor(hex: string, percent: number): string
function darkenColor(hex: string, percent: number): string
function getContrastColor(hex: string): '#000000' | '#FFFFFF'
```

---

## TASK 2: Rebuild White-Label Navbar

Create `src/components/nfstay/white-label/NfsWlNavbar.tsx`

The new navbar must match the VPS WhiteLabelNavbar:

**Desktop layout** (left to right):
- Logo (from `operator.logo_url`) with fallback to accent-colored initial letter
  - Logo: h-[50px] w-auto, object-contain, with loading skeleton (h-10 w-10 rounded-lg animate-pulse bg-gray-200)
  - On logo load error: fall back to initial letter
  - Fallback: w-10 h-10 rounded-lg, accent bg, white text, bold, first char uppercase
- Search bar (visible ONLY on search route — check `useLocation().pathname.includes('/search')`)
  - Full-width max-w-[800px] search input
- Right side group:
  - "Contact" button — outline style, rounded-full, Phone icon + "Contact" text (hidden on mobile)
  - "Book Now" link — accent bg, rounded-full, text-sm font-medium (hidden when on property page)

**Mobile layout** (hamburger):
- Logo left, hamburger right
- Mobile menu dropdown:
  - "Home" link
  - "About" link (only if `operator.about_bio` exists — links to `/#about`)
  - Divider
  - Phone link (if `operator.contact_phone`)
  - Email link (if `operator.contact_email`)
  - "Book Now" full-width CTA

**Contact modal** (create `NfsWlContactModal.tsx`):
- Triggered by "Contact" button
- Shows: phone, email, whatsapp, telegram (each only if available)
- Simple overlay/dialog using existing shadcn Dialog component

**Specifications**:
- Sticky: `sticky top-0 z-50`
- Background: `bg-white shadow-sm`
- Container: `max-w-full xl:px-10 md:px-5 sm:px-4 px-3`
- Row height: `h-20`
- Uses `Link` from `react-router-dom` (NOT `next/link`)

---

## TASK 3: Rebuild White-Label Footer

Create `src/components/nfstay/white-label/NfsWlFooter.tsx`

Match the VPS WhiteLabelFooter:
- Operator brand name + about bio excerpt (line-clamp-3)
- Contact section: email, phone, whatsapp links with icons
- Social links section: Instagram, Facebook, Airbnb
- Divider
- "Powered by NFStay" centered at bottom
- All data from `useNfsWhiteLabel()` context

---

## TASK 4: Update Layout Component

Rewrite `src/components/nfstay/white-label/NfsWhiteLabelLayout.tsx`:

```tsx
import { Outlet } from 'react-router-dom';
import { useNfsWhiteLabel } from '@/hooks/nfstay/use-nfs-white-label';
import { useNfsWhiteLabelTheme } from '@/hooks/nfstay/use-nfs-white-label-theme';
import NfsWlNavbar from './NfsWlNavbar';
import NfsWlFooter from './NfsWlFooter';

export default function NfsWhiteLabelLayout() {
  const { operator, loading, error } = useNfsWhiteLabel();
  useNfsWhiteLabelTheme(operator?.accent_color);

  if (loading) {
    // Purple spinner on gray-50 bg, "Loading..." text
  }

  if (error || !operator) {
    // "Website Not Available" error page:
    // - Red warning circle icon
    // - "Website Not Available" heading
    // - "This subdomain is not associated with any vacation rental operator."
    // - Bullet list: still being set up, entered incorrectly, temporary issue
    // - "Try Again" button (reload page)
    // - "Go to Main Site" button (link to /)
    // - "Need help? support@nfstay.app"
  }

  return (
    <div className="min-h-screen nfs-wl-themed">
      <NfsWlNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <NfsWlFooter />
    </div>
  );
}
```

---

## TASK 5: Add Missing White-Label Routes

Update `src/components/nfstay/white-label/NfsWhiteLabelRouter.tsx`:
- Add `/booking/:id` route → placeholder `NfsWlBooking.tsx`
- Add `/payment` route → placeholder `NfsWlPayment.tsx`
- Keep ALL existing routes unchanged

Placeholder pages should show:
```tsx
<div className="min-h-[60vh] flex items-center justify-center">
  <p className="text-muted-foreground">Coming soon</p>
</div>
```

---

## CONSTRAINTS

1. **Do NOT modify** any file outside `src/*/nfstay/` directories
2. **Do NOT import** from marketplace10-specific directories (only `components/ui/*` and shared auth are OK)
3. **Do NOT touch** `src/App.tsx`, `middleware.ts`, or any invest/blockchain files
4. **Preserve** all existing data fetching (Supabase queries in hooks remain unchanged)
5. **Use** `react-router-dom` (`Link`, `useNavigate`, `useLocation`) — NOT Next.js imports
6. **Use** standard `<img>` tags — NOT `next/image`
7. **Use** Lucide React icons: `Phone`, `Mail`, `Menu`, `X`, `Search`, `MessageCircle`, `RefreshCw`, `House`, `TriangleAlert`
8. All new files must use TypeScript (`.ts` / `.tsx`)
9. Zero TypeScript errors — run `npx tsc --noEmit` after changes
10. Every component must have loading, error, and empty states

---

## FILES TO CREATE
- `src/hooks/nfstay/use-nfs-white-label-theme.ts`
- `src/components/nfstay/white-label/NfsWlNavbar.tsx`
- `src/components/nfstay/white-label/NfsWlFooter.tsx`
- `src/components/nfstay/white-label/NfsWlContactModal.tsx`
- `src/pages/nfstay/white-label/NfsWlBooking.tsx` (placeholder)
- `src/pages/nfstay/white-label/NfsWlPayment.tsx` (placeholder)

## FILES TO MODIFY
- `src/components/nfstay/white-label/NfsWhiteLabelLayout.tsx` (rewrite)
- `src/components/nfstay/white-label/NfsWhiteLabelRouter.tsx` (add 2 routes)

## FILES TO LEAVE UNCHANGED
- `src/components/nfstay/white-label/NfsWhiteLabelProvider.tsx`
- `src/hooks/nfstay/use-nfs-white-label.ts`
- `src/lib/nfstay/white-label.ts`
- `src/lib/nfstay/types.ts`
- All Supabase query logic in any hook

---

## VERIFICATION

After completing all changes:
1. `npx tsc --noEmit` — must pass with zero errors
2. `npm run check` — must pass
3. Diff verification:
```bash
git diff origin/main --name-only | grep -v nfstay | grep -v nfs-
```
Output must be empty (no marketplace10 files modified).
