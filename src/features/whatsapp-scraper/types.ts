export interface ScraperGroup {
  id: string;
  group_name: string;
  member_count: number;
  is_active: boolean;
  last_scanned_at: string | null;
  deals_found: number;
  created_at: string;
  updated_at: string;
}

export interface ScraperDeal {
  id: string;
  group_id: string | null;
  group_name: string;
  wa_message_id: string;
  sender_phone: string | null;
  sender_name: string | null;
  raw_text: string;
  parsed_data: ParsedDealData | null;
  images: string[];
  status: 'pending' | 'approved' | 'rejected' | 'submitted';
  property_id: string | null;
  created_at: string;
}

export interface ParsedDealData {
  title?: string;
  city?: string;
  postcode?: string;
  bedrooms?: number;
  bathrooms?: number;
  rent_monthly?: number;
  profit_est?: number;
  property_type?: string;
  property_category?: 'flat' | 'house' | 'hmo';
  deal_type?: string;
  furnished?: boolean;
  description?: string;
  contact_name?: string;
  contact_phone?: string;
}

export interface ScraperActivity {
  id: string;
  action: string;
  details: string | null;
  group_name: string | null;
  created_at: string;
}

export interface ScraperConfig {
  selected_groups: string[];
  scan_interval_minutes: number;
  lookback_hours: number;
  is_paused: boolean;
  notifications_enabled: boolean;
  notification_email: string;
  max_messages_per_group: number;
  auto_submit_approved: boolean;
  duplicate_window_days: number;
}

export type DealStatus = ScraperDeal['status'];
