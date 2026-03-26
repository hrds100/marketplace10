// Admin: User management - wired to real Supabase profiles table
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, MoreHorizontal, UserCheck, UserX, Mail, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';

interface ProfileUser {
  id: string;
  name: string | null;
  email: string | null;
  wallet_address: string | null;
  tier: string | null;
  admin_label: string | null;
  whatsapp: string | null;
}

export default function AdminNfsUsers() {
  const [users, setUsers] = useState<ProfileUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await (supabase.from('profiles') as any)
        .select('id, name, email, wallet_address, tier, admin_label, whatsapp')
        .order('id', { ascending: false })
        .limit(500);

      if (dbError) { setError(dbError.message); return; }
      setUsers(data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter(u => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.wallet_address?.toLowerCase().includes(q) ||
      u.admin_label?.toLowerCase().includes(q)
    );
  });

  return (
    <div data-feature="ADMIN__NFSTAY" className="p-6 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground">{users.length} registered users</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          data-feature="ADMIN__NFS_USERS_SEARCH"
          placeholder="Search by name, email, or wallet..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 rounded-lg"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div data-feature="ADMIN__NFS_USERS_TABLE" className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left bg-muted/30">
                  <th className="p-4 font-medium text-muted-foreground">User</th>
                  <th className="p-4 font-medium text-muted-foreground">Tier</th>
                  <th className="p-4 font-medium text-muted-foreground">Label</th>
                  <th className="p-4 font-medium text-muted-foreground">WhatsApp</th>
                  <th className="p-4 font-medium text-muted-foreground w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No users found</td></tr>
                ) : filtered.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                          {(u.name || u.email || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{u.name || 'Unnamed'}</p>
                          <p className="text-xs text-muted-foreground">{u.email || u.wallet_address?.slice(0, 16) || '--'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                        {u.tier || 'free'}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground text-xs">{u.admin_label || '--'}</td>
                    <td className="p-4 text-muted-foreground text-xs">{u.whatsapp || '--'}</td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-lg hover:bg-secondary"><MoreHorizontal className="w-4 h-4" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2" onClick={() => {
                            navigator.clipboard.writeText(u.id);
                            toast({ title: 'User ID copied' });
                          }}>
                            <Mail className="w-4 h-4" /> Copy ID
                          </DropdownMenuItem>
                          {u.email && (
                            <DropdownMenuItem className="gap-2" onClick={() => {
                              navigator.clipboard.writeText(u.email!);
                              toast({ title: 'Email copied' });
                            }}>
                              <UserCheck className="w-4 h-4" /> Copy email
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
