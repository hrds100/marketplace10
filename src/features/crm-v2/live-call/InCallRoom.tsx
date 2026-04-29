// crm-v2 InCallRoom — full-screen modal that owns the live call UX.
//
// Hugo's UI/UX from the smsv2 InCallRoom is preserved: header on top,
// four columns in the body (Contact / Transcript / Script / Glossary),
// footer with the universal SessionControlBar.
//
// Visibility:
//   - roomView === 'closed': not rendered.
//   - roomView === 'open_full': fullscreen modal.
//   - roomView === 'open_min': not rendered here — the Softphone shows
//     a compact bar instead. (Less DOM, fewer event handlers competing.)

import { cn } from '@/lib/utils';
import { useDialer } from '../state/DialerProvider';
import InCallHeader from './InCallHeader';
import InCallFooter from './InCallFooter';
import ContactPane from './panes/ContactPane';
import LiveTranscriptPane from './panes/LiveTranscriptPane';
import PostCallOutcomePane from './panes/PostCallOutcomePane';
import ScriptPane from './panes/ScriptPane';
import TerminologyPane from './panes/TerminologyPane';

export default function InCallRoom() {
  const { roomView, callPhase, call } = useDialer();

  if (roomView !== 'open_full') return null;

  const isWrapUp =
    callPhase === 'stopped_waiting_outcome' ||
    callPhase === 'error_waiting_outcome' ||
    callPhase === 'outcome_submitting' ||
    callPhase === 'outcome_done';

  return (
    <div
      className={cn(
        'fixed inset-0 z-[200] bg-[#F3F3EE] flex flex-col',
        'animate-in fade-in duration-200'
      )}
      data-testid="incall-room"
      data-call-phase={callPhase}
    >
      <InCallHeader />

      <div className="flex-1 grid grid-cols-1 md:grid-cols-[20%_38%_22%_20%] divide-x divide-[#E5E7EB] bg-white overflow-hidden">
        <ContactPane />
        {isWrapUp ? <PostCallOutcomePane /> : <LiveTranscriptPane />}
        <ScriptPane campaignId={call?.campaignId ?? null} />
        <TerminologyPane />
      </div>

      <InCallFooter />
    </div>
  );
}
