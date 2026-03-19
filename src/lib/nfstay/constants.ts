// NFStay constants

export const NFS_ROUTES = {
  SIGNUP: '/signup',
  DASHBOARD: '/nfstay',
  PROPERTIES: '/nfstay/properties',
  PROPERTY_NEW: '/nfstay/properties/new',
  PROPERTY_DETAIL: '/nfstay/properties/:id',
  RESERVATIONS: '/nfstay/reservations',
  RESERVATION_DETAIL: '/nfstay/reservations/:id',
  CREATE_RESERVATION: '/nfstay/create-reservation',
  SETTINGS: '/nfstay/settings',
  ONBOARDING: '/nfstay/onboarding',
  SEARCH: '/nfstay/search',
  PROPERTY_VIEW: '/nfstay/property/:id',
  PAYMENT_SUCCESS: '/nfstay/payment/success',
  PAYMENT_CANCEL: '/nfstay/payment/cancel',
  ANALYTICS: '/nfstay/analytics',
} as const;

// White-label routes (used on *.nfstay.app and custom domains)
export const NFS_WL_ROUTES = {
  LANDING: '/',
  SEARCH: '/search',
  PROPERTY: '/property/:id',
  PAYMENT_SUCCESS: '/payment/success',
  PAYMENT_CANCEL: '/payment/cancel',
} as const;

// Reserved subdomains that operators cannot claim
export const NFS_RESERVED_SUBDOMAINS = [
  'www', 'api', 'connect', 'cd', 'admin', 'app', 'mail', 'staging', 'dev',
] as const;

export const NFS_ONBOARDING_STEPS = [
  'account_setup',
  'persona',
  'usage_intent',
  'business',
  'landing_page',
  'website_customization',
  'contact_info',
  'payment_methods',
  'completed',
] as const;

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

export const NFS_PROPERTY_STEP_LABELS: Record<(typeof NFS_PROPERTY_STEPS)[number], string> = {
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

export const NFS_PROPERTY_TYPES = [
  'apartment', 'house', 'villa', 'studio', 'cabin', 'cottage', 'townhouse', 'condo', 'loft', 'other',
] as const;

export const NFS_RENTAL_TYPES = [
  'entire_place', 'private_room', 'shared_room',
] as const;

export const NFS_CANCELLATION_POLICIES = [
  'flexible', 'moderate', 'strict',
] as const;

export const NFS_AMENITY_CATEGORIES = {
  essentials: ['wifi', 'parking', 'ac', 'heating', 'washer', 'dryer', 'kitchen'],
  safety: ['smoke_alarm', 'fire_extinguisher', 'first_aid'],
  outdoor: ['pool', 'hot_tub', 'garden', 'bbq'],
  entertainment: ['tv', 'gym', 'game_room'],
  other: ['elevator', 'wheelchair_access', 'ev_charger'],
} as const;

// ============================================================================
// Phase 3 — Reservations + Pricing
// ============================================================================

export const NFS_RESERVATION_STATUSES = [
  'pending', 'confirmed', 'cancelled', 'completed', 'no_show', 'expired',
] as const;

export const NFS_PAYMENT_STATUSES = [
  'pending', 'paid', 'partially_refunded', 'refunded', 'failed',
] as const;

export const NFS_BOOKING_SOURCES = [
  'main_platform', 'white_label', 'operator_direct',
] as const;

export const NFS_RESERVATION_STATUS_LABELS: Record<(typeof NFS_RESERVATION_STATUSES)[number], string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
  no_show: 'No Show',
  expired: 'Expired',
};

export const NFS_PAYMENT_STATUS_LABELS: Record<(typeof NFS_PAYMENT_STATUSES)[number], string> = {
  pending: 'Pending',
  paid: 'Paid',
  partially_refunded: 'Partially Refunded',
  refunded: 'Refunded',
  failed: 'Failed',
};

export const NFS_PROMO_CODE_STATUSES = [
  'active', 'expired', 'inactive', 'draft',
] as const;

// ============================================================================
// Platform defaults — virtual operator for nfstay.app main site
// ============================================================================

/** Platform-level defaults used when nfstay.app renders the main site.
 *  Acts as a "virtual operator" so NfsWl* pages work without a real operator row. */
export const NFS_PLATFORM_DEFAULTS = {
  id: '__nfstay_platform__',
  profile_id: '__nfstay_platform__',
  brand_name: 'NFStay',
  accent_color: '#2563eb',
  logo_url: null,
  logo_alt: 'NFStay',
  favicon_url: null,
  hero_headline: 'Find Your Perfect Vacation Rental',
  hero_subheadline: 'Book directly from property managers. No middlemen, no hidden fees.',
  hero_photo: null,
  about_bio: 'NFStay connects travelers directly with property managers for vacation rentals. Browse properties, book securely, and enjoy your stay — all without middlemen.',
  about_photo: null,
  faqs: [
    { question: 'How does NFStay work?', answer: 'NFStay lets property managers list their vacation rentals and accept direct bookings. As a traveler, you can search properties, check availability, and book securely with Stripe.' },
    { question: 'Is it free to browse?', answer: 'Yes — browsing properties, checking availability, and viewing details is completely free. You only pay when you make a booking.' },
    { question: 'How do payments work?', answer: 'Payments are processed securely through Stripe. Your payment goes directly to the property manager with a small platform fee.' },
    { question: 'Can I contact the property manager?', answer: 'Yes — each property listing includes the manager\'s contact details. You can reach out before or after booking.' },
  ],
  contact_email: 'support@nfstay.app',
  contact_phone: null,
  contact_whatsapp: null,
  contact_telegram: null,
  social_instagram: null,
  social_facebook: null,
  social_x: null,
  social_tiktok: null,
  social_youtube: null,
  social_google_business: null,
  airbnb_url: null,
  landing_page_enabled: true,
  subdomain: null,
  custom_domain: null,
  custom_domain_verified: false,
  onboarding_step: 'completed',
  is_platform: true,
} as const;
