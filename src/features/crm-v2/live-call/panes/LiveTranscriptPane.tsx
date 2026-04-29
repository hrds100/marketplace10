// crm-v2 LiveTranscriptPane — center column during a live call.
//
// Renders wk_live_transcripts via useTranscript + wk_live_coach_events
// via useCoachEvents, interleaved by timestamp so the agent sees the
// transcript and the coach's interventions in the same scroll feed.

import { useEffect, useMemo, useRef } from 'react';
import { useDialer } from '../../state/DialerProvider';
import { useTranscript } from '../../hooks/useTranscript';
import { useCoachEvents } from '../../hooks/useCoachEvents';

interface FeedItem {
  kind: 'transcript' | 'coach';
  id: string;
  ts: string;
  speaker?: 'agent' | 'caller' | 'unknown';
  body: string;
  title?: string | null;
}

export default function LiveTranscriptPane() {
  const { call, callPhase } = useDialer();
  const callId = call?.callId ?? null;
  const { lines, loading: transcriptLoading } = useTranscript(callId);
  const { events, loading: coachLoading } = useCoachEvents(callId);

  const feed = useMemo<FeedItem[]>(() => {
    const t: FeedItem[] = lines.map((l) => ({
      kind: 'transcript' as const,
      id: l.id,
      ts: l.ts,
      speaker: l.speaker,
      body: l.body,
    }));
    const c: FeedItem[] = events.map((e) => ({
      kind: 'coach' as const,
      id: e.id,
      ts: e.ts,
      body: e.body,
      title: e.title,
    }));
    return [...t, ...c].sort((a, b) =>
      a.ts === b.ts ? 0 : a.ts < b.ts ? -1 : 1
    );
  }, [lines, events]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [feed.length]);

  if (!callId) {
    return (
      <div
        className="flex-1 p-6 text-[12px] text-[#9CA3AF] italic flex items-center justify-center"
        data-testid="incall-transcript-pane"
      >
        Transcript appears once the call connects.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="incall-transcript-pane">
      <div className="px-4 py-2 border-b border-[#E5E7EB] flex items-center justify-between">
        <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wide">
          Live transcript
        </h3>
        <span className="text-[10px] text-[#9CA3AF] tabular-nums">
          {lines.length} lines · {events.length} coach
        </span>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
      >
        {(transcriptLoading || coachLoading) && feed.length === 0 && (
          <div className="text-[11px] text-[#9CA3AF] italic">
            Waiting for transcription stream…
          </div>
        )}
        {!transcriptLoading && !coachLoading && feed.length === 0 && (
          <div className="text-[11px] text-[#9CA3AF] italic">
            {callPhase === 'in_call'
              ? 'Listening…'
              : 'Transcript appears once the call connects.'}
          </div>
        )}
        {feed.map((item) =>
          item.kind === 'transcript' ? (
            <div key={item.id} className="text-[12px] leading-snug">
              <span
                className={
                  item.speaker === 'agent'
                    ? 'font-semibold text-[#1E9A80]'
                    : item.speaker === 'caller'
                      ? 'font-semibold text-[#1A1A1A]'
                      : 'font-semibold text-[#9CA3AF]'
                }
              >
                {item.speaker === 'agent'
                  ? 'You:'
                  : item.speaker === 'caller'
                    ? 'Caller:'
                    : '•'}
              </span>{' '}
              <span className="text-[#1A1A1A]">{item.body}</span>
            </div>
          ) : (
            <div
              key={item.id}
              className="text-[12px] leading-snug bg-[#FEF3C7] border-l-2 border-[#F59E0B] px-2 py-1 rounded"
            >
              <span className="font-semibold text-[#B45309]">
                ⚡ {item.title || 'Coach'}:
              </span>{' '}
              <span className="text-[#1A1A1A]">{item.body}</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
