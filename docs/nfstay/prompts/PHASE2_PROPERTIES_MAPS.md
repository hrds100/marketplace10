# NFStay Phase 2 — Properties + Maps — Execution Prompt

> **For:** Claude Code / Cursor coding agent
> **Designed by:** AI Architect (Orchestrator)
> **Date:** 2026-03-17
> **Status:** APPROVED by Tajul

---

## MANDATORY — READ BEFORE ANYTHING ELSE

1. Read `docs/nfstay/AGENT_INSTRUCTIONS.md` — the operating law
2. Read `docs/nfstay/BOUNDARIES.md` — the protection law
3. Read `docs/nfstay/DATABASE.md` — schema reference (especially `nfs_properties`)
4. Read `docs/nfstay/ROUTES.md` — route structure
5. Read `docs/nfstay/INTEGRATIONS.md` — Google Maps, Supabase Storage
6. Read `docs/nfstay/ARCHITECTURE.md` — frontend structure, data flow

**Do NOT skip any of these.** They define what you can and cannot do.

---

## OBJECTIVE

Build the complete Phase 2 (Properties + Maps) for NFStay:

1. **Operator-side:** Property creation wizard (10 steps), property list with filters/sort, property detail/edit, bulk status updates, photo upload
2. **Traveler-side:** Property search with filters, Google Maps view with markers/clustering, Places autocomplete, property detail page with gallery

**All 11 features from `FEATURES.md` Phase 2 must be delivered.**

---

## CRITICAL RULES

- **All files go in NFStay safe zone only:** `src/pages/nfstay/`, `src/components/nfstay/`, `src/hooks/nfstay/`, `src/lib/nfstay/`
- **The only non-NFStay file you may edit is `src/App.tsx`** — additive route additions only, same pattern as existing NFStay routes
- **Never import from marketplace10 directories** (only `@/components/ui/*`, `@/integrations/supabase/client`, `@/hooks/useAuth`)
- **Never modify any marketplace10 file, table, or component**
- **TypeScript must compile with zero errors** — run `npx tsc --noEmit` before finishing
- **Every async call: try/catch + user-visible error state**
- **Every new page: loading state + error state + empty state**
- **`nfs_properties` table uses `as any` cast on Supabase client** (same pattern as `use-nfs-operator.ts` — table not in auto-generated types)

---

## ARCHITECTURE CONTEXT

**This is a Vite + React + React Router app (NOT Next.js).** The docs reference `app/(nfstay)/` structure — ignore that. Follow the actual codebase structure:

- Pages: `src/pages/nfstay/`
- Components: `src/components/nfstay/`
- Hooks: `src/hooks/nfstay/`
- Lib: `src/lib/nfstay/`
- Routes: `src/App.tsx` using `react-router-dom`

**Existing patterns to follow:**
- Hook pattern: `src/hooks/nfstay/use-nfs-operator.ts` (fetch), `use-nfs-operator-update.ts` (mutation)
- Step component pattern: `src/components/nfstay/onboarding/StepAccountSetup.tsx`
- Wizard orchestrator pattern: `src/pages/nfstay/NfsOnboarding.tsx`
- Layout: all operator pages render inside `NfsOperatorLayout` (sidebar + topbar)
- UI components: import from `@/components/ui/*` (Button, Input, Label, Select, Tabs, Table, Card, Dialog, Badge, etc.)

---

## PHASE 2 TASK BREAKDOWN

### Task 1: Types + Constants

**File: `src/lib/nfstay/types.ts`** — Add `NfsProperty` interface

```typescript
export interface NfsProperty {
  id: string;
  operator_id: string;

  // Status
  status: 'draft' | 'completed';
  listing_status: 'listed' | 'unlisted' | 'archived' | 'draft';
  source: 'airbnb' | 'nfstay';
  current_step: string;
  completed_steps: string[];

  // Basics
  property_type: string | null;
  rental_type: string | null;
  accommodation_type: string | null;
  size_value: number | null;
  size_unit: string | null;

  // Location
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  street: string | null;
  lat: number | null;
  lng: number | null;
  timezone: string | null;

  // Guest / Rooms
  max_guests: number | null;
  allow_children: boolean;
  room_counts: unknown[];
  room_sections: unknown[];

  // Photos
  images: NfsPropertyImage[];

  // Amenities
  amenities: Record<string, boolean>;

  // Description
  public_title: string | null;
  internal_title: string | null;
  description: string | null;

  // House Rules
  check_in_time: string | null;
  check_out_time: string | null;
  max_pets: number | null;
  rules: string | null;
  cancellation_policy: string | null;

  // Availability
  availability_window: string;
  advance_notice: number;
  minimum_stay: number;
  date_ranges: unknown[];
  blocked_date_ranges: unknown[];

  // iCal
  inbound_calendars: unknown[];
  outbound_calendar_url: string | null;

  // Fees & Taxes
  cleaning_fee: { enabled: boolean; amount?: number };
  extra_guest_fee: { enabled: boolean; amount?: number; after_guests?: number };
  custom_fees: unknown[];
  custom_taxes: unknown[];

  // Discounts
  weekly_discount: { enabled: boolean; percentage?: number };
  monthly_discount: { enabled: boolean; percentage?: number };

  // Rates
  base_rate_currency: string;
  base_rate_amount: number;
  daily_rates: Record<string, number>;
  custom_rates: unknown[];
  synced_rate_modifier: unknown | null;

  // Hospitable (Phase 5 — leave null)
  hospitable_property_id: string | null;
  hospitable_connected: boolean;
  hospitable_last_sync_at: string | null;
  hospitable_sync_status: string;
  hospitable_connection_id: string | null;
  hospitable_customer_id: string | null;
  hospitable_platform_mappings: unknown[];

  created_at: string;
  updated_at: string;
}

export interface NfsPropertyImage {
  url: string;
  caption?: string;
  order: number;
}
```

**File: `src/lib/nfstay/constants.ts`** — Add property wizard steps and routes

```typescript
export const NFS_PROPERTY_STEPS = [
  'propertyBasics',
  'location',
  'guestsAndRooms',
  'photos',
  'amenities',
  'description',
  'houseRules',
  'availability',
  'pricing',
  'review',
] as const;

export const NFS_PROPERTY_STEP_LABELS: Record<typeof NFS_PROPERTY_STEPS[number], string> = {
  propertyBasics: 'Property Basics',
  location: 'Location',
  guestsAndRooms: 'Guests & Rooms',
  photos: 'Photos',
  amenities: 'Amenities',
  description: 'Description',
  houseRules: 'House Rules',
  availability: 'Availability',
  pricing: 'Pricing',
  review: 'Review & Publish',
};
```

Add to `NFS_ROUTES`:
```typescript
export const NFS_ROUTES = {
  // ... existing
  PROPERTIES: '/nfstay/properties',
  PROPERTY_NEW: '/nfstay/properties/new',
  PROPERTY_DETAIL: '/nfstay/properties/:id',
  SEARCH: '/nfstay/search',
  PROPERTY_VIEW: '/nfstay/property/:id',
  RESERVATIONS: '/nfstay/reservations',
} as const;
```

---

### Task 2: Hooks

Create the following hooks in `src/hooks/nfstay/`:

#### `use-nfs-properties.ts`
- Fetches all properties for the current operator
- Returns: `properties`, `loading`, `error`, `refetch`
- Query: `(supabase.from('nfs_properties') as any).select('*').eq('operator_id', operator.id).order('updated_at', { ascending: false })`
- Depends on `useNfsOperator()` for operator_id

#### `use-nfs-property.ts`
- Fetches a single property by ID
- Returns: `property`, `loading`, `error`, `refetch`
- Query: `(supabase.from('nfs_properties') as any).select('*').eq('id', propertyId).single()`

#### `use-nfs-property-mutation.ts`
- Creates, updates, and deletes properties
- `create(fields)` → INSERT into `nfs_properties` with `operator_id` set
- `update(id, fields)` → UPDATE `nfs_properties` by ID
- `remove(id)` → DELETE from `nfs_properties` by ID
- `bulkUpdateStatus(ids, listing_status)` → UPDATE multiple properties' `listing_status`
- Returns: `create`, `update`, `remove`, `bulkUpdateStatus`, `saving`, `error`
- Pattern: follow `use-nfs-operator-update.ts`

#### `use-nfs-property-wizard.ts`
- Manages property creation wizard state (similar to `use-nfs-onboarding.ts`)
- Tracks: `currentStep`, `currentStepIndex`, `completedSteps`
- Provides: `saveAndNext(fields)`, `back()`, `goToStep(step)`
- On save: UPDATE `nfs_properties` with step fields + update `current_step` + append to `completed_steps`
- On final step (review): set `status = 'completed'`

#### `use-nfs-property-search.ts`
- Full-text search + filters for traveler search page
- Params: `query`, `city`, `country`, `minGuests`, `minPrice`, `maxPrice`, `propertyType`
- Query: `(supabase.from('nfs_properties') as any).select('*').eq('listing_status', 'listed')` + filters
- For text search: use `.textSearch('description', query)` or `.ilike('public_title', '%query%')`
- Returns: `results`, `loading`, `error`, `search(params)`

#### `use-nfs-image-upload.ts`
- Uploads images to Supabase Storage `nfs-images` bucket
- `upload(file, propertyId)` → uploads to `nfs-images/{operator_id}/{property_id}/{filename}`
- `remove(path)` → deletes from storage
- Returns: `upload`, `remove`, `uploading`, `error`
- Uses `supabase.storage.from('nfs-images')`

#### `use-nfs-google-maps.ts`
- Loads Google Maps JavaScript API using `@googlemaps/js-api-loader`
- Returns: `isLoaded`, `loadError`, `mapRef`
- Uses env var `VITE_GOOGLE_MAPS_API_KEY`
- Loads libraries: `['places', 'marker']`

---

### Task 3: Property Creation Wizard (Operator)

**Page: `src/pages/nfstay/NfsPropertyNew.tsx`**
- Wizard orchestrator — identical pattern to `NfsOnboarding.tsx`
- On mount: CREATE a draft property (INSERT with `status: 'draft'`, `listing_status: 'draft'`)
- Render 10 step components based on `current_step`
- Progress bar (same style as onboarding)
- Back / Next navigation
- On final step: option to "Save as draft" or "Publish" (`listing_status = 'listed'`)

**Step components in `src/components/nfstay/properties/wizard/`:**

Each step receives `{ property: NfsProperty, onSave: (fields) => Promise<void>, saving: boolean }`.

1. **`StepPropertyBasics.tsx`** — property_type (apartment, house, villa, studio, etc.), rental_type (entire, private room, shared), accommodation_type, size_value + size_unit
2. **`StepLocation.tsx`** — address, city, state, country, postal_code, lat, lng. Use Google Places Autocomplete for address input. When address selected, auto-fill city/state/country/postal_code/lat/lng. Show small preview map.
3. **`StepGuestsAndRooms.tsx`** — max_guests (number stepper), allow_children (toggle), room_counts (bedrooms, bathrooms, beds as number steppers), room_sections (JSONB — optional, for named room descriptions)
4. **`StepPhotos.tsx`** — Image upload via `use-nfs-image-upload`. Drag-to-reorder (or arrow buttons). Caption field per image. Cover photo = first image. Min 1 photo to proceed. Show upload progress.
5. **`StepAmenities.tsx`** — Checkbox grid. Categories: essentials (wifi, parking, AC, heating, washer, dryer, kitchen), safety (smoke alarm, fire extinguisher, first aid), outdoor (pool, hot tub, garden, BBQ), entertainment (TV, gym, game room), other (elevator, wheelchair access, EV charger). Stored as `{ wifi: true, parking: false, ... }`.
6. **`StepDescription.tsx`** — public_title (text, max 100 chars), internal_title (text, operator-only), description (textarea, max 2000 chars)
7. **`StepHouseRules.tsx`** — check_in_time, check_out_time (time pickers or select), max_pets (number), rules (textarea), cancellation_policy (select: flexible, moderate, strict)
8. **`StepAvailability.tsx`** — availability_window (select: 3mo, 6mo, 1yr, 2yr), advance_notice (days, number), minimum_stay (nights, number). Date ranges / blocked dates can be Phase 3 (show "Calendar management coming soon" note).
9. **`StepPricing.tsx`** — base_rate_currency (select: USD, EUR, GBP), base_rate_amount (number input), cleaning_fee (toggle + amount), extra_guest_fee (toggle + amount + after_guests), weekly_discount (toggle + percentage), monthly_discount (toggle + percentage)
10. **`StepReview.tsx`** — Summary of all entered data. Read-only display of each section. "Publish" button sets `listing_status = 'listed'`, `status = 'completed'`. "Save as draft" keeps `listing_status = 'draft'`.

---

### Task 4: Property List Page (Operator)

**Page: `src/pages/nfstay/NfsProperties.tsx`**

- Header: "Properties" + "Add property" button → navigates to `/nfstay/properties/new`
- **Filters bar:** listing_status filter (All, Listed, Unlisted, Archived, Draft), text search (filters by title/address client-side)
- **Property grid/table:** Show each property as a card or table row with:
  - Cover photo thumbnail (first image, or placeholder)
  - public_title (or "Untitled" if null)
  - city, country
  - listing_status badge (color-coded: green=listed, gray=draft, yellow=unlisted, red=archived)
  - base_rate_amount + currency
  - updated_at (relative time)
  - Click → navigate to `/nfstay/properties/{id}`
- **Bulk actions:** Checkbox selection → "Change status" dropdown → calls `bulkUpdateStatus`
- **Empty state:** "No properties yet. Create your first property." with CTA button
- **Sorting:** By updated_at (default), by title, by status

---

### Task 5: Property Detail/Edit Page (Operator)

**Page: `src/pages/nfstay/NfsPropertyDetail.tsx`**

- Uses URL param `id` via `useParams()`
- Fetches property via `use-nfs-property.ts`
- **Tab layout** (using `@/components/ui/tabs`):
  - **Overview tab:** Summary card showing all key info (type, location, guests, price, status). Quick status toggle (listed/unlisted/archived).
  - **Details tab:** Editable form sections matching wizard steps (basics, location, guests, amenities, description, rules). Each section is a collapsible card with edit mode.
  - **Photos tab:** Photo gallery with upload, reorder, delete, caption edit. Reuses the same photo upload component from wizard.
  - **Availability tab:** Read-only for now (Phase 3 will add calendar). Show current settings (window, notice, min stay).
  - **Pricing tab:** Edit base rate, fees, discounts. Same fields as wizard step.
- **Header:** Property title + status badge + "Back to properties" link
- **Delete action:** Confirm dialog → delete property → navigate back to list
- **Save:** Per-section save buttons (same pattern as Settings tabs)

---

### Task 6: Traveler Search Page

**Page: `src/pages/nfstay/NfsSearch.tsx`**

- **Search bar:** Location input (Google Places Autocomplete), date range (check-in/check-out — can be date inputs), guests (number stepper)
- **Filter sidebar/panel:** Property type, price range (min/max inputs or slider), amenities checkboxes
- **Results area:** Grid of property cards
- **Property card component:** `src/components/nfstay/properties/NfsPropertyCard.tsx`
  - Cover photo
  - public_title
  - city, country
  - base_rate_amount / night
  - max_guests, bedrooms, bathrooms (icons)
  - Click → navigate to `/nfstay/property/{id}`
- **Map toggle:** Button to switch between grid view and map view
- **Map view:** Google Maps showing property markers (see Task 8)
- **Empty state:** "No properties found matching your search."
- **Loading state:** Skeleton cards

---

### Task 7: Google Maps Integration

**Install packages** (npm install):
```
@googlemaps/js-api-loader
@googlemaps/markerclusterer
```

**Components in `src/components/nfstay/maps/`:**

#### `NfsSearchMap.tsx`
- Full-width Google Map
- Receives `properties: NfsProperty[]` as prop
- Renders AdvancedMarkerElement for each property with lat/lng
- Uses MarkerClusterer for clustering when zoomed out
- Click marker → show info popup with property name, price, photo, link to detail
- Map auto-fits bounds to show all markers
- Syncs with search filters (when filters change, markers update)

#### `NfsPropertyMap.tsx`
- Small map for property detail page
- Shows single marker at property lat/lng
- Read-only, no clustering

#### `NfsPlacesAutocomplete.tsx`
- Reusable component wrapping Google Places Autocomplete
- Input field that suggests addresses as user types
- On place selected: returns `{ address, city, state, country, postal_code, lat, lng }`
- Used in: property wizard Step 2 (Location), traveler search bar
- Uses `use-nfs-google-maps.ts` hook for API loading

---

### Task 8: Traveler Property Detail Page

**Page: `src/pages/nfstay/NfsPropertyView.tsx`**

- Public page (no auth required) — but still inside NfsOperatorLayout for now (will move to public layout in Phase 6)
- Actually, this page should NOT be inside NfsOperatorLayout (it's traveler-facing). Create a minimal wrapper or render standalone.
- Fetches property by ID (must be `listing_status = 'listed'` — if not found or not listed, show 404)
- **Sections:**
  - **Photo gallery:** Grid or carousel of property images
  - **Title + location:** public_title, city, country
  - **Quick stats:** max_guests, bedrooms, bathrooms, size
  - **Description:** Full description text
  - **Amenities:** Grid of amenity icons/labels (only show enabled ones)
  - **House rules:** Check-in/out times, pet policy, cancellation, rules text
  - **Location map:** `NfsPropertyMap` component showing property location
  - **Booking widget (placeholder):** "Booking coming in Phase 3" card with price display. Show base rate, cleaning fee.
- **Responsive:** Mobile-first layout

---

### Task 9: Migration File

**File: `supabase/migrations/20260317130000_nfs_phase2_properties.sql`**

Create this migration with the full `nfs_properties` table from `DATABASE.md` (the exact SQL from §3 `nfs_properties`). Include:

1. CREATE TABLE `nfs_properties` (copy exact schema from DATABASE.md)
2. All indexes (operator, listing_status, location, search GIN)
3. RLS policies:
   - Operator manages own: `operator_id IN (SELECT id FROM nfs_operators WHERE profile_id = auth.uid())`
   - Public reads listed: `listing_status = 'listed'` (SELECT only)
4. `updated_at` trigger using `nfs_set_updated_at()`
5. Bulk update RPC:
```sql
CREATE OR REPLACE FUNCTION nfs_bulk_update_listing_status(
  property_ids UUID[],
  new_status TEXT
) RETURNS void AS $$
BEGIN
  UPDATE nfs_properties
  SET listing_status = new_status, updated_at = now()
  WHERE id = ANY(property_ids)
    AND operator_id IN (SELECT id FROM nfs_operators WHERE profile_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Mark this file with:** `-- REQUIRES HUGO TO REVIEW SQL BEFORE EXECUTION`

---

### Task 10: Routes (App.tsx)

Add these routes inside the existing NFStay route block in `src/App.tsx`:

```jsx
{/* Inside the /nfstay NfsOperatorLayout block */}
<Route path="properties" element={<NfsProperties />} />
<Route path="properties/new" element={<NfsPropertyNew />} />
<Route path="properties/:id" element={<NfsPropertyDetail />} />

{/* Traveler-facing routes — standalone (outside NfsOperatorLayout) */}
<Route path="/nfstay/search" element={<NfsSearch />} />
<Route path="/nfstay/property/:id" element={<NfsPropertyView />} />
```

Add the necessary imports at the top of App.tsx (in the NFStay import block).

---

### Task 11: Documentation Updates

In the **same commit** as the code changes:

1. **`docs/nfstay/FEATURES.md`** — Update all Phase 2 features from "Planned" to "Done"
2. **`docs/nfstay/ROUTES.md`** — Add the new routes (properties list, new, detail, search, property view)
3. **`docs/nfstay/CHANGELOG.md`** — Add entry at the top:

```markdown
## 2026-03-17

### Phase 2 — Properties + Maps
- Property creation wizard (10 steps) with draft/publish flow
- Property list page with filters, sort, bulk status updates
- Property detail/edit page with tabbed sections
- Photo upload to Supabase Storage (nfs-images bucket)
- Traveler search page with filters
- Google Maps integration (search map, property map, Places autocomplete)
- Traveler property detail page with gallery, amenities, rules, location map
- NfsProperty TypeScript type + property wizard constants
- New hooks: use-nfs-properties, use-nfs-property, use-nfs-property-mutation, use-nfs-property-wizard, use-nfs-property-search, use-nfs-image-upload, use-nfs-google-maps
- Phase 2 migration file created (awaiting Hugo SQL review)
- Routes wired in App.tsx (additive only)
- TypeScript compiles with zero errors
```

---

## PACKAGES TO INSTALL

```bash
npm install @googlemaps/js-api-loader @googlemaps/markerclusterer
```

No other new packages. Use existing: `@tanstack/react-query`, `react-router-dom`, `lucide-react`, `@/components/ui/*`.

---

## ENV VAR NEEDED

The Google Maps API key must be set as `VITE_GOOGLE_MAPS_API_KEY` in the `.env` file. If the key is not available, the maps should gracefully degrade (show a "Map unavailable" placeholder instead of crashing).

---

## DEFINITION OF DONE

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] All 10 property wizard steps render and save correctly
- [ ] Property list shows properties with filter/sort/bulk actions
- [ ] Property detail/edit page works for all sections
- [ ] Photo upload works (or gracefully handles missing bucket)
- [ ] Traveler search page shows listed properties with filters
- [ ] Google Maps loads (or gracefully degrades without API key)
- [ ] Places autocomplete works in property wizard and search
- [ ] Traveler property detail page shows all property information
- [ ] No marketplace10 files modified (except additive App.tsx routes)
- [ ] No marketplace10 imports in NFStay code
- [ ] Empty states, loading states, error states on all pages
- [ ] Migration file created with `-- REQUIRES HUGO TO REVIEW SQL BEFORE EXECUTION`
- [ ] `FEATURES.md`, `ROUTES.md`, `CHANGELOG.md` updated in same commit

---

## BOUNDARY REMINDERS

- **NEVER** import from `src/pages/` (marketplace10), `src/components/` (non-nfstay), `src/hooks/` (non-nfstay), `src/lib/` (non-nfstay)
- **ALLOWED** imports: `@/components/ui/*`, `@/integrations/supabase/client`, `@/hooks/useAuth`
- **NEVER** touch `middleware.ts`, marketplace10 tables, GoHighLevel, or existing Edge Functions
- **NEVER** modify shared UI components — if you need a variant, create a wrapper in `components/nfstay/`
- **Supabase client calls** use `(supabase.from('nfs_properties') as any)` cast pattern
- **Storage** uses `supabase.storage.from('nfs-images')` — handle bucket-not-found gracefully

---

## FILE CREATION SUMMARY

### New files (create these):

**Hooks (6):**
- `src/hooks/nfstay/use-nfs-properties.ts`
- `src/hooks/nfstay/use-nfs-property.ts`
- `src/hooks/nfstay/use-nfs-property-mutation.ts`
- `src/hooks/nfstay/use-nfs-property-wizard.ts`
- `src/hooks/nfstay/use-nfs-property-search.ts`
- `src/hooks/nfstay/use-nfs-image-upload.ts`
- `src/hooks/nfstay/use-nfs-google-maps.ts`

**Pages (5):**
- `src/pages/nfstay/NfsProperties.tsx`
- `src/pages/nfstay/NfsPropertyNew.tsx`
- `src/pages/nfstay/NfsPropertyDetail.tsx`
- `src/pages/nfstay/NfsSearch.tsx`
- `src/pages/nfstay/NfsPropertyView.tsx`

**Wizard steps (10):**
- `src/components/nfstay/properties/wizard/StepPropertyBasics.tsx`
- `src/components/nfstay/properties/wizard/StepLocation.tsx`
- `src/components/nfstay/properties/wizard/StepGuestsAndRooms.tsx`
- `src/components/nfstay/properties/wizard/StepPhotos.tsx`
- `src/components/nfstay/properties/wizard/StepAmenities.tsx`
- `src/components/nfstay/properties/wizard/StepDescription.tsx`
- `src/components/nfstay/properties/wizard/StepHouseRules.tsx`
- `src/components/nfstay/properties/wizard/StepAvailability.tsx`
- `src/components/nfstay/properties/wizard/StepPricing.tsx`
- `src/components/nfstay/properties/wizard/StepReview.tsx`

**Shared property components (3):**
- `src/components/nfstay/properties/NfsPropertyCard.tsx`
- `src/components/nfstay/properties/NfsPhotoUpload.tsx`
- `src/components/nfstay/properties/NfsPhotoGallery.tsx`

**Map components (3):**
- `src/components/nfstay/maps/NfsSearchMap.tsx`
- `src/components/nfstay/maps/NfsPropertyMap.tsx`
- `src/components/nfstay/maps/NfsPlacesAutocomplete.tsx`

**Migration (1):**
- `supabase/migrations/20260317130000_nfs_phase2_properties.sql`

### Modified files (3):
- `src/lib/nfstay/types.ts` — add NfsProperty, NfsPropertyImage
- `src/lib/nfstay/constants.ts` — add property steps, step labels, routes
- `src/App.tsx` — add 5 new routes (additive only)

### Documentation updates (3):
- `docs/nfstay/FEATURES.md` — Phase 2 status → Done
- `docs/nfstay/ROUTES.md` — add new routes
- `docs/nfstay/CHANGELOG.md` — add Phase 2 entry

**Total: ~30 new files + 6 modified files**

---

*End of Phase 2 execution prompt.*
