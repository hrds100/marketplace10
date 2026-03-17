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

  // Branding
  accent_color: string | null;
  logo_url: string | null;
  favicon_url: string | null;

  // Contact
  contact_email: string | null;
  contact_phone: string | null;

  // Onboarding
  onboarding_step: string;
  onboarding_completed_steps: string[];
  onboarding_skipped_steps: string[];
  onboarding_preference: string | null;
  usage_intent: string | null;

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
