import CallScriptPane from '@/features/smsv2/components/live-call/CallScriptPane';
import type { DialerPhase } from '../types';

interface Props {
  phase: DialerPhase;
  callId: string | null;
  contactFirstName: string;
  agentFirstName: string;
}

export default function ScriptPanelPro({ phase, callId, contactFirstName, agentFirstName }: Props) {
  const isActive = phase === 'connected' || phase === 'wrap_up' || phase === 'ringing' || phase === 'dialing';

  if (!isActive || !callId) {
    return (
      <div className="flex items-center justify-center h-full text-[#9CA3AF] text-sm">
        Script appears when dialing
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <CallScriptPane
        callId={callId}
        contactFirstName={contactFirstName}
        agentFirstName={agentFirstName}
      />
    </div>
  );
}
