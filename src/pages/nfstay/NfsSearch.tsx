// NFStay Search — Airbnb-style layout
// Auto-runs on mount reading URL params from HeroSearch (query, dates, adults, city)
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useNfsPropertySearch } from '@/hooks/nfstay/use-nfs-property-search';
import NfsPropertyCard from '@/components/nfstay/properties/NfsPropertyCard';
import NfsSearchMap from '@/components/nfstay/maps/NfsSearchMap';
import { Search, Map, LayoutGrid, SlidersHorizontal, X, Users, CalendarDays, ChevronDown } from 'lucide-react';

// ── Property type filter chips ────────────────────────────────────────────────

const PROPERTY_TYPES = [
  { label: 'All', value: '' },
  { label: '🏠 Entire home', value: 'entire_home' },
  { label: '🏢 Apartment', value: 'apartment' },
  { label: '🏡 Villa', value: 'villa' },
  { label: '🏚️ Cottage', value: 'cottage' },
  { label: '🛖 Cabin', value: 'cabin' },
  { label: '🏖️ Beach', value: 'beach' },
  { label: '🏔️ Mountain', value: 'mountain' },
];

export default function NfsSearch() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { results, loading, error, search } = useNfsPropertySearch();

  // ── Filter state — seeded from URL params (from HeroSearch / PopularDestinations) ──
  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [guests, setGuests] = useState(Number(searchParams.get('adults') || 1));
  const [checkIn, setCheckIn] = useState(searchParams.get('dates')?.split(',')[0] || '');
  const [checkOut, setCheckOut] = useState(searchParams.get('dates')?.split(',')[1] || '');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const guestRef = useRef<HTMLDivElement>(null);

  const minDate = new Date().toISOString().split('T')[0];

  // Auto-search on mount with URL params, and whenever property type changes
  useEffect(() => {
    runSearch();
  }, [propertyType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Also trigger on first mount to load all listings
  const ranOnce = useRef(false);
  useEffect(() => {
    if (!ranOnce.current) {
      ranOnce.current = true;
      runSearch();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close guest dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (guestRef.current && !guestRef.current.contains(e.target as Node)) {
        setGuestOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const runSearch = () => {
    search({
      query: query.trim() || undefined,
      minGuests: guests > 1 ? guests : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      propertyType: propertyType || undefined,
    });
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    runSearch();
  };

  const clearSearch = () => {
    setQuery('');
    setGuests(1);
    setCheckIn('');
    setCheckOut('');
    setMinPrice('');
    setMaxPrice('');
    setPropertyType('');
    search({});
  };

  const hasActiveFilters = query || guests > 1 || checkIn || minPrice || maxPrice || propertyType;

  return (
    <div className="min-h-screen bg-[#f7f7f7]">

      {/* ── Search bar ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-0 rounded-full border border-gray-300 shadow-sm bg-white overflow-hidden hover:shadow-md transition-shadow max-w-3xl mx-auto">

              {/* Location */}
              <div className="flex-1 flex items-center gap-2 px-4 py-2.5 border-r border-gray-200">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Anywhere"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full text-sm bg-transparent outline-none placeholder:text-gray-400"
                />
                {query && (
                  <button type="button" onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Check-in */}
              <div className="hidden sm:flex flex-col px-4 py-2 border-r border-gray-200 min-w-[120px]">
                <span className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">Check in</span>
                <input
                  type="date"
                  min={minDate}
                  value={checkIn}
                  onChange={e => setCheckIn(e.target.value)}
                  className="text-sm text-gray-600 bg-transparent outline-none cursor-pointer"
                />
              </div>

              {/* Check-out */}
              <div className="hidden sm:flex flex-col px-4 py-2 border-r border-gray-200 min-w-[120px]">
                <span className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">Check out</span>
                <input
                  type="date"
                  min={checkIn || minDate}
                  value={checkOut}
                  onChange={e => setCheckOut(e.target.value)}
                  className="text-sm text-gray-600 bg-transparent outline-none cursor-pointer"
                />
              </div>

              {/* Guests */}
              <div className="relative" ref={guestRef}>
                <button
                  type="button"
                  onClick={() => setGuestOpen(o => !o)}
                  className="flex items-center gap-2 px-4 py-2.5 min-w-[100px]"
                >
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{guests > 1 ? `${guests} guests` : 'Add guests'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>
                {guestOpen && (
                  <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 w-56 z-30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">Adults</p>
                        <p className="text-xs text-gray-500">Ages 13 or above</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setGuests(g => Math.max(1, g - 1))}
                          className="w-7 h-7 rounded-full border border-gray-300 text-gray-600 hover:border-gray-900 text-sm font-medium disabled:opacity-40"
                          disabled={guests <= 1}>−</button>
                        <span className="w-5 text-center text-sm">{guests}</span>
                        <button type="button" onClick={() => setGuests(g => Math.min(20, g + 1))}
                          className="w-7 h-7 rounded-full border border-gray-300 text-gray-600 hover:border-gray-900 text-sm font-medium">+</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Search button */}
              <button
                type="submit"
                disabled={loading}
                className="m-1.5 bg-gradient-to-r from-[#E61E4D] to-[#E31C5F] text-white rounded-full px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 flex-shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Search</span>
              </button>
            </div>
          </form>
        </div>

        {/* ── Type filter chips ───────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {PROPERTY_TYPES.map(pt => (
              <button
                key={pt.value}
                onClick={() => setPropertyType(propertyType === pt.value ? '' : pt.value)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  propertyType === pt.value
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-900'
                }`}
              >
                {pt.label}
              </button>
            ))}

            {/* Extra filters toggle */}
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium border transition-all ml-1 ${
                showFilters ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
            </button>

            {hasActiveFilters && (
              <button onClick={clearSearch} className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-900 underline">
                <X className="w-3 h-3" />Clear all
              </button>
            )}
          </div>

          {/* Price filter (shown when Filters is open) */}
          {showFilters && (
            <div className="flex items-center gap-3 pt-2 pb-1">
              <span className="text-xs font-semibold text-gray-700">Price / night:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                  className="w-20 text-sm border border-gray-300 rounded-lg px-2 py-1 outline-none focus:border-gray-900"
                  min={0}
                />
                <span className="text-gray-400">–</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  className="w-20 text-sm border border-gray-300 rounded-lg px-2 py-1 outline-none focus:border-gray-900"
                  min={0}
                />
                <button
                  onClick={runSearch}
                  className="px-3 py-1 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Results ─────────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4 border border-red-100">
            {error}
          </div>
        )}

        {/* Result count + view toggle */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-gray-600 font-medium">
            {loading ? 'Searching…' : `${results.length} ${results.length === 1 ? 'property' : 'properties'} found`}
          </p>
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-700'}`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'map' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-700'}`}
              title="Map view"
            >
              <Map className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="space-y-3">
                <div className="aspect-square bg-gray-200 rounded-2xl animate-pulse" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
              </div>
            ))}
          </div>
        ) : viewMode === 'map' ? (
          <div className="h-[600px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <NfsSearchMap
              properties={results}
              onPropertyClick={(id) => navigate(`/property/${id}`)}
            />
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <Search className="w-9 h-9 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No exact matches</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs">
              Try adjusting your search or filters to find what you're looking for.
            </p>
            <button
              onClick={clearSearch}
              className="text-sm font-semibold underline text-gray-900 hover:text-gray-600"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
