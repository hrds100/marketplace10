import { useState } from 'react';
import { MessageCircle, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { tierDisplayName } from '@/lib/ghl';
import { toast } from 'sonner';

const PAGE_SIZE = 20;
const TIER_FILTERS = ['all', 'free', 'monthly', 'yearly', 'lifetime'] as const;

interface Profile {
  id: string;
  name: string | null;
  whatsapp: string | null;
  tier: string | null;
  suspended: boolean | null;
  created_at?: string;
}

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);

  // Fetch profiles
  const { data: allProfiles = [], isLoading } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) {
        console.error('AdminUsers fetch error:', error.message);
        return [];
      }
      return (data || []) as Profile[];
    },
  });

  // Filter by tier
  const filtered = tierFilter === 'all'
    ? allProfiles
    : allProfiles.filter(u => (u.tier || 'free') === tierFilter);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Suspend/unsuspend mutation
  const suspendMutation = useMutation({
    mutationFn: async ({ id, suspended }: { id: string; suspended: boolean }) => {
      const { error } = await supabase.from('profiles').update({ suspended } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast.success('User updated');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update'),
  });

  // Hard delete mutation (soft: just suspend)
  const hardDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete: mark as suspended since we can't call auth.admin.deleteUser from client-side
      const { error } = await supabase.from('profiles').update({ suspended: true } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      setDeleteTarget(null);
      toast.success('User has been suspended (hard delete requires server-side admin API)');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete'),
  });

  const tierBadge = (tier: string | null) => {
    const t = tier || 'free';
    const styles: Record<string, string> = {
      free: 'bg-secondary text-muted-foreground',
      monthly: 'bg-blue-100 text-blue-800',
      yearly: 'bg-purple-100 text-purple-800',
      lifetime: 'bg-emerald-100 text-emerald-800',
    };
    return (
      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${styles[t] || styles.free}`}>
        {tierDisplayName(t as any)}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-[28px] font-bold text-foreground">Users ({filtered.length})</h1>
        <div className="flex items-center gap-3">
          <select
            value={tierFilter}
            onChange={e => { setTierFilter(e.target.value); setPage(0); }}
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {TIER_FILTERS.map(t => (
              <option key={t} value={t}>{t === 'all' ? 'All tiers' : tierDisplayName(t as any)}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading users...</div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-border">
                {['Name', 'User ID', 'WhatsApp', 'Tier', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left p-3.5 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((u, i) => {
                const isSuspended = !!u.suspended;
                return (
                  <tr key={u.id} className={`${i % 2 === 1 ? 'bg-secondary/50' : ''} ${isSuspended ? 'opacity-60' : ''}`}>
                    <td className="p-3.5 font-medium text-foreground">
                      {u.name || <span className="text-muted-foreground italic">No name</span>}
                    </td>
                    <td className="p-3.5 text-muted-foreground text-xs font-mono">{u.id.slice(0, 8)}...</td>
                    <td className="p-3.5">
                      {u.whatsapp ? (
                        <a
                          href={`https://wa.me/${u.whatsapp.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:opacity-75 inline-flex items-center gap-1 text-xs font-medium"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> {u.whatsapp}
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3.5">{tierBadge(u.tier)}</td>
                    <td className="p-3.5">
                      {isSuspended ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800">Suspended</span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Active</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="flex gap-2">
                        <button
                          onClick={() => suspendMutation.mutate({ id: u.id, suspended: !isSuspended })}
                          className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                            isSuspended
                              ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                              : 'border-amber-300 text-amber-700 hover:bg-amber-50'
                          }`}
                        >
                          {isSuspended ? 'Reactivate' : 'Suspend'}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="text-xs font-medium px-2.5 py-1 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages} · {filtered.length} users
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="h-9 px-3 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="h-9 px-3 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-[400px]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Delete User</h3>
                <p className="text-xs text-muted-foreground">This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-foreground mb-1">
              Are you sure you want to delete <strong>{deleteTarget.name || 'this user'}</strong>?
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              User ID: {deleteTarget.id}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-11 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => hardDeleteMutation.mutate(deleteTarget.id)}
                disabled={hardDeleteMutation.isPending}
                className="flex-1 h-11 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {hardDeleteMutation.isPending ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
