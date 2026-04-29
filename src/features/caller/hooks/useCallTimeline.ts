// Caller — useCallTimeline.
// Reads the wk_call_timeline VIEW (UNION over wk_live_transcripts,
// wk_live_coach_events where status='final', sms_messages where call_id
// is set, and wk_activities where call_id is set). Used by the in-call
// LiveCallScreen and the post-call PastCallScreen.
// Ported from src/features/smsv2/hooks/useCallTimeline.ts.

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TimelineRow {
  call_id: string;
  ts: string;
  kind: 'transcript' | 'coach' | 'sms' | 'activity';
  body: string | null;
  subtype: string | null;
  ref_id: string | null;
  meta: Record<string, unknown> | null;
}

interface TimelineTable {
  from: (t: string) => {
    select: (c: string) => {
      eq: (c: string, v: string) => {
        order: (
          col: string,
          opts: { ascending: boolean }
        ) => Promise<{
          data: TimelineRow[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
  channel: (n: string) => {
    on: (
      ev: string,
      filter: { event: string; schema: string; table: string },
      cb: () => void
    ) => { subscribe: () => { unsubscribe: () => void } };
  };
  removeChannel: (c: unknown) => void;
}

export function useCallTimeline(callId: string | null) {
  const [items, setItems] = useState<TimelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!callId) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error: e } = await (supabase as unknown as TimelineTable)
        .from('wk_call_timeline')
        .select('call_id, ts, kind, body, subtype, ref_id, meta')
        .eq('call_id', callId)
        .order('ts', { ascending: false });
      if (e) setError(e.message);
      else setItems(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed');
    } finally {
      setLoading(false);
    }
  }, [callId]);

  useEffect(() => {
    let cancelled = false;
    void reload();

    if (!callId) return;

    const tables = [
      'wk_live_transcripts',
      'wk_live_coach_events',
      'sms_messages',
      'wk_activities',
    ] as const;
    const channels = tables.map((t) =>
      (supabase as unknown as TimelineTable)
        .channel(`caller-timeline:${callId}:${t}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: t },
          () => {
            if (!cancelled) void reload();
          }
        )
        .subscribe()
    );
    return () => {
      cancelled = true;
      for (const ch of channels) {
        try {
          (supabase as unknown as TimelineTable).removeChannel(ch);
        } catch {
          /* ignore */
        }
      }
    };
  }, [callId, reload]);

  return { items, loading, error, reload };
}
