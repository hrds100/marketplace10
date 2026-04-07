// SMS Inbox — TypeScript interfaces

export interface SmsLabel {
  id: string;
  name: string;
  colour: string;
  position: number;
}

export interface SmsPipelineStage {
  id: string;
  name: string;
  colour: string;
  position: number;
}

export interface SmsContact {
  id: string;
  phoneNumber: string;
  displayName: string | null;
  labels: SmsLabel[];
  pipelineStageId: string | null;
  notes: string;
  assignedTo: string | null;
  optedOut: boolean;
  batchName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SmsMessage {
  id: string;
  twilioSid: string;
  fromNumber: string;
  toNumber: string;
  body: string;
  direction: 'inbound' | 'outbound';
  status: 'scheduled' | 'queued' | 'sent' | 'delivered' | 'undelivered' | 'failed' | 'received';
  mediaUrls: string[];
  numberId: string;
  contactId: string;
  campaignId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  scheduledAt: string | null;
  createdAt: string;
}

export interface SmsConversation {
  id: string;
  contactId: string;
  contact: SmsContact;
  numberId: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCount: number;
  isArchived: boolean;
  isLockedBy: string | null;
  lockedAt: string | null;
  createdAt: string;
}

export interface SmsTemplate {
  id: string;
  name: string;
  body: string;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SmsPhoneNumber {
  id: string;
  twilioSid: string;
  phoneNumber: string;
  label: string;
  isDefault: boolean;
  webhookUrl: string;
  messageCount: number;
  createdAt: string;
}

export interface SmsAutomation {
  id: string;
  name: string;
  description: string | null;
  flowJson: Record<string, unknown> | null;
  triggerType: 'new_message' | 'keyword' | 'time_based';
  triggerConfig: {
    keywords?: string[];
    numbers?: string[];
    timeRange?: { start: string; end: string };
  };
  isActive: boolean;
  lastRunAt: string | null;
  runCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SmsCampaign {
  id: string;
  name: string;
  batchName: string | null;
  messageBody: string;
  numberIds: string[];
  rotation: boolean;
  includeOptOut: boolean;
  status: 'draft' | 'scheduled' | 'sending' | 'complete' | 'cancelled';
  scheduledAt: string | null;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: string;
}

export interface SmsCampaignRecipient {
  id: string;
  campaignId: string;
  contactId: string;
  contact: SmsContact;
  messageId: string | null;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'skipped_opt_out';
  sentAt: string | null;
}

export interface SmsQuickReply {
  id: string;
  label: string;
  body: string;
  position: number;
}

export interface SmsTeamMember {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'agent';
}

export interface SmsInternalNote {
  id: string;
  conversationId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface SmsDashboardStats {
  messagesToday: { sent: number; received: number };
  unreadCount: number;
  activeAutomations: number;
  deliveryRate: number;
  dailyMessages: Array<{ date: string; sent: number; received: number }>;
  statusBreakdown: Array<{ status: string; count: number; colour: string }>;
}

// React Flow node types for automation builder
export type SmsFlowNodeType =
  | 'trigger'
  | 'ai_response'
  | 'condition'
  | 'delay'
  | 'label'
  | 'transfer'
  | 'template'
  | 'webhook'
  | 'move_stage';

export interface SmsFlowNodeData {
  type: SmsFlowNodeType;
  label: string;
  config: Record<string, unknown>;
}
