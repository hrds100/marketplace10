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
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function PropertyCardV2({
  listing, isFav, onToggleFav, onAddToCRM, onInquire,
  showSavedBadge, forceSignUp, onMouseEnter, onMouseLeave,
}: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [addedToCRM, setAddedToCRM] = useState(
    () => localStorage.getItem(`crm_${listing.id}`) === 'true',
  );

  const handleAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (forceSignUp) navigate('/signup');
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
    if (forceSignUp) { navigate('/signup'); return; }
    onInquire?.(listing);
  };

  const resolvedImage = usePropertyImage(
    listing.id,
    listing.image ? [listing.image] : null,
    listing.city,
    listing.type,
  );

  const listedLabel =
    listing.daysAgo === 0 ? 'Today' :
    listing.daysAgo === 1 ? 'Yesterday' :
    `${listing.daysAgo}d ago`;

  return (
    <div
      className="bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 group"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Image — 1:1 square ratio, Airbnb standard */}
      <div className="relative w-full aspect-square overflow-hidden bg-muted">
        <img
          src={resolvedImage}
          alt={`Property in ${listing.city}`}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              `https://placehold.co/600x600/1a1a2e/ffffff?text=${encodeURIComponent(listing.city || 'Property')}`;
          }}
        />

        {/* Badges — white pill, bg-white/90 is a valid Tailwind class */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
          {showSavedBadge && (
            <span className="bg-white/90 text-[10px] font-semibold px-2 py-0.5 rounded-full text-foreground shadow-sm">
              Saved
            </span>
          )}
          {listing.featured && (
            <span className="bg-white/90 text-[10px] font-semibold px-2 py-0.5 rounded-full text-amber-700 shadow-sm">
              ⭐ Featured
            </span>
          )}
          {listing.landlordApproved && (
            <span className="bg-white/90 text-[10px] font-semibold px-2 py-0.5 rounded-full text-emerald-700 flex items-center gap-1 shadow-sm">
              <CheckCircle className="w-2.5 h-2.5" /> SA Approved
            </span>
          )}
        </div>

        {/* Heart */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (forceSignUp) { navigate('/signup'); return; }
            onToggleFav();
          }}
          className="absolute top-2.5 right-2.5 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm"
        >
          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-primary text-primary' : 'text-foreground/50'}`} />
        </button>
      </div>

      {/* Body */}
      <div className="p-3.5">
        {/* Title + CRM toggle */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-[12px] font-semibold text-foreground leading-snug truncate">
              {listing.name}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5 truncate">
              <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
              {listing.city} · {listing.postcode}
            </p>
          </div>
          {onAddToCRM && (
            <button
              onClick={handleAddToCRM}
              className={`text-[10px] font-medium flex items-center gap-0.5 flex-shrink-0 mt-0.5 transition-colors ${
                addedToCRM
                  ? 'text-destructive hover:text-destructive/70'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {addedToCRM ? <><X className="w-2.5 h-2.5" />Remove</> : '+ CRM'}
            </button>
          )}
        </div>

        {/* Stats — 2×2 compact grid */}
        <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2">
          <div>
            <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide leading-none">
              Rent / mo
            </p>
            <p className="text-[12px] font-bold text-foreground mt-1 leading-none">
              £{listing.rent.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide leading-none">
              Est. profit
            </p>
            <p className="text-[12px] font-bold text-emerald-600 mt-1 leading-none">
              £{listing.profit.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide leading-none">
              Type
            </p>
            <p className="text-[11px] font-medium text-foreground mt-1 leading-none truncate">
              {listing.type}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide leading-none">
              Listed
            </p>
            <p className="text-[11px] font-medium text-foreground mt-1 leading-none">
              {listedLabel}
            </p>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex gap-1.5 mt-3">
          {forceSignUp ? (
            <>
              <button onClick={handleAction} className="flex-1 bg-foreground text-background h-8 rounded-lg text-[11px] font-semibold hover:opacity-90 transition-opacity">
                Inquire
              </button>
              <button onClick={handleAction} className="flex-1 border border-border h-8 rounded-lg text-[11px] font-medium text-foreground hover:bg-muted transition-colors">
                View
              </button>
            </>
          ) : (
            <>
              <button onClick={handleInquire} className="flex-1 bg-foreground text-background h-8 rounded-lg text-[11px] font-semibold hover:opacity-90 transition-opacity">
                Inquire
              </button>
              <Link
                to={`/deals/${listing.id}`}
                className="flex-1 border border-border h-8 rounded-lg text-[11px] font-medium text-foreground hover:bg-muted transition-colors inline-flex items-center justify-center"
              >
                View
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
