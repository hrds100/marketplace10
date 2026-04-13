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
  responseStatus: 'sent' | 'responded' | null;
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
  channel: 'sms' | 'whatsapp';
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
  automationId: string | null;
  automationEnabled: boolean;
  automationName: string | null;
  channel: 'sms' | 'whatsapp';
  createdAt: string;
}

export type SmsAutomationStateStatus = 'active' | 'suspended' | 'completed' | 'paused';

export interface SmsAutomationState {
  id: string;
  conversationId: string;
  automationId: string;
  currentNodeId: string;
  stepNumber: number;
  status: SmsAutomationStateStatus;
  lastMessageAt: string | null;
  startedAt: string;
  completedAt: string | null;
  exitReason: string | null;
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
  channel: 'sms' | 'whatsapp';
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
  maxRepliesPerLead?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SmsCampaign {
  id: string;
  name: string;
  batchName: string | null;
  templates: string[];
  messageBody: string;
  numberIds: string[];
  rotation: boolean;
  templateRotation: boolean;
  includeOptOut: boolean;
  status: 'draft' | 'scheduled' | 'sending' | 'paused' | 'complete' | 'cancelled';
  scheduledAt: string | null;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  skippedCount: number;
  sendSpeed: { min: number; max: number } | null;
  batchSize: number | null;
  followUp: {
    enabled: boolean;
    waitValue: number;
    waitUnit: 'seconds' | 'minutes' | 'hours' | 'days';
    message: string;
    maxFollowUps: number;
  } | null;
  automationId: string | null;
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

// Flow Editor Types (agencfront-style)
export enum SmsNodeType {
  DEFAULT = 'DEFAULT',
  STOP_CONVERSATION = 'STOP_CONVERSATION',
  FOLLOW_UP = 'FOLLOW_UP',
  TRANSFER = 'TRANSFER',
  LABEL = 'LABEL',
  MOVE_STAGE = 'MOVE_STAGE',
  WEBHOOK = 'WEBHOOK',
}

export enum SmsEdgeConditionOperator {
  CONTAIN = 'CONTAIN',
  DOES_NOT_CONTAIN = 'DOES_NOT_CONTAIN',
  EQUALS = 'EQUALS',
  DOES_NOT_EQUAL = 'DOES_NOT_EQUAL',
}

export enum SmsEdgeLogicalOperator {
  AND = 'AND',
  OR = 'OR',
}

export interface SmsEdgeCondition {
  operator: SmsEdgeLogicalOperator;
  field: string;
  conditionOperator: SmsEdgeConditionOperator;
  value: string;
}

export interface SmsEdgeData {
  label?: string;
  description?: string;
  conditions?: SmsEdgeCondition[];
  [key: string]: unknown;
}

export type TimeUnit = 'seconds' | 'minutes' | 'hours' | 'days';

export interface SmsFollowUpStep {
  id: string;
  name: string;
  waitMinutes: number;
  waitUnit?: TimeUnit;
  prompt?: string;
  text?: string;
}

export interface SmsNodeData {
  name: string;
  isStart?: boolean;
  prompt?: string;
  text?: string;
  delay?: number;
  steps?: SmsFollowUpStep[];
  assignTo?: string;
  labelId?: string;
  stageId?: string;
  webhookUrl?: string;
  webhookMethod?: string;
  modelOptions?: { temperature: number; model?: string };
  useGlobalSettings?: boolean;
  [key: string]: unknown;
}
