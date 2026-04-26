import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Lightbulb, HelpCircle, Activity, MessageSquare } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { MOCK_TRANSCRIPT, MOCK_COACH_EVENTS } from '../../data/mockTranscripts';
import { useKillSwitch } from '../../hooks/useKillSwitch';
import { useSmsV2 } from '../../store/SmsV2Store';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  durationSec: number;
  contactId: string;
  /** Server-side wk_calls.id — when set, subscribe to wk_live_transcripts
   *  and wk_live_coach_events for live data. Falls back to MOCK_* otherwise. */
  callId?: string | null;
}

interface LiveTranscriptRow {
  id: string;
  speaker: 'agent' | 'caller' | 'unknown';
  body: string;
  ts: string;
}

interface LiveCoachRow {
  id: string;
  kind: 'objection' | 'suggestion' | 'question' | 'metric' | 'warning';
  body: string;
  ts: string;
}

const COACH_ICONS = {
  objection: { Icon: AlertTriangle, colour: '#EF4444', label: '⚠ OBJECTION' },
  suggestion: { Icon: Lightbulb, colour: '#1E9A80', label: '💡 YOU COULD SAY' },
  question: { Icon: HelpCircle, colour: '#3B82F6', label: '❓ ASK' },
  warning: { Icon: Activity, colour: '#F59E0B', label: '📊 INSIGHT' },
};

// Hugo 2026-04-28: only the LATEST card matters for reading aloud.
// Older cards get visually demoted (smaller, dimmed, truncated) so the
// agent's eye snaps to the new line. Latest is fixed at 22px (sweet
// spot for fast-scan from the laptop while on a call) — older are
// 12px clamped to 2 lines.
const LATEST_BODY_CLASS = 'text-[22px] leading-[1.35] font-semibold tracking-[-0.005em]';
const OLDER_BODY_CLASS = 'text-[12px] leading-snug line-clamp-2';

export default function LiveTranscriptPane({ durationSec, contactId, callId }: Props) {
  const { aiCoach } = useKillSwitch();
  const store = useSmsV2();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [liveLines, setLiveLines] = useState<LiveTranscriptRow[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveCoachRow[]>([]);
  // Real contact name → first-name label for the caller side. Falls back
  // to "Caller" if we can't resolve a name (e.g. inbound from a number we
  // don't have a wk_contacts row for yet).
  const callerLabel = (() => {
    const c = store.getContact(contactId);
    const first = c?.name?.trim().split(/\s+/)[0];
    return first || 'Caller';
  })();
  // ?demo=1 in the URL keeps the legacy mock transcript reachable for
  // internal demos / Storybook screenshots. Default behaviour: show an
  // explicit empty state instead, so production calls never surface mock
  // text.
  const [searchParams] = useSearchParams();
  const demoMode = searchParams.get('demo') === '1';

  // Sticky note — auto-saved to store with 2s debounce
  const [note, setNote] = useState(store.getNote(contactId));
  useEffect(() => {
    setNote(store.getNote(contactId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);
  useEffect(() => {
    const handle = setTimeout(() => {
      if (note !== store.getNote(contactId)) {
        store.saveNote(contactId, note);
      }
    }, 2000);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note, contactId]);

  // Backfill any rows that already exist for this call (Twilio's first
  // transcript event can land in the DB while the UI is still in 'placing'
  // phase — i.e. BEFORE this component mounts/subscribes). Then subscribe
  // for new rows from now on.
  useEffect(() => {
    if (!callId) {
      setLiveLines([]);
      setLiveEvents([]);
      return;
    }

    let cancelled = false;

    void (async () => {
      const [tRes, cRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_live_transcripts' as any) as any)
          .select('id, speaker, body, ts')
          .eq('call_id', callId)
          .order('ts', { ascending: true }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_live_coach_events' as any) as any)
          .select('id, kind, body, ts')
          .eq('call_id', callId)
          .order('ts', { ascending: true }),
      ]);
      if (cancelled) return;
      if (tRes.data) setLiveLines(tRes.data as LiveTranscriptRow[]);
      if (cRes.data) setLiveEvents(cRes.data as LiveCoachRow[]);
    })();

    const tCh = supabase
      .channel(`live-transcripts:${callId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wk_live_transcripts',
          filter: `call_id=eq.${callId}`,
        },
        (payload: { new: LiveTranscriptRow }) => {
          // Dedupe in case the backfill SELECT and the realtime INSERT race.
          setLiveLines((prev) =>
            prev.some((l) => l.id === payload.new.id) ? prev : [...prev, payload.new]
          );
        }
      )
      .subscribe();
    // Subscribe to ALL changes (INSERT / UPDATE / DELETE) so the
    // streaming coach pipeline (PR #572 onwards) can morph a card in
    // place as tokens arrive, then DELETE if rejected by the
    // post-processor or superseded by a newer generation.
    const cCh = supabase
      .channel(`live-coach:${callId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wk_live_coach_events',
          filter: `call_id=eq.${callId}`,
        },
        (payload: {
          eventType?: string;
          new?: LiveCoachRow;
          old?: { id?: string };
        }) => {
          const evType = payload.eventType ?? '';
          if (evType === 'INSERT' && payload.new) {
            const next = payload.new;
            setLiveEvents((prev) =>
              prev.some((e) => e.id === next.id) ? prev : [...prev, next]
            );
          } else if (evType === 'UPDATE' && payload.new) {
            const next = payload.new;
            setLiveEvents((prev) =>
              prev.some((e) => e.id === next.id)
                ? prev.map((e) => (e.id === next.id ? { ...e, ...next } : e))
                : [...prev, next]
            );
          } else if (evType === 'DELETE' && payload.old?.id) {
            const oldId = payload.old.id;
            setLiveEvents((prev) => prev.filter((e) => e.id !== oldId));
          }
        }
      )
      .subscribe();
    return () => {
      cancelled = true;
      try { supabase.removeChannel(tCh); } catch { /* ignore */ }
      try { supabase.removeChannel(cCh); } catch { /* ignore */ }
    };
  }, [callId]);

  // Use live data when callId is present. Without a callId we render an
  // empty state in production. The legacy mock fallback is only allowed
  // when ?demo=1 is in the URL (internal demos / screenshots).
  const useLive = !!callId;
  const allowMock = !useLive && demoMode;
  const showEmptyState = !useLive && !demoMode;

  const lines = useLive
    ? liveLines.map((r) => ({
        id: r.id,
        speaker: r.speaker === 'agent' ? 'agent' : 'caller',
        text: r.body,
      }))
    : allowMock
      ? MOCK_TRANSCRIPT.filter((l) => l.ts <= Math.max(durationSec, 140))
      : [];
  const events = useLive
    ? liveEvents
        .filter((e) => e.kind === 'objection' || e.kind === 'suggestion'
          || e.kind === 'question' || e.kind === 'warning')
        .map((e) => ({
          id: e.id,
          kind: e.kind as 'objection' | 'suggestion' | 'question' | 'warning',
          title: '',
          body: e.body,
        }))
    : allowMock
      ? MOCK_COACH_EVENTS.filter((e) => e.ts <= Math.max(durationSec, 140))
      : [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines.length]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2.5 border-b border-[#E5E7EB] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#1E9A80] animate-pulse" />
          <span className="text-[12px] font-semibold text-[#1A1A1A]">Live transcript + AI coach</span>
        </div>
        <div className="text-[11px] text-[#6B7280] tabular-nums">
          You 62% / Them 38%
        </div>
      </div>

      {aiCoach && (
        <div className="mx-4 mt-3 p-2.5 bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg flex items-center gap-2 text-[12px] text-[#B91C1C]">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          AI coach offline — call and recording continue normally.
        </div>
      )}

      {/* Vertical resizable split (Hugo 2026-04-26):
            TOP    — transcript stream (smaller default — the agent doesn't
                     need to read every word back, it's the context).
            BOTTOM — coach cards (bigger default — this is what the agent
                     READS ALOUD; needs the most space + biggest text).
          autoSaveId persists drag widths per browser. */}
      <ResizablePanelGroup
        direction="vertical"
        autoSaveId="smsv2-livecall-transcript-coach"
        className="flex-1 overflow-hidden"
      >
        <ResizablePanel defaultSize={40} minSize={20} className="overflow-hidden">
          <div ref={scrollRef} className="h-full overflow-y-auto px-4 py-3 space-y-2">
            <div className="sticky top-0 -mt-3 -mx-4 px-4 py-1.5 mb-2 bg-white/95 backdrop-blur text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">
              Live transcript
            </div>
            {showEmptyState && (
              <div className="h-full flex flex-col items-center justify-center text-center px-6 py-10 text-[#9CA3AF]">
                <MessageSquare className="w-8 h-8 mb-3 opacity-40" />
                <div className="text-[13px] font-medium text-[#6B7280] mb-1">
                  No active call
                </div>
                <div className="text-[12px] leading-snug max-w-[280px]">
                  Live transcript will appear here once you place or receive a call.
                </div>
              </div>
            )}

            {lines.map((line) => (
              <div key={line.id} className="text-[13px] leading-relaxed">
                <span
                  className={
                    line.speaker === 'agent'
                      ? 'font-semibold text-[#1E9A80]'
                      : 'font-semibold text-[#1A1A1A]'
                  }
                >
                  {line.speaker === 'agent' ? 'You' : callerLabel}:
                </span>{' '}
                <span className="text-[#1A1A1A]">{line.text}</span>
              </div>
            ))}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={60} minSize={25} className="overflow-hidden">
          <div className="h-full overflow-y-auto px-4 py-3 space-y-2.5">
            <div className="sticky top-0 -mt-3 -mx-4 px-4 py-1.5 mb-2 bg-white/95 backdrop-blur text-[10px] font-bold uppercase tracking-wide text-[#1E9A80]">
              AI coach — read this aloud
            </div>
            {events.length === 0 && !aiCoach && (
              <div className="h-full flex flex-col items-center justify-center text-center px-6 py-10 text-[#9CA3AF]">
                <Lightbulb className="w-8 h-8 mb-3 opacity-40" />
                <div className="text-[12px] leading-snug max-w-[240px]">
                  Coach tips appear here when the caller speaks — exact words to read aloud.
                </div>
              </div>
            )}
            {events.length > 0 && !aiCoach && (
              [...events].reverse().map((event, idx) => {
                const meta = COACH_ICONS[event.kind];
                const isLatest = idx === 0;
                return (
                  <div
                    key={event.id}
                    className={cn(
                      'rounded-lg border bg-white transition-all',
                      isLatest
                        ? 'p-4 border-[#1E9A80] bg-[#ECFDF5]/50 shadow-[0_6px_24px_rgba(30,154,128,0.22)]'
                        : 'p-2 border-[#E5E7EB] opacity-55 hover:opacity-90'
                    )}
                    style={{ borderLeftColor: meta.colour, borderLeftWidth: isLatest ? 4 : 2 }}
                  >
                    <div
                      className={cn(
                        'font-bold tracking-wide flex items-center gap-2',
                        isLatest ? 'text-[10px] mb-2' : 'text-[9px] mb-0.5'
                      )}
                      style={{ color: meta.colour }}
                    >
                      <span>{meta.label}{event.title ? ` · ${event.title}` : ''}</span>
                      {isLatest && (
                        <span className="text-[9px] font-semibold uppercase bg-[#1E9A80] text-white px-1.5 py-0.5 rounded">
                          latest
                        </span>
                      )}
                    </div>
                    <div className={cn('text-[#1A1A1A]', isLatest ? LATEST_BODY_CLASS : OLDER_BODY_CLASS)}>
                      {event.body}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <div className="px-4 py-2 border-t border-[#E5E7EB] bg-[#F3F3EE]/40">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Quick note (auto-saves)…"
          className="w-full px-2 py-1.5 text-[12px] bg-white border border-[#E5E5E5] rounded-[10px] resize-none focus:outline-none focus:ring-1 focus:ring-[#1E9A80]/30 focus:border-[#1E9A80]"
          rows={2}
        />
      </div>
    </div>
  );
}
