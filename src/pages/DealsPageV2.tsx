import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import PropertyCardV2 from '@/components/PropertyCardV2';
import type { ListingShape } from '@/components/InquiryPanel';
import { useFavourites } from '@/hooks/useFavourites';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

// Lazy-load map to avoid blocking initial render
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
      : `https://placehold.co/800x600/1a1a2e/ffffff?text=${encodeURIComponent(p.city || 'Property')}`;
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
    daysAgo,
    image,
    landlordApproved: (p as Record<string, unknown>).sa_approved === 'yes',
    landlordWhatsapp: p.landlord_whatsapp,
  };
}

// Skeleton card — matches aspect-[4/3] image + body height
function CardSkeleton() {
  return (
    <div className="bg-card rounded-xl overflow-hidden animate-pulse">
      <div className="w-full aspect-[4/3] bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-muted rounded w-3/4" />
        <div className="h-2.5 bg-muted rounded w-1/2" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="space-y-1.5">
              <div className="h-2 bg-muted rounded w-2/3" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
        <div className="flex gap-1.5 mt-4">
          <div className="flex-1 h-8 bg-muted rounded-lg" />
          <div className="flex-1 h-8 bg-muted rounded-lg" />
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
  const [showAlert, setShowAlert] = useState(true);
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
  const featured = listings.filter(l => l.featured);
  const featuredIds = new Set(featured.map(l => l.id));

  const filtered = useMemo(() => {
    let result =
      featured.length > 0
        ? listings.filter(l => !featuredIds.has(l.id))
        : [...listings];
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
  }, [activeTab, city, type, sort, listings, featured.length]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const pageListings = filtered.slice((page - 1) * perPage, page * perPage);
  const cities = [...new Set(listings.map(l => l.city))].sort();
  const types = [...new Set(listings.map(l => l.type))].sort();

  const handleAddToCRM = (listing: ListingShape) => {
    toast.success(`${listing.name} added to CRM`);
  };

  const handleAlertClick = () => {
    setCity('Manchester');
    setActiveTab('All');
    setPage(1);
    setShowAlert(false);
  };

  // Map pins — featured + current page
  const mapListings = useMemo(
    () => [...featured, ...pageListings],
    [featured, pageListings],
  );

  return (
    /*
     * Layout reference: Airbnb 62/38 split (1128px breakpoint)
     * Left panel scrolls via page body. Map is sticky within viewport.
     * Source: Airbnb search results CSS vars + Serkanbyx/real-estate-listing
     */
    <div className="flex gap-5 items-start">

      {/* ── LEFT PANEL: 62% ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Deals</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Landlord-approved rent-to-rent opportunities across the UK
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 bg-muted text-muted-foreground text-[11px] font-medium px-2.5 py-1 rounded-full">
              📍 UK-wide · {liveCount} {liveCount === 1 ? 'property' : 'properties'} live
            </span>
            <button
              onClick={() => navigate('/dashboard/list-a-deal')}
              className="bg-foreground text-background px-3.5 py-1.5 rounded-lg text-[11px] font-semibold hover:opacity-90 transition-opacity"
            >
              + Submit a Deal
            </button>
          </div>
        </div>

        {/* Alert */}
        {showAlert && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 mb-5 flex items-center gap-2.5">
            <Bell className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span className="text-[12px] font-medium text-emerald-900">
              3 new deals added in Manchester today
            </span>
            <button
              className="text-[12px] text-emerald-700 font-semibold ml-1 hover:underline"
              onClick={handleAlertClick}
            >
              View
            </button>
            <button
              onClick={() => setShowAlert(false)}
              className="ml-auto text-emerald-600/50 hover:text-emerald-700"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* ── FEATURED — same grid, same cards, pinned at top ──── */}
        {featured.length > 0 && (
          <div className="mb-6">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              ⭐ Featured
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {featured.map(l => (
                <PropertyCardV2
                  key={l.id}
                  listing={l}
                  isFav={isFav(l.id)}
                  onToggleFav={() => toggle(l.id)}
                  onAddToCRM={() => handleAddToCRM(l)}
                  onInquire={handleInquire}
                  onMouseEnter={() => setHoveredId(l.id)}
                  onMouseLeave={() => setHoveredId(null)}
                />
              ))}
            </div>
            <div className="mt-6 border-t border-border" />
          </div>
        )}

        {/* ── TABS + FILTERS ───────────────────────────────────── */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            {tabs.map(t => (
              <button
                key={t}
                onClick={() => { setActiveTab(t); setPage(1); }}
                className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  activeTab === t
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {filtered.length + featured.length} deals
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          <select
            value={city}
            onChange={e => { setCity(e.target.value); setPage(1); }}
            className="input-nfstay h-8 text-[11px] pr-7 bg-card"
          >
            <option value="">All cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={type}
            onChange={e => { setType(e.target.value); setPage(1); }}
            className="input-nfstay h-8 text-[11px] pr-7 bg-card"
          >
            <option value="">All types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="input-nfstay h-8 text-[11px] pr-7 bg-card ml-auto"
          >
            <option value="newest">Newest</option>
            <option value="profit">Highest profit</option>
            <option value="rent">Lowest rent</option>
          </select>
        </div>

        {/* ── CARD GRID ────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map(i => <CardSkeleton key={i} />)}
          </div>
        ) : pageListings.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {pageListings.map(l => (
              <PropertyCardV2
                key={l.id}
                listing={l}
                isFav={isFav(l.id)}
                onToggleFav={() => toggle(l.id)}
                onAddToCRM={() => handleAddToCRM(l)}
                onInquire={handleInquire}
                onMouseEnter={() => setHoveredId(l.id)}
                onMouseLeave={() => setHoveredId(null)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-2xl mb-3">🏠</p>
            <p className="text-[14px] font-semibold text-foreground mb-1">No deals found</p>
            <p className="text-xs text-muted-foreground">
              Check back soon — new deals are added daily.
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40 px-2"
            >
              Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 rounded-full text-[11px] font-medium transition-colors ${
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
                <span className="text-muted-foreground text-[11px]">…</span>
                <button
                  onClick={() => setPage(totalPages)}
                  className={`w-7 h-7 rounded-full text-[11px] font-medium ${
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
              className="text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40 px-2"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL: sticky map, 38% ────────────────────────────── */}
      {/*
       * Proportions: Airbnb 38% at 1128px breakpoint.
       * sticky top-0 + h-[calc(100vh-theme(spacing.20))] mirrors
       * Airbnb's calc(100vh - header - 48px) pattern.
       * Shown at lg+ (1024px). Below lg: full-width list only.
       */}
      <div className="hidden lg:flex flex-col w-[38%] max-w-[500px] flex-shrink-0 sticky top-0 h-[calc(100vh-5rem)]">
        <div className="flex-1 rounded-xl overflow-hidden border border-border/60 shadow-sm bg-muted">
          <Suspense
            fallback={
              <div className="w-full h-full bg-muted animate-pulse rounded-xl flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Loading map…</span>
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
