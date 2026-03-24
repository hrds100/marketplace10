// Admin: All nfstay properties across all operators
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, RefreshCw, Loader2, AlertCircle, ExternalLink, MapPin, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type ListingStatus = 'all' | 'listed' | 'draft' | 'unlisted' | 'archived';

interface AdminProperty {
  id: string;
  public_title?: string;
  city?: string;
  country?: string;
  listing_status: string;
  base_rate_amount?: number;
  base_rate_currency?: string;
  max_guests?: number;
  created_at: string;
  operator?: { business_name?: string; email?: string };
  images?: { url: string; is_cover?: boolean }[];
}

const STATUS_COLORS: Record<string, string> = {
  listed:   'bg-green-100 text-green-700',
  draft:    'bg-amber-100 text-amber-700',
  unlisted: 'bg-gray-100 text-gray-600',
  archived: 'bg-red-100 text-red-700',
};

const STATUSES: ListingStatus[] = ['all', 'listed', 'draft', 'unlisted', 'archived'];

export default function AdminNfsProperties() {
  const [properties, setProperties] = useState<AdminProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ListingStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = (supabase.from('nfs_properties') as any)
        .select(`
          id, public_title, city, country, listing_status,
          base_rate_amount, base_rate_currency, max_guests, created_at, images,
          nfs_operators!operator_id(business_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(300);

      if (statusFilter !== 'all') query = query.eq('listing_status', statusFilter);

      const { data, error: dbError } = await query;
      if (dbError) { setError(dbError.message); return; }

      setProperties((data || []).map((p: any) => ({
        ...p,
        operator: p.nfs_operators,
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const updateStatus = async (id: string, newStatus: string) => {
    const { error: e } = await (supabase.from('nfs_properties') as any)
      .update({ listing_status: newStatus })
      .eq('id', id);
    if (!e) setProperties(prev => prev.map(p => p.id === id ? { ...p, listing_status: newStatus } : p));
  };

  const filtered = properties.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.public_title?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q) ||
      p.country?.toLowerCase().includes(q) ||
      p.operator?.business_name?.toLowerCase().includes(q) ||
      p.operator?.email?.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  });

  return (
    <div data-feature="ADMIN__NFSTAY" className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">nfstay Properties</h1>
          <p className="text-sm text-muted-foreground mt-0.5">All properties across all operators</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchProperties} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: filtered.length },
          { label: 'Listed', value: filtered.filter(p => p.listing_status === 'listed').length },
          { label: 'Draft', value: filtered.filter(p => p.listing_status === 'draft').length },
          { label: 'Unlisted', value: filtered.filter(p => p.listing_status === 'unlisted').length },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-card border border-border/40 rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, location, or operator..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-purple-600 text-white'
                  : 'bg-muted hover:bg-muted/70 text-muted-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No properties found.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(p => {
            const cover = p.images?.find(i => i.is_cover)?.url || p.images?.[0]?.url;
            const location = [p.city, p.country].filter(Boolean).join(', ');

            return (
              <div key={p.id} className="bg-white dark:bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm">
                {/* Image */}
                <div className="h-36 bg-muted overflow-hidden">
                  {cover
                    ? <img src={cover} alt={p.public_title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
                  }
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm line-clamp-1">{p.public_title || 'Untitled'}</h3>
                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[p.listing_status] || 'bg-gray-100 text-gray-600'}`}>
                      {p.listing_status}
                    </span>
                  </div>
                  {location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {location}
                    </p>
                  )}
                  {p.operator?.business_name && (
                    <p className="text-xs text-purple-600">by {p.operator.business_name}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    {p.base_rate_amount && (
                      <span className="font-semibold text-foreground">
                        {p.base_rate_currency} {p.base_rate_amount}/night
                      </span>
                    )}
                    {p.max_guests && (
                      <span className="flex items-center gap-0.5">
                        <Users className="w-3 h-3" /> {p.max_guests} max
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <select
                      value={p.listing_status}
                      onChange={e => updateStatus(p.id, e.target.value)}
                      className="flex-1 text-xs border border-border/40 rounded-md px-2 py-1 bg-background cursor-pointer"
                    >
                      {['draft', 'listed', 'unlisted', 'archived'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <a
                      href={`/property/${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-muted rounded-md transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
