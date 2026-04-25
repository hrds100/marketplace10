import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Lightbulb, HelpCircle, Activity } from 'lucide-react';
import { MOCK_TRANSCRIPT, MOCK_COACH_EVENTS } from '../../data/mockTranscripts';
import { useKillSwitch } from '../../hooks/useKillSwitch';
import { useSmsV2 } from '../../store/SmsV2Store';

interface Props {
  durationSec: number;
  contactId: string;
}

const COACH_ICONS = {
  objection: { Icon: AlertTriangle, colour: '#EF4444', label: '⚠ OBJECTION' },
  suggestion: { Icon: Lightbulb, colour: '#1E9A80', label: '💡 SAY' },
  question: { Icon: HelpCircle, colour: '#3B82F6', label: '❓ ASK' },
  warning: { Icon: Activity, colour: '#F59E0B', label: '📊 INSIGHT' },
};

export default function LiveTranscriptPane({ durationSec, contactId }: Props) {
  const { aiCoach } = useKillSwitch();
  const store = useSmsV2();
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Show transcript lines that have already happened (ts <= durationSec) — caps to all in mock.
  const lines = MOCK_TRANSCRIPT.filter((l) => l.ts <= Math.max(durationSec, 140));
  const events = MOCK_COACH_EVENTS.filter((e) => e.ts <= Math.max(durationSec, 140));

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

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {lines.map((line) => (
          <div key={line.id} className="text-[13px] leading-relaxed">
            <span
              className={
                line.speaker === 'agent'
                  ? 'font-semibold text-[#1E9A80]'
                  : 'font-semibold text-[#1A1A1A]'
              }
            >
              {line.speaker === 'agent' ? 'You' : 'Sarah'}:
            </span>{' '}
            <span className="text-[#1A1A1A]">{line.text}</span>
          </div>
        ))}

        {events.length > 0 && !aiCoach && (
          <div className="mt-3 space-y-2">
            <div className="border-t border-[#E5E7EB] pt-3" />
            {events.map((event) => {
              const meta = COACH_ICONS[event.kind];
              return (
                <div
                  key={event.id}
                  className="p-3 rounded-lg border border-[#E5E7EB] bg-white"
                  style={{ borderLeftColor: meta.colour, borderLeftWidth: 3 }}
                >
                  <div
                    className="text-[10px] font-bold tracking-wide mb-0.5"
                    style={{ color: meta.colour }}
                  >
                    {meta.label} · {event.title}
                  </div>
                  <div className="text-[12px] text-[#1A1A1A] leading-snug">{event.body}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
