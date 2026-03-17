// NFStay constants

export const NFS_ROUTES = {
  SIGNUP: '/nfstay/signup',
  DASHBOARD: '/nfstay',
  PROPERTIES: '/nfstay/properties',
  RESERVATIONS: '/nfstay/reservations',
  SETTINGS: '/nfstay/settings',
  ONBOARDING: '/nfstay/onboarding',
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
