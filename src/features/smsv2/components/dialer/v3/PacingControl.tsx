// PR 153 (Hugo 2026-04-29): pacing dropdown for the v3 overview header.
//
// Hugo Rule 3 (no forced auto-advance): default = Manual. Auto-next is
// opt-in per session, never persisted. Campaign `auto_advance_seconds`
// is shown as a *suggested default* — not authoritative.
//
// Mode = Manual | Auto-next.
// Delay = 0 / 5 / 10 / Custom (in seconds, 0–60). Hidden when Manual.

import { useDialerSession } from '../../../hooks/useDialerSession';
import type { PacingMode } from '../../../lib/dialerSession.types';

export interface PacingControlProps {
  /** Per-campaign suggested default (not authoritative). Surfaced as
   *  one of the menu options. */
  campaignDefaultSeconds?: number | null;
}

const PRESETS = [0, 5, 10] as const;

export default function PacingControl({
  campaignDefaultSeconds,
}: PacingControlProps) {
  const session = useDialerSession();
  const { mode, delaySeconds } = session.pacing;

  const onModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as PacingMode;
    session.setPacing({ mode: next, delaySeconds });
  };

  const onDelayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = parseInt(e.target.value, 10);
    if (Number.isFinite(v)) session.setPacing({ mode, delaySeconds: v });
  };

  return (
    <div
      className="flex items-center gap-2"
      data-testid="pacing-control"
      data-mode={mode}
      data-delay-seconds={delaySeconds}
    >
      <label className="text-[11px] text-[#6B7280] font-medium">Pacing</label>
      <select
        value={mode}
        onChange={onModeChange}
        className="px-2 py-1 text-[12px] bg-white border border-[#E5E7EB] rounded-[8px] cursor-pointer"
        data-testid="pacing-mode"
      >
        <option value="manual">Manual</option>
        <option value="auto_next">Auto-next</option>
      </select>
      {mode === 'auto_next' && (
        <select
          value={delaySeconds}
          onChange={onDelayChange}
          className="px-2 py-1 text-[12px] bg-white border border-[#E5E7EB] rounded-[8px] cursor-pointer"
          data-testid="pacing-delay"
          title="Seconds between calls"
        >
          {PRESETS.map((n) => (
            <option key={n} value={n}>
              {n === 0 ? 'No delay' : `${n}s delay`}
            </option>
          ))}
          {campaignDefaultSeconds &&
            !PRESETS.includes(campaignDefaultSeconds as 0 | 5 | 10) && (
              <option value={campaignDefaultSeconds}>
                Campaign default ({campaignDefaultSeconds}s)
              </option>
            )}
        </select>
      )}
    </div>
  );
}
