import { useState, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import PropertyCard from '@/components/PropertyCard';
import InquiryPanel from '@/components/InquiryPanel';
import type { ListingShape } from '@/components/InquiryPanel';
import { useFavourites } from '@/hooks/useFavourites';
import { listings as mockListings } from '@/data/mockData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

function toListingShape(p: Tables<'properties'>): ListingShape {
  const daysAgo = Math.max(0, Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000));
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
    image: p.image_url || `https://picsum.photos/seed/prop-${p.city.toLowerCase()}-${p.id.slice(0, 6)}/800/520`,
    landlordApproved: p.sa_approved === 'yes',
    landlordWhatsapp: p.landlord_whatsapp,
  };
}

export default function FavouritesPage() {
  const { toggle, isFav, favourites } = useFavourites();

  const favIds = [...favourites];

  // Try Supabase first, fallback to mock data for matching IDs
  const { data: favListings = [] } = useQuery({
    queryKey: ['favourite-properties', favIds.sort().join(',')],
    queryFn: async () => {
      if (favIds.length === 0) return [];

      // Try DB first
      const { data } = await supabase
        .from('properties')
        .select('*')
        .in('id', favIds);

      if (data && data.length > 0) {
        return data.map(toListingShape);
      }

      // Fallback: match against mock listings (properties table may be empty)
      return mockListings.filter(l => favIds.includes(l.id));
    },
    enabled: favIds.length > 0,
  });

  const [inquiryListing, setInquiryListing] = useState<ListingShape | null>(null);
  const [inquiryOpen, setInquiryOpen] = useState(false);

  const handleInquire = useCallback((listing: ListingShape) => {
    setInquiryListing(listing);
    setInquiryOpen(true);
  }, []);

  const handleCloseInquiry = useCallback(() => {
    setInquiryOpen(false);
  }, []);

  if (favIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Heart className="w-12 h-12 text-border mb-4" strokeWidth={1.5} />
        <h3 className="text-xl font-semibold text-foreground">No saved deals yet</h3>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-[300px]">Browse live deals and tap the heart icon to save them here.</p>
        <Link to="/dashboard/deals" className="mt-5 h-11 px-6 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm inline-flex items-center hover:opacity-90 transition-opacity">
          Browse Deals →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[28px] font-bold text-foreground">Favourites</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">Your saved rent-to-rent deals</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {favListings.map(l => (
          <PropertyCard key={l.id} listing={l} isFav={true} onToggleFav={() => toggle(l.id)} onInquire={handleInquire} showSavedBadge />
        ))}
      </div>
      <InquiryPanel open={inquiryOpen} listing={inquiryListing} onClose={handleCloseInquiry} />
    </div>
  );
}
