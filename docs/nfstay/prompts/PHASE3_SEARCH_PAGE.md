# Phase 3 Execution Prompt — Search Page (Map + Cards + Filters)

> For coding agents (Claude Code / Cursor). Do not execute without reading BOUNDARIES.md first.

---

## CONTEXT

You are working on the NFStay module within marketplace10. Read these files BEFORE writing any code:
- `docs/nfstay/BOUNDARIES.md` — what you can/cannot touch
- `docs/nfstay/VPS_SOURCE_REFERENCE.md` — the target UI reference (TravelerSearch section)

**Stack**: React 18 + Vite + React Router + Tailwind CSS + Lucide icons + shadcn/ui
**NOT Next.js** — no `usePathname`, `next/image`, `next/link`, or App Router patterns. Use `react-router-dom` equivalents.

**Safe zone**: Only modify files in `src/pages/nfstay/`, `src/components/nfstay/`, `src/hooks/nfstay/`, `src/lib/nfstay/`, `docs/nfstay/`.

---

## OBJECTIVE

Enhance the white-label search page to achieve visual parity with the VPS nfstay.app search page. Add:
1. Interactive Google Maps with property markers
2. Filter panel (property type, price range, guest count)
3. Enhanced property cards (image overlay, stats, better layout)

**Preserve all existing data fetching patterns.** The search queries Supabase directly — keep that approach.

---

## TASK 1: White-Label Property Card

Create `src/components/nfstay/white-label/NfsWlPropertyCard.tsx`

An enhanced property card for the white-label search grid. Reference: VPS `TravelerSearch/PropertyCard.tsx`.

```
Props:
  property: NfsProperty
  onClick: () => void
  isHighlighted?: boolean  (for map hover interaction)

Layout:
  - Image container: aspect-[4/3], rounded-xl overflow-hidden, relative
    - Cover image: object-cover w-full h-full, lazy loading
    - No-photo fallback: gray bg with Home icon
    - Image count badge (bottom-right): bg-black/60 text-white text-xs px-2 py-0.5 rounded-full
      - Shows "{images.length} photos" if > 1 image
    - "New" badge (top-left): bg-white text-xs font-medium px-2 py-1 rounded-full shadow-sm
      - Only show if property created < 30 days ago
  - Content: pt-3 space-y-1
    - Title: text-sm font-semibold truncate
    - Location: text-xs text-muted-foreground truncate (city, country)
    - Stats row: flex gap-3 text-xs text-muted-foreground
      - Guests icon + count
      - Bed icon + count (from room_counts)
      - Bath icon + count (from room_counts)
    - Price: text-sm font-semibold mt-1
      - "£120 / night" format (currency symbol + amount + " / night")
      - If no price: "Price on request" in muted text

Hover: shadow-md transition-shadow duration-200
Highlighted state: ring-2 ring-primary (for map interaction)
```

Currency symbol helper (inline, no external lib):
```typescript
function getCurrencySymbol(code: string): string {
  const symbols: Record<string, string> = { GBP: '£', USD: '$', EUR: '€', AUD: 'A$', CAD: 'C$' };
  return symbols[code] || code + ' ';
}
```

---

## TASK 2: Filter Panel

Create `src/components/nfstay/white-label/NfsWlFilterPanel.tsx`

A horizontal filter bar above the results grid. On mobile, filters collapse into a Sheet (slide-up panel).

```
Props:
  filters: {
    propertyType: string;
    minPrice: string;
    maxPrice: string;
    minGuests: string;
    query: string;
  }
  onFiltersChange: (filters) => void
  onSearch: () => void
  onClear: () => void
  loading: boolean
  resultCount: number

Desktop layout (md+): horizontal flex row with gap-3, items-end
  - Search input: flex-1 min-w-[180px], Search icon left, placeholder "Search location, name..."
  - Property type: Select component, w-[160px]
    Options: All Types, Apartment, House, Villa, Studio, Cabin, Cottage, Loft, Other
  - Min price: Input type=number, w-[100px], placeholder "Min £"
  - Max price: Input type=number, w-[100px], placeholder "Max £"
  - Guests: Input type=number, w-[80px], placeholder "Guests", min=1
  - Search button: Button variant default, disabled when loading
  - Clear link: text-xs text-muted-foreground underline, only visible when any filter is active

Mobile layout (< md):
  - Search input (always visible) + "Filters" button with SlidersHorizontal icon
  - "Filters" button opens a Sheet (bottom) with all filter fields stacked vertically
  - Sheet has "Apply" and "Clear" buttons at bottom

Result count: below filter bar, "X properties available" text-sm text-muted-foreground
```

Use shadcn/ui: `Input`, `Button`, `Select` + `SelectTrigger` + `SelectValue` + `SelectContent` + `SelectItem`, `Sheet` + `SheetTrigger` + `SheetContent` + `SheetHeader` + `SheetTitle`.

---

## TASK 3: Search Map

Create `src/components/nfstay/white-label/NfsWlSearchMap.tsx`

An interactive Google Map showing property markers. Reference: VPS `TravelerSearch/SearchMap.tsx`.

```
Props:
  properties: NfsProperty[]
  onMarkerClick: (propertyId: string) => void
  onMarkerHover: (propertyId: string | null) => void
  highlightedPropertyId: string | null
  className?: string

Behavior:
  1. Use useNfsGoogleMaps() hook to load Google Maps API
  2. If API not loaded or error → render fallback:
     - Light gray box with MapPin icon and "Map unavailable" text
     - If loadError contains "API key" → show "Configure VITE_GOOGLE_MAPS_API_KEY"
  3. Create a google.maps.Map instance in a ref'd div
     - Default center: first property with lat/lng, or London (51.5074, -0.1278)
     - Default zoom: 12
     - Map options: disableDefaultUI: true, zoomControl: true, mapTypeControl: false, streetViewControl: false, fullscreenControl: true
  4. Add markers for each property that has lat && lng
     - Marker content: price badge (small white card with price text)
     - On click: call onMarkerClick(property.id)
     - On mouseenter: call onMarkerHover(property.id)
     - On mouseleave: call onMarkerHover(null)
  5. Auto-fit bounds to show all markers (with padding 50px)
     - Only refit when properties array changes (not on every render)
  6. Highlighted marker: scale up or change color when highlightedPropertyId matches

Cleanup: remove markers and map instance on unmount

Use google.maps.marker.AdvancedMarkerElement if available, fall back to google.maps.Marker.
```

**IMPORTANT**: The map MUST handle the case where `google.maps` is loaded but `marker` library isn't ready. Use try/catch around AdvancedMarkerElement and fall back gracefully.

---

## TASK 4: Rewrite Search Page

Rewrite `src/pages/nfstay/white-label/NfsWlSearch.tsx`

```
Imports:
  - useNfsWhiteLabel (operator context)
  - supabase client (direct queries — keep existing pattern)
  - NfsWlPropertyCard (new)
  - NfsWlFilterPanel (new)
  - NfsWlSearchMap (new)
  - Lucide: Search, Map, LayoutGrid, MapPin

State:
  - results: NfsProperty[]
  - loading: boolean
  - error: string | null
  - filters: { query, propertyType, minPrice, maxPrice, minGuests }
  - showMap: boolean (default true on desktop, false on mobile — use window.innerWidth >= 768)
  - highlightedPropertyId: string | null

Data fetching:
  - Keep the existing Supabase query pattern (supabase.from('nfs_properties').select('*'))
  - Scope to operator_id from useNfsWhiteLabel()
  - Apply all filters: query (ilike on title/description/address), propertyType (eq), minPrice (gte base_rate_amount), maxPrice (lte base_rate_amount), minGuests (gte max_guests)
  - Search on mount (load all) and on filter submit
  - eq('listing_status', 'listed')

Desktop layout (md+):
  ┌──────────────────────────────────────────┐
  │ Filter Bar (full width)                   │
  ├───────────────────┬──────────────────────┤
  │ Map (40%)         │ Results Grid (60%)    │
  │                   │ ┌──────┐ ┌──────┐   │
  │                   │ │ Card │ │ Card │   │
  │   Google Map      │ ├──────┤ ├──────┤   │
  │                   │ │ Card │ │ Card │   │
  │                   │ └──────┘ └──────┘   │
  └───────────────────┴──────────────────────┘

  - Map panel: sticky top-[80px] (below navbar), h-[calc(100vh-80px)]
  - Results panel: overflow-y-auto, grid grid-cols-2 gap-4, p-4
  - Toggle button (top of results): Map/Grid icon toggle

Mobile layout (< md):
  ┌──────────────────────────┐
  │ Filter Bar               │
  ├──────────────────────────┤
  │ Toggle: Map | Grid       │
  ├──────────────────────────┤
  │ Map (full width, 50vh)   │
  │   — OR —                 │
  │ Results Grid (1 col)     │
  └──────────────────────────┘

  - Map/Grid toggle: sticky below filter bar
  - Map: h-[50vh] when visible
  - Grid: single column

Interaction:
  - Hover on card → highlight marker on map (onMarkerHover)
  - Click marker on map → scroll to card in results list
  - Card click → navigate('/property/' + id)

Loading state: grid of 6 skeleton cards (aspect-[4/3] rounded-xl animate-pulse bg-muted/30)
Empty state: centered MapPin icon + "No properties match your search" + "Try adjusting filters" text
Error state: destructive banner with error message
```

---

## CONSTRAINTS

1. **Do NOT modify** any file outside `src/*/nfstay/` or `docs/nfstay/` directories
2. **Do NOT import** from marketplace10-specific directories (only `components/ui/*` and shared auth are OK)
3. **Do NOT touch** `src/App.tsx`, `middleware.ts`, or any invest/blockchain files
4. **Preserve** all existing components — do NOT modify `NfsPropertyCard.tsx` in `src/components/nfstay/properties/`
5. **Use** `react-router-dom` (`Link`, `useNavigate`, `useLocation`) — NOT Next.js imports
6. **Use** standard `<img>` tags — NOT `next/image`
7. **Use** Lucide React icons
8. All new files must use TypeScript (`.ts` / `.tsx`)
9. Zero TypeScript errors — run `npx tsc --noEmit` after changes
10. Every component must have loading, error, and empty states
11. **Do NOT modify** `use-nfs-white-label.ts`, `NfsWhiteLabelProvider.tsx`, `white-label.ts`
12. **Do NOT modify** `NfsWhiteLabelRouter.tsx` — no route changes needed

---

## FILES TO CREATE

- `src/components/nfstay/white-label/NfsWlPropertyCard.tsx`
- `src/components/nfstay/white-label/NfsWlFilterPanel.tsx`
- `src/components/nfstay/white-label/NfsWlSearchMap.tsx`

## FILES TO MODIFY

- `src/pages/nfstay/white-label/NfsWlSearch.tsx` (full rewrite)

## FILES TO LEAVE UNCHANGED

- `src/components/nfstay/properties/NfsPropertyCard.tsx`
- `src/components/nfstay/white-label/NfsWhiteLabelProvider.tsx`
- `src/components/nfstay/white-label/NfsWhiteLabelRouter.tsx`
- `src/components/nfstay/white-label/NfsWhiteLabelLayout.tsx`
- `src/hooks/nfstay/use-nfs-white-label.ts`
- `src/hooks/nfstay/use-nfs-google-maps.ts`
- `src/lib/nfstay/white-label.ts`
- `src/lib/nfstay/types.ts`

---

## VERIFICATION

After completing all changes:
1. `npx tsc --noEmit` — must pass with zero errors
2. Diff verification:
```bash
git diff origin/main --name-only | grep -v nfstay | grep -v nfs- | grep -v n8n-workflows/nfs
```
Output must be empty (no marketplace10 files modified).

3. Verify protected files unchanged:
```bash
git diff origin/main -- src/pages/invest/ src/hooks/useBlockchain.ts src/hooks/useInvestData.ts src/components/PropertyCard.tsx src/layouts/DashboardLayout.tsx src/pages/SignUp.tsx src/pages/AffiliatesPage.tsx middleware.ts
```
Output must be empty.
