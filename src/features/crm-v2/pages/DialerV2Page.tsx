// crm-v2 DialerV2Page — route entry at /crm/dialer-v2.
//
// Mounts in order:
//   1. DialerProvider — owns state machine + Twilio side-effects.
//   2. OverviewPage — pre-call surface (visible by default).
//   3. InCallRoom — full-screen modal, only renders when
//      roomView === 'open_full' (live call OR maximised post-call).
//   4. Softphone — floating widget, hidden when InCallRoom is open.

import { DialerProvider } from '../state/DialerProvider';
import OverviewPage from '../dialer/OverviewPage';
import InCallRoom from '../live-call/InCallRoom';
import Softphone from '../softphone/Softphone';

export default function DialerV2Page() {
  return (
    <DialerProvider>
      <OverviewPage />
      <InCallRoom />
      <Softphone />
    </DialerProvider>
  );
}
