import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import PropertyCard from '@/components/PropertyCard';
import type { ListingShape } from '@/components/InquiryPanel';
import { useFavourites } from '@/hooks/useFavourites';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

const DealsMap = lazy(() => import('@/components/DealsMap'));

const tabs = ['All', 'Live', 'On Offer', 'Inactive'] as const;

function toListingShape(p: Tables<'properties'>): ListingShape {
  const daysAgo = Math.max(
    0,
    Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000),
  );
  const photos = (p as Record<string, unknown>).photos as string[] | null;
  const image =
    photos && photos.length > 0
      ? photos[0]
      : `https://placehold.co/800x520/1a1a2e/ffffff?text=${encodeURIComponent(p.city || 'Property')}`;
  return {
    id: p.id,
    name: p.name,
    city: p.city,
    postcode: p.postcode,
    rent: p.rent_monthly,
    profit: p.profit_est,
    type: p.type,
    status: p.status as 'live' | 'on-offer' | 'inactive',
    featured: p.featured,
    prime: (p as Record<string, unknown>).prime === true,
    daysAgo,
    image,
    landlordApproved: (p as Record<string, unknown>).sa_approved === 'yes',
    landlordWhatsapp: p.landlord_whatsapp,
  };
}

function CardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse">
      <div className="h-[200px] bg-muted" />
      <div className="p-3.5 pt-3 space-y-3">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="space-y-2 mt-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex justify-between py-[7px] border-b border-border/50">
              <div className="h-3 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-1/4" />
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <div className="flex-1 h-[38px] bg-muted rounded-lg" />
          <div className="flex-1 h-[38px] bg-muted rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function DealsPageV2() {
  const { toggle, isFav } = useFavourites();
  const [activeTab, setActiveTab] = useState<string>('All');
  const [city, setCity] = useState('');
  const [type, setType] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const perPage = 12;
  const navigate = useNavigate();

  const handleInquire = useCallback(
    (listing: ListingShape) => {
      navigate(`/dashboard/inbox?deal=${listing.id}`);
    },
    [navigate],
  );

  const { data: dbProperties, isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data, error } = await supabase.from('properties').select('*');
      if (error) throw error;
      return data;
    },
  });

  const listings = useMemo(() => {
    if (!dbProperties) return [];
    return dbProperties
      .filter(p => p.status === 'live' || p.status === 'on-offer')
      .map(toListingShape);
  }, [dbProperties]);

  const liveCount = listings.filter(l => l.status === 'live').length;

  // Top section: Prime first, then Featured, fill remaining slots with regular
  const highlighted = useMemo(() => {
    const prime = listings.filter(l => l.prime);
    const featured = listings.filter(l => l.featured && !l.prime);
    const topIds = new Set([...prime, ...featured].map(l => l.id));
    // If we have fewer than 2 highlighted, fill with regular properties
    const regular = listings.filter(l => !topIds.has(l.id));
    const combined = [...prime, ...featured];
    while (combined.length < 2 && regular.length > 0) {
      combined.push(regular.shift()!);
    }
    return combined;
  }, [listings]);
  const highlightedIds = new Set(highlighted.map(l => l.id));

  const filtered = useMemo(() => {
    let result = listings.filter(l => !highlightedIds.has(l.id));
    if (activeTab !== 'All') {
      const statusMap: Record<string, string> = {
        Live: 'live',
        'On Offer': 'on-offer',
        Inactive: 'inactive',
      };
      result = result.filter(l => l.status === statusMap[activeTab]);
    }
    if (city) result = result.filter(l => l.city === city);
    if (type) result = result.filter(l => l.type === type);
    if (sort === 'profit') result.sort((a, b) => b.profit - a.profit);
    else if (sort === 'rent') result.sort((a, b) => a.rent - b.rent);
    else result.sort((a, b) => a.daysAgo - b.daysAgo);
    return result;
  }, [activeTab, city, type, sort, listings, highlightedIds]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const pageListings = filtered.slice((page - 1) * perPage, page * perPage);
  const cities = [...new Set(listings.map(l => l.city))].sort();
  const types = [...new Set(listings.map(l => l.type))].sort();

  const handleAddToCRM = () => {
    // Toast handled inside PropertyCard
  };

  const mapListings = useMemo(
    () => [...highlighted, ...pageListings],
    [highlighted, pageListings],
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* ── HEADER — subtitle only, no "Deals" title ───────────── */}
      <div className="px-6 md:px-8 pt-4 pb-3 flex-shrink-0">
        <p className="text-sm text-muted-foreground">
          {liveCount} landlord-approved properties across the UK
        </p>
      </div>

      {/* ── SPLIT — filter+cards left, map right ────────────────── */}
      <div className="flex flex-1 overflow-hidden border-t border-border/30">

        {/* Left: scrollable card list */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="px-6 md:px-8 py-5">

            {/* Filter bar */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <div className="flex gap-0.5 bg-muted p-1 rounded-lg">
                {tabs.map(t => (
                  <button
                    key={t}
                    onClick={() => { setActiveTab(t); setPage(1); }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                      activeTab === t
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <select
                value={city}
                onChange={e => { setCity(e.target.value); setPage(1); }}
                className="input-nfstay h-8 text-xs pr-7 bg-card"
              >
                <option value="">All cities</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={type}
                onChange={e => { setType(e.target.value); setPage(1); }}
                className="input-nfstay h-8 text-xs pr-7 bg-card"
              >
                <option value="">All types</option>
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="input-nfstay h-8 text-xs pr-7 bg-card"
              >
                <option value="newest">Newest</option>
                <option value="profit">Highest profit</option>
                <option value="rent">Lowest rent</option>
              </select>
              <span className="text-xs text-muted-foreground">
                {filtered.length + highlighted.length} deals
              </span>
            </div>

            {/* Highlighted: Prime → Featured → Regular fill */}
            {highlighted.length > 0 && (
              <div className="mb-8">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Top Picks
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {highlighted.map(l => (
                    <div
                      key={l.id}
                      onMouseEnter={() => setHoveredId(l.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <PropertyCard
                        listing={l}
                        isFav={isFav(l.id)}
                        onToggleFav={() => toggle(l.id)}
                        onAddToCRM={handleAddToCRM}
                        onInquire={handleInquire}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-8 border-t border-border" />
              </div>
            )}

            {/* Card grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[0, 1, 2, 3, 4, 5].map(i => <CardSkeleton key={i} />)}
              </div>
            ) : pageListings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {pageListings.map(l => (
                  <div
                    key={l.id}
                    onMouseEnter={() => setHoveredId(l.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <PropertyCard
                      listing={l}
                      isFav={isFav(l.id)}
                      onToggleFav={() => toggle(l.id)}
                      onAddToCRM={handleAddToCRM}
                      onInquire={handleInquire}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-2xl mb-3">🏠</p>
                <p className="text-base font-semibold text-foreground mb-1">No deals found</p>
                <p className="text-sm text-muted-foreground">
                  Check back soon — new deals are added daily.
                </p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8 pb-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 px-2 py-1"
                >
                  Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                      page === p
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                {totalPages > 5 && (
                  <>
                    <span className="text-muted-foreground text-xs">…</span>
                    <button
                      onClick={() => setPage(totalPages)}
                      className={`w-8 h-8 rounded-full text-xs font-medium ${
                        page === totalPages
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 px-2 py-1"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: map */}
        <div className="hidden lg:block w-[45%] max-w-[700px] flex-shrink-0 border-l border-border/30">
          <Suspense
            fallback={
              <div className="w-full h-full bg-muted/30 animate-pulse flex items-center justify-center">
                <span className="text-sm text-muted-foreground">Loading map…</span>
              </div>
            }
          >
            <DealsMap listings={mapListings} hoveredId={hoveredId} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
