import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Heart, Share2, ChevronDown, MapPin, Home, CheckCircle, Plus, Sparkles, X } from 'lucide-react';
import { faqItems } from '@/data/mockData';
import { useFavourites } from '@/hooks/useFavourites';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchPexelsPhotos } from '@/lib/pexels';
import PropertyCard from '@/components/PropertyCard';
import InquiryPanel from '@/components/InquiryPanel';
import type { ListingShape } from '@/components/InquiryPanel';

export default function DealDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toggle, isFav } = useFavourites();

  // Fetch real property from Supabase
  const { data: listing, isLoading } = useQuery({
    queryKey: ['property', id],
    queryFn: async () => {
      // properties has columns not in generated types — cast needed
      const { data, error } = await (supabase.from('properties') as any)
        .select('*')
        .eq('id', id!)
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
  const rent = (listing?.rent_monthly as number) ?? 0;
  const profit = (listing?.profit_est as number) ?? 0;
  const type = (listing?.type as string) || '';
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

  // Inquiry panel state
  const [inquiryListing, setInquiryListing] = useState<ListingShape | null>(null);
  const [inquiryOpen, setInquiryOpen] = useState(false);

  const handleInquire = useCallback((l: ListingShape) => {
    setInquiryListing(l);
    setInquiryOpen(true);
  }, []);

  const handleCloseInquiry = useCallback(() => {
    setInquiryOpen(false);
  }, []);

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
        daysAgo: Math.max(0, Math.floor((Date.now() - new Date(p.created_at as string).getTime()) / 86400000)),
        image: ((p.photos as string[] | null)?.[0]) || `https://placehold.co/800x520/1a1a2e/ffffff?text=${encodeURIComponent((p.city as string) || 'Property')}`,
        landlordApproved: p.sa_approved === 'yes',
        landlordWhatsapp: (p.landlord_whatsapp as string) || null,
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

  // Build ListingShape for inquiry panel
  const listingShape: ListingShape = {
    id: id || '',
    name, city, postcode, rent, profit, type,
    status: status as 'live' | 'on-offer' | 'inactive',
    featured: !!listing?.featured,
    daysAgo,
    image: images[0],
    landlordApproved,
    landlordWhatsapp,
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
    <div className="min-h-screen bg-card">
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
            <h1 className="text-[28px] font-bold text-foreground">{name}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3.5 h-3.5" /> {city} · {postcode}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => toggle(id || '')} className={`h-10 px-4 rounded-lg border border-border flex items-center gap-2 text-sm font-medium transition-colors ${isFav(id || '') ? 'text-primary bg-accent-light' : 'text-foreground hover:bg-secondary'}`}>
              <Heart className={`w-4 h-4 ${isFav(id || '') ? 'fill-primary' : ''}`} /> {isFav(id || '') ? 'Saved' : 'Save'}
            </button>
            <button className="h-10 px-4 rounded-lg border border-border flex items-center gap-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
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
          £{rent.toLocaleString()} / month · {type} · {postcode}
        </div>

        {/* Photo grid */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-2 rounded-2xl overflow-hidden mb-8">
          <img src={images[0]} className="w-full h-[300px] md:h-[400px] object-cover cursor-pointer" alt="" onClick={() => { setGalleryIdx(0); setShowGallery(true); }} />
          <div className="grid grid-rows-2 gap-2">
            <img src={images[1]} className="w-full h-full object-cover cursor-pointer" alt="" onClick={() => { setGalleryIdx(1); setShowGallery(true); }} />
            <div className="relative">
              <img src={images[2]} className="w-full h-full object-cover cursor-pointer" alt="" onClick={() => { setGalleryIdx(2); setShowGallery(true); }} />
              <button onClick={() => setShowGallery(true)} className="absolute bottom-3 right-3 bg-card/90 backdrop-blur-sm text-sm font-medium px-3 py-1.5 rounded-lg border border-border">Show all photos</button>
            </div>
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                {[
                  { label: 'Monthly rent', value: `£${rent.toLocaleString()}` },
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
              <h2 className="text-xl font-bold text-foreground mb-4">About this deal</h2>
              {listing.description ? (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{listing.description as string}</p>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {name} is a {type} in {city} ({postcode}){landlordApproved ? ', fully approved by the landlord for short-term rental use' : ''}.
                  With a monthly rent of £{rent.toLocaleString()} and estimated profit of £{profit.toLocaleString()}, this property offers strong returns in a high-demand area.
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
                <input type="range" min={5} max={30} value={nights} onChange={e => setNights(Number(e.target.value))} className="w-full accent-primary" />
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
                        <Sparkles className="w-3 h-3" /> AI estimated
                      </a>
                    ) : (
                      <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent-light text-accent-foreground inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> AI estimated
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
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Monthly rent</span><span className="font-medium text-foreground">-£{rent.toLocaleString()}</span></div>
                {showExtraCosts && totalExtraCosts > 0 && (
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Extra costs</span><span className="font-medium text-foreground">-£{totalExtraCosts}</span></div>
                )}
                <div className="flex justify-between text-base border-t border-border pt-3">
                  <span className="font-semibold text-foreground">Est. monthly profit</span>
                  <span className={`font-bold text-lg ${finalProfit > 0 ? 'text-accent-foreground' : 'text-destructive'}`}>£{finalProfit.toLocaleString()}</span>
                </div>
              </div>
              <button onClick={() => handleInquire(listingShape)} className="w-full h-12 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold mt-6 hover:opacity-90 transition-opacity">
                Inquire Now
              </button>
              <p className="text-xs text-muted-foreground text-center mt-2">Contact via WhatsApp</p>
            </div>
          </div>
        </div>

        {/* Nearby deals */}
        {nearbyDeals.length > 0 && (
          <div className="mt-14">
            <h2 className="text-xl font-bold text-foreground mb-6">More deals near {city}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {nearbyDeals.map(l => (
                <PropertyCard key={l.id} listing={l} isFav={isFav(l.id)} onToggleFav={() => toggle(l.id)} onInquire={handleInquire} />
              ))}
            </div>
          </div>
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

      <InquiryPanel open={inquiryOpen} listing={inquiryListing} onClose={handleCloseInquiry} />
    </div>
  );
}
