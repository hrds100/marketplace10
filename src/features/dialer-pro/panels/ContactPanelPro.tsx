import { useCallback, useEffect, useState } from 'react';
import { Pencil, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import ContactMetaCompact from '@/features/smsv2/components/live-call/ContactMetaCompact';
import MidCallSmsSender from '@/features/smsv2/components/live-call/MidCallSmsSender';
import EditContactModal from '@/features/smsv2/components/contacts/EditContactModal';
import type { Contact } from '@/features/smsv2/types';
import type { QueueLead, DialerPhase } from '../types';

interface Props {
  lead: QueueLead | null;
  phase: DialerPhase;
  campaignId: string | null;
  agentFirstName: string;
}

export default function ContactPanelPro({ lead, phase, campaignId, agentFirstName }: Props) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);

  useEffect(() => {
    if (!lead) { setContact(null); return; }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const [contactRes, tagsRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_contacts' as any) as any)
          .select('id, name, phone, email, owner_agent_id, pipeline_column_id, is_hot, deal_value_pence, custom_fields, created_at, last_contact_at')
          .eq('id', lead.contactId)
          .maybeSingle(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_contact_tags' as any) as any)
          .select('tag')
          .eq('contact_id', lead.contactId),
      ]);
      if (cancelled) return;
      setLoading(false);
      if (contactRes.error || !contactRes.data) return;
      const d = contactRes.data;
      const tags = ((tagsRes.data ?? []) as { tag: string }[]).map((r) => r.tag);
      setContact({
        id: d.id,
        name: d.name ?? '',
        phone: d.phone ?? '',
        email: d.email ?? undefined,
        ownerAgentId: d.owner_agent_id ?? undefined,
        pipelineColumnId: d.pipeline_column_id ?? undefined,
        tags,
        isHot: d.is_hot ?? false,
        dealValuePence: d.deal_value_pence ?? undefined,
        customFields: d.custom_fields ?? {},
        createdAt: d.created_at ?? new Date().toISOString(),
        lastContactAt: d.last_contact_at ?? undefined,
      });
    })();
    return () => { cancelled = true; };
  }, [lead?.contactId, lead]);

  const handleEditSaved = useCallback((updated: Contact) => {
    setEditContact(null);
    setContact(updated);
  }, []);

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-full text-[#9CA3AF] text-sm">
        No active lead
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-3 border-b border-[#E5E7EB] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1A1A1A]">Contact</h3>
        <button
          onClick={() => contact && setEditContact(contact)}
          disabled={!contact}
          className="p-1 rounded hover:bg-black/[0.04] text-[#6B7280] hover:text-[#1A1A1A] transition-colors disabled:opacity-30"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
        </button>
      </div>

      {contact && (
        <div className="p-3 border-b border-[#E5E7EB]">
          <ContactMetaCompact contact={contact} />
        </div>
      )}

      <div className={cn('flex-1 p-3', phase !== 'connected' && phase !== 'wrap_up' && 'opacity-40 pointer-events-none')}>
        {contact && (
          <MidCallSmsSender
            contactId={contact.id}
            contactName={contact.name}
            contactPhone={contact.phone}
            contactEmail={contact.email}
            agentFirstName={agentFirstName}
            campaignId={campaignId}
          />
        )}
      </div>

      {editContact && (
        <EditContactModal
          contact={editContact}
          onClose={() => setEditContact(null)}
          onSave={handleEditSaved}
        />
      )}
    </div>
  );
}
