// CallerStateProvider — root provider stack for Caller.
//
// Order matters:
//   - CallerToastsProvider mounts first so any provider below can push
//     toasts during its mount effects.
//   - DialerSessionProvider next; it owns session pacing + dialed-set.
//   - ActiveCallProvider last; the call context reads
//     session.recordDialed + session.paused.

import type { ReactNode } from 'react';
import { CallerToastsProvider } from './toastsProvider';
import { DialerSessionProvider } from './dialerSessionProvider';
import { ActiveCallProvider } from './activeCallProvider';

interface Props {
  children: ReactNode;
}

export default function CallerStateProvider({ children }: Props) {
  return (
    <CallerToastsProvider>
      <DialerSessionProvider>
        <ActiveCallProvider>{children}</ActiveCallProvider>
      </DialerSessionProvider>
    </CallerToastsProvider>
  );
}
