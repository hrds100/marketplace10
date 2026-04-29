// crm-v2 InCallFooter — bottom bar of the InCallRoom.
// Hosts the universal SessionControlBar + a context help line.

import { useDialer } from '../state/DialerProvider';
import SessionControlBar from '../dialer/SessionControlBar';

const HELP: Record<string, string> = {
  dialing: 'Connecting…',
  ringing: 'Ringing the destination…',
  in_call: 'Microphone live · 1–9 to outcome on hang up',
  stopped_waiting_outcome: 'Pick an outcome to advance.',
  error_waiting_outcome: 'Call ended on error — pick an outcome to advance.',
  outcome_submitting: 'Saving outcome…',
  outcome_done: 'Outcome saved — press Next call.',
  idle: 'Ready.',
};

export default function InCallFooter() {
  const { callPhase, pacingDeadlineMs } = useDialer();
  const helpText = HELP[callPhase] ?? '';

  return (
    <footer
      className="bg-white border-t border-[#E5E7EB] px-4 py-3 flex items-center gap-4"
      data-testid="incall-footer"
    >
      <SessionControlBar size="lg" pacingDeadlineMs={pacingDeadlineMs} />
      <span className="ml-auto text-[12px] text-[#6B7280]">{helpText}</span>
    </footer>
  );
}
