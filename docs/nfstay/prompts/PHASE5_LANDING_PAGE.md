# Phase 5 Execution Prompt — Landing Page Enhancement

> For coding agents (Claude Code / Cursor). Do not execute without reading BOUNDARIES.md first.

---

## CONTEXT

You are working on the NFStay module within marketplace10. Read these files BEFORE writing any code:
- `docs/nfstay/BOUNDARIES.md` — what you can/cannot touch
- `docs/nfstay/VPS_SOURCE_REFERENCE.md` — the target UI reference

**Stack**: React 18 + Vite + React Router + Tailwind CSS + Lucide icons + shadcn/ui
**NOT Next.js** — no `usePathname`, `next/image`, `next/link`, or App Router patterns.

**Safe zone**: Only modify files in `src/pages/nfstay/`, `src/components/nfstay/`, `src/hooks/nfstay/`, `src/lib/nfstay/`, `docs/nfstay/`.

---

## OBJECTIVE

Enhance the white-label landing page to match VPS nfstay.app. Add:
1. Hero section with inline search bar (text input → navigates to `/search?q=...`)
2. Featured properties grid (6 most recent listed, using NfsWlPropertyCard)
3. Improved about section layout
4. Smoother FAQ accordion with CSS transitions
5. Stronger CTA section

Preserve the existing operator context and data sources.

---

## FILES TO CREATE

- `src/components/nfstay/white-label/NfsWlFeaturedProperties.tsx`

## FILES TO MODIFY

- `src/pages/nfstay/white-label/NfsWlLanding.tsx` (full rewrite)

## FILES TO LEAVE UNCHANGED

- `src/components/nfstay/white-label/NfsWlPropertyCard.tsx`
- `src/hooks/nfstay/use-nfs-white-label.ts`
- `src/hooks/nfstay/use-nfs-property.ts`

---

## VERIFICATION

1. `npx tsc --noEmit` — zero errors
2. `git diff origin/main --name-only | grep -v nfstay | grep -v nfs-` — empty
3. Protected files unchanged
