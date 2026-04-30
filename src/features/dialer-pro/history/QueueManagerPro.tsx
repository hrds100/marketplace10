import { useCallback, useState } from 'react';
import { GripVertical, Trash2, Plus, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
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
        {queue.map((lead, i) => (
          <div
            key={lead.queueRowId}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white border border-[#E5E7EB] text-xs group"
          >
            <GripVertical className="w-3.5 h-3.5 text-[#9CA3AF] cursor-grab flex-shrink-0" />
            <span className="font-mono text-[10px] text-[#9CA3AF] w-4">{i + 1}</span>
            <span className="font-medium text-[#1A1A1A] truncate flex-1">{lead.name}</span>
            <span className="text-[#9CA3AF] truncate max-w-[100px]">{lead.phone}</span>
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
              {i < queue.length - 1 && (
                <button
                  onClick={() => void movePriority(lead.queueRowId, Math.max(0, lead.priority - 1))}
                  className="p-0.5 rounded text-[#6B7280] hover:text-[#1A1A1A] text-[10px]"
                >
                  ↓
                </button>
              )}
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
      </div>
    </div>
  );
}
