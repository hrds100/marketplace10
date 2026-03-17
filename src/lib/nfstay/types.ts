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
