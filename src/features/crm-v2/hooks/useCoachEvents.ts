// crm-v2 useCoachEvents — realtime AI coach suggestions for a call.
//
// Source: wk_live_coach_events INSERTs. The edge function
// wk-voice-transcription generates these events from the
// three-layer coach prompt. Read-only here.

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { realtime } from '../data/realtime';
import type { LiveCoachEventRow } from '../data/types';

export interface CoachEvent {
  id: string;
  kind: string;
  title: string | null;
  body: string;
  ts: string;
}

export function useCoachEvents(callId: string | null): {
  events: CoachEvent[];
  loading: boolean;
} {
  const [events, setEvents] = useState<CoachEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!callId) {
      setEvents([]);
      setLoading(false);
      seen.current = new Set();
      return;
    }
    let cancelled = false;
    seen.current = new Set();

    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('wk_live_coach_events' as any) as any)
        .select('id, kind, title, body, ts')
        .eq('call_id', callId)
        .order('ts', { ascending: true });
      if (cancelled) return;
      const rows = (data ?? []) as LiveCoachEventRow[];
      const initial: CoachEvent[] = [];
      for (const r of rows) {
        if (seen.current.has(r.id)) continue;
        seen.current.add(r.id);
        initial.push({
          id: r.id,
          kind: r.kind,
          title: r.title,
          body: r.body,
          ts: r.ts,
        });
      }
      setEvents(initial);
      setLoading(false);
    })();

    const unsub = realtime.liveCoach(callId, (change) => {
      if (change.eventType !== 'INSERT') return;
      const row = change.new as LiveCoachEventRow;
      if (!row?.id || seen.current.has(row.id)) return;
      seen.current.add(row.id);
      setEvents((prev) => [
        ...prev,
        {
          id: row.id,
          kind: row.kind,
          title: row.title,
          body: row.body,
          ts: row.ts,
        },
      ]);
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [callId]);

  return { events, loading };
}
