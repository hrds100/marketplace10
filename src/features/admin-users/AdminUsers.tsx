import { useState } from 'react';
import { MessageCircle, ChevronLeft, ChevronRight, AlertTriangle, Trash2, Wallet } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { tierDisplayName } from '@/lib/ghl';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/lib/auditLog';

const PAGE_SIZE = 20;
const TIER_FILTERS = ['all', 'free', 'monthly', 'yearly', 'lifetime'] as const;

const WALLET_DURATION_OPTIONS = [
  { label: '1 hour', hours: 1 },
  { label: '24 hours', hours: 24 },
  { label: '7 days', hours: 168 },
  { label: 'Custom', hours: 0 },
];

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  wallet_address?: string | null;
  tier: string | null;
  suspended: boolean | null;
  created_at?: string;
}

export default function AdminUsers() {
  const { user: adminUser, session } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<Profile | null>(null);
  const [pin, setPin] = useState('');
  const [walletTarget, setWalletTarget] = useState<Profile | null>(null);
  const [walletDuration, setWalletDuration] = useState<number>(24);
  const [walletCustomHours, setWalletCustomHours] = useState('');
  const [walletPassword, setWalletPassword] = useState('');
  const [walletDurationChoice, setWalletDurationChoice] = useState<number>(24);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkPin, setBulkPin] = useState('');
  const [editTarget, setEditTarget] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({ name: '', whatsapp: '', email: '' });

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
      const { error } = await supabase.from('profiles').update({ suspended }).eq('id', id);
      if (error) throw error;
      // Audit log (fire-and-forget)
      if (adminUser) logAdminAction(adminUser.id, { action: suspended ? 'suspend_user' : 'unsuspend_user', target_table: 'profiles', target_id: id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast.success('User updated');
    },
    onError: (err: unknown) => toast.error((err as Error).message || 'Failed to update'),
  });

  // Hard delete mutation (soft: just suspend)
  const hardDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete: mark as suspended since we can't call auth.admin.deleteUser from client-side
      const { error } = await supabase.from('profiles').update({ suspended: true }).eq('id', id);
      if (error) throw error;
      // Audit log (fire-and-forget)
      if (adminUser) logAdminAction(adminUser.id, { action: 'delete_user', target_table: 'profiles', target_id: id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      setDeleteTarget(null);
      toast.success('User has been suspended (hard delete requires server-side admin API)');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete'),
  });

  // TRUE hard delete — removes from auth.users + all data via Edge Function
  const trueHardDeleteMutation = useMutation({
    mutationFn: async ({ id, userPin }: { id: string; userPin: string }) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/hard-delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ userId: id, pin: userPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      setHardDeleteTarget(null);
      setPin('');
      toast.success('User permanently deleted from database');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to hard delete'),
  });

  // Bulk hard delete mutation
  const bulkHardDeleteMutation = useMutation({
    mutationFn: async ({ ids, userPin }: { ids: string[]; userPin: string }) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/hard-delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ userIds: ids, pin: userPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to bulk delete');
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      setBulkDeleteOpen(false);
      setBulkPin('');
      setSelectedIds(new Set());
      toast.success(`${variables.ids.length} user(s) permanently deleted`);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to bulk delete'),
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map(u => u.id)));
    }
  };

  // Allow wallet change mutation
  const walletPermissionMutation = useMutation({
    mutationFn: async ({ userId, hours, password }: { userId: string; hours: number; password: string }) => {
      // Validate password: must be 5891 + last 3 digits of user's WhatsApp
      const targetUser = allProfiles.find(u => u.id === userId);
      if (!targetUser?.whatsapp) throw new Error('User has no WhatsApp number on file');
      const digits = targetUser.whatsapp.replace(/\D/g, '');
      if (digits.length < 3) throw new Error('WhatsApp number too short to derive password');
      const expectedPassword = '5891' + digits.slice(-3);
      if (password !== expectedPassword) throw new Error('Incorrect password');

      const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      const { error } = await (supabase.from('profiles') as any)
        .update({ wallet_change_allowed_until: until })
        .eq('id', userId);
      if (error) throw error;
      if (adminUser) logAdminAction(adminUser.id, { action: 'allow_wallet_change', target_table: 'profiles', target_id: userId, metadata: { hours, until } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      setWalletTarget(null);
      setWalletPassword('');
      setWalletCustomHours('');
      toast.success('Wallet change permission granted');
    },
    onError: (err: unknown) => toast.error((err as Error).message || 'Failed to grant permission'),
  });

  const editUserMutation = useMutation({
    mutationFn: async ({ id, name, whatsapp, email }: { id: string; name: string; whatsapp: string; email: string }) => {
      const updates: Record<string, string> = {};
      if (name) updates.name = name;
      if (whatsapp) updates.whatsapp = whatsapp;
      if (email) updates.email = email;
      const { error } = await supabase.from('profiles').update(updates).eq('id', id);
      if (error) throw error;
      if (adminUser) logAdminAction(adminUser.id, { action: 'edit_user', target_table: 'profiles', target_id: id, metadata: { name, whatsapp, email } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      setEditTarget(null);
      toast.success('User updated');
    },
    onError: (err: unknown) => toast.error((err as Error).message || 'Failed to update'),
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
    <div data-feature="ADMIN">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-[28px] font-bold text-foreground">Users ({filtered.length})</h1>
        <div className="flex items-center gap-3">
          <select
            data-feature="ADMIN__USERS_FILTER"
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
          <table data-feature="ADMIN__USERS_TABLE" className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-border">
                <th className="p-3.5 w-10">
                  <input
                    type="checkbox"
                    checked={paginated.length > 0 && selectedIds.size === paginated.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-border accent-[#1E9A80] cursor-pointer"
                  />
                </th>
                {['Name', 'Email', 'User ID', 'Wallet', 'WhatsApp', 'Tier', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left p-3.5 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((u, i) => {
                const isSuspended = !!u.suspended;
                return (
                  <tr key={u.id} className={`${i % 2 === 1 ? 'bg-secondary/50' : ''} ${isSuspended ? 'opacity-60' : ''}`}>
                    <td className="p-3.5 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(u.id)}
                        onChange={() => toggleSelect(u.id)}
                        className="w-4 h-4 rounded border-border accent-[#1E9A80] cursor-pointer"
                      />
                    </td>
                    <td className="p-3.5 font-medium text-foreground">
                      {u.name || <span className="text-muted-foreground italic">No name</span>}
                    </td>
                    <td className="p-3.5 text-muted-foreground text-xs">
                      {u.email || <span className="italic">—</span>}
                    </td>
                    <td className="p-3.5 text-muted-foreground text-xs font-mono">{u.id.slice(0, 8)}...</td>
                    <td className="p-3.5 text-muted-foreground text-xs font-mono">
                      {u.wallet_address
                        ? <span title={u.wallet_address}>{u.wallet_address.slice(0, 6)}...{u.wallet_address.slice(-4)}</span>
                        : <span className="italic">—</span>}
                    </td>
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
                          onClick={() => { setEditTarget(u); setEditForm({ name: u.name || '', whatsapp: u.whatsapp || '', email: u.email || '' }); }}
                          className="text-xs font-medium px-2.5 py-1 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          data-feature="ADMIN__USERS_SUSPEND"
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
                        <button
                          onClick={() => setHardDeleteTarget(u)}
                          className="text-xs font-medium px-2.5 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Hard Delete
                        </button>
                        <button
                          onClick={() => { setWalletTarget(u); setWalletDurationChoice(24); setWalletPassword(''); setWalletCustomHours(''); }}
                          className="text-xs font-medium px-2.5 py-1 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors inline-flex items-center gap-1"
                        >
                          <Wallet className="w-3 h-3" /> Wallet
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div data-feature="ADMIN__USERS_PAGINATION" className="flex items-center justify-between mt-4">
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

      {/* Soft Delete Confirmation Dialog */}
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

      {/* Hard Delete PIN Dialog */}
      {hardDeleteTarget && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => { setHardDeleteTarget(null); setPin(''); }}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-[400px]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Permanent Hard Delete</h3>
                <p className="text-xs text-red-600 font-semibold">This removes EVERYTHING — cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-foreground mb-1">
              Permanently delete <strong>{hardDeleteTarget.name || 'this user'}</strong>?
            </p>
            <p className="text-xs text-muted-foreground mb-1">
              This will remove their login, profile, messages, favourites, and all linked data.
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              User ID: {hardDeleteTarget.id}
            </p>
            <div className="mb-4">
              <label className="text-xs font-semibold text-foreground block mb-1.5">Enter PIN to confirm</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full h-11 px-3 rounded-lg border border-border bg-background text-center text-lg font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-red-500"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setHardDeleteTarget(null); setPin(''); }}
                className="flex-1 h-11 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => trueHardDeleteMutation.mutate({ id: hardDeleteTarget.id, userPin: pin })}
                disabled={trueHardDeleteMutation.isPending || pin.length !== 4}
                className="flex-1 h-11 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {trueHardDeleteMutation.isPending ? 'Deleting...' : 'Hard Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E5E7EB] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-6 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">{selectedIds.size} selected</span>
          <button
            onClick={() => setBulkDeleteOpen(true)}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors inline-flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Hard Delete Selected
          </button>
        </div>
      )}

      {/* Bulk Hard Delete PIN Dialog */}
      {bulkDeleteOpen && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => { setBulkDeleteOpen(false); setBulkPin(''); }}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-[400px]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Bulk Hard Delete</h3>
                <p className="text-xs text-red-600 font-semibold">Permanently delete {selectedIds.size} user(s) — cannot be undone</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs font-semibold text-foreground block mb-1.5">Enter PIN to confirm</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={bulkPin}
                onChange={e => setBulkPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full h-11 px-3 rounded-lg border border-border bg-background text-center text-lg font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-red-500"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setBulkDeleteOpen(false); setBulkPin(''); }}
                className="flex-1 h-11 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => bulkHardDeleteMutation.mutate({ ids: Array.from(selectedIds), userPin: bulkPin })}
                disabled={bulkHardDeleteMutation.isPending || bulkPin.length !== 4}
                className="flex-1 h-11 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {bulkHardDeleteMutation.isPending ? 'Deleting...' : 'Hard Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => setEditTarget(null)}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-[420px]" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-foreground mb-4">Edit User</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Name</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">WhatsApp</label>
                <input value={editForm.whatsapp} onChange={e => setEditForm(f => ({ ...f, whatsapp: e.target.value }))} className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="+44 7911 123456" />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Email</label>
                <input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="user@example.com" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditTarget(null)} className="flex-1 h-11 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button
                onClick={() => editUserMutation.mutate({ id: editTarget.id, name: editForm.name, whatsapp: editForm.whatsapp, email: editForm.email })}
                disabled={editUserMutation.isPending}
                className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {editUserMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Change Permission Dialog */}
      {walletTarget && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => { setWalletTarget(null); setWalletPassword(''); }}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-[420px]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Allow Wallet Change</h3>
                <p className="text-xs text-muted-foreground">Grant temporary permission to change wallet address</p>
              </div>
            </div>
            <p className="text-sm text-foreground mb-4">
              User: <strong>{walletTarget.name || 'Unknown'}</strong>
              {walletTarget.whatsapp && <span className="text-muted-foreground ml-1">({walletTarget.whatsapp})</span>}
            </p>

            {/* Duration picker */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-foreground block mb-1.5">Duration</label>
              <div className="grid grid-cols-4 gap-2">
                {WALLET_DURATION_OPTIONS.map(opt => (
                  <button
                    key={opt.hours}
                    onClick={() => { setWalletDurationChoice(opt.hours); if (opt.hours > 0) setWalletDuration(opt.hours); }}
                    className={`text-xs font-medium px-2 py-2 rounded-lg border transition-colors ${
                      walletDurationChoice === opt.hours ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-border text-foreground hover:bg-secondary'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {walletDurationChoice === 0 && (
                <div className="mt-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter hours..."
                    value={walletCustomHours}
                    onChange={e => { setWalletCustomHours(e.target.value); if (Number(e.target.value) > 0) setWalletDuration(Number(e.target.value)); }}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Password */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-foreground block mb-1.5">Password</label>
              <input
                type="password"
                value={walletPassword}
                onChange={e => setWalletPassword(e.target.value)}
                placeholder="Enter password to confirm"
                className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground mt-1">Password = 5891 + last 3 digits of user's WhatsApp</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setWalletTarget(null); setWalletPassword(''); }}
                className="flex-1 h-11 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => walletPermissionMutation.mutate({ userId: walletTarget.id, hours: walletDuration, password: walletPassword })}
                disabled={walletPermissionMutation.isPending || !walletPassword || walletDuration < 1}
                className="flex-1 h-11 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {walletPermissionMutation.isPending ? 'Granting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
