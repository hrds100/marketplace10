import { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PropertyCard from '@/components/PropertyCard';
import type { ListingShape } from '@/components/InquiryPanel';
import { useFavourites } from '@/hooks/useFavourites';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useInvestProperties } from '@/hooks/useInvestData';

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
    listing_type: ((p as Record<string, unknown>).listing_type as 'rental' | 'sale') || 'rental',
    slug: ((p as Record<string, unknown>).slug as string) || null,
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
  const [listingTypeFilter, setListingTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const perPage = 12;
  const navigate = useNavigate();
  const location = useLocation();

  // Scroll to property when navigated from favourites dropdown
  useEffect(() => {
    if (location.hash) {
      setTimeout(() => {
        const el = document.getElementById(location.hash.slice(1));
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.transition = 'box-shadow 0.3s';
          el.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.4)';
          setTimeout(() => { el.style.boxShadow = ''; }, 2000);
        }
      }, 500);
    }
  }, [location.hash]);

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

  const { data: investProperties } = useInvestProperties();

  const listings = useMemo(() => {
    if (!dbProperties) return [];
    const base = dbProperties
      .filter(p => p.status === 'live' || p.status === 'on-offer')
      .map(toListingShape);

    // Enrich prime/JV cards with real investment data from inv_properties
    if (investProperties && investProperties.length > 0) {
      const inv = investProperties[0]; // Primary investment property (Pembroke Place)
      const totalShares = inv.total_shares || 1;
      const sharesSold = inv.shares_sold || 0;
      const fundedPct = Math.round((sharesSold / totalShares) * 100);
      const propertyValue = Number(inv.property_value) || 0;
      const pricePerShare = Number(inv.price_per_share) || 1;
      const minContribution = Math.max(pricePerShare * 500, 500); // Min 500 shares or £500
      const annualYield = Number(inv.annual_yield) || 0;
      const monthlyRent = Number(inv.monthly_rent) || 0;
      // Monthly profit estimate: (monthlyRent * annualYield / 100) simplified
      const monthlyProfit = Math.round((propertyValue * (annualYield / 100)) / 12);

      // Use inv_properties location (e.g. "Liverpool, United Kingdom") as the display location
      const invLocation = (inv.location as string) || '';

      return base.map(l => {
        if (!l.prime) return l;
        return {
          ...l,
          name: inv.title || l.name,
          city: invLocation || l.city,
          postcode: '',
          image: (inv as any).photos?.[0] || (inv as any).images?.[0] || (inv.image as string) || l.image,
          type: (inv.type as string) || l.type,
          investTarget: propertyValue,
          investFundedPct: fundedPct,
          investMinContribution: minContribution,
          investMonthlyProfit: monthlyProfit,
          investReturns: annualYield,
        };
      });
    }

    return base;
  }, [dbProperties, investProperties]);

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
    if (listingTypeFilter !== 'all') result = result.filter(l => (l.listing_type || 'rental') === listingTypeFilter);
    if (sort === 'profit') result.sort((a, b) => b.profit - a.profit);
    else if (sort === 'rent') result.sort((a, b) => a.rent - b.rent);
    else result.sort((a, b) => a.daysAgo - b.daysAgo);
    return result;
  }, [activeTab, city, type, sort, listingTypeFilter, listings, highlightedIds]);

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
    <div data-feature="DEALS" className="flex flex-col flex-1 overflow-hidden">

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
            <div data-feature="DEALS__FILTER_BAR" className="flex items-center gap-2 mb-6 flex-wrap">
              <div data-feature="DEALS__STATUS_TABS" className="flex gap-0.5 bg-muted p-1 rounded-lg">
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
                data-feature="DEALS__FILTER_CITY"
                value={city}
                onChange={e => { setCity(e.target.value); setPage(1); }}
                className="input-nfstay h-8 text-xs pr-7 bg-card"
              >
                <option value="">All cities</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                data-feature="DEALS__FILTER_TYPE"
                value={type}
                onChange={e => { setType(e.target.value); setPage(1); }}
                className="input-nfstay h-8 text-xs pr-7 bg-card"
              >
                <option value="">All types</option>
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                data-feature="DEALS__FILTER_LISTING_TYPE"
                value={listingTypeFilter}
                onChange={e => { setListingTypeFilter(e.target.value); setPage(1); }}
                className="input-nfstay h-8 text-xs pr-7 bg-card"
              >
                <option value="all">All listings</option>
                <option value="rental">Rental only</option>
                <option value="sale">For Sale only</option>
              </select>
              <select
                data-feature="DEALS__FILTER_SORT"
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="input-nfstay h-8 text-xs pr-7 bg-card"
              >
                <option value="newest">Newest</option>
                <option value="profit">Highest profit</option>
                <option value="rent">Lowest rent</option>
              </select>
              <span data-feature="DEALS__COUNT" className="text-xs text-muted-foreground">
                {filtered.length + highlighted.length} deals
              </span>
            </div>

            {/* All cards in one continuous grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {[0, 1, 2, 3, 4, 5].map(i => <CardSkeleton key={i} />)}
              </div>
            ) : [...highlighted, ...pageListings].length > 0 ? (
              <div data-feature="DEALS__GRID" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...highlighted, ...pageListings].map(l => (
                  <div
                    key={l.id}
                    id={`property-${l.id}`}
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
        <div className="hidden lg:flex lg:flex-col w-[35%] max-w-[520px] flex-shrink-0 p-3">
          <div className="flex items-center gap-2 px-1 pb-2.5">
            <span className="text-emerald-500 text-lg">📍</span>
            <span className="text-[14px] font-semibold text-foreground">Deal Locations</span>
          </div>
          <div className="flex-1 rounded-2xl overflow-hidden border border-border/30 shadow-sm">
            <Suspense
              fallback={
                <div className="w-full h-full bg-muted/30 animate-pulse flex items-center justify-center rounded-2xl">
                  <span className="text-sm text-muted-foreground">Loading map…</span>
                </div>
              }
            >
              <DealsMap listings={mapListings} hoveredId={hoveredId} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
