import { useEffect, useState } from 'react';
import {
  Sparkles,
  Clock,
  PhoneMissed,
  X,
  Voicemail,
  Ban,
  Pause,
  SkipForward,
  Phone,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACTIVE_PIPELINE } from '../../data/mockPipelines';
import { MOCK_TEMPLATES } from '../../data/mockCampaigns';
import { useActiveCallCtx } from './ActiveCallContext';

const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  Clock,
  PhoneMissed,
  X,
  Voicemail,
  Ban,
};

const AUTO_ADVANCE_SECONDS = 10;

export default function PostCallPanel() {
  const { applyOutcome, call } = useActiveCallCtx();
  const [secondsLeft, setSecondsLeft] = useState(AUTO_ADVANCE_SECONDS);
  const [paused, setPaused] = useState(false);
  const [appliedToast, setAppliedToast] = useState<string | null>(null);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [paused]);

  useEffect(() => {
    if (secondsLeft === 0 && !paused) {
      const def = ACTIVE_PIPELINE.columns.find((c) => c.isDefaultOnTimeout);
      if (def) handleClick(def.id, def.name);
    }
  }, [secondsLeft, paused]);

  const handleClick = (columnId: string, columnName: string) => {
    const col = ACTIVE_PIPELINE.columns.find((c) => c.id === columnId);
    const badges: string[] = [];
    if (col?.automation.sendSms) badges.push('SMS sent');
    if (col?.automation.createTask) badges.push('Task created');
    if (col?.automation.retryDial)
      badges.push(`Retry in ${col.automation.retryInHours}h`);
    if (col?.automation.addTag) badges.push(`Tag +${col.automation.tag}`);
    setAppliedToast(`Moved to ${columnName} · ${badges.join(' · ')}`);
    setTimeout(() => {
      applyOutcome(columnId);
    }, 800);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (appliedToast) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9) {
        const col = ACTIVE_PIPELINE.columns.find((c) => c.position === num);
        if (col) handleClick(col.id, col.name);
      } else if (e.key.toLowerCase() === 'p') {
        setPaused((p) => !p);
      } else if (e.key.toLowerCase() === 's') {
        applyOutcome('skipped');
      } else if (e.key.toLowerCase() === 'n') {
        applyOutcome('next-now');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedToast]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#1E9A80]" />
        <span className="text-[13px] font-semibold text-[#1A1A1A]">
          ✅ Call ended · {call?.contactName} · Recording saved
        </span>
      </div>

      {appliedToast && (
        <div className="mx-5 mt-4 p-3 bg-[#ECFDF5] border border-[#1E9A80]/30 rounded-xl text-[13px] text-[#1E9A80] font-medium flex items-center gap-2 animate-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4" /> {appliedToast}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-3">
          ⚡ Pick an outcome — pipeline columns
        </div>

        <div className="grid grid-cols-2 gap-3">
          {ACTIVE_PIPELINE.columns.map((col) => {
            const Icon = ICON_MAP[col.icon] ?? Sparkles;
            const badges: string[] = [];
            if (col.automation.sendSms) badges.push('+SMS');
            if (col.automation.createTask) badges.push('+task');
            if (col.automation.retryDial) badges.push(`+retry ${col.automation.retryInHours}h`);
            if (col.automation.addTag) badges.push(`+tag`);
            return (
              <button
                key={col.id}
                onClick={() => handleClick(col.id, col.name)}
                disabled={!!appliedToast}
                className={cn(
                  'group p-3 rounded-2xl border-2 text-left bg-white hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all',
                  'border-[#E5E7EB] hover:border-[#1E9A80]/50',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                style={
                  {
                    '--col-colour': col.colour,
                  } as React.CSSProperties
                }
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${col.colour}1A`, color: col.colour }}
                  >
                    <Icon className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-[#9CA3AF] tabular-nums">
                        {col.position}.
                      </span>
                      <span className="text-[14px] font-semibold text-[#1A1A1A] truncate">
                        {col.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#6B7280] mt-1 leading-tight">
                      {badges.length > 0 ? badges.join(' · ') : 'Logged · no automation'}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick SMS / note row */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-1.5">
              Quick SMS (override)
            </div>
            <select className="w-full px-2 py-2 text-[13px] bg-white border border-[#E5E5E5] rounded-[10px]">
              <option value="">Pick template…</option>
              {MOCK_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-1.5">
              Quick note
            </div>
            <input
              placeholder="Add a note…"
              className="w-full px-2 py-2 text-[13px] bg-white border border-[#E5E5E5] rounded-[10px]"
            />
          </div>
        </div>
      </div>

      {/* Footer auto-advance */}
      <div className="px-5 py-3 border-t border-[#E5E7EB] bg-[#F3F3EE]/50 flex items-center gap-3">
        <div className="flex-1 text-[12px] text-[#6B7280]">
          {paused ? (
            <span>Paused — pick when ready</span>
          ) : (
            <>
              Next call in{' '}
              <span className="text-[#1A1A1A] font-semibold tabular-nums">
                0:{secondsLeft.toString().padStart(2, '0')}
              </span>
            </>
          )}
          <span className="ml-2 text-[10px] text-[#9CA3AF]">
            ⌨ 1–9 · S skip · P pause · N call now
          </span>
        </div>
        <button
          onClick={() => setPaused((p) => !p)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border border-[#E5E7EB] text-[12px] font-medium text-[#6B7280] hover:bg-white"
        >
          <Pause className="w-3.5 h-3.5" /> {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          onClick={() => applyOutcome('skipped')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border border-[#E5E7EB] text-[12px] font-medium text-[#6B7280] hover:bg-white"
        >
          <SkipForward className="w-3.5 h-3.5" /> Skip
        </button>
        <button
          onClick={() => applyOutcome('next-now')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#1E9A80] text-white text-[12px] font-semibold hover:bg-[#1E9A80]/90 shadow-[0_4px_12px_rgba(30,154,128,0.35)]"
        >
          <Phone className="w-3.5 h-3.5" /> Call now
        </button>
      </div>
    </div>
  );
}
