# Phase 4 Execution Prompt — Property Detail Page (VPS Parity)

> For coding agents (Claude Code / Cursor). Do not execute without reading BOUNDARIES.md first.

---

## CONTEXT

You are working on the NFStay module within marketplace10. Read these files BEFORE writing any code:
- `docs/nfstay/BOUNDARIES.md` — what you can/cannot touch
- `docs/nfstay/VPS_SOURCE_REFERENCE.md` — the target UI reference (TravelerProduct section)

**Stack**: React 18 + Vite + React Router + Tailwind CSS + Lucide icons + shadcn/ui
**NOT Next.js** — no `usePathname`, `next/image`, `next/link`, or App Router patterns.

**Safe zone**: Only modify files in `src/pages/nfstay/`, `src/components/nfstay/`, `src/hooks/nfstay/`, `src/lib/nfstay/`, `docs/nfstay/`.

---

## OBJECTIVE

Enhance the white-label property detail page to match VPS nfstay.app. Add:
1. Hero image gallery with fullscreen lightbox
2. Section-based layout with anchor navigation
3. Location map (Google Maps single marker)
4. Check-in/check-out info section
5. Space/rooms breakdown
6. Related properties from same operator

Preserve the existing NfsBookingWidget and operator boundary check.

---

## FILES TO CREATE

- `src/components/nfstay/white-label/NfsWlImageGallery.tsx`
- `src/components/nfstay/white-label/NfsWlLocationMap.tsx`

## FILES TO MODIFY

- `src/pages/nfstay/white-label/NfsWlProperty.tsx` (full rewrite)

## FILES TO LEAVE UNCHANGED

- `src/components/nfstay/properties/NfsPhotoGallery.tsx`
- `src/components/nfstay/reservations/NfsBookingWidget.tsx`
- `src/hooks/nfstay/use-nfs-property.ts`
- `src/hooks/nfstay/use-nfs-google-maps.ts`
- `src/hooks/nfstay/use-nfs-white-label.ts`

---

## VERIFICATION

1. `npx tsc --noEmit` — zero errors
2. `git diff origin/main --name-only | grep -v nfstay | grep -v nfs-` — empty
3. Protected files unchanged
