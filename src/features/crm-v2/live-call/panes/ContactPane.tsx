// crm-v2 ContactPane — left column of the InCallRoom.
//
// Shows: name, phone, attempts, current pipeline stage, plus a small
// activity timeline (recent SMS / calls — wired in PR 5+ when SMS UI
// is rebuilt; PR C just shows the contact card so the layout reads).

import { useEffect, useState } from 'react';
import { Phone, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDialer } from '../../state/DialerProvider';

interface ContactDetail {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  pipeline_column_id: string | null;
  is_hot: boolean | null;
}

export default function ContactPane() {
  const { call } = useDialer();
  const [detail, setDetail] = useState<ContactDetail | null>(null);

  useEffect(() => {
    if (!call?.contactId || call.contactId.startsWith('manual-') || call.contactId.startsWith('inbound-')) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('wk_contacts' as any) as any)
        .select('id, name, phone, email, pipeline_column_id, is_hot')
        .eq('id', call.contactId)
        .maybeSingle();
      if (!cancelled) setDetail((data as ContactDetail) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [call?.contactId]);

  if (!call) {
    return (
      <div className="p-4 text-[12px] text-[#9CA3AF] italic">
        No active call.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3" data-testid="incall-contact-pane">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-[#ECFDF5] text-[#1E9A80] flex items-center justify-center">
          <User className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold text-[#1A1A1A] truncate">
            {call.contactName || detail?.name || 'Unknown'}
          </div>
          <div className="text-[11px] text-[#6B7280] tabular-nums truncate flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {call.phone || detail?.phone || '—'}
          </div>
        </div>
        {detail?.is_hot && (
          <span className="text-[9px] uppercase font-bold text-[#B91C1C] bg-[#FEE2E2] px-1.5 py-0.5 rounded">
            Hot
          </span>
        )}
      </div>

      {detail?.email && (
        <div className="text-[11px] text-[#6B7280] truncate">
          ✉ {detail.email}
        </div>
      )}

      <div className="border-t border-[#E5E7EB] pt-3">
        <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-1">
          Active call
        </div>
        <div className="text-[11px] text-[#6B7280]">
          Started {new Date(call.startedAt).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
