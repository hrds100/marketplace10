// crm-v2 useTranscript — realtime live transcript for a call.
//
// Source: wk_live_transcripts INSERTs filtered by call_id. The
// edge function wk-voice-transcription writes one row per speech
// segment from Twilio's Real-Time Transcription stream.

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { realtime } from '../data/realtime';
import type { LiveTranscriptRow } from '../data/types';

export interface TranscriptLine {
  id: string;
  speaker: 'agent' | 'caller' | 'unknown';
  body: string;
  ts: string;
}

export function useTranscript(callId: string | null): {
  lines: TranscriptLine[];
  loading: boolean;
} {
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [loading, setLoading] = useState(true);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!callId) {
      setLines([]);
      setLoading(false);
      seen.current = new Set();
      return;
    }
    let cancelled = false;
    seen.current = new Set();

    void (async () => {
      // Initial backfill — pulls everything written so far for this call.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('wk_live_transcripts' as any) as any)
        .select('id, speaker, body, ts')
        .eq('call_id', callId)
        .order('ts', { ascending: true });
      if (cancelled) return;
      const rows = (data ?? []) as LiveTranscriptRow[];
      const initial: TranscriptLine[] = [];
      for (const r of rows) {
        if (seen.current.has(r.id)) continue;
        seen.current.add(r.id);
        initial.push({
          id: r.id,
          speaker: r.speaker,
          body: r.body,
          ts: r.ts,
        });
      }
      setLines(initial);
      setLoading(false);
    })();

    const unsub = realtime.liveTranscript(callId, (change) => {
      if (change.eventType !== 'INSERT') return;
      const row = change.new as LiveTranscriptRow;
      if (!row?.id || seen.current.has(row.id)) return;
      seen.current.add(row.id);
      setLines((prev) => [
        ...prev,
        {
          id: row.id,
          speaker: row.speaker,
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

  return { lines, loading };
}
