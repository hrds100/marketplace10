import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Heart, Share2, ChevronDown, MapPin, Home, CheckCircle, Plus, Sparkles, X, Lock, Mail, Loader2 } from 'lucide-react';
import { faqItems } from '@/data/mockData';
import { useFavourites } from '@/hooks/useFavourites';
import { useAuth } from '@/hooks/useAuth';
import { useUserTier } from '@/hooks/useUserTier';
import { isPaidTier } from '@/lib/ghl';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchPexelsPhotos } from '@/lib/pexels';
import PropertyCard from '@/components/PropertyCard';
import InquiryChatModal from '@/features/inquiry/InquiryChatModal';
import InquiryPanel from '@/components/InquiryPanel';
import type { ListingShape } from '@/components/InquiryPanel';


export default function DealDetail() {
  useEffect(() => { document.title = 'nfstay - Deal Detail'; }, []);
  const { id } = useParams();
  const { user } = useAuth();
  const { toggle, isFav } = useFavourites();

  // Fetch real property from Supabase (supports both slug and UUID)
  const { data: listing, isLoading } = useQuery({
    queryKey: ['property', id],
    queryFn: async () => {
      // properties has columns not in generated types — cast needed
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id!);
      const { data, error } = await (supabase.from('properties') as any)
        .select('*')
        .or(`slug.eq.${id}${isUuid ? `,id.eq.${id}` : ''}`)
        .single();
      if (error) throw error;
      return data as Record<string, unknown>;
    },
    enabled: !!id,
  });

  // Normalize fields from Supabase schema
  const name = (listing?.name as string) || '';
  const city = (listing?.city as string) || '';
  const postcode = (listing?.postcode as string) || '';
  const isSale = listing?.listing_type === 'sale';
  const rent = (listing?.rent_monthly as number) ?? 0;
  const purchasePrice = (listing?.purchase_price as number) ?? 0;
  const displayPrice = isSale ? purchasePrice : rent;
  const profit = (listing?.profit_est as number) ?? 0;
  const type = (listing?.type as string) || (listing?.deal_type as string) || 'Property';
  const status = (listing?.status as string) || 'inactive';
  const landlordApproved = listing?.sa_approved === 'yes';
  const daysAgo = listing?.created_at
    ? Math.max(0, Math.floor((Date.now() - new Date(listing.created_at as string).getTime()) / 86400000))
    : 0;
  const landlordWhatsapp = (listing?.landlord_whatsapp as string) || (listing?.contact_whatsapp as string) || null;

  // AI pricing data
  const aiNightlyRate = (listing?.estimated_nightly_rate as number) || 0;
  const aiSearchUrl = (listing?.airbnb_search_url_30d as string) || '';

  const defaultNightlyRate = Math.round(rent / 20 * 1.8);

  const [nights, setNights] = useState(20);
  const [addedToCrm, setAddedToCrm] = useState(false);
  const [nightlyRate, setNightlyRate] = useState(0);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [justAddedToCrm, setJustAddedToCrm] = useState(false);
  const [showExtraCosts, setShowExtraCosts] = useState(false);
  const [extraCosts, setExtraCosts] = useState([
    { label: 'Cleaning', amount: 80 },
    { label: 'Utilities', amount: 120 },
    { label: 'Insurance', amount: 50 },
    { label: 'Platform fees', amount: 60 },
  ]);

  // Set nightly rate once listing loads
  useEffect(() => {
    if (!listing) return;
    setNightlyRate(aiNightlyRate > 0 ? aiNightlyRate : defaultNightlyRate);
  }, [listing?.id]);

  // CRM state from localStorage (persists across navigation)
  useEffect(() => {
    if (!id) return;
    setAddedToCrm(localStorage.getItem(`crm_${id}`) === 'true');
  }, [id]);

  useEffect(() => {
    if (!justAddedToCrm) return;
    const t = setTimeout(() => setJustAddedToCrm(false), 1500);
    return () => clearTimeout(t);
  }, [justAddedToCrm]);

  const navigate = useNavigate();
  const { tier } = useUserTier();
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);

  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryTarget, setInquiryTarget] = useState<ListingShape | null>(null);

  // Check if user has already contacted this property
  const { data: isContacted, refetch: refetchContacted } = useQuery({
    queryKey: ['contacted', user?.id, id],
    queryFn: async () => {
      if (!user?.id || !id) return false;
      const { data } = await supabase.from('inquiries').select('id').eq('tenant_id', user.id).eq('property_id', id).limit(1);
      return (data && data.length > 0);
    },
    enabled: !!user?.id && !!id,
  });

  const handleInquire = useCallback((l: ListingShape) => {
    if (l.id.startsWith('inv-')) { navigate('/dashboard/invest/marketplace'); return; }
    setInquiryTarget(l);
    setInquiryOpen(true);
  }, [navigate]);

  const contactEmail = (listing?.contact_email as string) || null;
  const contactPhone = landlordWhatsapp || (listing?.contact_phone as string) || null;
  const listerType = (listing?.lister_type as string) || null;

  const handleDetailWhatsApp = () => {
    if (!listing || isLoading) return;
    if (!user) { navigate('/signup'); return; }
    if (!isPaidTier(tier)) { handleInquire(listingShape); return; }
    setWhatsappModalOpen(true);
  };

  const handleDetailEmail = () => {
    if (!listing || isLoading) return;
    if (!user) { navigate('/signup'); return; }
    if (!isPaidTier(tier)) { handleInquire(listingShape); return; }
    setEmailModalOpen(true);
  };

  // Build images: user photos first, Pexels fills remaining slots
  const userPhotos: string[] = Array.isArray(listing?.photos) ? (listing.photos as string[]) : [];
  const [pexelsImages, setPexelsImages] = useState<string[]>([]);

  useEffect(() => {
    if (!listing) return;
    if (userPhotos.length >= 5) return;
    const needed = 5 - userPhotos.length;
    fetchPexelsPhotos(city, type, needed + 2).then(results => {
      setPexelsImages(results.slice(0, needed));
      // Cache to DB if property has no photos at all
      if (userPhotos.length === 0 && results.length > 0 && id) {
        (supabase.from('properties') as any).update({ photos: results.slice(0, 5) }).eq('id', id).then(() => {});
      }
    });
  }, [listing?.id]);

  const stockImages = pexelsImages.length > 0
    ? pexelsImages
    : Array.from({ length: 5 }, (_, i) => `https://placehold.co/1200x900/1a1a2e/ffffff?text=${encodeURIComponent(city || 'Property')}-${i + 1}`);
  const images = [...userPhotos, ...stockImages.slice(0, 5 - userPhotos.length)].slice(0, 5);
  const isPexelsImage = (url: string) => url.includes('pexels.com') || url.includes('placehold.co');

  // More deals (same city, excluding current)
  const { data: moreDeals = [] } = useQuery({
    queryKey: ['more-deals', id, city],
    queryFn: async () => {
      if (!city) return [];
      const { data } = await (supabase.from('properties') as any)
        .select('*')
        .neq('id', id!)
        .eq('status', 'live')
        .eq('city', city)
        .order('created_at', { ascending: false })
        .limit(3);
      return (data || []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        name: p.name as string,
        city: p.city as string,
        postcode: p.postcode as string,
        rent: (p.rent_monthly as number) || 0,
        profit: (p.profit_est as number) || 0,
        type: p.type as string,
        status: (p.status as 'live' | 'on-offer' | 'inactive') || 'inactive',
        featured: !!p.featured,
        prime: !!p.prime,
        daysAgo: Math.max(0, Math.floor((Date.now() - new Date(p.created_at as string).getTime()) / 86400000)),
        image: ((p.photos as string[] | null)?.[0]) || `https://placehold.co/800x520/1a1a2e/ffffff?text=${encodeURIComponent((p.city as string) || 'Property')}`,
        landlordApproved: p.sa_approved === 'yes',
        landlordWhatsapp: (p.landlord_whatsapp as string) || null,
        slug: (p.slug as string) || null,
      })) as ListingShape[];
    },
    enabled: !!id && !!city,
  });

  // Nearby deals from Supabase (same city, live only)
  const { data: nearbyDeals = [] } = useQuery({
    queryKey: ['nearby-deals', city, id],
    queryFn: async () => {
      const { data } = await (supabase.from('properties') as any)
        .select('*')
        .eq('city', city)
        .eq('status', 'live')
        .neq('id', id!)
        .limit(3);
      return (data || []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        name: p.name as string,
        city: p.city as string,
        postcode: p.postcode as string,
        rent: (p.rent_monthly as number) || 0,
        profit: (p.profit_est as number) || 0,
        type: p.type as string,
        status: (p.status as 'live' | 'on-offer' | 'inactive') || 'inactive',
        featured: !!p.featured,
        prime: !!(p as Record<string, unknown>).prime,
        daysAgo: Math.max(0, Math.floor((Date.now() - new Date(p.created_at as string).getTime()) / 86400000)),
        image: ((p.photos as string[] | null)?.[0]) || `https://placehold.co/800x520/1a1a2e/ffffff?text=${encodeURIComponent((p.city as string) || 'Property')}`,
        landlordApproved: p.sa_approved === 'yes',
        landlordWhatsapp: (p.landlord_whatsapp as string) || null,
        slug: (p.slug as string) || null,
      })) as ListingShape[];
    },
    enabled: !!city && !!id,
  });

  const estRevenue = nightlyRate * nights;
  const estProfit = estRevenue - rent;
  const totalExtraCosts = extraCosts.reduce((sum, c) => sum + c.amount, 0);
  const finalProfit = estProfit - (showExtraCosts ? totalExtraCosts : 0);

  const handleAddToCrm = async () => {
    if (!user) { toast.error('Sign in to add deals to your CRM'); return; }
    if (!id) return;

    // TOGGLE OFF — remove from CRM
    if (addedToCrm) {
      const { error } = await supabase.from('crm_deals').delete()
        .eq('user_id', user.id).eq('property_id', id);
      if (error) { toast.error('Failed to remove — ' + error.message); return; }
      localStorage.removeItem(`crm_${id}`);
      setAddedToCrm(false);
      toast.success('Removed from CRM');
      return;
    }

    // TOGGLE ON — add to CRM
    const { error } = await supabase.from('crm_deals').insert({
      user_id: user.id,
      name, city, postcode, rent, profit, type,
      stage: 'New Lead',
      notes: 'Added from deal page',
      photo_url: images[0] || null,
      property_id: id || null,
    });
    if (error) { toast.error('Failed to add to CRM — ' + error.message); return; }
    localStorage.setItem(`crm_${id}`, 'true');
    setAddedToCrm(true);
    setJustAddedToCrm(true);
    toast.success('Added to CRM!');
  };

  // Build ListingShape for inquiry panel (use real UUID from DB, not URL slug)
  const listingShape: ListingShape = {
    id: (listing?.id as string) || id || '',
    name, city, postcode, rent, profit, type,
    status: status as 'live' | 'on-offer' | 'inactive',
    featured: !!listing?.featured,
    prime: false,
    daysAgo,
    image: images[0],
    landlordApproved,
    landlordWhatsapp,
    slug: (listing?.slug as string) || null,
    lister_type: listerType as any,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground mt-3">Loading deal...</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Deal not found</p>
          <p className="text-sm text-muted-foreground mt-1">This property may have been removed or the link is invalid.</p>
          <Link to="/dashboard/deals" className="mt-4 inline-block text-sm text-primary font-semibold">← Back to Deals</Link>
        </div>
      </div>
    );
  }

  return (
    <div data-feature="DEALS" className="min-h-screen bg-card">
      {/* Nav */}
      <div className="h-[68px] flex items-center px-6 md:px-10 border-b border-border">
        <Link to="/dashboard/deals" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to deals
        </Link>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-8">
        {/* Breadcrumb */}
        <div className="text-[13px] text-muted-foreground mb-4">
          <Link to="/dashboard/deals" className="hover:text-foreground">Deals</Link> / <span className="text-foreground">{name}</span>
        </div>

        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 data-feature="DEALS__DETAIL_TITLE" className="text-[28px] font-bold text-foreground">{name}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3.5 h-3.5" /> {city} · {postcode}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button data-feature="DEALS__DETAIL_FAVOURITE" onClick={() => toggle(id || '')} className={`h-10 px-4 rounded-lg border border-border flex items-center gap-2 text-sm font-medium transition-colors ${isFav(id || '') ? 'text-primary bg-accent-light' : 'text-foreground hover:bg-secondary'}`}>
              <Heart className={`w-4 h-4 ${isFav(id || '') ? 'fill-primary' : ''}`} /> {isFav(id || '') ? 'Saved' : 'Save'}
            </button>
            <button
              data-feature="DEALS__DETAIL_SHARE"
              onClick={async () => {
                const url = window.location.href;
                try {
                  if (navigator.share) {
                    await navigator.share({ title: name, url });
                  } else {
                    await navigator.clipboard.writeText(url);
                    toast.success('Link copied!');
                  }
                } catch {
                  // User cancelled share or clipboard failed
                }
              }}
              className="h-10 px-4 rounded-lg border border-border flex items-center gap-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
            <div className="relative inline-block min-w-[140px]">
              {justAddedToCrm && <div className="crm-celebration-ring absolute inset-0 rounded-lg border-2 border-primary" aria-hidden />}
              <button type="button" onClick={handleAddToCrm}
                className={`relative z-0 h-10 px-4 rounded-lg border flex items-center gap-2 text-sm font-medium transition-all shrink-0 ${addedToCrm ? 'bg-muted text-muted-foreground border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive' : 'bg-primary text-primary-foreground border-primary hover:opacity-90'}`}>
                {addedToCrm ? <X className="w-4 h-4 shrink-0" /> : <Plus className="w-4 h-4 shrink-0" />}
                <span>{addedToCrm ? 'Remove from CRM' : 'Add to CRM'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Info strip */}
        <div className="text-sm font-semibold text-foreground mb-6">
          {isSale ? `£${displayPrice.toLocaleString()}` : `£${rent.toLocaleString()} / month`} · {type} · {postcode}
        </div>

        {/* Photo grid */}
        <div data-feature="DEALS__DETAIL_PHOTOS" className="grid grid-cols-1 md:grid-cols-[2fr_1fr] md:grid-rows-2 gap-2 rounded-2xl overflow-hidden mb-8 md:h-[400px]">
          <div className="relative w-full h-[300px] md:h-full md:row-span-2 cursor-pointer overflow-hidden" onClick={() => { setGalleryIdx(0); setShowGallery(true); }}>
            <img src={images[0]} className="w-full h-full object-cover" alt="" style={isPexelsImage(images[0]) ? { filter: 'blur(8px)', transform: 'scale(1.1)' } : undefined} />
            {isPexelsImage(images[0]) && <div className="absolute inset-0 bg-black/35 flex flex-col items-center justify-center gap-2"><Lock className="w-8 h-8 text-white/90" /><span className="text-white text-sm font-medium">Photos on request</span></div>}
          </div>
          <div className="relative w-full h-full cursor-pointer overflow-hidden hidden md:block" onClick={() => { setGalleryIdx(1); setShowGallery(true); }}>
            <img src={images[1]} className="w-full h-full object-cover" alt="" style={isPexelsImage(images[1]) ? { filter: 'blur(8px)', transform: 'scale(1.1)' } : undefined} />
            {isPexelsImage(images[1]) && <div className="absolute inset-0 bg-black/35 flex items-center justify-center"><Lock className="w-5 h-5 text-white/90" /></div>}
          </div>
          <div className="relative hidden md:block overflow-hidden">
            <img src={images[2]} className="w-full h-full object-cover cursor-pointer" alt="" onClick={() => { setGalleryIdx(2); setShowGallery(true); }} style={isPexelsImage(images[2]) ? { filter: 'blur(8px)', transform: 'scale(1.1)' } : undefined} />
            {isPexelsImage(images[2]) && <div className="absolute inset-0 bg-black/35 flex items-center justify-center"><Lock className="w-5 h-5 text-white/90" /></div>}
            <button onClick={() => setShowGallery(true)} className="absolute bottom-3 right-3 bg-card/90 backdrop-blur-sm text-sm font-medium px-3 py-1.5 rounded-lg border border-border">Show all photos</button>
          </div>
        </div>

        {/* Content + Estimator */}
        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          <div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={status === 'live' ? 'badge-green-fill' : status === 'on-offer' ? 'badge-amber' : 'badge-gray'}>
                  {status === 'live' ? 'LIVE' : status === 'on-offer' ? 'On offer' : status === 'pending' ? 'Pending' : 'Inactive'}
                </span>
                {landlordApproved && <span className="badge-green">Landlord approved</span>}
              </div>
              <div data-feature="DEALS__DETAIL_FINANCIALS" className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                {[
                  { label: isSale ? 'Sale price' : 'Monthly rent', value: `£${displayPrice.toLocaleString()}` },
                  { label: 'Est. profit', value: `£${profit.toLocaleString()}`, green: true },
                  { label: 'Property type', value: type },
                  { label: 'Added', value: `${daysAgo} days ago` },
                ].map(d => (
                  <div key={d.label} className="bg-secondary rounded-xl p-4">
                    <div className="text-xs text-muted-foreground">{d.label}</div>
                    <div className={`text-lg font-bold mt-1 ${d.green ? 'text-accent-foreground' : 'text-foreground'}`}>{d.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10">
              <h2 data-feature="DEALS__DETAIL_FAQ" className="text-xl font-bold text-foreground mb-4">About this deal</h2>
              {listing.description ? (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{listing.description as string}</p>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {name} is a {type} in {city} ({postcode}){landlordApproved ? ', fully approved by the landlord for short-term rental use' : ''}.
                  With {isSale ? `an asking price of £${displayPrice.toLocaleString()}` : `a monthly rent of £${rent.toLocaleString()}`} and estimated profit of £{profit.toLocaleString()}, this property offers strong returns in a high-demand area.
                </p>
              )}
              <div className="mt-6 space-y-2">
                {faqItems.slice(0, 3).map(faq => (
                  <div key={faq.id} className="border border-border rounded-xl overflow-hidden">
                    <button onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)} className="w-full flex items-center justify-between p-4 text-left">
                      <span className="text-sm font-medium text-foreground">{faq.question}</span>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openFaq === faq.id ? 'rotate-180' : ''}`} />
                    </button>
                    {openFaq === faq.id && <p className="px-4 pb-4 text-sm text-muted-foreground">{faq.answer}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Estimator */}
          <div className="lg:sticky lg:top-8 h-fit">
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-lg font-bold text-foreground mb-1">Earnings estimator</h3>
              <div className="flex items-center gap-2 mb-6">
                <Home className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{type}</span>
              </div>
              <div className="mb-4">
                <label className="text-xs font-semibold text-foreground block mb-2">Nights booked per month</label>
                <input type="range" min={5} max={30} value={nights} onChange={e => setNights(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer outline-none"
                  style={{ background: `linear-gradient(to right, #10b981 0%, #10b981 ${((nights - 5) / 25) * 100}%, #e5e7eb ${((nights - 5) / 25) * 100}%, #e5e7eb 100%)` }} />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>5</span><span className="font-semibold text-foreground">{nights} nights</span><span>30</span>
                </div>
              </div>
              <div className="mb-4">
                <label className="text-xs font-semibold text-foreground block mb-2">
                  Nightly average rate (£)
                  {aiNightlyRate > 0 && (
                    aiSearchUrl ? (
                      <a href={aiSearchUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent-light text-accent-foreground inline-flex items-center gap-1 hover:opacity-75 transition-opacity">
                        <Sparkles className="w-3 h-3" /> AirDNA verified
                      </a>
                    ) : (
                      <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent-light text-accent-foreground inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> AirDNA verified
                      </span>
                    )
                  )}
                </label>
                <input type="number" min={20} max={500} value={nightlyRate} onChange={e => setNightlyRate(Number(e.target.value) || 0)}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="mb-4">
                <button onClick={() => setShowExtraCosts(!showExtraCosts)} className="flex items-center justify-between w-full text-left">
                  <span className="text-xs font-semibold text-foreground">Extra costs</span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showExtraCosts ? 'rotate-180' : ''}`} />
                </button>
                {showExtraCosts && (
                  <div className="mt-3 space-y-2">
                    {extraCosts.map((cost, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{cost.label}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">£</span>
                          <input type="number" value={cost.amount} onChange={e => { const u = [...extraCosts]; u[i].amount = Number(e.target.value) || 0; setExtraCosts(u); }}
                            className="w-16 h-7 rounded border border-border bg-background px-2 text-xs text-foreground" />
                        </div>
                      </div>
                    ))}
                    <p className="text-[11px] text-muted-foreground italic mt-1">Typical costs for a {type} in {city}</p>
                  </div>
                )}
              </div>
              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Nightly rate</span><span className="font-medium text-foreground">£{nightlyRate}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Est. revenue</span><span className="font-medium text-foreground">£{estRevenue.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">{isSale ? 'Sale price' : 'Monthly rent'}</span><span className="font-medium text-foreground">-£{displayPrice.toLocaleString()}</span></div>
                {showExtraCosts && totalExtraCosts > 0 && (
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Extra costs</span><span className="font-medium text-foreground">-£{totalExtraCosts}</span></div>
                )}
                <div className="flex justify-between text-base border-t border-border pt-3">
                  <span className="font-semibold text-foreground">Est. monthly profit</span>
                  <span className={`font-bold text-lg ${finalProfit > 0 ? 'text-accent-foreground' : 'text-destructive'}`}>£{finalProfit.toLocaleString()}</span>
                </div>
              </div>
              {/* Contact buttons */}
              <div className="flex gap-2 mt-6">
                {isContacted ? (
                  <div className="flex-1 h-12 rounded-xl inline-flex items-center justify-center gap-2 text-[14px] font-medium" style={{ backgroundColor: '#F3F3EE', color: '#6B7280' }}>
                    <CheckCircle className="w-[18px] h-[18px]" /> Already contacted
                  </div>
                ) : (
                  <>
                    <button data-feature="DEALS__DETAIL_WHATSAPP" onClick={handleDetailWhatsApp}
                      disabled={isLoading}
                      className="flex-1 h-12 rounded-xl inline-flex items-center justify-center gap-2.5 text-[14px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: '#1E9A80' }}>
                      {isLoading ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>}
                      WhatsApp
                    </button>
                    <button data-feature="DEALS__DETAIL_EMAIL" onClick={handleDetailEmail}
                      className="flex-1 h-12 rounded-xl inline-flex items-center justify-center gap-2.5 text-[14px] font-semibold transition-all hover:brightness-[0.96]"
                      style={{ backgroundColor: '#E8F0EF', color: '#2D6A5F' }}>
                      <Mail className="w-[18px] h-[18px]" strokeWidth={1.8} /> Email
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Nearby deals */}
        {nearbyDeals.length > 0 && (
          <div className="mt-14">
            <h2 className="text-xl font-bold text-foreground mb-6">More deals near {city}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {nearbyDeals.map(l => (
                <PropertyCard key={l.id} listing={l} isFav={isFav(l.id)} onToggleFav={() => toggle(l.id)} onInquire={handleInquire} onEmailInquire={() => { setEmailModalOpen(true); }} onWhatsAppInquire={() => { setWhatsappModalOpen(true); }} />
              ))}
            </div>
          </div>
        )}

        {/* More deals near city (same city only) */}
        {moreDeals.length > 0 && (
          <section data-feature="DEALS__DETAIL_MORE_DEALS" className="mt-12 mb-8">
            <h2 className="text-xl font-bold text-foreground mb-6">More deals near {city}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {moreDeals.map(l => (
                <PropertyCard key={l.id} listing={l} isFav={isFav(l.id)} onToggleFav={() => toggle(l.id)} onInquire={handleInquire} onEmailInquire={() => { setEmailModalOpen(true); }} onWhatsAppInquire={() => { setWhatsappModalOpen(true); }} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Gallery modal */}
      {showGallery && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center" onClick={() => setShowGallery(false)}>
          <button className="absolute top-6 right-6 text-white text-2xl font-light" onClick={() => setShowGallery(false)}>✕</button>
          <button className="absolute left-6 text-white text-3xl" onClick={e => { e.stopPropagation(); setGalleryIdx(i => (i - 1 + images.length) % images.length); }}>‹</button>
          <img src={images[galleryIdx]} className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg" alt="" onClick={e => e.stopPropagation()} />
          <button className="absolute right-6 text-white text-3xl" onClick={e => { e.stopPropagation(); setGalleryIdx(i => (i + 1) % images.length); }}>›</button>
          <div className="absolute bottom-6 text-white text-sm">{galleryIdx + 1} / {images.length}</div>
        </div>
      )}

      {/* Inquiry modals */}
      <InquiryChatModal open={emailModalOpen} listing={listingShape} onClose={() => setEmailModalOpen(false)} contacted={!!isContacted} onContactSuccess={() => refetchContacted()} />
      <InquiryChatModal channel="whatsapp" open={whatsappModalOpen} listing={listingShape} onClose={() => setWhatsappModalOpen(false)} contacted={!!isContacted} onContactSuccess={() => refetchContacted()} />
      {/* GHL payment panel (free users) */}
      <InquiryPanel open={inquiryOpen} listing={inquiryTarget} onClose={() => setInquiryOpen(false)} />
    </div>
  );
}
