// White-label search page — shows only this operator's listed properties
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNfsWhiteLabel } from '@/hooks/nfstay/use-nfs-white-label';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import NfsPropertyCard from '@/components/nfstay/properties/NfsPropertyCard';
import { Search } from 'lucide-react';
import type { NfsProperty } from '@/lib/nfstay/types';

export default function NfsWlSearch() {
  const navigate = useNavigate();
  const { operator } = useNfsWhiteLabel();
  const [results, setResults] = useState<NfsProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [minGuests, setMinGuests] = useState('');

  const searchProperties = useCallback(async () => {
    if (!operator?.id) return;
    setLoading(true);
    setError(null);

    try {
      let q = (supabase.from('nfs_properties') as any)
        .select('*')
        .eq('operator_id', operator.id)
        .eq('listing_status', 'listed');

      if (query) {
        q = q.or(
          `public_title.ilike.%${query}%,description.ilike.%${query}%,address.ilike.%${query}%`
        );
      }

      if (minGuests) {
        q = q.gte('max_guests', Number(minGuests));
      }

      const { data, error: dbError } = await q.order('updated_at', { ascending: false });

      if (dbError) {
        setError(dbError.message);
        setResults([]);
      } else {
        setResults((data as NfsProperty[]) ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [operator?.id, query, minGuests]);

  // Load on mount
  useEffect(() => {
    searchProperties();
  }, [operator?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    searchProperties();
  };

  return (
    <div data-feature="BOOKING_NFSTAY__WHITE_LABEL" className="min-h-[60vh]">
      {/* Search bar */}
      <div className="border-b border-border/40 bg-white dark:bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search properties..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="w-24">
              <Input
                type="number"
                placeholder="Guests"
                value={minGuests}
                onChange={e => setMinGuests(e.target.value)}
                min={1}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <p className="text-sm text-muted-foreground mb-4">
          {results.length} {results.length === 1 ? 'property' : 'properties'} available
        </p>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-muted/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No properties available right now.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map(p => (
              <NfsPropertyCard
                key={p.id}
                property={p}
                onClick={() => navigate(`/property/${p.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
