import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNfsPropertySearch } from '@/hooks/nfstay/use-nfs-property-search';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import NfsPropertyCard from '@/components/nfstay/properties/NfsPropertyCard';
import NfsSearchMap from '@/components/nfstay/maps/NfsSearchMap';
import { Search, Map, LayoutGrid } from 'lucide-react';

export default function NfsSearch() {
  const navigate = useNavigate();
  const { results, loading, error, search } = useNfsPropertySearch();
  const [query, setQuery] = useState('');
  const [minGuests, setMinGuests] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    search({
      query: query || undefined,
      minGuests: minGuests ? Number(minGuests) : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/40 bg-white dark:bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by location, name..."
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
            <div className="w-28">
              <Input
                type="number"
                placeholder="Min price"
                value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
                min={0}
              />
            </div>
            <div className="w-28">
              <Input
                type="number"
                placeholder="Max price"
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                min={0}
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

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {results.length} {results.length === 1 ? 'property' : 'properties'} found
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/40'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-2 rounded-lg ${viewMode === 'map' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/40'}`}
            >
              <Map className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-muted/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : viewMode === 'map' ? (
          <div className="h-[600px] rounded-xl overflow-hidden border border-border/40">
            <NfsSearchMap
              properties={results}
              onPropertyClick={(id) => navigate(`/property/${id}`)}
            />
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No properties found matching your search.</p>
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
