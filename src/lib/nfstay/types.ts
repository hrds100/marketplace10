// nfstay TypeScript types
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
  custom_domain_cf: Record<string, unknown>;

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
  is_cover?: boolean;
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

// ============================================================================
// Phase 3 — Reservations + Pricing
// ============================================================================

export type NfsReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show' | 'expired';
export type NfsPaymentStatus = 'pending' | 'paid' | 'partially_refunded' | 'refunded' | 'failed';
export type NfsBookingSource = 'main_platform' | 'white_label' | 'operator_direct';

export interface NfsReservation {
  id: string;
  property_id: string;
  operator_id: string | null;
  created_by: string | null;

  // Guest info
  guest_email: string | null;
  guest_first_name: string | null;
  guest_last_name: string | null;
  guest_phone: string | null;
  guest_address: string | null;
  guest_city: string | null;
  guest_country: string | null;

  // Booking
  booking_source: NfsBookingSource;
  operator_domain: string | null;
  check_in: string;
  check_out: string;
  check_in_time: string;
  check_out_time: string;
  guest_message: string;
  status: NfsReservationStatus;

  // Guests
  adults: number;
  children: number;
  infants: number;
  pets: number;

  // Pricing
  total_amount: number;
  discounts: unknown[];
  add_ons: unknown[];
  custom_fees: unknown[];
  synced_rate_modifier: unknown | null;
  expiration: unknown | null;
  block_dates: boolean;

  // Payment
  payment_status: NfsPaymentStatus;
  stripe_charge_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;
  stripe_refund_id: string | null;
  payment_currency: string;
  payment_amounts: Record<string, unknown>;
  payment_fee_breakdown: unknown[];
  payment_processed_at: string | null;
  refund_amount: number | null;
  refund_status: string | null;
  refund_reason: string | null;
  refund_at: string | null;
  promo_code: string | null;
  promo_discount_amount: number | null;

  // Guest session
  guest_token: string | null;
  is_linked_to_user: boolean;
  linked_at: string | null;

  // Hospitable (Phase 5)
  hospitable_reservation_id: string | null;
  hospitable_platform: string | null;
  hospitable_platform_id: string | null;
  hospitable_connection_id: string | null;
  hospitable_status: string | null;
  hospitable_financials: unknown | null;
  hospitable_status_history: unknown[];
  hospitable_last_sync_at: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export type NfsPromoCodeStatus = 'active' | 'expired' | 'inactive' | 'draft';
export type NfsDiscountType = 'fixed' | 'percentage';

export interface NfsPromoCode {
  id: string;
  operator_id: string;
  name: string | null;
  code: string;
  discount_type: NfsDiscountType;
  value: number;
  currency: string | null;
  valid_from: string | null;
  valid_to: string | null;
  limited_uses: boolean;
  max_uses: number | null;
  current_uses: number;
  status: NfsPromoCodeStatus;
  created_at: string;
  updated_at: string;
}

export interface NfsGuestSession {
  id: string;
  token: string;
  session_data: Record<string, unknown>;
  linked_reservations: string[];
  linked_user_id: string | null;
  linked_at: string | null;
  expires_at: string;
  created_at: string;
}

// ============================================================================
// Phase 4 — Stripe Payments
// ============================================================================

export interface NfsStripeAccount {
  id: string;
  operator_id: string;

  // Stripe Connect
  connect_account_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  stripe_user_id: string | null;
  stripe_publishable_key: string | null;
  oauth_state: string | null;
  oauth_code_verifier: string | null;

  // Account status
  connection_status: string;
  account_status: string;
  details_submitted: boolean;
  payouts_enabled: boolean;
  charges_enabled: boolean;
  currently_due: string[];
  past_due: string[];

  // Fee config
  platform_fee_pct: number;
  stripe_fee_pct: number;
  stripe_fee_fixed: number;

  // Earnings
  total_earned: number;
  total_platform_fees: number;
  total_transferred: number;
  total_paid_out: number;
  pending_amount: number;
  last_payout_date: string | null;
  last_payout_amount: number | null;

  // Lifecycle
  connected_at: string | null;
  disconnected_at: string | null;
  onboarding_completed: boolean;
  last_error: unknown | null;

  created_at: string;
  updated_at: string;
}

export interface NfsHospitableConnection {
  id: string;
  profile_id: string;
  operator_id: string;

  // Hospitable identity
  hospitable_customer_id: string;
  hospitable_connection_id: string | null;
  channel_info: Record<string, unknown>;

  // OAuth
  auth_code: string | null;
  auth_code_expires_at: string | null;

  // Connection status
  status: 'pending' | 'connected' | 'disconnected' | 'failed';
  is_active: boolean;
  connected_at: string | null;
  disconnected_at: string | null;

  // Sync state
  last_sync_at: string | null;
  sync_status: 'pending' | 'syncing' | 'completed' | 'failed';
  user_metadata: Record<string, unknown>;
  connected_platforms: unknown[];
  total_properties: number;
  total_reservations: number;
  last_sync_results: Record<string, unknown>;
  sync_progress: Record<string, unknown>;

  // Health monitoring
  health_status: 'healthy' | 'warning' | 'error';
  last_health_check: string | null;
  last_sync_error: string | null;
  last_error: unknown | null;

  created_at: string;
  updated_at: string;
}

export interface NfsWebhookEvent {
  id: string;
  source: 'stripe' | 'stripe_connect' | 'hospitable';
  external_event_id: string;
  event_type: string;
  processed: boolean;
  success: boolean | null;
  error: string | null;
  data: Record<string, unknown>;
  processed_at: string | null;
  retry_count: number;
  last_retry_at: string | null;
  created_at: string;
}

// ============================================================================
// Phase 6 — Analytics
// ============================================================================

export interface NfsAnalyticsEvent {
  id: string;
  operator_id: string;
  property_id: string | null;
  event_type: string;
  user_agent: string | null;
  ip_address: string | null;
  referrer: string | null;
  session_id: string | null;
  device_type: string | null;
  view_source: string;
  reservation_id: string | null;
  booking_data: Record<string, unknown>;
  timestamp: string;
  created_at: string;
}
