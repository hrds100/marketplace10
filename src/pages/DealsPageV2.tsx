import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import PropertyCardV2 from '@/components/PropertyCardV2';
import type { ListingShape } from '@/components/InquiryPanel';
import { useFavourites } from '@/hooks/useFavourites';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

const tabs = ['All', 'Live', 'On Offer', 'Inactive'] as const;

function toListingShape(p: Tables<'properties'>): ListingShape {
  const daysAgo = Math.max(0, Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000));
  const photos = (p as Record<string, unknown>).photos as string[] | null;
  const image = (photos && photos.length > 0)
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
    daysAgo,
    image,
    landlordApproved: (p as Record<string, unknown>).sa_approved === 'yes',
    landlordWhatsapp: p.landlord_whatsapp,
  };
}

export default function DealsPageV2() {
  const { toggle, isFav } = useFavourites();
  const [activeTab, setActiveTab] = useState<string>('All');
  const [city, setCity] = useState('');
  const [type, setType] = useState('');
  const [sort, setSort] = useState('newest');
  const [showAlert, setShowAlert] = useState(true);
  const [page, setPage] = useState(1);
  const perPage = 12;

  const navigate = useNavigate();

  const handleInquire = useCallback((listing: ListingShape) => {
    navigate(`/dashboard/inbox?deal=${listing.id}`);
  }, [navigate]);

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
    let result = featured.length > 0
      ? listings.filter(l => !featuredIds.has(l.id))
      : [...listings];
    if (activeTab !== 'All') {
      const statusMap: Record<string, string> = { 'Live': 'live', 'On Offer': 'on-offer', 'Inactive': 'inactive' };
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

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Deals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Landlord-approved rent-to-rent opportunities across the UK
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 bg-muted text-muted-foreground text-xs font-medium px-3 py-1.5 rounded-full">
            📍 UK-wide · {liveCount} {liveCount === 1 ? 'property' : 'properties'} live
          </span>
          <button
            onClick={() => navigate('/dashboard/list-a-deal')}
            className="bg-foreground text-background px-4 py-2 rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            + Submit a Deal
          </button>
        </div>
      </div>

      {/* Alert banner */}
      {showAlert && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 px-4 mb-6 flex items-center gap-2.5">
          <Bell className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="text-[13px] font-medium text-emerald-900">
            3 new deals added in Manchester today
          </span>
          <button
            className="text-[13px] text-emerald-700 font-semibold ml-1 hover:underline"
            onClick={handleAlertClick}
          >
            View
          </button>
          <button onClick={() => setShowAlert(false)} className="ml-auto text-emerald-600/60 hover:text-emerald-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Featured — horizontal scroll */}
      {featured.length > 0 && (
        <div className="mb-8">
          <span className="text-[13px] font-semibold text-foreground mb-3 block">⭐ Featured</span>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
            {featured.map(l => (
              <div key={l.id} className="w-[300px] flex-shrink-0">
                <PropertyCardV2
                  listing={l}
                  isFav={isFav(l.id)}
                  onToggleFav={() => toggle(l.id)}
                  onAddToCRM={() => handleAddToCRM(l)}
                  onInquire={handleInquire}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex gap-1.5 bg-muted p-1 rounded-xl">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => { setActiveTab(t); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                activeTab === t
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="text-[13px] text-muted-foreground">
          {filtered.length + featured.length} deals
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2.5 mb-5">
        <select value={city} onChange={e => { setCity(e.target.value); setPage(1); }} className="input-nfstay h-[38px] text-sm pr-8 bg-card">
          <option value="">All cities</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={type} onChange={e => { setType(e.target.value); setPage(1); }} className="input-nfstay h-[38px] text-sm pr-8 bg-card">
          <option value="">All types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} className="input-nfstay h-[38px] text-sm pr-8 bg-card ml-auto">
          <option value="newest">Newest</option>
          <option value="profit">Highest profit</option>
          <option value="rent">Lowest rent</option>
        </select>
      </div>

      {/* Skeleton loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl overflow-hidden animate-pulse">
              <div className="h-52 bg-muted" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="space-y-1">
                      <div className="h-2 bg-muted rounded w-2/3" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <div className="flex-1 h-10 bg-muted rounded-xl" />
                  <div className="flex-1 h-10 bg-muted rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {pageListings.map(l => (
            <PropertyCardV2
              key={l.id}
              listing={l}
              isFav={isFav(l.id)}
              onToggleFav={() => toggle(l.id)}
              onAddToCRM={() => handleAddToCRM(l)}
              onInquire={handleInquire}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && pageListings.length === 0 && featured.length === 0 && (
        <div className="text-center py-20">
          <p className="text-3xl mb-3">🏠</p>
          <p className="text-[15px] font-semibold text-foreground mb-1">No deals found</p>
          <p className="text-sm text-muted-foreground">Check back soon — new deals are added daily.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            Prev
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-full text-sm font-medium ${
                page === p ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p}
            </button>
          ))}
          {totalPages > 5 && <span className="text-muted-foreground">…</span>}
          {totalPages > 5 && (
            <button
              onClick={() => setPage(totalPages)}
              className={`w-8 h-8 rounded-full text-sm font-medium ${
                page === totalPages ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {totalPages}
            </button>
          )}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
