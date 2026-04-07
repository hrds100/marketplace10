export type Actor =
  | 'tenant'
  | 'landlord'
  | 'admin'
  | 'system'
  | 'payment'
  | 'crypto'
  | 'booking'
  | 'integration';

export type Confidence = 'confirmed' | 'likely' | 'unverified' | 'missing';

export type NodeKind = 'business' | 'decision' | 'system' | 'end';

export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  description: string;
  actor: Actor;
  kind?: NodeKind;
  route?: string;
  files?: string[];
  tables?: string[];
  edgeFunctions?: string[];
  webhooks?: string[];
  integrations?: string[];
  calledBy?: string[];
  callsTo?: string[];
  confidence: Confidence;
  risks?: string[];
  gaps?: string[];
  debugTrigger?: string;
  isHighlighted?: boolean;
  isFiltered?: boolean;
  isDimmed?: boolean;
  isActive?: boolean;
  debugMode?: boolean;
}

export const ACTOR_COLORS: Record<Actor, string> = {
  tenant: '#1E9A80',
  landlord: '#3B82F6',
  admin: '#1A1A1A',
  system: '#9CA3AF',
  payment: '#F59E0B',
  crypto: '#8B5CF6',
  booking: '#EC4899',
  integration: '#6B7280',
};

export const ACTOR_BG: Record<Actor, string> = {
  tenant: '#ECFDF5',
  landlord: '#EFF6FF',
  admin: '#F3F3EE',
  system: '#F9FAFB',
  payment: '#FFFBEB',
  crypto: '#F5F3FF',
  booking: '#FDF2F8',
  integration: '#F9FAFB',
};

export const ACTOR_LABELS: Record<Actor, string> = {
  tenant: 'Tenant',
  landlord: 'Landlord',
  admin: 'Admin',
  system: 'System',
  payment: 'Payment',
  crypto: 'Crypto',
  booking: 'Booking',
  integration: 'Integration',
};

export const CONFIDENCE_CONFIG: Record<Confidence, { label: string; color: string; dot: string }> = {
  confirmed: { label: 'Confirmed', color: '#1E9A80', dot: '#1E9A80' },
  likely: { label: 'Likely', color: '#3B82F6', dot: '#3B82F6' },
  unverified: { label: 'Unverified', color: '#F59E0B', dot: '#F59E0B' },
  missing: { label: 'Missing', color: '#EF4444', dot: '#EF4444' },
};
