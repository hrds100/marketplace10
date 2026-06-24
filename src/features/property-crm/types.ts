// Property Ops CRM — shared types
//
// The Supabase generated Database type is auto-generated and frozen, so
// pcrm_* tables are not yet typed there. We declare our own row shapes
// and cast at call sites in the api/ layer.

export type PcrmRole = 'admin' | 'manager' | 'staff' | 'viewer';

export type PcrmFieldType =
  | 'text'
  | 'long_text'
  | 'number'
  | 'date'
  | 'checkbox'
  | 'select'
  | 'multi_select'
  | 'url'
  | 'email'
  | 'phone'
  | 'status'
  | 'currency'
  | 'user';

export type PcrmViewType = 'table' | 'kanban' | 'calendar' | 'gallery';

export interface PcrmWorkspace {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PcrmMember {
  workspace_id: string;
  user_id: string;
  role: PcrmRole;
  created_at: string;
}

export interface PcrmFieldOption {
  id: string;
  label: string;
  color?: string;
}

export interface PcrmField {
  id: string;
  workspace_id: string;
  name: string;
  field_type: PcrmFieldType;
  options: PcrmFieldOption[];
  position: number;
  is_primary: boolean;
  is_system: boolean;
  created_at: string;
}

export interface PcrmRow {
  id: string;
  workspace_id: string;
  property_name: string;
  address: string | null;
  status: string | null;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PcrmCell {
  id: string;
  row_id: string;
  field_id: string;
  value: unknown;
  updated_by: string | null;
  updated_at: string;
}

export interface PcrmCredentials {
  id: string;
  row_id: string;
  wifi_name: string | null;
  wifi_password: string | null;
  wifi_provider: string | null;
  broadband_email: string | null;
  broadband_password: string | null;
  broadband_provider: string | null;
  broadband_account_number: string | null;
  booking_email: string | null;
  booking_password: string | null;
  booking_provider: string | null;
  notes: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface PcrmDocument {
  id: string;
  row_id: string;
  workspace_id: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface PcrmActivityEntry {
  id: string;
  workspace_id: string;
  row_id: string | null;
  user_id: string | null;
  action: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface PcrmView {
  id: string;
  workspace_id: string;
  name: string;
  view_type: PcrmViewType;
  config: Record<string, unknown>;
  is_default: boolean;
  position: number;
  created_by: string | null;
  created_at: string;
}
