// Admin: Operator management - wired to real Supabase nfs_operators table
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, Globe, Building2, Phone, Mail, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface OperatorRow {
  id: string;
  profile_id: string;
  brand_name: string | null;
  legal_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  subdomain: string | null;
  custom_domain: string | null;
  listings_count: number;
  onboarding_step: string;
  created_at: string;
}

export default function AdminNfsOperators() {
  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchOperators = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await (supabase.from('nfs_operators') as any)
        .select('id, profile_id, brand_name, legal_name, contact_email, contact_phone, subdomain, custom_domain, listings_count, onboarding_step, created_at')
        .order('created_at', { ascending: false })
        .limit(200);

      if (dbError) { setError(dbError.message); return; }
      setOperators(data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load operators');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOperators(); }, [fetchOperators]);

  const filtered = operators.filter(op => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      op.brand_name?.toLowerCase().includes(q) ||
      op.legal_name?.toLowerCase().includes(q) ||
      op.contact_email?.toLowerCase().includes(q) ||
      op.subdomain?.toLowerCase().includes(q)
    );
  });

  return (
    <div data-feature="ADMIN__NFSTAY" className="p-6 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Operator Management</h1>
          <p className="text-sm text-muted-foreground">{operators.length} total operators</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchOperators} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search operators..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-lg" />
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
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No operators found.</p>
      ) : (
        <div data-feature="ADMIN__NFS_OPERATORS_TABLE" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(op => (
            <div key={op.id} className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-base">{op.brand_name || op.legal_name || 'Unnamed'}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Joined {new Date(op.created_at).toLocaleDateString()} -- Step: {op.onboarding_step}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                  {op.listings_count} listing{op.listings_count !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {op.contact_email && (
                  <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-3.5 h-3.5" />{op.contact_email}</div>
                )}
                {op.contact_phone && (
                  <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-3.5 h-3.5" />{op.contact_phone}</div>
                )}
                {op.subdomain && (
                  <div className="flex items-center gap-2 text-muted-foreground"><Globe className="w-3.5 h-3.5" />{op.subdomain}.nfstay.app</div>
                )}
                {op.custom_domain && (
                  <div className="flex items-center gap-2 text-muted-foreground"><Globe className="w-3.5 h-3.5" />{op.custom_domain}</div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="w-3.5 h-3.5" />{op.listings_count} properties</div>
              </div>

              <p className="text-xs font-mono text-muted-foreground">ID: {op.id.slice(0, 12)}...</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
