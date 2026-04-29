// CallerStateProvider — root provider for Caller.
//
// After the dialer rewrite (2026-04-29) all dialer-specific state lives
// inside DialerPage itself (no global provider). This wrapper now only
// mounts the toast surface so success/error feedback works app-wide.

import type { ReactNode } from 'react';
import { CallerToastsProvider } from './toastsProvider';

interface Props {
  children: ReactNode;
}

export default function CallerStateProvider({ children }: Props) {
  return <CallerToastsProvider>{children}</CallerToastsProvider>;
}
