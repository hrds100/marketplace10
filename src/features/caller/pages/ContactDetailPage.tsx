// ContactDetailPage — Phase 4 single contact view.
// Header with name + phone + email + stage. Body shows recent calls
// + recent messages.
//
// Phase 4 skeleton:
//   - no inline reply composer (logged as deferred — replies lives in Inbox until composer ports)
//   - no notes editor
//   - no follow-up scheduler
//   - no tag editor
//   - no "next due" callback widget

import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, MessageSquare, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCalls } from '../hooks/useCalls';
import { useContactMessages } from '../hooks/useContactMessages';
import { usePipelineColumns } from '../hooks/usePipelineColumns';

interface ContactDetailRow {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  pipeline_column_id: string | null;
  tags: string[] | null;
  last_contact_at: string | null;
  created_at: string;
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [contact, setContact] = useState<ContactDetailRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: e } = await (supabase.from('wk_contacts' as any) as any)
        .select('id, name, phone, email, pipeline_column_id, tags, last_contact_at, created_at')
        .eq('id', id)
        .maybeSingle();
      if (cancelled) return;
      if (e) setError(e.message);
      else setContact((data as ContactDetailRow | null) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const { calls } = useCalls({ contactId: id ?? null, limit: 50 });
  const { messages } = useContactMessages(id ?? null);
  const { columns } = usePipelineColumns(null);
  const stage = columns.find((c) => c.id === contact?.pipeline_column_id);

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-4">
      <Link
        to="/caller/contacts"
        className="inline-flex items-center gap-1.5 text-[12px] text-[#6B7280] hover:text-[#1A1A1A] px-2 py-1 rounded-lg hover:bg-black/[0.04]"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to contacts
      </Link>

      {error && (
        <div className="text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] px-3 py-2">
          {error}
        </div>
      )}

      {contact && (
        <>
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
            <h1 className="text-[22px] font-bold text-[#1A1A1A] tracking-tight">
              {contact.name ?? contact.phone ?? 'Unknown'}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-[12px] text-[#6B7280]">
              {contact.phone && (
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Phone className="w-3.5 h-3.5" />
                  {contact.phone}
                </span>
              )}
              {contact.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {contact.email}
                </span>
              )}
              {stage && (
                <span className="inline-flex items-center gap-1.5 bg-[#ECFDF5] text-[#1E9A80] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide text-[10px]">
                  {stage.name}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
              <div className="text-[12px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-3 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" />
                Recent calls ({calls.length})
              </div>
              {calls.length === 0 ? (
                <div className="text-[11px] text-[#9CA3AF] italic">No calls yet.</div>
              ) : (
                <ul className="divide-y divide-[#E5E7EB]">
                  {calls.slice(0, 10).map((c) => (
                    <li key={c.id} className="py-2 flex items-center justify-between gap-3">
                      <div className="text-[12px] text-[#6B7280] tabular-nums">
                        {c.startedAt ? new Date(c.startedAt).toLocaleString() : '—'}
                      </div>
                      <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
                        {c.status}
                      </div>
                      <Link
                        to={`/caller/calls/${c.id}`}
                        className="text-[11px] text-[#1E9A80] hover:underline font-semibold"
                      >
                        Open →
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
              <div className="text-[12px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-3 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" />
                Messages ({messages.length})
              </div>
              {messages.length === 0 ? (
                <div className="text-[11px] text-[#9CA3AF] italic">No messages yet.</div>
              ) : (
                <ul className="space-y-2 max-h-[360px] overflow-y-auto">
                  {messages.slice(-10).map((m) => (
                    <li
                      key={m.id}
                      className={`text-[12px] px-3 py-2 rounded-[10px] ${m.direction === 'inbound' ? 'bg-[#F3F3EE] text-[#1A1A1A]' : 'bg-[#ECFDF5] text-[#065F46]'}`}
                    >
                      <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] mb-0.5">
                        {m.direction} · {m.channel}
                      </div>
                      {m.subject && (
                        <div className="text-[11px] font-semibold mb-0.5">
                          {m.subject}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap break-words">
                        {m.body || '—'}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
