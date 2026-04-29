// crm-v2 row types — narrow shapes the dialer reads from Supabase.
//
// We don't import from the auto-generated Database type because the
// generated types include every column on every table; the dialer only
// needs a small subset, and pinning the subset here makes contract
// drift catchable in api.contract.test.ts.

export interface CallRow {
  id: string;
  contact_id: string | null;
  campaign_id: string | null;
  agent_id: string | null;
  to_e164: string | null;
  status:
    | 'queued'
    | 'ringing'
    | 'in_progress'
    | 'completed'
    | 'busy'
    | 'no_answer'
    | 'failed'
    | 'canceled'
    | 'missed'
    | 'voicemail';
  started_at: string | null;
  ended_at: string | null;
  duration_sec: number | null;
  twilio_call_sid: string | null;
  agent_note: string | null;
  disposition_column_id: string | null;
}

export interface DialerQueueRow {
  id: string;
  contact_id: string;
  campaign_id: string;
  agent_id: string | null;
  status: 'pending' | 'dialing' | 'connected' | 'voicemail' | 'missed' | 'done' | 'skipped';
  priority: number;
  attempts: number;
  scheduled_for: string | null;
}

export interface ContactRow {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  pipeline_column_id: string | null;
  is_hot: boolean | null;
}

export interface CampaignRow {
  id: string;
  name: string;
  is_active: boolean;
  parallel_lines: number;
  auto_advance_seconds: number | null;
}

export interface PipelineColumnRow {
  id: string;
  name: string;
  position: number;
  colour: string | null;
  icon: string | null;
}

export interface LiveTranscriptRow {
  id: string;
  call_id: string;
  speaker: 'agent' | 'caller' | 'unknown';
  body: string;
  ts: string;
}

export interface LiveCoachEventRow {
  id: string;
  call_id: string;
  kind: string;
  title: string | null;
  body: string;
  ts: string;
}

export interface RecordingRow {
  call_id: string;
  storage_path: string | null;
  status: 'pending' | 'uploading' | 'ready' | 'failed';
}

export interface AgentLimitsRow {
  agent_id: string;
  daily_limit_pence: number | null;
  daily_spend_pence: number;
  is_admin: boolean;
}

// ─── Edge function I/O contracts ────────────────────────────────────

export interface VoiceTokenResponse {
  token: string;
  identity: string;
  ttl_seconds: number;
  extension: string | null;
}

export interface CallsCreateRequest {
  to_phone: string;
  contact_id?: string | null;
  campaign_id?: string | null;
}

export type CallsCreateResponse =
  | {
      allowed: true;
      call_id: string;
      from_e164: string;
      to_e164: string;
    }
  | {
      allowed: false;
      reason: string;
      daily_spend_pence?: number;
      daily_limit_pence?: number;
    };

export interface LeadsNextRequest {
  campaign_id: string;
}

export type LeadsNextResponse =
  | { empty: true }
  | {
      empty?: false;
      contact_id: string;
      queue_id: string;
      campaign_id: string;
    };

export interface OutcomeApplyRequest {
  call_id: string;
  contact_id: string;
  column_id: string;
  agent_note?: string | null;
}

export interface OutcomeApplyResponse {
  applied?: string[];
  column_id?: string;
}

export interface HangupLegRequest {
  call_id: string;
}

export interface HangupLegResponse {
  ok?: boolean;
  status?: string;
  already_terminal?: boolean;
}
