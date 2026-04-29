// PR 140 → PR 153 (Hugo 2026-04-29): DialerPage now mounts the v3
// OverviewPage. The v2 PreCallRoom is kept as a compat re-export
// pointing at the same v3 component for one cycle (PR 154 deletes it).
//
// The four-column InCallRoom UI is unchanged across this rebuild.

import OverviewPage from '../components/dialer/v3/OverviewPage';

export default function DialerPage() {
  return <OverviewPage />;
}
