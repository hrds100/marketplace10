// Caller — useCallDetail.
// Fetches recording + AI summary + cost for a single call_id. Used by
// PastCallScreen. Realtime so the AI summary appears as soon as
// wk-ai-postcall writes it.

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RecordingRow {
  call_id: string;
  storage_path: string | null;
  status: string | null;
  duration_sec: number | null;
}

interface IntelRow {
  call_id: string;
  summary: string | null;
  next_steps: string | null;
}

interface CostRow {
  call_id: string;
  total_pence: number | null;
}

export interface CallDetail {
  recordingUrl: string | null;
  recordingStatus: string | null;
  recordingDurationSec: number | null;
  aiSummary: string | null;
  aiNextSteps: string | null;
  costPence: number | null;
}

export function useCallDetail(callId: string | null) {
  const [detail, setDetail] = useState<CallDetail>({
    recordingUrl: null,
    recordingStatus: null,
    recordingDurationSec: null,
    aiSummary: null,
    aiNextSteps: null,
    costPence: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!callId) {
      setLoading(false);
      return;
    }

    async function load() {
      const [recRes, intelRes, costRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_recordings' as any) as any)
          .select('call_id, storage_path, status, duration_sec')
          .eq('call_id', callId)
          .maybeSingle(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_call_intelligence' as any) as any)
          .select('call_id, summary, next_steps')
          .eq('call_id', callId)
          .maybeSingle(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_voice_call_costs' as any) as any)
          .select('call_id, total_pence')
          .eq('call_id', callId)
          .maybeSingle(),
      ]);
      if (cancelled) return;

      const rec = (recRes.data as RecordingRow | null) ?? null;
      const intel = (intelRes.data as IntelRow | null) ?? null;
      const cost = (costRes.data as CostRow | null) ?? null;

      let recordingUrl: string | null = null;
      if (rec?.storage_path) {
        try {
          const { data: signed } = await supabase.storage
            .from('wk-recordings')
            .createSignedUrl(rec.storage_path, 60 * 60);
          if (cancelled) return;
          recordingUrl = signed?.signedUrl ?? null;
        } catch {
          recordingUrl = null;
        }
      }

      setDetail({
        recordingUrl,
        recordingStatus: rec?.status ?? null,
        recordingDurationSec: rec?.duration_sec ?? null,
        aiSummary: intel?.summary ?? null,
        aiNextSteps: intel?.next_steps ?? null,
        costPence: cost?.total_pence ?? null,
      });
      setLoading(false);
    }

    void load();

    const ch = supabase
      .channel(`caller-call-detail-${callId}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'wk_call_intelligence',
          filter: `call_id=eq.${callId}`,
        },
        () => void load()
      )
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'wk_recordings',
          filter: `call_id=eq.${callId}`,
        },
        () => void load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      try { void supabase.removeChannel(ch); } catch { /* ignore */ }
    };
  }, [callId]);

  return { detail, loading };
}
