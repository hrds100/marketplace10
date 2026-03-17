import { Heart, CheckCircle, X, ShieldCheck } from 'lucide-react';
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

export default function PropertyCard({ listing, isFav, onToggleFav, onAddToCRM, onInquire, showSavedBadge, forceSignUp }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [addedToCRM, setAddedToCRM] = useState(() => localStorage.getItem(`crm_${listing.id}`) === 'true');

  const statusDot = () => {
    if (listing.daysAgo <= 7) return 'bg-emerald-500';
    if (listing.daysAgo <= 14) return 'bg-amber-500';
    return 'bg-gray-400';
  };

  const handleAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (forceSignUp) {
      navigate('/signup');
    }
  };

  const handleAddToCRM = async () => {
    if (!user) { toast.error('Sign in to add deals to your CRM'); return; }

    // TOGGLE OFF — remove from CRM
    if (addedToCRM) {
      const { error } = await supabase.from('crm_deals').delete()
        .eq('user_id', user.id).eq('property_id', listing.id);
      if (error) { toast.error('Failed to remove — ' + error.message); return; }
      localStorage.removeItem(`crm_${listing.id}`);
      setAddedToCRM(false);
      toast.success('Removed from CRM');
      return;
    }

    // TOGGLE ON — add to CRM (resolve photo if placeholder)
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

  const airdnaUrl = `https://www.airdna.co`;
  const resolvedImage = usePropertyImage(listing.id, listing.image ? [listing.image] : null, listing.city, listing.type);

  return (
    <div className={`bg-card rounded-2xl overflow-hidden card-hover ${listing.prime ? 'border-[1.5px]' : 'border border-border'}`} style={listing.prime ? { borderColor: '#E8C547', boxShadow: '0 0 14px rgba(232,197,71,0.2), 0 0 5px rgba(232,197,71,0.12)' } : undefined}>
      {/* Photo */}
      <div className="relative h-[200px] overflow-hidden">
        <img
          src={resolvedImage}
          alt={`Property in ${listing.city}`}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/800x520/1a1a2e/ffffff?text=${encodeURIComponent(listing.city || 'Property')}`; }}
        />
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          {showSavedBadge && <span className="badge-green text-[11px]">Saved</span>}
          {listing.featured && <span className="badge-green-fill text-[11px]">Featured</span>}
          {listing.prime && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-sm" style={{ background: 'linear-gradient(135deg, #FBE88A, #F0D04A)', color: '#7A6520', border: '1px solid rgba(232,197,71,0.4)' }}>
              <ShieldCheck className="w-3 h-3" /> Prime
            </span>
          )}
        </div>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (forceSignUp) { navigate('/signup'); return; } onToggleFav(); }}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all ${isFav ? 'bg-accent-light' : 'bg-black/30'}`}
        >
          <Heart className={`w-4 h-4 ${isFav ? 'fill-primary text-primary' : 'text-white'}`} />
        </button>
      </div>

      {/* Body */}
      <div className="p-3.5 pt-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-foreground leading-tight">{listing.name}</h3>
            <p className="text-[13px] text-muted-foreground mt-0.5">{listing.city} · {listing.postcode}</p>
          </div>
          {onAddToCRM && (
            <button
              onClick={handleAddToCRM}
              className={`text-[11px] font-semibold transition-all whitespace-nowrap flex items-center gap-1 px-2 py-1 rounded-full ${addedToCRM ? 'bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive' : listing.prime ? 'bg-[#E8C547] text-white hover:opacity-90' : 'bg-primary text-primary-foreground hover:opacity-90'}`}
            >
              {addedToCRM ? (
                <><X className="w-3.5 h-3.5" /> Remove from CRM</>
              ) : (
                '+ Add to CRM'
              )}
            </button>
          )}
        </div>

        <div className="mt-3 space-y-0">
          <div className="flex justify-between items-center py-[7px] border-b border-border/50">
            <span className="text-xs text-muted-foreground">Monthly rent</span>
            <span className="text-[13px] font-medium text-foreground">£{listing.rent.toLocaleString()} / month</span>
          </div>
          <div className="flex justify-between items-center py-[7px] border-b border-border/50">
            <span className="text-xs text-muted-foreground">Est. monthly profit</span>
            <div className="flex items-center gap-2">
              <span className={`text-[13px] font-bold ${listing.prime ? 'text-[#9A7D1A]' : 'text-accent-foreground'}`}>£{listing.profit}</span>
              <a href={airdnaUrl} target="_blank" rel="noopener noreferrer" className={`text-[10px] font-medium hover:underline ${listing.prime ? 'text-[#DAA520]' : 'text-primary'}`} onClick={e => e.stopPropagation()}>
                Airdna verified ✓
              </a>
            </div>
          </div>
          <div className="flex justify-between items-center py-[7px]">
            <span className="text-xs text-muted-foreground">Property type</span>
            <span className="text-[13px] font-medium text-foreground">{listing.type}</span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 mt-2 border-t border-border/50">
          <span className="text-[11px] text-muted-foreground">Added {listing.daysAgo} days ago</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${statusDot()}`} />
            <span className="text-[11px] text-muted-foreground capitalize">{listing.daysAgo <= 7 ? 'Live' : listing.daysAgo <= 14 ? 'Under offer' : 'Expired'}</span>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          {forceSignUp ? (
            <>
              <button
                onClick={handleAction}
                className={`flex-1 text-white shadow-sm h-[38px] rounded-lg text-[13px] font-semibold inline-flex items-center justify-center hover:opacity-90 transition-opacity ${listing.prime ? 'bg-gradient-to-r from-[#E8C547] via-[#F0D75E] to-[#DAA520]' : 'bg-gradient-to-r from-emerald-500 to-teal-600'}`}
              >
                Visit Listing
              </button>
              <button
                onClick={handleAction}
                className={`flex-1 h-[38px] rounded-lg text-[13px] font-medium transition-colors ${listing.prime ? 'border border-[#E8C547] text-[#9A7D1A] hover:bg-[#FBF3D5]/40' : 'border border-border text-foreground hover:bg-secondary'}`}
              >
                Inquire Now
              </button>
            </>
          ) : (
            <>
              <Link
                to={`/deals/${listing.id}`}
                className={`flex-1 text-white shadow-sm h-[38px] rounded-lg text-[13px] font-semibold inline-flex items-center justify-center hover:opacity-90 transition-opacity ${listing.prime ? 'bg-gradient-to-r from-[#E8C547] via-[#F0D75E] to-[#DAA520]' : 'bg-gradient-to-r from-emerald-500 to-teal-600'}`}
              >
                Visit Listing
              </Link>
              <button onClick={handleInquire} className={`flex-1 h-[38px] rounded-lg text-[13px] font-medium transition-colors ${listing.prime ? 'border border-[#E8C547] text-[#9A7D1A] hover:bg-[#FBF3D5]/40' : 'border border-border text-foreground hover:bg-secondary'}`}>
                Inquire Now
              </button>
            </>
          )}
        </div>
      </div>
      {/* NO modal rendered here — modal lives at page level */}
    </div>
  );
}

