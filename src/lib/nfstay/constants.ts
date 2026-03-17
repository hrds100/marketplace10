// NFStay constants

export const NFS_ROUTES = {
  SIGNUP: '/nfstay/signup',
  DASHBOARD: '/nfstay',
  PROPERTIES: '/nfstay/properties',
  PROPERTY_NEW: '/nfstay/properties/new',
  PROPERTY_DETAIL: '/nfstay/properties/:id',
  RESERVATIONS: '/nfstay/reservations',
  SETTINGS: '/nfstay/settings',
  ONBOARDING: '/nfstay/onboarding',
  SEARCH: '/nfstay/search',
  PROPERTY_VIEW: '/nfstay/property/:id',
} as const;

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
