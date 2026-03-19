// White-label search page — map + filter panel + property grid
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNfsWhiteLabel } from '@/hooks/nfstay/use-nfs-white-label';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Map, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NfsWlPropertyCard from '@/components/nfstay/white-label/NfsWlPropertyCard';
import NfsWlFilterPanel, {
  type NfsWlSearchFilters,
} from '@/components/nfstay/white-label/NfsWlFilterPanel';
import NfsWlSearchMap from '@/components/nfstay/white-label/NfsWlSearchMap';
import type { NfsProperty } from '@/lib/nfstay/types';

const INITIAL_FILTERS: NfsWlSearchFilters = {
  query: '',
  propertyType: '',
  minPrice: '',
  maxPrice: '',
  minGuests: '',
};

export default function NfsWlSearch() {
  const navigate = useNavigate();
  const { operator, isPlatform } = useNfsWhiteLabel();
  const [results, setResults] = useState<NfsProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<NfsWlSearchFilters>(INITIAL_FILTERS);
  const [showMap, setShowMap] = useState(() => window.innerWidth >= 768);
  const [highlightedPropertyId, setHighlightedPropertyId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const searchProperties = useCallback(async () => {
    if (!operator?.id) return;
    setLoading(true);
    setError(null);

    try {
      let q = (supabase.from('nfs_properties') as any)
        .select('*')
        .eq('listing_status', 'listed');

      // Platform mode: show all listed properties from all operators
      // Operator mode: filter to this operator only
      if (!isPlatform) {
        q = q.eq('operator_id', operator.id);
      }

      if (filters.query) {
        q = q.or(
          `public_title.ilike.%${filters.query}%,description.ilike.%${filters.query}%,address.ilike.%${filters.query}%`,
        );
      }

      if (filters.propertyType) {
        q = q.eq('property_type', filters.propertyType);
      }

      if (filters.minPrice) {
        q = q.gte('base_rate_amount', Number(filters.minPrice));
      }

      if (filters.maxPrice) {
        q = q.lte('base_rate_amount', Number(filters.maxPrice));
      }

      if (filters.minGuests) {
        q = q.gte('max_guests', Number(filters.minGuests));
      }

      const { data, error: dbError } = await q.order('updated_at', {
        ascending: false,
      });

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
  }, [operator?.id, isPlatform, filters]);

  // Load on mount
  useEffect(() => {
    searchProperties();
  }, [operator?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    searchProperties();
  };

  const handleClear = () => {
    setFilters(INITIAL_FILTERS);
    // Trigger search with cleared filters on next tick
    setTimeout(() => searchProperties(), 0);
  };

  const handleMarkerClick = (propertyId: string) => {
    const el = cardRefs.current[propertyId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedPropertyId(propertyId);
      setTimeout(() => setHighlightedPropertyId(null), 2000);
    }
  };

  const handleCardHover = (propertyId: string | null) => {
    setHighlightedPropertyId(propertyId);
  };

  return (
    <div className="min-h-[60vh]">
      {/* Filter bar */}
      <NfsWlFilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        onSearch={handleSearch}
        onClear={handleClear}
        loading={loading}
        resultCount={results.length}
      />

      {/* Map/Grid toggle */}
      <div className="border-b border-border/40 bg-white dark:bg-card">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2">
          <Button
            variant={showMap ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowMap(true)}
            className="gap-1.5"
          >
            <Map className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Map</span>
          </Button>
          <Button
            variant={!showMap ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowMap(false)}
            className="gap-1.5"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Grid</span>
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-auto max-w-7xl px-4 pt-4">
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="mx-auto max-w-7xl">
        <div className={`flex ${showMap ? 'flex-col md:flex-row' : ''}`}>
          {/* Map panel */}
          {showMap && (
            <div className="h-[50vh] w-full md:sticky md:top-[80px] md:h-[calc(100vh-80px)] md:w-[40%]">
              <NfsWlSearchMap
                properties={results}
                onMarkerClick={handleMarkerClick}
                onMarkerHover={handleCardHover}
                highlightedPropertyId={highlightedPropertyId}
                className="h-full"
              />
            </div>
          )}

          {/* Results grid */}
          <div className={`flex-1 p-4 ${showMap ? 'md:w-[60%]' : ''}`}>
            {loading ? (
              <div
                className={`grid gap-4 ${
                  showMap
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                }`}
              >
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="aspect-[4/3] rounded-xl bg-muted/30 animate-pulse"
                  />
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MapPin className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">
                  No properties match your search
                </p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Try adjusting your filters
                </p>
              </div>
            ) : (
              <div
                className={`grid gap-4 ${
                  showMap
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                }`}
              >
                {results.map((p) => (
                  <div
                    key={p.id}
                    ref={(el) => {
                      cardRefs.current[p.id] = el;
                    }}
                    onMouseEnter={() => handleCardHover(p.id)}
                    onMouseLeave={() => handleCardHover(null)}
                  >
                    <NfsWlPropertyCard
                      property={p}
                      onClick={() => navigate(`/property/${p.id}`)}
                      isHighlighted={highlightedPropertyId === p.id}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
