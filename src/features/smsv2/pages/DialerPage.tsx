// PR 140 (Hugo 2026-04-28): the legacy 645-line DialerPage shell
// (campaign tabs + 7 mini stats + queue + recent calls) is replaced by
// the new PreCallRoom — a clean power-dialer surface centered around
// one big "Dial next lead" card. The route still imports
// `Smsv2DialerPage` from this file (App.tsx:127), so we keep the
// default export here and delegate.
//
// Why: the old shell was an internal refactor magnet — every PR added
// chrome around the dial action instead of clarifying it. PreCallRoom
// is the genuine product rebuild Hugo asked for.

import PreCallRoom from '../components/dialer/v2/PreCallRoom';

export default function DialerPage() {
  return <PreCallRoom />;
}
