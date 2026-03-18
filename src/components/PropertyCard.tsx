import { Heart, CheckCircle, X, Gem, Zap } from 'lucide-react';
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

// JV card CSS animations (injected once)
const JV_STYLES_ID = 'jv-card-styles';
if (typeof document !== 'undefined' && !document.getElementById(JV_STYLES_ID)) {
  const style = document.createElement('style');
  style.id = JV_STYLES_ID;
  style.textContent = `
    @keyframes jv-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
    @keyframes jv-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  `;
  document.head.appendChild(style);
}

const GOLD = {
  buttonGradient: 'linear-gradient(135deg, #BF953F 0%, #D4AC2B 30%, #F0D55E 50%, #D4AC2B 70%, #BF953F 100%)',
  shimmerBtn: 'linear-gradient(90deg, #BF953F, #FCF6BA, #BF953F)',
  badge: '#1A1A2E',
  badgeText: '#F0D55E',
  border: '#C9A842',
  text: '#8B6914',
  textLight: '#A67C00',
};

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
    if (forceSignUp) navigate('/signup');
  };

  const handleAddToCRM = async () => {
    if (!user) { toast.error('Sign in to add deals to your CRM'); return; }
    if (addedToCRM) {
      const { error } = await supabase.from('crm_deals').delete().eq('user_id', user.id).eq('property_id', listing.id);
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
      user_id: user.id, name: listing.name, city: listing.city, postcode: listing.postcode,
      rent: listing.rent, profit: listing.profit, type: listing.type, stage: 'New Lead',
      notes: 'Added from deals page', photo_url: photoUrl || null, property_id: listing.id || null,
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

  const airdnaUrl = `https://www.airdna.co`;
  const resolvedImage = usePropertyImage(listing.id, listing.image ? [listing.image] : null, listing.city, listing.type);
  const isPrime = listing.prime;

  // ─── JV CARD (Style 4: Floating + Shimmer + Progress) ───
  // Exact match to Card 4 from /testing/design
  if (isPrime) {
    const funded = 64;
    return (
      <div>
      <div
        className="bg-card rounded-2xl overflow-hidden border-[1.5px] flex flex-col"
        style={{
          borderColor: '#C9A842',
          boxShadow: '0 4px 24px rgba(191,149,63,0.15)',
          animation: 'jv-float 4s ease-in-out infinite',
        }}
      >
        <div className="relative h-[200px] overflow-hidden">
          <img src={resolvedImage} alt={`Property in ${listing.city}`} loading="lazy" className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/800x520/1a1a2e/ffffff?text=${encodeURIComponent(listing.city || 'Property')}`; }} />
          <div className="absolute top-2.5 left-2.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: '#1A1A2E', color: '#F0D55E', border: '1px solid #C9A842' }}>
              💎 Exclusive JV
            </span>
          </div>
          <div className="absolute bottom-2.5 right-2.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: 'rgba(191,149,63,0.9)' }}>
              {funded}% funded
            </span>
          </div>
        </div>
        <div className="p-3.5 pt-3 flex flex-col flex-1">
          <h3 className="text-[15px] font-bold text-foreground">{listing.name}</h3>
          <p className="text-[13px] text-muted-foreground mt-0.5">{listing.city} · {listing.postcode}</p>
          <div className="mt-3 mb-2">
            <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${funded}%`, background: 'linear-gradient(90deg, #BF953F, #F0D55E, #BF953F)' }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">{funded}% funded</span>
              <span className="text-[10px] font-medium" style={{ color: '#A67C00' }}>Target: £45,000</span>
            </div>
          </div>
          <div className="flex-1 space-y-0">
            <div className="flex justify-between items-center py-[7px] border-b border-border/50">
              <span className="text-xs text-muted-foreground">Min. investment</span>
              <span className="text-[13px] font-bold" style={{ color: '#A67C00' }}>£500</span>
            </div>
            <div className="flex justify-between items-center py-[7px] border-b border-border/50">
              <span className="text-xs text-muted-foreground">Est. monthly profit</span>
              <span className="text-[13px] font-bold" style={{ color: '#A67C00' }}>£{listing.profit}</span>
            </div>
            <div className="flex justify-between items-center py-[7px]">
              <span className="text-xs text-muted-foreground">Projected ROI</span>
              <span className="text-[13px] font-bold" style={{ color: '#A67C00' }}>12.4%</span>
            </div>
          </div>
          <div className="mt-auto pt-3">
            {forceSignUp ? (
              <button onClick={handleAction}
                className="w-full h-[42px] rounded-lg text-[14px] font-bold inline-flex items-center justify-center gap-1.5 hover:opacity-95"
                style={{ background: 'linear-gradient(90deg, #BF953F, #FCF6BA, #BF953F)', backgroundSize: '200% 100%', animation: 'jv-shimmer 3s ease-in-out infinite', color: '#5C4000' }}>
                Invest Online <Zap className="w-4 h-4" />
              </button>
            ) : (
              <Link to={`/deals/${listing.id}`}
                className="w-full h-[42px] rounded-lg text-[14px] font-bold inline-flex items-center justify-center gap-1.5 hover:opacity-95"
                style={{ background: 'linear-gradient(90deg, #BF953F, #FCF6BA, #BF953F)', backgroundSize: '200% 100%', animation: 'jv-shimmer 3s ease-in-out infinite', color: '#5C4000' }}>
                Invest Online <Zap className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
      {/* Added date — outside the card */}
      <div className="flex justify-between items-center px-1 pt-1.5">
        <span className="text-[11px] text-muted-foreground">Added {listing.daysAgo} days ago</span>
      </div>
      </div>
    );
  }

  // ─── REGULAR CARD ────────────────────────────────────
  return (
    <div>
    <div className="bg-card border border-border rounded-2xl overflow-hidden card-hover flex flex-col">
      <div className="relative h-[200px] overflow-hidden">
        <img src={resolvedImage} alt={`Property in ${listing.city}`} loading="lazy" className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/800x520/1a1a2e/ffffff?text=${encodeURIComponent(listing.city || 'Property')}`; }} />
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          {showSavedBadge && <span className="badge-green text-[11px]">Saved</span>}
          {listing.featured && <span className="badge-green-fill text-[11px]">Featured</span>}
        </div>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (forceSignUp) { navigate('/signup'); return; } onToggleFav(); }}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all ${isFav ? 'bg-accent-light' : 'bg-black/30'}`}
        >
          <Heart className={`w-4 h-4 ${isFav ? 'fill-primary text-primary' : 'text-white'}`} />
        </button>
      </div>

      <div className="p-3.5 pt-3 flex flex-col flex-1">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-foreground leading-tight">{listing.name}</h3>
            <p className="text-[13px] text-muted-foreground mt-0.5">{listing.city} · {listing.postcode}</p>
          </div>
          {onAddToCRM && (
            <button onClick={handleAddToCRM}
              className={`text-[11px] font-semibold transition-all whitespace-nowrap flex items-center gap-1 px-2 py-1 rounded-full ${addedToCRM ? 'bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive' : 'bg-primary text-primary-foreground hover:opacity-90'}`}>
              {addedToCRM ? <><X className="w-3.5 h-3.5" /> Remove from CRM</> : '+ Add to CRM'}
            </button>
          )}
        </div>

        <div className="mt-3 space-y-0">
          <div className="flex justify-between items-center py-[7px] border-b border-border/50">
            <span className="text-xs text-muted-foreground">Monthly rent</span>
            <span className="text-[13px] font-medium text-foreground">£{listing.rent.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center py-[7px] border-b border-border/50">
            <span className="text-xs text-muted-foreground">Est. monthly profit</span>
            <div className="text-right">
              <span className="text-[13px] font-bold text-accent-foreground">£{listing.profit}</span>
              <a href={airdnaUrl} target="_blank" rel="noopener noreferrer" className="block text-[10px] text-primary font-medium hover:underline -mt-0.5" onClick={e => e.stopPropagation()}>
                Airdna verified ✓
              </a>
            </div>
          </div>
          <div className="flex justify-between items-center py-[7px]">
            <span className="text-xs text-muted-foreground">Property type</span>
            <span className="text-[13px] font-medium text-foreground">{listing.type}</span>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          {forceSignUp ? (
            <>
              <button onClick={handleAction} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm h-[38px] rounded-lg text-[13px] font-semibold inline-flex items-center justify-center hover:opacity-90 transition-opacity">
                Visit Listing
              </button>
              <button onClick={handleAction} className="flex-1 border border-border h-[38px] rounded-lg text-[13px] font-medium text-foreground hover:bg-secondary transition-colors">
                Inquire Now
              </button>
            </>
          ) : (
            <>
              <Link to={`/deals/${listing.id}`} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm h-[38px] rounded-lg text-[13px] font-semibold inline-flex items-center justify-center hover:opacity-90 transition-opacity">
                Visit Listing
              </Link>
              <button onClick={handleInquire} className="flex-1 border border-border h-[38px] rounded-lg text-[13px] font-medium text-foreground hover:bg-secondary transition-colors">
                Inquire Now
              </button>
            </>
          )}
        </div>
      </div>
    </div>
    {/* Added date — outside the card */}
    <div className="flex justify-between items-center px-1 pt-1.5">
      <span className="text-[11px] text-muted-foreground">Added {listing.daysAgo} days ago</span>
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${statusDot()}`} />
        <span className="text-[11px] text-muted-foreground capitalize">{listing.daysAgo <= 7 ? 'Live' : listing.daysAgo <= 14 ? 'Under offer' : 'Expired'}</span>
      </div>
    </div>
    </div>
  );
}
