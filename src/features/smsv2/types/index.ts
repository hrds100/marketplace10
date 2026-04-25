// smsv2 — sandbox calling + CRM workspace types
// All types are mock-only (Phase 0 UI). Backend wiring happens in Phase 1.

export type AgentStatus = 'available' | 'busy' | 'idle' | 'offline';
export type CallDirection = 'inbound' | 'outbound';
export type CallStatus =
  | 'ringing'
  | 'connected'
  | 'completed'
  | 'missed'
  | 'voicemail'
  | 'failed';

export interface Agent {
  id: string;
  name: string;
  email: string;
  extension: string;
  role: 'admin' | 'agent' | 'viewer';
  status: AgentStatus;
  callsToday: number;
  answeredToday: number;
  avgDurationSec: number;
  spendPence: number;
  limitPence: number;
  isAdmin?: boolean;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  ownerAgentId?: string;
  pipelineColumnId?: string;
  tags: string[];
  isHot: boolean;
  dealValuePence?: number;
  customFields: Record<string, string>;
  createdAt: string;
  lastContactAt?: string;
}

export interface SmsMessage {
  id: string;
  contactId: string;
  direction: CallDirection;
  body: string;
  sentAt: string;
  agentId?: string;
}

export interface CallRecord {
  id: string;
  contactId: string;
  agentId: string;
  direction: CallDirection;
  status: CallStatus;
  startedAt: string;
  durationSec: number;
  recordingUrl?: string;
  hasTranscript: boolean;
  aiSummary?: string;
  costPence: number;
  dispositionColumnId?: string;
  agentNote?: string;
}

export interface TranscriptLine {
  id: string;
  speaker: 'agent' | 'caller';
  text: string;
  ts: number; // seconds from call start
}

export interface CoachEvent {
  id: string;
  kind: 'objection' | 'suggestion' | 'question' | 'warning';
  title: string;
  body: string;
  ts: number;
}

export interface PipelineColumn {
  id: string;
  pipelineId: string;
  name: string;
  colour: string; // hex
  icon: string; // lucide name
  position: number; // 1-9 keyboard hint
  isDefaultOnTimeout?: boolean;
  automation: ColumnAutomation;
}

export interface ColumnAutomation {
  sendSms: boolean;
  smsTemplateId?: string;
  createTask: boolean;
  taskTitle?: string;
  taskDueInHours?: number;
  retryDial: boolean;
  retryInHours?: number;
  addTag: boolean;
  tag?: string;
  moveToPipelineId?: string;
}

export interface Pipeline {
  id: string;
  name: string;
  scope: string;
  columns: PipelineColumn[];
}

export interface Campaign {
  id: string;
  name: string;
  pipelineId: string;
  ownerAgentId: string;
  totalLeads: number;
  doneLeads: number;
  connectedLeads: number;
  voicemailLeads: number;
  mode: 'parallel' | 'power' | 'manual';
  parallelLines: number;
  aiCoachEnabled: boolean;
  aiCoachPromptId?: string;
  scriptMd?: string;
  autoAdvanceSeconds: number;
}

export interface SmsTemplate {
  id: string;
  name: string;
  bodyMd: string;
  mergeFields: string[];
}

export interface NumberRecord {
  id: string;
  e164: string;
  label: string;
  capabilities: ('voice' | 'sms')[];
  assignedAgentId?: string;
  rotationPoolId?: string;
  maxCallsPerMinute: number;
  cooldownSecondsAfterCall: number;
  recordingEnabled: boolean;
}

export interface KillSwitch {
  id: string;
  kind: 'all_dialers' | 'agent_dialer' | 'ai_coach' | 'outbound';
  scopeAgentId?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  reason?: string;
}

export interface ActivityEvent {
  id: string;
  contactId: string;
  kind:
    | 'call_inbound'
    | 'call_outbound'
    | 'call_missed'
    | 'sms_inbound'
    | 'sms_outbound'
    | 'voicemail'
    | 'note'
    | 'stage_moved'
    | 'tag_added'
    | 'task_created'
    | 'outcome_applied';
  title: string;
  body?: string;
  ts: string;
  agentId?: string;
  refId?: string;
}

export interface Task {
  id: string;
  contactId: string;
  title: string;
  dueAt: string;
  assignedAgentId: string;
  done: boolean;
}

export interface DialerLeg {
  id: string;
  line: number;
  contactId: string;
  contactName: string;
  phone: string;
  status: 'dialing' | 'ringing' | 'connecting' | 'connected' | 'voicemail' | 'no_answer';
  startedAt: number;
}
