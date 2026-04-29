// DialerPage — entry route for /crm/dialer.
//
// 2026-04-29: replaced with the cloned-from-caller power-dialer
// mechanism. One mode only — POWER DIALER (auto-pacing or manual).
// No parallel-line dialer. No multi-Dial-button manual mode. Hugo:
// "We're not gonna have a parallel diagram anymore or manual. We
// only gonna have power diagram."
//
// All UI panes (AI coach, transcript, script, glossary, mid-call
// SMS) are reused from src/features/smsv2/components/live-call/ —
// only the orchestration mechanism changed.

import PowerDialerPage from '../dialer-power/PowerDialerPage';

export default function DialerPage() {
  return <PowerDialerPage />;
}
