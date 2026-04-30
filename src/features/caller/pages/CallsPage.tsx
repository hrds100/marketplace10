// CallsPage — compact call history with edit, play, and transcript actions.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, FileText, PlayCircle, Loader2 } from 'lucide-react';
import ReactDOM from 'react-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useCalls, signCallRecording } from '../hooks/useCalls';
import { usePipelineColumns } from '../hooks/usePipelineColumns';
import EditContactModal from '@/features/smsv2/components/contacts/EditContactModal';
import type { Contact } from '@/features/smsv2/types';

export default function CallsPage() {
  const { user, isAdmin } = useAuth();
  const { calls, loading, error } = useCalls({
    agentId: !isAdmin && user ? user.id : null,
    limit: 200,
  });
  const { columns } = usePipelineColumns(null);
  const columnsById = new Map(columns.map((c) => [c.id, c]));

  const [editContactId, setEditContactId] = useState<string | null>(null);

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-4">
      <div>
        <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight">
          Call history
        </h1>
        <p className="text-[12px] text-[#6B7280] mt-0.5">
          {isAdmin ? 'All agents' : 'Your calls'} · most recent first
        </p>
      </div>

      {error && (
        <div className="text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] px-3 py-2">
          {error}
        </div>
      )}

      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
        {loading && calls.length === 0 && (
          <div className="text-[12px] text-[#9CA3AF] italic py-8 text-center">
            Loading calls…
          </div>
        )}

        {!loading && calls.length === 0 && !error && (
          <div className="text-[12px] text-[#9CA3AF] italic py-8 text-center">
            No calls yet.
          </div>
        )}

        {calls.length > 0 && (
          <table className="w-full text-[12px]">
            <thead className="bg-[#F3F3EE]/50 text-[11px] uppercase tracking-wide text-[#9CA3AF]">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Name</th>
                <th className="text-left px-4 py-2 font-semibold">Stage</th>
                <th className="text-left px-4 py-2 font-semibold">Date</th>
                <th className="text-right px-4 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {calls.map((c) => {
                const col = c.pipelineColumnId ? columnsById.get(c.pipelineColumnId) : null;
                return (
                  <tr key={c.id} className="hover:bg-[#F3F3EE]/30">
                    <td className="px-4 py-2">
                      <div className="text-[12px] font-semibold text-[#1A1A1A] truncate">
                        {c.contactName || 'Unknown'}
                      </div>
                      <div className="text-[11px] text-[#6B7280] tabular-nums truncate">
                        {c.contactPhone || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {col ? (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-[#ECFDF5] text-[#1E9A80]"
                        >
                          {col.name}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#9CA3AF]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-[12px] text-[#1A1A1A] whitespace-nowrap">
                      {formatStamp(c.startedAt)}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/caller/calls/${c.id}`}
                          title="View transcript"
                          className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#1E9A80] hover:bg-[#F3F3EE] transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </Link>
                        {c.recordingUrl ? (
                          <PlayButton storagePath={c.recordingUrl} />
                        ) : (
                          <span className="p-1.5 text-[#E5E7EB]" title="No recording">
                            <PlayCircle className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditContactId(c.contactId)}
                          title="Edit contact"
                          className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#1E9A80] hover:bg-[#F3F3EE] transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {editContactId && (
        <RichEditContactBridge
          contactId={editContactId}
          onClose={() => setEditContactId(null)}
        />
      )}
    </div>
  );
}

function PlayButton({ storagePath }: { storagePath: string }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const url = await signCallRecording(storagePath);
      if (url) window.open(url, '_blank');
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      title="Play recording"
      className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#1E9A80] hover:bg-[#F3F3EE] transition-colors disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <PlayCircle className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

function RichEditContactBridge({ contactId, onClose }: { contactId: string; onClose: () => void }) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('wk_contacts' as any) as any)
        .select('id, name, phone, email, owner_agent_id, pipeline_column_id, tags, is_hot, deal_value_pence, custom_fields, created_at, last_contact_at')
        .eq('id', contactId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setContact({
          id: data.id,
          name: data.name ?? '',
          phone: data.phone ?? '',
          email: data.email ?? undefined,
          ownerAgentId: data.owner_agent_id ?? undefined,
          pipelineColumnId: data.pipeline_column_id ?? undefined,
          tags: data.tags ?? [],
          isHot: data.is_hot ?? false,
          dealValuePence: data.deal_value_pence ?? undefined,
          customFields: data.custom_fields ?? {},
          createdAt: data.created_at ?? new Date().toISOString(),
          lastContactAt: data.last_contact_at ?? undefined,
        });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [contactId]);

  if (loading) {
    return ReactDOM.createPortal(
      <div className="fixed inset-0 z-[250] bg-black/40 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8">
          <Loader2 className="w-5 h-5 animate-spin text-[#9CA3AF]" />
        </div>
      </div>,
      document.body
    );
  }

  return ReactDOM.createPortal(
    <EditContactModal
      contact={contact}
      onClose={onClose}
      onSave={async (updated) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('wk_contacts' as any) as any)
          .update({
            name: updated.name || null,
            phone: updated.phone,
            email: updated.email || null,
            pipeline_column_id: updated.pipelineColumnId || null,
            owner_agent_id: updated.ownerAgentId || null,
            tags: updated.tags,
            is_hot: updated.isHot,
            deal_value_pence: updated.dealValuePence ?? null,
            custom_fields: updated.customFields,
          })
          .eq('id', contactId);
        onClose();
      }}
    />,
    document.body
  );
}

function formatStamp(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mon = months[d.getMonth()];
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${mon}, ${h}:${m}`;
  } catch {
    return iso;
  }
}
