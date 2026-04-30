import { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { GripVertical, Trash2, Plus, Search, Loader2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import EditContactModal from '@/features/smsv2/components/contacts/EditContactModal';
import type { Contact } from '@/features/smsv2/types';
import type { QueueLead } from '../types';

interface Props {
  queue: QueueLead[];
  campaignId: string | null;
  onRefresh: () => void;
}

export default function QueueManagerPro({ queue, campaignId, onRefresh }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; phone: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [visibleCount, setVisibleCount] = useState(25);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver — reveal more queue items on scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && visibleCount < queue.length) {
          setVisibleCount((prev) => Math.min(prev + 25, queue.length));
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, queue.length]);

  const visibleQueue = queue.slice(0, visibleCount);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  useEffect(() => {
    if (!editingContactId) { setEditingContact(null); return; }
    let cancelled = false;
    void (async () => {
      const [contactRes, tagsRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_contacts' as any) as any)
          .select('id, name, phone, email, owner_agent_id, pipeline_column_id, is_hot, deal_value_pence, custom_fields, created_at, last_contact_at')
          .eq('id', editingContactId)
          .maybeSingle(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_contact_tags' as any) as any)
          .select('tag')
          .eq('contact_id', editingContactId),
      ]);
      if (cancelled) return;
      if (contactRes.error || !contactRes.data) return;
      const d = contactRes.data;
      const tags = ((tagsRes.data ?? []) as { tag: string }[]).map((r) => r.tag);
      setEditingContact({
        id: d.id, name: d.name ?? '', phone: d.phone ?? '',
        email: d.email ?? undefined, ownerAgentId: d.owner_agent_id ?? undefined,
        pipelineColumnId: d.pipeline_column_id ?? undefined, tags,
        isHot: d.is_hot ?? false, dealValuePence: d.deal_value_pence ?? undefined,
        customFields: d.custom_fields ?? {}, createdAt: d.created_at ?? new Date().toISOString(),
        lastContactAt: d.last_contact_at ?? undefined,
      });
    })();
    return () => { cancelled = true; };
  }, [editingContactId]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !campaignId) return;
    setSearching(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('wk_contacts' as any) as any)
      .select('id, name, phone')
      .or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
      .limit(10);
    setSearching(false);
    if (error) return;
    const existing = new Set(queue.map((q) => q.contactId));
    setSearchResults(
      ((data ?? []) as Array<{ id: string; name: string | null; phone: string | null }>)
        .filter((c) => c.phone && !existing.has(c.id))
        .map((c) => ({ id: c.id, name: c.name ?? c.phone!, phone: c.phone! }))
    );
  }, [searchQuery, campaignId, queue]);

  const addToQueue = useCallback(
    async (contactId: string) => {
      if (!campaignId) return;
      setAdding(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('wk_dialer_queue' as any) as any).insert({
        contact_id: contactId,
        campaign_id: campaignId,
        status: 'pending',
        priority: 0,
        attempts: 0,
      });
      setAdding(false);
      setSearchResults((prev) => prev.filter((c) => c.id !== contactId));
      onRefresh();
    },
    [campaignId, onRefresh]
  );

  const removeFromQueue = useCallback(
    async (queueRowId: string) => {
      setRemoving(queueRowId);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).rpc('wk_update_queue_status', {
          p_queue_id: queueRowId,
          p_status: 'done',
        });
      } catch { /* ignore */ }
      setRemoving(null);
      onRefresh();
    },
    [onRefresh]
  );

  const movePriority = useCallback(
    async (queueRowId: string, newPriority: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('wk_dialer_queue' as any) as any)
        .update({ priority: newPriority })
        .eq('id', queueRowId);
      onRefresh();
    },
    [onRefresh]
  );

  return (
    <div className="p-2 space-y-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1E9A80] text-white hover:bg-[#1E9A80]/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add lead
        </button>
        <span className="text-xs text-[#9CA3AF]">{queue.length} pending</span>
      </div>

      {showSearch && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-2 space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
              placeholder="Search contacts by name or phone…"
              className="flex-1 px-3 py-1.5 rounded-lg border border-[#E5E5E5] text-xs focus:outline-none focus:ring-1 focus:ring-[#1E9A80]"
            />
            <button
              onClick={() => void handleSearch()}
              disabled={searching}
              className="p-1.5 rounded-lg bg-[#1E9A80] text-white hover:bg-[#1E9A80]/90"
            >
              {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {searchResults.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-black/[0.02] text-xs">
                  <div>
                    <span className="font-medium text-[#1A1A1A]">{c.name}</span>
                    <span className="ml-2 text-[#9CA3AF]">{c.phone}</span>
                  </div>
                  <button
                    onClick={() => void addToQueue(c.id)}
                    disabled={adding}
                    className="text-[#1E9A80] hover:text-[#1E9A80]/80 font-medium"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-1">
        {visibleQueue.map((lead, i) => (
          <div
            key={lead.queueRowId}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-[#F3F3EE]/50 text-xs group"
          >
            <span className="font-mono text-[10px] text-[#9CA3AF] w-4 flex-shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[#1A1A1A] truncate text-[11px]">{lead.name}</div>
              <div className="text-[10px] text-[#9CA3AF] truncate">{lead.phone}</div>
            </div>
            {lead.attempts > 0 && (
              <span className="text-[10px] text-[#9CA3AF]">×{lead.attempts}</span>
            )}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {i > 0 && (
                <button
                  onClick={() => void movePriority(lead.queueRowId, lead.priority + 1)}
                  className="p-0.5 rounded text-[#6B7280] hover:text-[#1A1A1A] text-[10px]"
                >
                  ↑
                </button>
              )}
              {i < visibleQueue.length - 1 && (
                <button
                  onClick={() => void movePriority(lead.queueRowId, Math.max(0, lead.priority - 1))}
                  className="p-0.5 rounded text-[#6B7280] hover:text-[#1A1A1A] text-[10px]"
                >
                  ↓
                </button>
              )}
              <button
                onClick={() => setEditingContactId(lead.contactId)}
                className="p-0.5 rounded text-[#6B7280] hover:text-[#1E9A80]"
                title="Edit contact"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={() => void removeFromQueue(lead.queueRowId)}
                disabled={removing === lead.queueRowId}
                className={cn(
                  'p-0.5 rounded text-red-400 hover:text-red-600',
                  removing === lead.queueRowId && 'animate-spin'
                )}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="h-2" />
        {visibleCount < queue.length && (
          <div className="flex items-center justify-center py-1 text-[10px] text-[#9CA3AF]">
            Showing {visibleCount} of {queue.length}…
          </div>
        )}
      </div>

      {editingContact && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999]">
          <EditContactModal
            contact={editingContact}
            onClose={() => { setEditingContactId(null); setEditingContact(null); }}
            onSave={async (updated) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase.from('wk_contacts' as any) as any)
                .update({
                  name: updated.name || null, phone: updated.phone,
                  email: updated.email || null, pipeline_column_id: updated.pipelineColumnId || null,
                  owner_agent_id: updated.ownerAgentId || null, is_hot: updated.isHot,
                  deal_value_pence: updated.dealValuePence ?? null, custom_fields: updated.customFields,
                }).eq('id', updated.id);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase.from('wk_contact_tags' as any) as any).delete().eq('contact_id', updated.id);
              if (updated.tags.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabase.from('wk_contact_tags' as any) as any)
                  .insert(updated.tags.map((t) => ({ contact_id: updated.id, tag: t })));
              }
              setEditingContactId(null);
              setEditingContact(null);
              onRefresh();
            }}
          />
        </div>,
        document.body,
      )}
    </div>
  );
}
