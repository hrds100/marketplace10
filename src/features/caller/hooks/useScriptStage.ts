// Caller — useScriptStage.
// Tracks the agent's position through the parsed script in real time.
// Subscribes to wk_live_transcripts (agent rows) for the active call,
// runs matchChunkToBlock against the parsed blocks, and advances the
// stage cursor. Sequential-only (cannot snap back to earlier blocks).

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parseBlocks, type Block } from '../lib/scriptParser';
import { matchChunkToBlock } from '../lib/scriptMatcher';

interface TranscriptRow {
  id: string;
  call_id: string;
  speaker: string | null;
  text: string | null;
  ts: string | null;
}

export function useScriptStage(callId: string | null, scriptMd: string | null) {
  const blocks = useMemo<Block[]>(
    () => (scriptMd ? parseBlocks(scriptMd) : []),
    [scriptMd]
  );
  const [stageIdx, setStageIdx] = useState(0);
  const stageRef = useRef(stageIdx);
  stageRef.current = stageIdx;

  useEffect(() => {
    setStageIdx(0);
  }, [callId, scriptMd]);

  useEffect(() => {
    if (!callId || blocks.length === 0) return;
    let cancelled = false;
    let processed = new Set<string>();

    const consume = (chunk: string) => {
      const r = matchChunkToBlock(chunk, blocks, stageRef.current);
      if (r.matchedIdx !== null && r.matchedIdx > stageRef.current) {
        setStageIdx(r.matchedIdx);
      }
    };

    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('wk_live_transcripts' as any) as any)
        .select('id, call_id, speaker, text, ts')
        .eq('call_id', callId)
        .eq('speaker', 'agent')
        .order('ts', { ascending: true })
        .limit(200);
      if (cancelled) return;
      for (const r of (data ?? []) as TranscriptRow[]) {
        if (r.text) {
          processed.add(r.id);
          consume(r.text);
        }
      }
    })();

    const ch = supabase
      .channel(`caller-script-stage-${callId}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wk_live_transcripts',
          filter: `call_id=eq.${callId}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const row = payload.new as TranscriptRow | undefined;
          if (!row || !row.text || row.speaker !== 'agent') return;
          if (processed.has(row.id)) return;
          processed.add(row.id);
          consume(row.text);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      try { void supabase.removeChannel(ch); } catch { /* ignore */ }
    };
  }, [callId, blocks]);

  return { blocks, stageIdx };
}
