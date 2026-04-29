// MidCallSmsPane — collapsible mid-call message composer.
// Available during dialing/ringing/in-call/wrap-up so the agent can
// fire a follow-up SMS / WhatsApp / email without leaving the call
// surface.

import { useState } from 'react';
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import ReplyComposer from '../inbox/ReplyComposer';

interface Props {
  contactId: string;
  contactName?: string;
  campaignId?: string | null;
}

export default function MidCallSmsPane({ contactId, contactName, campaignId }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div
      data-feature="CALLER__MID_CALL_SMS"
      className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-2.5 flex items-center justify-between gap-2 text-[12px] uppercase tracking-wide text-[#9CA3AF] font-semibold hover:bg-[#F3F3EE]/50"
      >
        <span className="inline-flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5" />
          Send mid-call message
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <ReplyComposer
          contactId={contactId}
          contactName={contactName}
          defaultChannel="sms"
          campaignId={campaignId ?? null}
          onSent={() => setOpen(false)}
        />
      )}
    </div>
  );
}
