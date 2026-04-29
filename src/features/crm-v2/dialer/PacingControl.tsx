// crm-v2 PacingControl — Manual / Auto-next dropdown + delay preset.
//
// Hugo Rule 3 (no forced auto-advance): default is Manual, Auto-next
// is opt-in per session, never persisted across sessions.

import { useDialer } from '../state/DialerProvider';
import type { PacingConfig } from '../state/sessionStore';

const DELAY_PRESETS = [0, 5, 10] as const;

export interface PacingControlProps {
  /** Per-campaign suggested default — surfaced as one of the menu
   *  options if it's not already a preset. Optional. */
  campaignDefaultSeconds?: number | null;
}

export default function PacingControl({
  campaignDefaultSeconds,
}: PacingControlProps) {
  const { session, setPacing } = useDialer();
  const { mode, delaySeconds } = session.pacing;

  const onModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as PacingConfig['mode'];
    setPacing({ mode: next, delaySeconds });
  };

  const onDelayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = parseInt(e.target.value, 10);
    if (Number.isFinite(v)) setPacing({ mode, delaySeconds: v });
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
          {DELAY_PRESETS.map((n) => (
            <option key={n} value={n}>
              {n === 0 ? 'No delay' : `${n}s delay`}
            </option>
          ))}
          {campaignDefaultSeconds !== null &&
            campaignDefaultSeconds !== undefined &&
            !DELAY_PRESETS.includes(campaignDefaultSeconds as 0 | 5 | 10) && (
              <option value={campaignDefaultSeconds}>
                Campaign default ({campaignDefaultSeconds}s)
              </option>
            )}
        </select>
      )}
    </div>
  );
}
