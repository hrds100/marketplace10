// crm-v2 DialerV2Page — route entry at /crm/dialer-v2.
//
// Wraps the OverviewPage in DialerProvider so the reducer + session
// store are scoped to this page. CrmGuard above it (in the parent
// /crm route) enforces auth.
//
// PR B is BEHAVIOUR-NEUTRAL on /crm/dialer (the live route).
// /crm/dialer-v2 is the parallel testing route per the plan.

import { DialerProvider } from '../state/DialerProvider';
import OverviewPage from '../dialer/OverviewPage';

export default function DialerV2Page() {
  return (
    <DialerProvider>
      <OverviewPage />
    </DialerProvider>
  );
}
