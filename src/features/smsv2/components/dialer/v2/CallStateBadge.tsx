// PR 140 (Hugo 2026-04-28): the BIG, unambiguous state pill that
// dominates the new in-call header. Reads dialerUiState helpers, so
// every consumer renders the same labels / colours / pulses.
//
// Hugo's rule: an agent should never have to guess whether the call is
// ringing, connected, or already over. This badge answers that in one
// glance.

import { cn } from '@/lib/utils';
import {
  uiStateLabel,
  uiStateTone,
  uiStatePulse,
  toneClasses,
  type DialerUiState,
} from '../../../lib/dialerUiState';

export interface CallStateBadgeProps {
  state: DialerUiState;
  /** Optional secondary text — e.g. ringing timer, call duration. */
  meta?: string | null;
  /** "lg" for the in-call header, "sm" for the pre-call/minimised pill. */
  size?: 'sm' | 'lg';
  className?: string;
}

export default function CallStateBadge({
  state,
  meta,
  size = 'lg',
  className,
}: CallStateBadgeProps) {
  const tone = uiStateTone(state);
  const palette = toneClasses(tone);
  const pulse = uiStatePulse(state);
  const label = uiStateLabel(state);

  const isLg = size === 'lg';

  return (
    <div
      data-testid="call-state-badge"
      data-state-kind={state.kind}
      data-state-tone={tone}
      className={cn(
        'inline-flex items-center gap-2 rounded-full ring-1',
        isLg
          ? 'px-4 py-1.5 text-[13px] font-bold uppercase tracking-wide'
          : 'px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        palette.bg,
        palette.text,
        palette.ring,
        className
      )}
    >
      <span className={cn('relative inline-flex', isLg ? 'w-2.5 h-2.5' : 'w-2 h-2')}>
        {pulse && (
          <span
            className={cn(
              'absolute inset-0 rounded-full opacity-75 animate-ping',
              palette.dot
            )}
          />
        )}
        <span
          className={cn(
            'relative rounded-full',
            isLg ? 'w-2.5 h-2.5' : 'w-2 h-2',
            palette.dot
          )}
        />
      </span>
      <span>{label}</span>
      {meta ? (
        <span
          className={cn(
            'tabular-nums font-bold',
            isLg ? 'text-[14px]' : 'text-[11px]',
            'opacity-90'
          )}
        >
          · {meta}
        </span>
      ) : null}
    </div>
  );
}
