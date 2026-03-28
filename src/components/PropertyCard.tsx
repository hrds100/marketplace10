import { Heart, CheckCircle, Gem, Zap, Lock, MessageCircle, Mail, Phone } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { ListingShape } from '@/components/InquiryPanel';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserTier } from '@/hooks/useUserTier';
import { isPaidTier } from '@/lib/ghl';
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
  onEmailInquire?: (listing: ListingShape) => void;
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

const NFSTAY_WHATSAPP = '447476368123';

const LISTER_LABELS: Record<string, string> = {
  landlord: 'Direct Landlord',
  agent: 'Letting Agent',
  deal_sourcer: 'Deal Sourcer',
};

export default function PropertyCard({ listing, isFav, onToggleFav, onAddToCRM, onInquire, onEmailInquire, showSavedBadge, forceSignUp }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier } = useUserTier();
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

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (forceSignUp) { navigate('/signup'); return; }
    if (!isPaidTier(tier)) {
      toast.error('Upgrade your plan to contact listers');
      navigate('/dashboard/deals');
      return;
    }
    const propertyUrl = `https://hub.nfstay.com/deals/${listing.slug || listing.id}`;
    const msg = encodeURIComponent(
      `Hi, I am interested in your property on nfstay.\nLink: ${propertyUrl}\nReference no.: ${listing.id}\nPlease contact me at your earliest convenience.`,
    );
    // Fire inquiry in background
    supabase.functions.invoke('process-inquiry', {
      body: {
        property_id: listing.id,
        channel: 'whatsapp',
        message: `Interested in ${listing.name} at ${listing.city}`,
        tenant_name: user?.user_metadata?.name || '',
        tenant_email: user?.email || '',
        tenant_phone: user?.user_metadata?.whatsapp || '',
        property_url: propertyUrl,
      },
    }).catch(() => {});
    window.open(`https://wa.me/${NFSTAY_WHATSAPP}?text=${msg}`, '_blank');
  };

  const handleEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (forceSignUp) { navigate('/signup'); return; }
    if (!isPaidTier(tier)) {
      toast.error('Upgrade your plan to contact listers');
      navigate('/dashboard/deals');
      return;
    }
    onEmailInquire?.(listing);
  };

  const airdnaUrl = `https://www.airdna.co`;
  const isPrime = listing.prime;
  const resolvedImage = usePropertyImage(listing.id, listing.image ? [listing.image] : null, listing.city, listing.type, 0, isPrime);
  const isPexelsPhoto = resolvedImage?.includes('images.pexels.com') || false;

  const placeholderUrl = `https://placehold.co/800x520/1a1a2e/ffffff?text=${encodeURIComponent(listing.city || 'Property')}`;
  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.src !== placeholderUrl) img.src = placeholderUrl;
  };
  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    // If image decoded but has 0 dimensions (broken/HTML response), swap to placeholder
    if (img.naturalWidth === 0 && img.src !== placeholderUrl) img.src = placeholderUrl;
  };

  // ─── JV CARD (Style 4: Floating + Shimmer + Progress) ───
  // Exact match to Card 4 from /testing/design
  if (isPrime) {
    const funded = listing.investFundedPct ?? 0;
    const target = listing.investTarget ?? 0;
    const minContribution = listing.investMinContribution ?? 0;
    const monthlyProfit = listing.investMonthlyProfit ?? listing.profit;
    const estReturns = listing.investReturns ?? 0;
    return (
      <div
        className="bg-card rounded-2xl overflow-hidden border-[1.5px] flex flex-col"
        style={{
          borderColor: '#C9A842',
          boxShadow: '0 4px 24px rgba(191,149,63,0.15)',
          animation: 'jv-float 4s ease-in-out infinite',
        }}
      >
        <div className="relative h-[200px] overflow-hidden">
          <img src={resolvedImage} alt={`Property in ${listing.city}`} loading="lazy"
            className="w-full h-full object-cover"
            style={isPexelsPhoto ? { filter: 'blur(8px)', transform: 'scale(1.1)' } : undefined}
            onError={handleImgError} onLoad={handleImgLoad} />
          {isPexelsPhoto && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 z-[1]" style={{ background: 'rgba(0,0,0,0.4)' }}>
              <Lock className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.9)' }} />
              <span className="text-white text-xs font-medium">Photos on request</span>
            </div>
          )}
          <div className="absolute top-2.5 left-2.5 z-[2]">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: '#1A1A2E', color: '#F0D55E', border: '1px solid #C9A842' }}>
              Exclusive JV
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
          <p className="text-[13px] text-muted-foreground mt-0.5">{listing.city}{listing.postcode ? ` · ${listing.postcode}` : ''}</p>
          <div className="mt-3 mb-2">
            <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${funded}%`, background: 'linear-gradient(90deg, #BF953F, #F0D55E, #BF953F)' }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">{funded}% funded</span>
              <span className="text-[10px] font-medium" style={{ color: '#A67C00' }}>Target: £{target.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex-1 space-y-0">
            <div className="flex justify-between items-center py-[7px] border-b border-border/50">
              <span className="text-xs text-muted-foreground">Min. contribution</span>
              <span className="text-[13px] font-bold" style={{ color: '#A67C00' }}>£{minContribution.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-[7px] border-b border-border/50">
              <span className="text-xs text-muted-foreground">Est. monthly profit</span>
              <span className="text-[13px] font-bold" style={{ color: '#A67C00' }}>£{monthlyProfit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-[7px]">
              <span className="text-xs text-muted-foreground">Est. Returns</span>
              <span className="text-[13px] font-bold" style={{ color: '#A67C00' }}>{estReturns}%</span>
            </div>
          </div>
          <div className="mt-auto pt-3">
            {forceSignUp ? (
              <button onClick={handleAction}
                className="w-full h-[42px] rounded-lg text-[14px] font-bold inline-flex items-center justify-center gap-1.5 hover:opacity-95"
                style={{ background: 'linear-gradient(90deg, #BF953F, #FCF6BA, #BF953F)', backgroundSize: '200% 100%', animation: 'jv-shimmer 3s ease-in-out infinite', color: '#5C4000' }}>
                Partner Now <Zap className="w-4 h-4" />
              </button>
            ) : (
              <Link to="/dashboard/invest/marketplace"
                className="w-full h-[42px] rounded-lg text-[14px] font-bold inline-flex items-center justify-center gap-1.5 hover:opacity-95"
                style={{ background: 'linear-gradient(90deg, #BF953F, #FCF6BA, #BF953F)', backgroundSize: '200% 100%', animation: 'jv-shimmer 3s ease-in-out infinite', color: '#5C4000' }}>
                Partner Now <Zap className="w-4 h-4" />
              </Link>
            )}
          </div>
          <div className="flex justify-between items-center pt-2 mt-2 border-t border-border/50">
            <span className="text-[11px] text-muted-foreground">Added {listing.daysAgo} days ago</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#C9A842' }} />
              <span className="text-[11px] font-medium" style={{ color: '#C9A842' }}>Live</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── REGULAR CARD ────────────────────────────────────
  return (
    <div data-feature="DEALS__PROPERTY_CARD" className="bg-card border border-border rounded-2xl overflow-hidden card-hover flex flex-col">
      <div className="relative h-[200px] overflow-hidden">
        <img data-feature="DEALS__PROPERTY_CARD_IMAGE" src={resolvedImage} alt={`Property in ${listing.city}`} loading="lazy"
          className="w-full h-full object-cover"
          style={isPexelsPhoto ? { filter: 'blur(8px)', transform: 'scale(1.1)' } : undefined}
          onError={handleImgError} onLoad={handleImgLoad} />
        {isPexelsPhoto && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 z-[1]" style={{ background: 'rgba(0,0,0,0.4)' }}>
            <Lock className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.9)' }} />
            <span className="text-white text-xs font-medium">Photos on request</span>
          </div>
        )}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5 z-[2]">
          {showSavedBadge && <span className="badge-green text-[11px]">Saved</span>}
          {listing.featured && <span data-feature="DEALS__PROPERTY_CARD_BADGE" className="badge-green-fill text-[11px]">Featured</span>}
          <span data-feature="DEALS__PROPERTY_CARD_LISTING_TYPE" className={`text-white text-[9px] font-semibold px-2 py-0.5 rounded-full ${listing.listing_type === 'sale' ? 'bg-emerald-600/90' : 'bg-[#1E9A80]/90'}`}>
            {listing.listing_type === 'sale' ? 'Sale' : 'Rental'}
          </span>
        </div>
        <button
          data-feature="DEALS__PROPERTY_CARD_FAVOURITE"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (forceSignUp) { navigate('/signup'); return; } onToggleFav(); }}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all ${isFav ? 'bg-accent-light' : 'bg-black/30'}`}
        >
          <Heart className={`w-4 h-4 ${isFav ? 'fill-primary text-primary' : 'text-white'}`} />
        </button>
      </div>

      <div className="p-3.5 pt-3 flex flex-col flex-1">
        <div className="flex items-start justify-between">
          <div>
            <h3 data-feature="DEALS__PROPERTY_CARD_TITLE" className="text-[15px] font-bold text-foreground leading-tight">{listing.name}</h3>
            <p data-feature="DEALS__PROPERTY_CARD_LOCATION" className="text-[13px] text-muted-foreground mt-0.5">{listing.city} · {listing.postcode}</p>
          </div>
          {onAddToCRM && (
            <span data-feature="DEALS__PROPERTY_CARD_CRM" onClick={handleAddToCRM}
              className={`text-[10px] font-medium italic cursor-pointer transition-colors ${addedToCRM ? 'text-muted-foreground hover:text-foreground' : 'text-[#1E9A80] hover:text-[#1E9A80]/70'}`}>
              {addedToCRM ? 'Added to CRM' : '+ Add to CRM'}
            </span>
          )}
        </div>

        <div className="mt-3 space-y-0">
          <div className="flex justify-between items-center py-[7px] border-b border-border/50">
            <span className="text-xs text-muted-foreground">{listing.listing_type === 'sale' ? 'Property price' : 'Monthly rent'}</span>
            <span data-feature="DEALS__PROPERTY_CARD_RENT" className="text-[13px] font-medium text-foreground">£{(listing.listing_type === 'sale' ? (listing.purchasePrice ?? listing.rent ?? 0) : (listing.rent ?? 0)).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center py-[7px] border-b border-border/50">
            <span className="text-xs text-muted-foreground">Est. monthly profit</span>
            <div className="text-right">
              <span data-feature="DEALS__PROPERTY_CARD_PROFIT" className="text-[13px] font-bold text-accent-foreground">£{listing.profit}</span>
              <a href={airdnaUrl} target="_blank" rel="noopener noreferrer" className="block text-[10px] text-primary font-medium hover:underline -mt-0.5" onClick={e => e.stopPropagation()}>
                Airdna verified ✓
              </a>
            </div>
          </div>
          <div className="flex justify-between items-center py-[7px]">
            <span className="text-xs text-muted-foreground">Property type</span>
            <span data-feature="DEALS__PROPERTY_CARD_TYPE" className="text-[13px] font-medium text-foreground">{listing.type}</span>
          </div>
        </div>

        {/* Lister type badge */}
        {listing.lister_type && LISTER_LABELS[listing.lister_type] && (
          <div className="mt-2">
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
              style={{
                backgroundColor: listing.lister_type === 'agent' ? '#F3F4F6' : '#ECFDF5',
                color: listing.lister_type === 'agent' ? '#374151' : '#1E9A80',
              }}
            >
              {LISTER_LABELS[listing.lister_type]}
            </span>
          </div>
        )}

        {/* Contact buttons - Bayut-style: 3 equal buttons, icon + label */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {forceSignUp ? (
            <>
              <button data-feature="DEALS__PROPERTY_CARD_EMAIL" onClick={handleAction}
                className="h-[42px] rounded-xl inline-flex items-center justify-center gap-2 text-[13px] font-semibold transition-all hover:opacity-90"
                style={{ backgroundColor: '#1E9A80', color: '#fff' }}>
                <Mail className="w-4 h-4" /> Email
              </button>
              <button onClick={handleAction}
                className="h-[42px] rounded-xl border inline-flex items-center justify-center gap-2 text-[13px] font-semibold transition-all hover:bg-gray-50"
                style={{ borderColor: '#E5E7EB', color: '#1A1A1A' }}>
                <Phone className="w-4 h-4" /> Call
              </button>
              <button onClick={handleAction}
                className="h-[42px] rounded-xl inline-flex items-center justify-center gap-2 text-[13px] font-semibold transition-all hover:opacity-90"
                style={{ backgroundColor: '#25D366', color: '#fff' }}>
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </button>
            </>
          ) : (
            <>
              <button data-feature="DEALS__PROPERTY_CARD_EMAIL" onClick={handleEmail}
                className="h-[42px] rounded-xl inline-flex items-center justify-center gap-2 text-[13px] font-semibold transition-all hover:opacity-90"
                style={{ backgroundColor: '#1E9A80', color: '#fff' }}>
                <Mail className="w-4 h-4" /> Email
              </button>
              <Link data-feature="DEALS__PROPERTY_CARD_VIEW" to={`/deals/${listing.slug || listing.id}`}
                className="h-[42px] rounded-xl border inline-flex items-center justify-center gap-2 text-[13px] font-semibold transition-all hover:bg-gray-50"
                style={{ borderColor: '#E5E7EB', color: '#1A1A1A' }}>
                <Phone className="w-4 h-4" /> Call
              </Link>
              <button data-feature="DEALS__PROPERTY_CARD_WHATSAPP" onClick={handleWhatsApp}
                className="h-[42px] rounded-xl inline-flex items-center justify-center gap-2 text-[13px] font-semibold transition-all hover:opacity-90"
                style={{ backgroundColor: '#25D366', color: '#fff' }}>
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </button>
            </>
          )}
        </div>
        <div className="flex justify-between items-center pt-2 mt-2 border-t border-border/50">
          <span className="text-[11px] text-muted-foreground">Added {listing.daysAgo} days ago</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${statusDot()}`} />
            <span className="text-[11px] text-muted-foreground capitalize">{listing.daysAgo <= 7 ? 'Live' : listing.daysAgo <= 14 ? 'Under offer' : 'Expired'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
