// NFStay TypeScript types
// Mirrors the nfs_operators schema from docs/nfstay/DATABASE.md
// These types are manually maintained because nfs_* tables are not in
// the auto-generated Supabase types.ts (yet).

export interface NfsOperator {
  id: string;
  profile_id: string;

  // Identity
  first_name: string | null;
  last_name: string | null;
  persona_type: 'owner' | 'property_manager' | null;
  listings_count: number;

  // Business
  brand_name: string | null;
  legal_name: string | null;
  subdomain: string | null;

  // Domain
  primary_domain_type: 'subdomain' | 'custom';
  custom_domain: string | null;
  custom_domain_verified: boolean;
  custom_domain_dns_verified: boolean;
  custom_domain_dns_method: string | null;
  custom_domain_dns_checked_at: string | null;

  // Branding
  accent_color: string | null;
  logo_url: string | null;
  logo_alt: string | null;
  favicon_url: string | null;

  // Landing Page
  landing_page_enabled: boolean;
  hero_photo: string | null;
  hero_headline: string | null;
  hero_subheadline: string | null;
  about_bio: string | null;
  about_photo: string | null;
  faqs: unknown[];

  // Contact
  contact_email: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_telegram: string | null;

  // External Accounts
  google_business_url: string | null;
  airbnb_url: string | null;
  social_twitter: string | null;
  social_instagram: string | null;
  social_facebook: string | null;
  social_tiktok: string | null;
  social_youtube: string | null;

  // Analytics / SEO
  google_analytics_id: string | null;
  meta_pixel_id: string | null;
  meta_title: string | null;
  meta_description: string | null;

  // Payment Settings
  fees_options_enabled: boolean;

  // Onboarding
  onboarding_step: string;
  onboarding_completed_steps: string[];
  onboarding_skipped_steps: string[];
  onboarding_preference: string | null;
  usage_intent: string | null;
  onboarding_updated_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface NfsPropertyImage {
  url: string;
  caption?: string;
  order: number;
}

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

  // Hospitable (Phase 5)
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

export interface NfsOperatorUser {
  id: string;
  profile_id: string;
  operator_id: string;
  role: 'admin' | 'editor' | 'affiliate';
  status: 'pending' | 'active' | 'suspended';
  invited_by: string | null;
  accepted_at: string | null;
  created_at: string;
}
