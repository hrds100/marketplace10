import { useState, useMemo, useCallback } from 'react';
import { Bell, X } from 'lucide-react';
import PropertyCard from '@/components/PropertyCard';
import InquiryPanel from '@/components/InquiryPanel';
import type { ListingShape } from '@/components/InquiryPanel';
import { useFavourites } from '@/hooks/useFavourites';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

const tabs = ['All', 'Live', 'On Offer', 'Inactive'] as const;

// Convert DB property to Listing shape for PropertyCard
function toListingShape(p: Tables<'properties'>): ListingShape {
  const daysAgo = Math.max(0, Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000));
  // Use first uploaded photo, or city-based Unsplash stock image
  const photos = (p as Record<string, unknown>).photos as string[] | null;
  const citySlug = encodeURIComponent((p.city || 'london').toLowerCase());
  const image = (photos && photos.length > 0)
    ? photos[0]
    : `https://source.unsplash.com/featured/800x520/?${citySlug},property,interior&sig=${p.id.slice(0, 6)}`;

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

export default function DealsPage() {
  const { toggle, isFav } = useFavourites();
  const [activeTab, setActiveTab] = useState<string>('All');
  const [city, setCity] = useState('');
  const [type, setType] = useState('');
  const [sort, setSort] = useState('newest');
  const [showAlert, setShowAlert] = useState(true);
  const [page, setPage] = useState(1);
  const perPage = 12;

  // ── Page-level inquiry panel state ──
  const [inquiryListing, setInquiryListing] = useState<ListingShape | null>(null);
  const [inquiryOpen, setInquiryOpen] = useState(false);

  const handleInquire = useCallback((listing: ListingShape) => {
    setInquiryListing(listing);
    setInquiryOpen(true);
  }, []);

  const handleCloseInquiry = useCallback(() => {
    setInquiryOpen(false);
  }, []);

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
    // Exclude featured from main grid when featured strip is visible
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-[28px] font-bold text-foreground">Deals</h1>
          <p className="text-sm text-muted-foreground mt-1">Landlord-approved rent-to-rent opportunities across the UK</p>
        </div>
        <span className="badge-gray text-xs">📍 UK-wide · {liveCount} properties live</span>
      </div>

      {showAlert && (
        <div className="bg-accent-light border rounded-xl p-3 px-4 mb-6 flex items-center gap-2.5" style={{ borderColor: 'hsla(145,63%,42%,0.18)' }}>
          <Bell className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-[13px] font-medium text-accent-foreground">3 new deals added in Manchester today</span>
          <button className="text-[13px] text-primary font-semibold ml-1 hover:underline" onClick={handleAlertClick}>View</button>
          <button onClick={() => setShowAlert(false)} className="ml-auto text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Featured */}
      {featured.length > 0 && (
        <div className="mb-8">
          <span className="text-[13px] font-semibold text-foreground mb-3 block">⭐ Featured</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map(l => (
              <PropertyCard key={l.id} listing={l} isFav={isFav(l.id)} onToggleFav={() => toggle(l.id)} onAddToCRM={() => handleAddToCRM(l)} onInquire={handleInquire} />
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-2">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => { setActiveTab(t); setPage(1); }}
              className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-colors ${activeTab === t ? 'bg-nfstay-black text-nfstay-black-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="text-[13px] text-muted-foreground">Showing {filtered.length + featured.length} deals</span>
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

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {pageListings.map(l => (
          <PropertyCard key={l.id} listing={l} isFav={isFav(l.id)} onToggleFav={() => toggle(l.id)} onAddToCRM={() => handleAddToCRM(l)} onInquire={handleInquire} />
        ))}
      </div>

      {isLoading && (
        <div className="text-center py-16 text-muted-foreground text-sm">Loading deals...</div>
      )}

      {!isLoading && pageListings.length === 0 && featured.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-semibold mb-1">No deals found</p>
          <p className="text-sm">Check back soon — new deals are added daily.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-40">Prev</button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-full text-sm font-medium ${page === p ? 'bg-nfstay-black text-nfstay-black-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{p}</button>
          ))}
          {totalPages > 5 && <span className="text-muted-foreground">…</span>}
          {totalPages > 5 && <button onClick={() => setPage(totalPages)} className={`w-8 h-8 rounded-full text-sm ${page === totalPages ? 'bg-nfstay-black text-nfstay-black-foreground' : 'text-muted-foreground'}`}>{totalPages}</button>}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-40">Next</button>
        </div>
      )}

      {/* Single page-level inquiry panel */}
      <InquiryPanel open={inquiryOpen} listing={inquiryListing} onClose={handleCloseInquiry} />
    </div>
  );
}
