import { Heart, CheckCircle, X, MapPin } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { ListingShape } from '@/components/InquiryPanel';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { usePropertyImage } from '@/hooks/usePropertyImage';
import { fetchPexelsPhotos } from '@/lib/pexels';

export type { ListingShape };

interface Props {
  listing: ListingShape;
  isFav: boolean;
  onToggleFav: () => void;
  onAddToCRM?: () => void;
  onInquire?: (listing: ListingShape) => void;
  showSavedBadge?: boolean;
  forceSignUp?: boolean;
}

export default function PropertyCardV2({ listing, isFav, onToggleFav, onAddToCRM, onInquire, showSavedBadge, forceSignUp }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [addedToCRM, setAddedToCRM] = useState(() => localStorage.getItem(`crm_${listing.id}`) === 'true');

  const handleAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (forceSignUp) {
      navigate('/signup');
    }
  };

  const handleAddToCRM = async () => {
    if (!user) { toast.error('Sign in to add deals to your CRM'); return; }

    if (addedToCRM) {
      const { error } = await supabase.from('crm_deals').delete()
        .eq('user_id', user.id).eq('property_id', listing.id);
      if (error) { toast.error('Failed to remove — ' + error.message); return; }
      localStorage.removeItem(`crm_${listing.id}`);
      setAddedToCRM(false);
      toast.success('Removed from CRM');
      return;
    }

    let photoUrl = resolvedImage;
    if (!photoUrl || photoUrl.includes('placehold.co')) {
      const pexels = await fetchPexelsPhotos(listing.city, listing.type, 1);
      if (pexels[0]) photoUrl = pexels[0];
    }
    const { error } = await supabase.from('crm_deals').insert({
      user_id: user.id,
      name: listing.name,
      city: listing.city,
      postcode: listing.postcode,
      rent: listing.rent,
      profit: listing.profit,
      type: listing.type,
      stage: 'New Lead',
      notes: 'Added from deals page',
      photo_url: photoUrl || null,
      property_id: listing.id || null,
    });
    if (error) { toast.error('Failed to add — ' + error.message); return; }
    localStorage.setItem(`crm_${listing.id}`, 'true');
    setAddedToCRM(true);
    onAddToCRM?.();
    toast.success(`${listing.name} added to CRM!`);
  };

  const handleInquire = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (forceSignUp) {
      navigate('/signup');
      return;
    }
    onInquire?.(listing);
  };

  const resolvedImage = usePropertyImage(listing.id, listing.image ? [listing.image] : null, listing.city, listing.type);

  const listedLabel = listing.daysAgo === 0
    ? 'Today'
    : listing.daysAgo === 1
    ? 'Yesterday'
    : `${listing.daysAgo}d ago`;

  return (
    <div className="bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Hero image */}
      <div className="relative h-52 overflow-hidden">
        <img
          src={resolvedImage}
          alt={`Property in ${listing.city}`}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/800x520/1a1a2e/ffffff?text=${encodeURIComponent(listing.city || 'Property')}`; }}
        />

        {/* Status pills — top left */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {showSavedBadge && (
            <span className="bg-white/90 text-[11px] font-semibold px-2.5 py-0.5 rounded-full text-foreground">
              Saved
            </span>
          )}
          {listing.featured && (
            <span className="bg-white/90 text-[11px] font-semibold px-2.5 py-0.5 rounded-full text-foreground">
              ⭐ Featured
            </span>
          )}
          {listing.landlordApproved && (
            <span className="bg-white/90 text-[11px] font-semibold px-2.5 py-0.5 rounded-full text-emerald-700 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> SA Approved
            </span>
          )}
        </div>

        {/* Heart — top right */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (forceSignUp) { navigate('/signup'); return; } onToggleFav(); }}
          className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
        >
          <Heart className={`w-4 h-4 ${isFav ? 'fill-primary text-primary' : 'text-foreground/60'}`} />
        </button>
      </div>

      {/* Card body */}
      <div className="p-4">
        {/* Name + location */}
        <h3 className="text-[15px] font-semibold text-foreground leading-tight">{listing.name}</h3>
        <p className="text-[13px] text-muted-foreground mt-0.5 flex items-center gap-1">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          {listing.city} · {listing.postcode}
        </p>

        {/* Stats grid */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Monthly rent</p>
            <p className="text-[15px] font-bold text-foreground mt-0.5">£{listing.rent.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Est. profit</p>
            <p className="text-[15px] font-bold text-emerald-600 mt-0.5">£{listing.profit.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Type</p>
            <p className="text-[13px] font-medium text-foreground mt-0.5">{listing.type}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Listed</p>
            <p className="text-[13px] font-medium text-foreground mt-0.5">{listedLabel}</p>
          </div>
        </div>

        {/* Add to CRM — subtle link */}
        {onAddToCRM && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleAddToCRM}
              className={`text-[11px] font-medium flex items-center gap-1 transition-colors ${
                addedToCRM
                  ? 'text-destructive hover:text-destructive/80'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {addedToCRM ? <><X className="w-3 h-3" /> Remove from CRM</> : '+ Add to CRM'}
            </button>
          </div>
        )}

        {/* CTAs */}
        <div className="flex gap-2 mt-3">
          {forceSignUp ? (
            <>
              <button
                onClick={handleAction}
                className="flex-1 bg-foreground text-background h-10 rounded-xl text-[13px] font-semibold hover:opacity-90 transition-opacity"
              >
                Inquire Now
              </button>
              <button
                onClick={handleAction}
                className="flex-1 border border-border h-10 rounded-xl text-[13px] font-medium text-foreground hover:bg-muted transition-colors"
              >
                View Listing
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleInquire}
                className="flex-1 bg-foreground text-background h-10 rounded-xl text-[13px] font-semibold hover:opacity-90 transition-opacity"
              >
                Inquire Now
              </button>
              <Link
                to={`/deals/${listing.id}`}
                className="flex-1 border border-border h-10 rounded-xl text-[13px] font-medium text-foreground hover:bg-muted transition-colors inline-flex items-center justify-center"
              >
                View Listing
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
