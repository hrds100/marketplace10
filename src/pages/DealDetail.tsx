import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Heart, Share2, ChevronDown, MapPin, Home, CheckCircle, Plus } from 'lucide-react';
import { listings, faqItems, crmDeals } from '@/data/mockData';
import { useFavourites } from '@/hooks/useFavourites';
import { toast } from 'sonner';
import PropertyCard from '@/components/PropertyCard';
import InquiryPopup from '@/components/InquiryPopup';

declare global {
  interface Window {
    crmDeals?: Array<{ id: string; name: string; city: string; postcode: string; rent: number; profit: number; type: string; stage: string; lastContact: string; ownerInitials: string; notes: string }>;
  }
}

export default function DealDetail() {
  const { id } = useParams();
  const listing = listings.find(l => l.id === id) || listings[0];
  const { toggle, isFav } = useFavourites();
  const [nights, setNights] = useState(20);
  const [addedToCrm, setAddedToCrm] = useState(false);
  const defaultNightlyRate = Math.round(listing.rent / 20 * 1.8);
  const [nightlyRate, setNightlyRate] = useState(defaultNightlyRate);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [showInquiry, setShowInquiry] = useState(false);
  const [justAddedToCrm, setJustAddedToCrm] = useState(false);
  const [showExtraCosts, setShowExtraCosts] = useState(false);
  const [extraCosts, setExtraCosts] = useState([
    { label: 'Cleaning', amount: 80 },
    { label: 'Utilities', amount: 120 },
    { label: 'Insurance', amount: 50 },
    { label: 'Platform fees', amount: 60 },
  ]);

  const images = [
    `https://picsum.photos/seed/detail-main/1200/900`,
    `https://picsum.photos/seed/detail-tr/600/440`,
    `https://picsum.photos/seed/detail-br/600/440`,
    `https://picsum.photos/seed/detail-g4/1200/900`,
    `https://picsum.photos/seed/detail-g5/1200/900`,
  ];

  const estRevenue = nightlyRate * nights;
  const estProfit = estRevenue - listing.rent;
  const totalExtraCosts = extraCosts.reduce((sum, c) => sum + c.amount, 0);
  const finalProfit = estProfit - (showExtraCosts ? totalExtraCosts : 0);
  const nearbyDeals = listings.filter(l => l.city === listing.city && l.id !== listing.id).slice(0, 3);

  useEffect(() => {
    const source = window.crmDeals && window.crmDeals.length ? window.crmDeals : crmDeals;
    const isInCrm = source.some(d => d.name === listing.name && d.city === listing.city);
    setAddedToCrm(isInCrm);
  }, [listing.name, listing.city]);

  useEffect(() => {
    if (!justAddedToCrm) return;
    const t = setTimeout(() => setJustAddedToCrm(false), 1500);
    return () => clearTimeout(t);
  }, [justAddedToCrm]);

  const handleAddToCrm = () => {
    const newCrmDeal = {
      id: `deal-${listing.id}-crm`,
      name: listing.name,
      city: listing.city,
      postcode: listing.postcode,
      rent: listing.rent,
      profit: listing.profit,
      type: listing.type,
      stage: 'New Lead',
      lastContact: 'Today',
      ownerInitials: 'ME',
      notes: 'Added from deal page',
    };
    window.crmDeals = window.crmDeals ?? [...crmDeals];
    if (!window.crmDeals.some(d => d.name === listing.name && d.city === listing.city)) {
      window.crmDeals.push(newCrmDeal);
      setAddedToCrm(true);
      setJustAddedToCrm(true);
      toast.success('Added to CRM!');
    }
  };

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
          <Link to="/dashboard/deals" className="hover:text-foreground">Deals</Link> / <span className="text-foreground">{listing.name}</span>
        </div>

        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-[28px] font-bold text-foreground">{listing.name}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3.5 h-3.5" /> {listing.city} · {listing.postcode}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => toggle(listing.id)} className={`h-10 px-4 rounded-lg border border-border flex items-center gap-2 text-sm font-medium transition-colors ${isFav(listing.id) ? 'text-primary bg-accent-light' : 'text-foreground hover:bg-secondary'}`}>
              <Heart className={`w-4 h-4 ${isFav(listing.id) ? 'fill-primary' : ''}`} /> {isFav(listing.id) ? 'Saved' : 'Save'}
            </button>
            <button className="h-10 px-4 rounded-lg border border-border flex items-center gap-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
              <Share2 className="w-4 h-4" /> Share
            </button>
            <div className="relative inline-block min-w-[140px]">
              {justAddedToCrm && (
                <div className="crm-celebration-ring absolute inset-0 rounded-lg border-2 border-primary" aria-hidden />
              )}
              <button
                type="button"
                onClick={handleAddToCrm}
                disabled={addedToCrm}
                className={`relative z-0 h-10 px-4 rounded-lg border flex items-center gap-2 text-sm font-medium transition-all shrink-0 ${
                  addedToCrm
                    ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                    : 'bg-primary text-primary-foreground border-primary hover:opacity-90'
                }`}
              >
                {addedToCrm ? <CheckCircle className="w-4 h-4 shrink-0" /> : <Plus className="w-4 h-4 shrink-0" />}
                <span>{addedToCrm ? 'Added to CRM' : 'Add to CRM'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Info strip */}
        <div className="text-sm font-semibold text-foreground mb-6">
          £{listing.rent.toLocaleString()} / month · {listing.type} · {listing.postcode}
        </div>

        {/* Photo grid */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-2 rounded-2xl overflow-hidden mb-8">
          <img src={images[0]} className="w-full h-[300px] md:h-[400px] object-cover cursor-pointer" alt="" onClick={() => { setGalleryIdx(0); setShowGallery(true); }} />
          <div className="grid grid-rows-2 gap-2">
            <img src={images[1]} className="w-full h-full object-cover cursor-pointer" alt="" onClick={() => { setGalleryIdx(1); setShowGallery(true); }} />
            <div className="relative">
              <img src={images[2]} className="w-full h-full object-cover cursor-pointer" alt="" onClick={() => { setGalleryIdx(2); setShowGallery(true); }} />
              <button onClick={() => setShowGallery(true)} className="absolute bottom-3 right-3 bg-card/90 backdrop-blur-sm text-sm font-medium px-3 py-1.5 rounded-lg border border-border">
                Show all photos
              </button>
            </div>
          </div>
        </div>

        {/* Content + Estimator */}
        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          <div>
            {/* Deal details */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={listing.status === 'live' ? 'badge-green-fill' : listing.status === 'on-offer' ? 'badge-amber' : 'badge-gray'}>
                  {listing.status === 'live' ? 'LIVE' : listing.status === 'on-offer' ? 'On offer' : 'Inactive'}
                </span>
                {listing.landlordApproved && <span className="badge-green">Landlord approved</span>}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                {[
                  { label: 'Monthly rent', value: `£${listing.rent.toLocaleString()}` },
                  { label: 'Est. profit', value: `£${listing.profit}`, green: true },
                  { label: 'Property type', value: listing.type },
                  { label: 'Added', value: `${listing.daysAgo} days ago` },
                ].map(d => (
                  <div key={d.label} className="bg-secondary rounded-xl p-4">
                    <div className="text-xs text-muted-foreground">{d.label}</div>
                    <div className={`text-lg font-bold mt-1 ${d.green ? 'text-accent-foreground' : 'text-foreground'}`}>{d.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* About */}
            <div className="mt-10">
              <h2 className="text-xl font-bold text-foreground mb-4">About this deal</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {listing.name} is a {listing.type} in {listing.city} ({listing.postcode}), fully approved by the landlord for short-term rental use. 
                With a monthly rent of £{listing.rent.toLocaleString()} and estimated profit of £{listing.profit}, this property offers strong returns in a high-demand area.
              </p>

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
                <span className="text-sm text-muted-foreground">{listing.type}</span>
              </div>

              <div className="mb-4">
                <label className="text-xs font-semibold text-foreground block mb-2">Nights booked per month</label>
                <input
                  type="range"
                  min={5}
                  max={30}
                  value={nights}
                  onChange={e => setNights(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>5</span>
                  <span className="font-semibold text-foreground">{nights} nights</span>
                  <span>30</span>
                </div>
              </div>

              <div className="mb-4">
                <label className="text-xs font-semibold text-foreground block mb-2">Nightly average rate (£)</label>
                <input
                  type="number"
                  min={20}
                  max={500}
                  value={nightlyRate}
                  onChange={e => setNightlyRate(Number(e.target.value) || 0)}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Extra costs toggle */}
              <div className="mb-4">
                <button
                  onClick={() => setShowExtraCosts(!showExtraCosts)}
                  className="flex items-center justify-between w-full text-left"
                >
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
                          <input
                            type="number"
                            value={cost.amount}
                            onChange={e => {
                              const updated = [...extraCosts];
                              updated[i].amount = Number(e.target.value) || 0;
                              setExtraCosts(updated);
                            }}
                            className="w-16 h-7 rounded border border-border bg-background px-2 text-xs text-foreground"
                          />
                        </div>
                      </div>
                    ))}
                    <p className="text-[11px] text-muted-foreground italic mt-1">💡 AI suggestion: typical costs for a {listing.type} in {listing.city}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Nightly rate</span><span className="font-medium text-foreground">£{nightlyRate}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Est. revenue</span><span className="font-medium text-foreground">£{estRevenue.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Monthly rent</span><span className="font-medium text-foreground">-£{listing.rent.toLocaleString()}</span></div>
                {showExtraCosts && totalExtraCosts > 0 && (
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Extra costs</span><span className="font-medium text-foreground">-£{totalExtraCosts}</span></div>
                )}
                <div className="flex justify-between text-base border-t border-border pt-3">
                  <span className="font-semibold text-foreground">Est. monthly profit</span>
                  <span className={`font-bold text-lg ${finalProfit > 0 ? 'text-accent-foreground' : 'text-destructive'}`}>£{finalProfit.toLocaleString()}</span>
                </div>
              </div>

              <button onClick={() => setShowInquiry(true)} className="w-full h-12 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold mt-6 hover:opacity-90 transition-opacity">
                Inquire Now
              </button>
              <p className="text-xs text-muted-foreground text-center mt-2">Contact via WhatsApp</p>
            </div>
          </div>
        </div>

        {/* Nearby deals */}
        {nearbyDeals.length > 0 && (
          <div className="mt-14">
            <h2 className="text-xl font-bold text-foreground mb-6">More deals near {listing.city}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {nearbyDeals.map(l => (
                <PropertyCard key={l.id} listing={l} isFav={isFav(l.id)} onToggleFav={() => toggle(l.id)} />
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

      <InquiryPopup open={showInquiry} onClose={() => setShowInquiry(false)} propertyName={listing.name} city={listing.city} />
    </div>
  );
}
