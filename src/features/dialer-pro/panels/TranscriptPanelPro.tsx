import LiveTranscriptPane from '@/features/smsv2/components/live-call/LiveTranscriptPane';
import type { DialerPhase } from '../types';

interface Props {
  phase: DialerPhase;
  durationSec: number;
  contactId: string | null;
  callId: string | null;
  agentFirstName: string;
}

export default function TranscriptPanelPro({ phase, durationSec, contactId, callId, agentFirstName }: Props) {
  const isActive = phase === 'connected' || phase === 'wrap_up';

  if (!isActive || !contactId) {
    return (
      <div className="flex items-center justify-center h-full text-[#9CA3AF] text-sm">
        Transcript appears during a call
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <LiveTranscriptPane
        durationSec={durationSec}
        contactId={contactId}
        callId={callId}
        agentFirstName={agentFirstName}
      />
    </div>
  );
}
