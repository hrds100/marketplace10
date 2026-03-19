# NFStay VPS Source Reference

> Extracted 2026-03-19 from VPS `31.97.118.211` (Hostinger srv978547)
> This is a READ-ONLY reference. Never deploy to or modify the VPS from marketplace10.

## Infrastructure

| Component | Path | Repo | Stack | PM2 |
|---|---|---|---|---|
| Frontend | `/var/www/nfstay.app` | `zain-ul-abdin-dev/nfsproperty-fe` | Next.js 14.2.15 (App Router) | `nfstay.app` |
| API | `/var/www/api.nfstay.app` | `shaherya/nfspropertis-backend` | Node.js/Express (plain JS) | `api.nfstay.app` |
| Worker | `/var/www/api.nfstay.app/worker.js` | Same as API | Node.js | `worker.nfstay.app` |

- **API Base URL**: `https://api.nfstay.app/api/v1`
- **Domain**: `nfstay.app` (subdomains resolve to white-label operators)
- **Build ID**: `oKuAczyp8RezxGt5zAyff`

## Frontend Route Map

### Operator Dashboard (`/operator/*`)
```
/operator                    → Dashboard home
/operator/login              → Operator login
/operator/onboarding         → Onboarding wizard
/operator/properties/new     → Create property
/operator/properties/[id]    → Edit property
/operator/property/[id]      → View property
/operator/listings           → Listings list
/operator/add-listings       → Add listings
/operator/bulk-edit          → Bulk edit
/operator/reservations       → Reservations list
/operator/reservations/[id]  → Reservation detail
/operator/reservation/[id]   → Reservation detail (alt)
/operator/create-reservation → Manual reservation
/operator/settings           → Settings page
/operator/oauth-callback     → OAuth callback (Hospitable)
```

### Traveler/Guest (`/traveler/*`)
```
/traveler                        → Traveler home
/traveler/login                  → Traveler login
/traveler/search                 → Search properties
/traveler/reservations           → My reservations
/traveler/reservation/[id]       → Reservation detail
/traveler/terms-and-conditions   → T&C
/traveler/privacy-policy         → Privacy policy
/property/[id]                   → Property detail (direct)
/payment                         → Payment page
```

### White-Label (`/white-label/*`) — Subdomain-resolved
```
/white-label/                → Landing page (Hero + Featured + About + FAQ + Footer)
/white-label/search          → Property search (map + filters)
/white-label/property/[id]   → Property detail page
/white-label/payment         → Payment page (Zustand booking store)
/white-label/payment/success → Booking confirmation
/white-label/booking/[id]    → Booking by reservation ID
/white-label/not-found       → Operator not found error
/white-label/error           → General error
```

### Auth
```
/verify-email → Email verification
```

## Key Contexts & Providers

### WhiteLabelProvider (`app/context/WhiteLabelContext.tsx`)
- Resolves operator by subdomain from hostname or meta tag
- Fetches `/white-label/operator/{subdomain}` from API
- Provides: `operator`, `properties`, `propertyCount`, `loading`, `error`, `subdomain`, `isReady`
- Methods: `loadOperatorData()`, `searchProperties()`, `getProperty()`
- Helpers: `getThemeColor()` (default `#6366f1`), `getBrandName()` (default "Vacation Rentals"), `getLogo()`, `getFavicon()`

### CurrencyProvider (`app/context/CurrencyContext.tsx`)
- Multi-currency support
- Navbar currency selector component

### OnBoardingContext (`app/context/OnBoardingContext.tsx`)
- Operator onboarding wizard state

### BrandingContext (`app/context/BrandingContext.tsx`)
- Branding/theme data

### Zustand Booking Store (`app/stores/bookingStore.ts`)
- `useWhiteLabelBooking()` — persists booking data with expiry
- Fields: `propertyId`, `checkIn`, `checkOut`, `guests`, `nights`, `guestMessage`, `pricing`, `propertyInfo`
- Auto-expires stale bookings

## Operator Data Shape
```typescript
operator.branding.accentColor    // e.g. "#6366f1"
operator.branding.brandName      // e.g. "Vacation Rentals"
operator.branding.logo.url       // logo image URL
operator.branding.favicon.url    // favicon URL
operator.contactInfo.phone
operator.contactInfo.email
operator.contactInfo.whatsapp
operator.contactInfo.telegram
operator.landingPage.heroContent.headline
operator.landingPage.heroContent.subheadline
operator.landingPage.aboutUs.bio
operator.landingPage.faqs[]
operator.landingPage.enabled
operator.subdomain
```

## White-Label Layout Structure
```
CurrencyProvider
  └─ WhiteLabelProvider (resolves operator by subdomain)
       └─ WhiteLabelContent (applies theme CSS, handles overflow)
            ├─ WhiteLabelNavbar (sticky top, logo, search, contact, Book Now, currency, mobile menu)
            └─ {children} (page content)
```

## White-Label Theming (`useWhiteLabelTheme` hook)
- Dynamic CSS injection based on `operator.branding.accentColor`
- Overrides Tailwind blue/purple/green classes with operator accent
- Auto-contrast text color calculation
- Applied via `.white-label-themed` CSS class
- Targets: buttons, text, borders, gradients, hover states, focus rings, modals

## Component File Map

### WhiteLabel Components (`components/WhiteLabel/`)
- `WhiteLabelNavbar.tsx` — Sticky navbar with logo, search, contact modal, Book Now CTA, currency selector, mobile menu
- `WhiteLabelFooter.tsx` — Footer component
- `WhiteLabelLoading.tsx` — Loading spinner (purple border, gray bg)
- `WhiteLabelError.tsx` — "Website Not Available" error page with retry/home buttons
- `WhiteLabelAbout.tsx` — About section from operator.landingPage.aboutUs
- `WhiteLabelFAQ.tsx` — FAQ accordion from operator.landingPage.faqs

### TravelerSearch Components (`components/TravalerSearch/`)
- `Main.tsx` — Search page main container
- `SearchMap.tsx` — Map component for search
- `PropertyCard.tsx` — Property card (grid display)
- `FilterPanel.tsx` — Search filters

### TravelerProduct Components (`components/TravalerProduct/`)
- `PropertyDetailPage.tsx` — Full property detail page wrapper
- `Main.tsx` — Product main container
- `Head.tsx` — Property title/header
- `ImageGallery.tsx` — Photo gallery
- `Overview.tsx` — Property overview
- `Amenities.tsx` — Amenities list
- `Space.tsx` — Space/rooms info
- `Location.tsx` — Map location
- `Rules.tsx` — House rules
- `Arrival.tsx` — Check-in info
- `Departure.tsx` — Check-out info
- `Reviews.tsx` — Guest reviews
- `Properties.tsx` — Related properties
- `PropertySection.tsx` — Section wrapper
- `PropertyNavigation.tsx` — Section navigation
- `PropertyContent.tsx` — Content wrapper
- `PropertyDetailLayout.tsx` — Detail page layout
- `PropertyDetailLoading.tsx` — Loading state
- `PropertyDetailError.tsx` — Error state

### UI Components
- `Hero.tsx` — Landing page hero with search

### Payment Components (`components/TravalerPayment/`)
- `Main.tsx` — Payment form (used by both `/payment` and `/booking/[id]`)
  - Props: `bookingData`, `property`, `propertyLoading`, `isWhiteLabel`, `showStripeFees`, `usePricingAPI`, `isPromo`, `disableEditing`

## API Services (`app/lib/api/services/`)
- `auth.services.ts` — Authentication
- `operator.service.ts` — Operator CRUD
- `property.ts` — Property operations + `getWhiteLabelPropertyById()`
- `whitelabel.service.ts` / `whiteLabel.ts` — White-label operations
- `reservationService.ts` / `reservationApi.service.ts` — Reservations
- `payment.service.ts` — Payments
- `stripe.service.ts` / `stripe-connect.service.ts` — Stripe
- `branding.service.ts` — Branding
- `analytics.service.ts` — Analytics
- `promoCode.service.ts` — Promo codes
- `ical.service.ts` — iCal sync
- `content.service.ts` — Content management
- `profile-info.service.ts` — Profile
- `travelerService.ts` — Traveler operations

## Auth Flow
- JWT tokens in `localStorage` (`auth_token` / `traveler_only_token`)
- Auto-expiry detection in axios interceptor
- 401 → redirect to login (`/operator/login` or `/traveler/login`)
- Separate operator and traveler auth flows

## Booking Data Shape (BookingData type)
```typescript
{
  propertyId: string;
  reservationId?: string;
  checkIn: string;          // "YYYY-MM-DD"
  checkOut: string;         // "YYYY-MM-DD"
  guests: number;
  nights: number;
  guestMessage: string;
  guestInfo: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
  expiration?: string;
  createdAt?: string;
  discounts?: any[];
  customFees?: any[];
  addOns?: any[];
  pricing: {
    total: number;
    currency: string;
    nights: number;
    basePrice: number;
    cleaningFee: number;
    serviceFee: number;
    taxes: number;
    discount: { amount: number; percentage: number; type: string | null };
    totalCustomFees: number;
    totalCustomTaxes: number;
  };
  propertyInfo: {
    title: string;
    location: string;
    images: string;
    propertyType: string;
    maxGuests: number;
    baseRate: number;
    currency: string;
  };
}
```

## Key Hooks
- `use-auth.ts` — Auth state management
- `use-api.ts` — API client helper
- `use-hospitable.ts` / `use-hospitable-accounts.ts` — Hospitable PMS integration
- `usePropertyData.ts` — Property data fetching
- `usePropertyFilters.ts` — Search filter state
- `useReservationFilters.ts` — Reservation filter state
- `useAnalytics.ts` + `usePropertyPageView` — Analytics tracking
- `useWhiteLabelTheme.ts` — Dynamic CSS theming
- `useCloudinaryUpload.ts` — Image uploads to Cloudinary
- `usePlacesAutocomplete.ts` — Google Places autocomplete
- `use-promoCode.ts` — Promo code validation
- `use-ical.ts` — iCal calendar sync
- `use-sidebar.ts` — Sidebar state
- `useHospitableAvailability.ts` — Availability from Hospitable
- `useAccountUsers.ts` — Account user management
