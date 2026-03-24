import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNfsProperties } from '@/hooks/nfstay/use-nfs-properties';
import { useNfsPropertyMutation } from '@/hooks/nfstay/use-nfs-property-mutation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NFS_ROUTES } from '@/lib/nfstay/constants';
import { Building2, Plus, Search } from 'lucide-react';
import type { NfsProperty } from '@/lib/nfstay/types';

const STATUS_FILTERS = ['all', 'listed', 'unlisted', 'archived', 'draft'] as const;

const STATUS_COLORS: Record<string, string> = {
  listed: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  unlisted: 'bg-yellow-100 text-yellow-700',
  archived: 'bg-red-100 text-red-700',
};

export default function NfsProperties() {
  const navigate = useNavigate();
  const { properties, loading, error, refetch } = useNfsProperties();
  const { bulkUpdateStatus, saving } = useNfsPropertyMutation();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!properties) return [];
    return properties.filter((p: NfsProperty) => {
      if (statusFilter !== 'all' && p.listing_status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const title = (p.public_title || p.internal_title || '').toLowerCase();
        const addr = (p.address || '').toLowerCase();
        const city = (p.city || '').toLowerCase();
        if (!title.includes(q) && !addr.includes(q) && !city.includes(q)) return false;
      }
      return true;
    });
  }, [properties, statusFilter, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkStatus = async (status: string) => {
    if (selected.size === 0) return;
    try {
      await bulkUpdateStatus(Array.from(selected), status);
      setSelected(new Set());
      refetch();
    } catch {
      // error shown via hook
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
        <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg">{error}</div>
      </div>
    );
  }

  return (
    <div data-feature="BOOKING_NFSTAY__OPERATOR_DASHBOARD" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your vacation rental listings.</p>
        </div>
        <Button data-feature="BOOKING_NFSTAY__PROPERTIES_ADD" onClick={() => navigate(NFS_ROUTES.PROPERTY_NEW)}>
          <Plus className="w-4 h-4 mr-1" /> Add property
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div data-feature="BOOKING_NFSTAY__PROPERTIES_FILTER" className="flex gap-1.5">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                statusFilter === s
                  ? 'border-primary bg-primary/5 font-medium text-primary'
                  : 'border-border/40 text-muted-foreground hover:border-primary/30'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div data-feature="BOOKING_NFSTAY__PROPERTIES_SEARCH" className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search properties..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 rounded-lg border border-primary/20">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => handleBulkStatus('listed')} disabled={saving}>
            List
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkStatus('unlisted')} disabled={saving}>
            Unlist
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkStatus('archived')} disabled={saving}>
            Archive
          </Button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground ml-auto hover:underline">
            Clear
          </button>
        </div>
      )}

      {/* Property list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border/60 rounded-xl bg-muted/20">
          <Building2 className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            {properties && properties.length > 0
              ? 'No properties match your filters.'
              : 'No properties yet. Create your first property.'}
          </p>
          {(!properties || properties.length === 0) && (
            <Button onClick={() => navigate(NFS_ROUTES.PROPERTY_NEW)}>
              <Plus className="w-4 h-4 mr-1" /> Create property
            </Button>
          )}
        </div>
      ) : (
        <div data-feature="BOOKING_NFSTAY__PROPERTIES_LIST" className="grid gap-3">
          {filtered.map((p: NfsProperty) => {
            const coverImage = p.images?.[0];
            const title = p.public_title || p.internal_title || 'Untitled';
            const location = [p.city, p.country].filter(Boolean).join(', ');
            const updated = new Date(p.updated_at).toLocaleDateString();

            return (
              <div
                key={p.id}
                data-feature="BOOKING_NFSTAY__PROPERTIES_CARD"
                className="flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-white dark:bg-card hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => navigate(`/nfstay/properties/${p.id}`)}
              >
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={e => { e.stopPropagation(); toggleSelect(p.id); }}
                  onClick={e => e.stopPropagation()}
                  className="w-4 h-4 rounded border-border"
                />
                <div className="w-16 h-12 rounded-lg bg-muted/40 overflow-hidden flex-shrink-0">
                  {coverImage ? (
                    <img src={coverImage.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{title}</p>
                  <p className="text-xs text-muted-foreground">{location || 'No location'}</p>
                </div>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[p.listing_status] || STATUS_COLORS.draft}`}>
                  {p.listing_status}
                </span>
                <div className="text-right">
                  <p className="text-sm font-medium">{p.base_rate_currency} {p.base_rate_amount}</p>
                  <p className="text-xs text-muted-foreground">{updated}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
