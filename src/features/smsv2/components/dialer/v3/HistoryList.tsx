// PR 153 (Hugo 2026-04-29): the v3 history section is just the
// existing RecentCallsPanel wrapped in a v3 card chrome. Outcome
// column lands in PR 154 (separate concern: SELECT extension + join).
//
// All existing actions (Edit / Open / Transcript / Recording / Hangup)
// are preserved as-is — Hugo's non-negotiable.

import RecentCallsPanel from '../RecentCallsPanel';

export default function HistoryList() {
  return (
    <section
      className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden"
      data-testid="history-list"
    >
      <RecentCallsPanel />
    </section>
  );
}
