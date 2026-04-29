// PR 153 (Hugo 2026-04-29): v2 PreCallRoom is replaced by the v3
// OverviewPage. This file is kept for ONE cycle as a compat re-export
// so any external mount point keeps working. PR 154 deletes this file.

import OverviewPage from '../v3/OverviewPage';

/** @deprecated Use `dialer/v3/OverviewPage` directly — this re-export
 *  goes away in PR 154. */
export default function PreCallRoom() {
  return <OverviewPage />;
}
