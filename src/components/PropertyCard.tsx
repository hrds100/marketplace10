import { Heart, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import InquiryPopup from '@/components/InquiryPopup';

export interface ListingShape {
  id: string;
  name: string;
  city: string;
  postcode: string;
  rent: number;
  profit: number;
  type: string;
  status: 'live' | 'on-offer' | 'inactive';
  featured: boolean;
  daysAgo: number;
  image: string;
  landlordApproved: boolean;
  landlordWhatsapp?: string | null;
}

interface Props {
  listing: ListingShape;
  isFav: boolean;
  onToggleFav: () => void;
  onAddToCRM?: () => void;
  showSavedBadge?: boolean;
  forceSignUp?: boolean;
}

export default function PropertyCard({ listing, isFav, onToggleFav, onAddToCRM, showSavedBadge, forceSignUp }: Props) {
  const navigate = useNavigate();
  const [addedToCRM, setAddedToCRM] = useState(false);
  const [showInquiry, setShowInquiry] = useState(false);

  const ageBadge = () => {
    if (listing.daysAgo <= 7) return <span className="badge-green-fill text-[11px]">LIVE</span>;
    if (listing.daysAgo <= 14) return <span className="badge-amber text-[11px]">Under Offer</span>;
    return <span className="badge-gray text-[11px]">Expired</span>;
  };

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

  const [celebrating, setCelebrating] = useState(false);
  const handleAddToCRM = () => {
    if (addedToCRM) return;
    setAddedToCRM(true);
    setCelebrating(true);
    onAddToCRM?.();
    setTimeout(() => setCelebrating(false), 1500);
  };

  const airbnbSearchUrl = `https://www.airbnb.co.uk/s/${encodeURIComponent(listing.city)}/homes`;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden card-hover">
      {/* Photo */}
      <div className="relative h-[200px] overflow-hidden">
        <img
          src={listing.image}
          alt={`Property in ${listing.city}`}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/fallback/800/520'; }}
        />
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
          {showSavedBadge && <span className="badge-green text-[11px]">Saved</span>}
          {listing.featured && <span className="badge-green-fill text-[11px]">Featured</span>}
          {ageBadge()}
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
              className={`relative text-[11px] font-semibold transition-all whitespace-nowrap flex items-center gap-1 px-2 py-1 rounded-full ${addedToCRM ? 'bg-muted text-muted-foreground cursor-default' : 'bg-primary text-primary-foreground hover:opacity-90'}`}
            >
              {celebrating && <span className="absolute inset-0 rounded-full animate-ping bg-primary/30" />}
              {addedToCRM ? (
                <><CheckCircle className="w-3.5 h-3.5" /> Added to CRM</>
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
              <span className="text-[13px] font-bold text-accent-foreground">£{listing.profit}</span>
              <a href={airbnbSearchUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary font-medium hover:underline" onClick={e => e.stopPropagation()}>
                Airbnb verified ✓
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
                className="flex-1 bg-nfstay-black text-nfstay-black-foreground h-[38px] rounded-lg text-[13px] font-semibold inline-flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                Visit Listing
              </button>
              <button
                onClick={handleAction}
                className="flex-1 border border-border h-[38px] rounded-lg text-[13px] font-medium text-foreground hover:bg-secondary transition-colors"
              >
                Inquire Now
              </button>
            </>
          ) : (
            <>
              <Link
                to={`/deals/${listing.id}`}
                className="flex-1 bg-nfstay-black text-nfstay-black-foreground h-[38px] rounded-lg text-[13px] font-semibold inline-flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                Visit Listing
              </Link>
              <button onClick={() => setShowInquiry(true)} className="flex-1 border border-border h-[38px] rounded-lg text-[13px] font-medium text-foreground hover:bg-secondary transition-colors">
                Inquire Now
              </button>
            </>
          )}
        </div>
      </div>
      <InquiryPopup open={showInquiry} onClose={() => setShowInquiry(false)} propertyName={listing.name} city={listing.city} />
    </div>
  );
}
