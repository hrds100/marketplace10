// useCalls — loads wk_calls (+ joined wk_recordings + wk_call_intelligence)
// for the current agent / admin scope. Maps DB rows to the existing
// CallRecord shape so CallsPage keeps working without major refactor.
//
// Recording URLs are NOT returned by this hook — call-recordings is a
// private bucket. Use signCallRecording(path) at click time to get a
// short-lived signed URL.

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CallRecord } from '../types';

interface WkCallRow {
  id: string;
  contact_id: string | null;
  agent_id: string | null;
  direction: 'inbound' | 'outbound';
  status: string;
  started_at: string | null;
  duration_sec: number | null;
  disposition_column_id: string | null;
  agent_note: string | null;
}

interface WkRecordingRow {
  call_id: string;
  storage_path: string | null;
  status: string;
}

interface WkIntelRow {
  call_id: string;
  summary: string | null;
}

interface WkCostRow {
  call_id: string;
  total_pence: number | null;
}

const STATUS_MAP: Record<string, CallRecord['status']> = {
  queued: 'ringing',
  ringing: 'ringing',
  in_progress: 'connected',
  completed: 'completed',
  busy: 'failed',
  no_answer: 'missed',
  failed: 'failed',
  canceled: 'missed',
  missed: 'missed',
  voicemail: 'voicemail',
};

export function rowToCall(
  row: WkCallRow,
  recording: WkRecordingRow | undefined,
  intel: WkIntelRow | undefined,
  cost: WkCostRow | undefined
): CallRecord {
  return {
    id: row.id,
    contactId: row.contact_id ?? '',
    agentId: row.agent_id ?? '',
    direction: row.direction,
    status: STATUS_MAP[row.status] ?? 'completed',
    startedAt: row.started_at ?? new Date().toISOString(),
    durationSec: row.duration_sec ?? 0,
    recordingUrl: recording?.storage_path ?? undefined,
    hasTranscript: false,
    aiSummary: intel?.summary ?? undefined,
    costPence: cost?.total_pence ?? 0,
    dispositionColumnId: row.disposition_column_id ?? undefined,
    agentNote: row.agent_note ?? undefined,
  };
}

export interface UseCallsResult {
  calls: CallRecord[];
  loading: boolean;
  error: string | null;
}

export function useCalls(): UseCallsResult {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [callsRes, recRes, intelRes, costRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_calls' as any) as any)
          .select(
            'id, contact_id, agent_id, direction, status, started_at, duration_sec, disposition_column_id, agent_note'
          )
          .order('started_at', { ascending: false })
          .limit(200),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_recordings' as any) as any).select('call_id, storage_path, status'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_call_intelligence' as any) as any).select('call_id, summary'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_voice_call_costs' as any) as any).select('call_id, total_pence'),
      ]);

      if (cancelled) return;

      if (callsRes.error) {
        setError(callsRes.error.message);
        setLoading(false);
        return;
      }

      const recById = new Map<string, WkRecordingRow>();
      for (const r of (recRes.data ?? []) as WkRecordingRow[]) recById.set(r.call_id, r);
      const intelById = new Map<string, WkIntelRow>();
      for (const i of (intelRes.data ?? []) as WkIntelRow[]) intelById.set(i.call_id, i);
      const costById = new Map<string, WkCostRow>();
      for (const c of (costRes.data ?? []) as WkCostRow[]) costById.set(c.call_id, c);

      setCalls(
        ((callsRes.data ?? []) as WkCallRow[]).map((row) =>
          rowToCall(row, recById.get(row.id), intelById.get(row.id), costById.get(row.id))
        )
      );
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { calls, loading, error };
}

/**
 * Sign a call-recordings storage path and return a short-lived URL.
 * Call this at click time, never store the result long-term.
 * Returns null if the path is missing or the bucket denies access.
 */
export async function signCallRecording(path: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('call-recordings')
      .createSignedUrl(path, 600); // 10 minutes
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}
