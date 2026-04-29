// PacingControl — Phase 2 pacing config.
// Lets the agent pick manual vs auto-next + delay seconds. Phase 2
// PERSISTS the choice to DialerSessionProvider but does NOT yet act on
// it — the auto-next pacing-timer effect lives in ActiveCallProvider
// and is intentionally deferred to Phase 3 (see LOG.md). Selecting
// "auto-next" here is a UX preview; the agent must still click Call.

import { useDialerSession } from '../../store/dialerSessionProvider';

const PRESET_DELAYS = [0, 5, 10, 30] as const;

export default function PacingControl() {
  const session = useDialerSession();

  return (
    <div
      data-feature="CALLER__PACING_CONTROL"
      className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex flex-wrap items-center gap-3 text-[12px]"
    >
      <span className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
        Pacing
      </span>
      <div className="inline-flex rounded-[10px] border border-[#E5E7EB] overflow-hidden">
        <button
          type="button"
          onClick={() =>
            session.setPacing({
              mode: 'manual',
              delaySeconds: session.pacing.delaySeconds,
            })
          }
          className={`px-3 py-1.5 ${session.pacing.mode === 'manual' ? 'bg-[#1E9A80] text-white' : 'bg-white text-[#1A1A1A] hover:bg-[#F3F3EE]'}`}
        >
          Manual
        </button>
        <button
          type="button"
          onClick={() =>
            session.setPacing({
              mode: 'auto_next',
              delaySeconds: session.pacing.delaySeconds || 5,
            })
          }
          className={`px-3 py-1.5 ${session.pacing.mode === 'auto_next' ? 'bg-[#1E9A80] text-white' : 'bg-white text-[#1A1A1A] hover:bg-[#F3F3EE]'}`}
        >
          Auto next
        </button>
      </div>

      {session.pacing.mode === 'auto_next' && (
        <div className="flex items-center gap-2">
          <span className="text-[#6B7280]">delay</span>
          {PRESET_DELAYS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() =>
                session.setPacing({ mode: 'auto_next', delaySeconds: s })
              }
              className={`px-2 py-1 rounded-full font-semibold ${session.pacing.delaySeconds === s ? 'bg-[#ECFDF5] text-[#1E9A80]' : 'text-[#6B7280] hover:bg-[#F3F3EE]'}`}
            >
              {s}s
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => (session.paused ? session.resume() : session.pause())}
        className={`ml-auto text-[11px] font-semibold px-3 py-1.5 rounded-[10px] border ${session.paused ? 'border-[#1E9A80] text-[#1E9A80] bg-[#ECFDF5]' : 'border-[#E5E7EB] text-[#1A1A1A] bg-white hover:bg-[#F3F3EE]'}`}
      >
        {session.paused ? '▶ Resume session' : '⏸ Pause session'}
      </button>
    </div>
  );
}
