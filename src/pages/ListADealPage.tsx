import { useState, useEffect } from 'react';
import { CheckCircle, Sparkles, Loader2, ArrowRight, Minus, Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import PhotoUpload from '@/components/PhotoUpload';
import MyListingsPanel from '@/components/MyListingsPanel';

const N8N_BASE = (import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.srv886554.hstgr.cloud').replace(/\/$/, '');

const FLAT_BEDS = ['1-bed', '2-bed', '3-bed', '4-bed', '5-bed', '6-bed'];
const HOUSE_BEDS = ['2-bed', '3-bed', '4-bed', '5-bed', '6-bed', '7-bed', '8-bed', '9-bed', '10-bed'];

const CATEGORIES = [
  { key: 'flat' as const, label: 'Flat', icon: '🏢', desc: 'Apartment or flat' },
  { key: 'house' as const, label: 'House', icon: '🏠', desc: 'Detached or terraced' },
  { key: 'hmo' as const, label: 'HMO', icon: '🏘️', desc: 'House in multiple occupation' },
];

const FURNISHED_OPTIONS = [
  { key: 'furnished' as const, label: 'Furnished', icon: '🛋️' },
  { key: 'part-furnished' as const, label: 'Part-furnished', icon: '🪑' },
  { key: 'unfurnished' as const, label: 'Unfurnished', icon: '📦' },
];

const SECTION_ORDER = ['property-details', 'property-type', 'property-features', 'financials', 'sa-approval', 'contact', 'media'] as const;

interface DealForm {
  name: string;
  streetName: string;
  houseNumber: string;
  city: string;
  postcode: string;
  propertyCategory: 'flat' | 'house' | 'hmo' | '';
  type: string;
  bedrooms: string;
  bathrooms: string;
  garage: string;
  furnished: 'furnished' | 'unfurnished' | 'part-furnished' | '';
  rent: string;
  profit: string;
  deposit: string;
  agentFee: string;
  saApproved: string;
  contactName: string;
  contactPhone: string;
  contactWhatsapp: string;
  contactEmail: string;
}

interface AIPricingResult {
  estimated_nightly_rate: number;
  estimated_monthly_revenue: number;
  estimated_profit: number;
  confidence: string;
  notes: string;
  airbnb_url_7d?: string;
  airbnb_url_30d?: string;
  airbnb_url_90d?: string;
}

type SubmitPhase = 'idle' | 'analysing' | 'reveal' | 'fallback';

const INITIAL_FORM: DealForm = {
  name: '', streetName: '', houseNumber: '', city: '', postcode: '',
  propertyCategory: '', type: '', bedrooms: '', bathrooms: '', garage: '', furnished: '',
  rent: '', profit: '', deposit: '', agentFee: '',
  saApproved: '',
  contactName: '', contactPhone: '', contactWhatsapp: '', contactEmail: '',
};

function Counter({ value, onChange, min = 1, max = 10, label }: { value: string; onChange: (v: string) => void; min?: number; max?: number; label: string }) {
  const num = parseInt(value) || 0;
  return (
    <div>
      <label className="text-xs font-semibold text-foreground block mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onChange(String(Math.max(min, num - 1)))} disabled={num <= min} className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-30">
          <Minus className="w-4 h-4 text-foreground" />
        </button>
        <span className="w-10 text-center text-base font-semibold text-foreground">{num || '—'}</span>
        <button type="button" onClick={() => onChange(String(Math.min(max, num + 1)))} disabled={num >= max} className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-30">
          <Plus className="w-4 h-4 text-foreground" />
        </button>
      </div>
    </div>
  );
}

function AccordionSection({ id, title, description, isOpen, isComplete, onToggle, summary, children }: {
  id: string; title: string; description: string; isOpen: boolean; isComplete: boolean; onToggle: () => void; summary: string; children: React.ReactNode;
}) {
  return (
    <div className={`bg-card border rounded-2xl overflow-hidden transition-all ${isComplete && !isOpen ? 'border-emerald-200' : 'border-border'}`}>
      <button data-feature="DEALS__LIST_FORM_SECTION" type="button" onClick={onToggle} className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-secondary/40 transition-colors">
        <div className="flex items-center gap-3">
          {isComplete ? (
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-border flex-shrink-0" />
          )}
          <div>
            <div className="text-sm font-bold text-foreground">{title}</div>
            {!isOpen && <div className="text-xs text-muted-foreground mt-0.5">{isComplete ? summary : description}</div>}
          </div>
        </div>
        <svg className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-6 pb-6 pt-1 border-t border-border">
          <p className="text-xs text-muted-foreground mb-5">{description}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function ListADealPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle');
  const [pricingResult, setPricingResult] = useState<AIPricingResult | null>(null);
  const [submittedPropertyId, setSubmittedPropertyId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [nextId] = useState(() => `Property #${1000 + Math.floor(Math.random() * 9000)}`);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<DealForm>(INITIAL_FORM);
  const [profileWhatsapp, setProfileWhatsapp] = useState('');
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['property-details', 'media']));

  // Reset form when user navigates to this page fresh (e.g. sidebar click after submit)
  useEffect(() => {
    if (submitPhase !== 'idle') resetAll();
  }, [location.key]);

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Clicking open section → close it
        next.delete(id);
      } else {
        // Clicking closed section → close all others, open this one
        // Keep media open if it was open — it's always optional
        const keepMedia = id !== 'media' && prev.has('media');
        next.clear();
        next.add(id);
        if (keepMedia) next.add('media');
      }
      return next;
    });
  };

  const set = (key: keyof DealForm, value: string) => setForm(p => ({ ...p, [key]: value }));

  useEffect(() => {
    if (!user?.id) return;
    (supabase.from('profiles') as any)
      .select('whatsapp')
      .eq('id', user.id)
      .single()
      .then(({ data }: { data: { whatsapp: string } | null }) => {
        if (data?.whatsapp) {
          setProfileWhatsapp(data.whatsapp);
          setForm(p => ({ ...p, contactWhatsapp: data.whatsapp }));
        }
      });
  }, [user?.id]);

  const selectPropertyType = (category: 'flat' | 'house' | 'hmo', bed: string) => {
    if (category === 'hmo') {
      setForm(p => ({ ...p, propertyCategory: 'hmo', type: 'HMO', bedrooms: '' }));
    } else {
      const bedNum = bed.replace('-bed', '');
      setForm(p => ({ ...p, propertyCategory: category, type: `${bed} ${category}`, bedrooms: bedNum }));
    }
  };

  const selectCategory = (cat: 'flat' | 'house' | 'hmo') => {
    if (cat === 'hmo') { selectPropertyType('hmo', ''); }
    else { setForm(p => ({ ...p, propertyCategory: cat, type: '', bedrooms: '' })); }
  };

  const resetAll = () => {
    setSubmitPhase('idle');
    setPricingResult(null);
    setSubmittedPropertyId(null);
    setPhotos([]);
    setDescription('');
    setNotes('');
    setForm(INITIAL_FORM);
    setOpenSections(new Set(['property-details', 'media']));
  };

  // Section completion checks
  const sectionComplete: Record<string, () => boolean> = {
    'property-details': () => !!form.city && !!form.postcode,
    'property-type': () => !!form.type || form.propertyCategory === 'hmo',
    'property-features': () => !!form.bedrooms && !!form.bathrooms,
    'financials': () => !!form.rent && !!form.profit && !!form.deposit,
    'sa-approval': () => !!form.saApproved,
    'contact': () => !!form.contactName && !!form.contactEmail && (!!form.contactPhone || !!form.contactWhatsapp),
    'media': () => true,
  };

  const summaries: Record<string, () => string> = {
    'property-details': () => [form.streetName, form.city, form.postcode].filter(Boolean).join(' · '),
    'property-type': () => form.type || 'HMO',
    'property-features': () => `${form.bedrooms} bed · ${form.bathrooms} bath${form.furnished ? ` · ${form.furnished}` : ''}`,
    'financials': () => `£${form.rent}/mo · £${form.profit} profit · £${form.deposit} deposit`,
    'sa-approval': () => `SA Approved: ${form.saApproved}`,
    'contact': () => form.contactName,
    'media': () => `${photos.length} photo${photos.length !== 1 ? 's' : ''}${description ? ' · description added' : ''}`,
  };

  // No auto-advance — sections only open/close on manual click

  const generateDesc = async () => {
    if (!form.city && !form.type && !form.bedrooms) {
      toast.error('Please fill in at least city, property type, or bedrooms first.');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch(`${N8N_BASE}/webhook/ai-generate-listing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: form.city || '', postcode: form.postcode || '', bedrooms: parseInt(form.bedrooms) || 0, bathrooms: parseInt(form.bathrooms) || 0,
          type: form.type || form.propertyCategory || '', rent: parseInt(form.rent) || 0, profit: parseInt(form.profit) || 0, deposit: parseInt(form.deposit) || 0,
          garage: form.garage === 'yes', sa_approved: form.saApproved || '', notes: notes || '', existing_description: description || '', street_name: form.streetName || '',
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (data?.description || data?.text) { setDescription(data.description || data.text); toast.success('Description generated with AI'); }
    } catch { toast.error('Failed to generate description'); }
    finally { setGenerating(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const resolvedType = form.type || (form.propertyCategory === 'hmo' ? 'HMO' : '');

    const missing: string[] = [];
    if (!form.city) missing.push('City');
    if (!form.postcode) missing.push('Postcode');
    if (!resolvedType) missing.push('Property type');
    if (!form.bedrooms) missing.push('Bedrooms');
    if (!form.bathrooms) missing.push('Bathrooms');
    if (!form.rent) missing.push('Monthly rent');
    if (!form.profit) missing.push('Est. monthly profit');
    if (!form.deposit) missing.push('Deposit');
    if (!form.saApproved) missing.push('SA Approval');
    if (!form.contactName) missing.push('Contact name');
    if (!form.contactEmail) missing.push('Contact email');
    if (!form.contactPhone && !form.contactWhatsapp) missing.push('Phone or WhatsApp');

    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.join(', ')}`);
      return;
    }

    setLoading(true);
    try {
      const { data: insertedRow, error } = await (supabase.from('properties') as any).insert({
        name: nextId, city: form.city, postcode: form.postcode,
        rent_monthly: parseInt(form.rent) || 0, profit_est: parseInt(form.profit) || 0,
        type: resolvedType, status: 'pending', submitted_by: user?.id || null,
        property_category: form.propertyCategory || null, bedrooms: parseInt(form.bedrooms) || null, bathrooms: parseInt(form.bathrooms) || null,
        garage: form.garage === 'yes', deposit: parseInt(form.deposit) || null, agent_fee: parseInt(form.agentFee) || null,
        sa_approved: form.saApproved.toLowerCase(), contact_name: form.contactName, contact_phone: form.contactPhone,
        contact_whatsapp: form.contactWhatsapp, contact_email: form.contactEmail, landlord_whatsapp: form.contactWhatsapp || null,
        description: description || null, photos: photos.length > 0 ? photos : [],
        notes: [notes, form.furnished ? `Furnishing: ${form.furnished}` : ''].filter(Boolean).join(' | ') || null,
      }).select('id').single();

      if (error) throw error;
      const propertyId = insertedRow?.id || null;
      setSubmittedPropertyId(propertyId);
      setSubmitPhase('analysing');
      setLoading(false);

      // Notify admin (non-blocking)
      const nc = new AbortController();
      const nt = setTimeout(() => nc.abort(), 10_000);
      fetch(`${N8N_BASE}/webhook/notify-admin-new-deal`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, city: form.city, postcode: form.postcode, type: resolvedType, submittedBy: user?.id, rent: parseInt(form.rent) || 0 }),
        signal: nc.signal }).catch(() => {}).finally(() => clearTimeout(nt));

      // Email admin via Resend (non-blocking)
      supabase.functions.invoke('send-email', {
        body: {
          type: 'new-deal-admin',
          data: { name: nextId, city: form.city, postcode: form.postcode, type: resolvedType, rent: parseInt(form.rent) || 0, contactName: form.contactName, contactEmail: form.contactEmail },
        },
      }).catch(() => {});

      // AI pricing
      const minDelay = new Promise(r => setTimeout(r, 2500));
      const pricingFetch = (async (): Promise<AIPricingResult | null> => {
        const c = new AbortController(); const t = setTimeout(() => c.abort(), 15_000);
        try {
          const res = await fetch(`${N8N_BASE}/webhook/airbnb-pricing`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ city: form.city, postcode: form.postcode, bedrooms: parseInt(form.bedrooms) || 0, bathrooms: parseInt(form.bathrooms) || 0, type: resolvedType, rent: parseInt(form.rent) || 0, propertyId }),
            signal: c.signal });
          clearTimeout(t); if (!res.ok) return null; const data = await res.json(); if (!data?.estimated_nightly_rate) return null; return data as AIPricingResult;
        } catch { clearTimeout(t); return null; }
      })();

      const [, result] = await Promise.all([minDelay, pricingFetch]);
      if (result) {
        setPricingResult(result); setSubmitPhase('reveal');
        if (propertyId) {
          (supabase.from('properties') as any).update({
            estimated_nightly_rate: result.estimated_nightly_rate, estimated_monthly_revenue: result.estimated_monthly_revenue, estimated_profit: result.estimated_profit,
            estimation_confidence: result.confidence, estimation_notes: result.notes,
            airbnb_search_url_7d: result.airbnb_url_7d || null, airbnb_search_url_30d: result.airbnb_url_30d || null, airbnb_search_url_90d: result.airbnb_url_90d || null, ai_model_used: 'gpt-4o-mini',
          }).eq('id', propertyId).then(() => {});
        }
      } else { setSubmitPhase('fallback'); }
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Submission failed'); setLoading(false); }
  };

  // ── Phase: Analysing ──
  if (submitPhase === 'analysing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-lg border border-border rounded-2xl p-8 bg-card text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <h2 className="text-[22px] font-bold text-foreground mt-5">We are preparing your listing</h2>
          <p className="text-sm text-muted-foreground mt-1.5">Our AI is analysing Airbnb data and comparable listings in {form.city || 'your area'}.</p>
          <div className="mt-6 rounded-xl bg-secondary p-4 text-left">
            {photos[0] && <img src={photos[0]} alt="" className="w-full h-32 object-cover rounded-lg mb-3" />}
            <div className="text-sm font-bold text-foreground">{nextId}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{form.city} · {form.postcode}</div>
            <div className="flex gap-3 mt-2 text-xs text-muted-foreground"><span>{form.type}</span>{form.bedrooms && <span>{form.bedrooms} bed</span>}</div>
            <div className="text-sm font-semibold text-foreground mt-2">£{parseInt(form.rent || '0').toLocaleString()} / month</div>
          </div>
          <div className="mt-6 w-full h-1.5 rounded-full overflow-hidden bg-border">
            <div className="h-full rounded-full bg-primary" style={{ animation: 'analysingProgress 2.5s ease-out forwards' }} />
          </div>
          <style>{`@keyframes analysingProgress { from { width: 0% } to { width: 92% } }`}</style>
        </div>
      </div>
    );
  }

  // ── Phase: Reveal ──
  if (submitPhase === 'reveal' && pricingResult) {
    const rent = parseInt(form.rent || '0');
    const cc = pricingResult.confidence === 'High' ? 'bg-emerald-100 text-emerald-800' : pricingResult.confidence === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600';
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-lg border border-border rounded-2xl p-8 bg-card text-center">
          <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center mx-auto"><CheckCircle className="w-6 h-6 text-primary" /></div>
          <h2 className="text-[22px] font-bold text-foreground mt-4">Congratulations! Your deal is under review.</h2>
          <p className="text-sm text-muted-foreground mt-1.5">Based on Airbnb comparable listings, we estimate this property could generate approximately:</p>
          <div className="mt-5 rounded-xl bg-accent-light p-6 text-left">
            <div className="flex justify-between items-center py-2 border-b border-border/30"><span className="text-sm text-muted-foreground">Estimated nightly rate</span><span className="text-sm font-semibold text-foreground">£{pricingResult.estimated_nightly_rate}/night</span></div>
            <div className="flex justify-between items-center py-2 border-b border-border/30"><span className="text-sm text-muted-foreground">Est. monthly revenue</span><span className="text-sm font-semibold text-foreground">£{pricingResult.estimated_monthly_revenue.toLocaleString()}</span></div>
            <div className="flex justify-between items-center py-2 border-b border-border/30"><span className="text-sm text-muted-foreground">Monthly rent</span><span className="text-sm font-semibold text-foreground">-£{rent.toLocaleString()}</span></div>
            <div className="flex justify-between items-center pt-3 mt-1"><span className="text-base font-bold text-foreground">Est. monthly profit</span><span className="text-2xl font-bold text-primary">£{pricingResult.estimated_profit.toLocaleString()}</span></div>
            <p className="text-[11px] text-muted-foreground mt-1 italic">Please consider costs such as utilities, cleaning, and platform fees.</p>
          </div>
          <div className="mt-4 flex items-center justify-center"><span className={`text-xs font-semibold px-3 py-1 rounded-full ${cc}`}>Confidence: {pricingResult.confidence}</span></div>
          {pricingResult.notes && <p className="text-xs text-muted-foreground mt-3 max-w-[400px] mx-auto">{pricingResult.notes}</p>}
          <p className="text-[11px] text-muted-foreground mt-3 italic">Estimation based on live Airbnb comparable listings. Actual results may vary.</p>
          <div className="border-t border-border mt-6 pt-5">
            <p className="text-sm text-muted-foreground mb-5">Your listing is now under review by our DME (Deal Management Engine).</p>
            <div className="flex justify-center">
              <button onClick={resetAll} className="h-11 px-8 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition-opacity">Submit another deal <ArrowRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase: Fallback ──
  if (submitPhase === 'fallback') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center"><CheckCircle className="w-6 h-6 text-primary" /></div>
        <h2 className="text-[22px] font-bold text-foreground mt-4">Deal submitted successfully!</h2>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-[400px]">Your listing has been submitted. Our AI is still analysing market data — estimated profitability will appear on your deal shortly.</p>
        <div className="flex justify-center mt-6">
          <button onClick={resetAll} className="h-11 px-8 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition-opacity">Submit another deal <ArrowRight className="w-4 h-4" /></button>
        </div>
      </div>
    );
  }

  const bedOptions = form.propertyCategory === 'flat' ? FLAT_BEDS : form.propertyCategory === 'house' ? HOUSE_BEDS : [];

  // ── Phase: Idle (form) ──
  return (
    <div data-feature="DEALS__LIST_A_DEAL">
      <h1 className="text-[28px] font-bold text-foreground">Submit a Deal</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-8">List a landlord-approved rent-to-rent opportunity.</p>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_440px] gap-6 items-start max-w-6xl">
        <div>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ── Property Details ── */}
            <AccordionSection id="property-details" title="Property Details" description="Basic information about the property location."
              isOpen={openSections.has('property-details')} isComplete={sectionComplete['property-details']()} onToggle={() => toggleSection('property-details')}
              summary={summaries['property-details']()}>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Property ID</label>
                  <input type="text" value={nextId} disabled className="input-nfstay w-full opacity-60 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-semibold text-foreground block mb-1.5">Street name</label><input type="text" placeholder="e.g. Oxford Road" value={form.streetName} onChange={e => set('streetName', e.target.value)} className="input-nfstay w-full rounded-xl" /></div>
                  <div><label className="text-xs font-semibold text-foreground block mb-1.5">House number</label><input type="text" placeholder="e.g. 42" value={form.houseNumber} onChange={e => set('houseNumber', e.target.value)} className="input-nfstay w-full rounded-xl" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-semibold text-foreground block mb-1.5">City *</label><input type="text" placeholder="e.g. Manchester" value={form.city} onChange={e => set('city', e.target.value)} className="input-nfstay w-full rounded-xl" required /></div>
                  <div><label className="text-xs font-semibold text-foreground block mb-1.5">Postcode area *</label><input type="text" placeholder="e.g. M14" value={form.postcode} onChange={e => set('postcode', e.target.value)} className="input-nfstay w-full rounded-xl" required /></div>
                </div>
              </div>
            </AccordionSection>

            {/* ── Property Type ── */}
            <AccordionSection id="property-type" title="Property Type" description="Select the type that best describes this property."
              isOpen={openSections.has('property-type')} isComplete={sectionComplete['property-type']()} onToggle={() => toggleSection('property-type')}
              summary={summaries['property-type']()}>
              <div className="grid grid-cols-3 gap-3">
                {CATEGORIES.map(cat => (
                  <button key={cat.key} type="button" onClick={() => selectCategory(cat.key)}
                    className={`rounded-2xl border-2 p-5 cursor-pointer text-center transition-all ${form.propertyCategory === cat.key ? 'border-primary bg-accent-light' : 'border-border hover:border-muted-foreground'}`}>
                    <div className="text-2xl mb-2">{cat.icon}</div>
                    <div className="text-sm font-bold text-foreground">{cat.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{cat.desc}</div>
                  </button>
                ))}
              </div>
              {(form.propertyCategory === 'flat' || form.propertyCategory === 'house') && (
                <div className="mt-5">
                  <label className="text-xs font-semibold text-foreground block mb-1.5">How many bedrooms?</label>
                  <select value={form.bedrooms ? `${form.bedrooms}-bed` : ''} onChange={e => { if (e.target.value) selectPropertyType(form.propertyCategory as 'flat' | 'house', e.target.value); }}
                    className="w-full h-12 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" required>
                    <option value="">Select bedrooms</option>
                    {bedOptions.map(bed => <option key={bed} value={bed}>{bed}</option>)}
                  </select>
                </div>
              )}
            </AccordionSection>

            {/* ── Property Features ── */}
            <AccordionSection id="property-features" title="Property Features" description="Room counts and amenities."
              isOpen={openSections.has('property-features')} isComplete={sectionComplete['property-features']()} onToggle={() => toggleSection('property-features')}
              summary={summaries['property-features']()}>
              <div className="flex flex-wrap gap-8">
                <Counter label="Bedrooms *" value={form.bedrooms} onChange={v => set('bedrooms', v)} />
                <Counter label="Bathrooms *" value={form.bathrooms} onChange={v => set('bathrooms', v)} />
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-2">Garage?</label>
                  <div className="flex gap-3 mt-1">
                    {['yes', 'no'].map(o => (
                      <label key={o} className="flex items-center gap-1.5 text-sm text-foreground cursor-pointer capitalize">
                        <input type="radio" name="garage" value={o} checked={form.garage === o} onChange={e => set('garage', e.target.value)} className="accent-primary" /> {o}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <label className="text-xs font-semibold text-foreground block mb-3">Furnishing</label>
                <div className="grid grid-cols-3 gap-3">
                  {FURNISHED_OPTIONS.map(opt => (
                    <button key={opt.key} type="button" onClick={() => set('furnished', opt.key)}
                      className={`rounded-2xl border-2 p-4 cursor-pointer text-center transition-all ${form.furnished === opt.key ? 'border-primary bg-accent-light' : 'border-border hover:border-muted-foreground'}`}>
                      <div className="text-xl mb-1">{opt.icon}</div>
                      <div className="text-xs font-semibold text-foreground">{opt.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </AccordionSection>

            {/* ── Financials ── */}
            <AccordionSection id="financials" title="Financials" description="Rental costs and expected returns."
              isOpen={openSections.has('financials')} isComplete={sectionComplete['financials']()} onToggle={() => toggleSection('financials')}
              summary={summaries['financials']()}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-semibold text-foreground block mb-1.5">Monthly rent (£) *</label><input type="number" placeholder="1200" value={form.rent} onChange={e => set('rent', e.target.value)} className="input-nfstay w-full rounded-xl" required /></div>
                  <div><label className="text-xs font-semibold text-foreground block mb-1.5">Est. monthly profit (£) *</label><p className="text-[10px] text-muted-foreground mb-1">We will cross-check with Airbnb similar listings for accuracy.</p><input type="number" placeholder="600" value={form.profit} onChange={e => set('profit', e.target.value)} className="input-nfstay w-full rounded-xl" required /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-semibold text-foreground block mb-1.5">Deposit (£) *</label><input type="number" placeholder="2400" value={form.deposit} onChange={e => set('deposit', e.target.value)} className="input-nfstay w-full rounded-xl" required /></div>
                  <div><label className="text-xs font-semibold text-foreground block mb-1.5">Fee (£)</label><input type="number" placeholder="0" value={form.agentFee} onChange={e => set('agentFee', e.target.value)} className="input-nfstay w-full rounded-xl" /></div>
                </div>
              </div>
            </AccordionSection>

            {/* ── SA Approval ── */}
            <AccordionSection id="sa-approval" title="SA Approval" description="Is the agent or landlord approved for Serviced Accommodation?"
              isOpen={openSections.has('sa-approval')} isComplete={sectionComplete['sa-approval']()} onToggle={() => toggleSection('sa-approval')}
              summary={summaries['sa-approval']()}>
              <div className="flex gap-4">
                {['Yes', 'No', 'Awaiting'].map(o => (
                  <label key={o} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input type="radio" name="saApproved" value={o} checked={form.saApproved === o} onChange={e => set('saApproved', e.target.value)} className="accent-primary" required /> {o}
                  </label>
                ))}
              </div>
            </AccordionSection>

            {/* ── Contact ── */}
            <AccordionSection id="contact" title="Contact Details" description="Landlord or agent contact information."
              isOpen={openSections.has('contact')} isComplete={sectionComplete['contact']()} onToggle={() => toggleSection('contact')}
              summary={summaries['contact']()}>
              <div className="space-y-4">
                <div><label className="text-xs font-semibold text-foreground block mb-1.5">Contact name *</label><input type="text" placeholder="Landlord/Agent" value={form.contactName} onChange={e => set('contactName', e.target.value)} className="input-nfstay w-full rounded-xl" required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">Contact phone</label>
                    <input type="tel" placeholder="07911 123 456" value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} className="input-nfstay w-full rounded-xl" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">At least one of phone or WhatsApp required</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">Contact WhatsApp</label>
                    {profileWhatsapp ? (
                      <div className="h-10 rounded-xl border border-border bg-secondary px-3 flex items-center gap-2 cursor-not-allowed">
                        <span className="text-sm text-foreground">{profileWhatsapp}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground">From your profile</span>
                      </div>
                    ) : (
                      <>
                        <input type="tel" placeholder="+44 7911 123 456" value={form.contactWhatsapp} onChange={e => set('contactWhatsapp', e.target.value)} className="input-nfstay w-full rounded-xl" />
                        <p className="text-[10px] text-muted-foreground mt-0.5">Add WhatsApp to your profile to auto-fill this field.</p>
                      </>
                    )}
                  </div>
                </div>
                <div><label className="text-xs font-semibold text-foreground block mb-1.5">Contact email *</label><input type="email" placeholder="landlord@example.com" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} className="input-nfstay w-full rounded-xl" required /></div>
              </div>
            </AccordionSection>

            {/* ── Media ── */}
            <AccordionSection id="media" title="Media & Description" description="Photos and listing text to attract partners."
              isOpen={openSections.has('media')} isComplete={sectionComplete['media']()} onToggle={() => toggleSection('media')}
              summary={summaries['media']()}>
              <div className="space-y-5">
                <PhotoUpload photos={photos} onChange={setPhotos} />
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Description</label>
                  <p className="text-[10px] text-muted-foreground mb-1.5">Public listing description visible to members.</p>
                  <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Property description for the listing..." className="input-nfstay w-full h-auto py-3 resize-none rounded-xl" />
                  <button type="button" onClick={generateDesc} disabled={generating} className="text-[13px] font-semibold text-primary mt-1 hover:opacity-75 transition-opacity inline-flex items-center gap-1 disabled:opacity-50">
                    {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {generating ? 'Generating...' : 'Generate description with AI'}
                  </button>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Notes</label>
                  <p className="text-[10px] text-muted-foreground mb-1.5">Internal notes — only visible to admin, not on the listing.</p>
                  <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any internal notes for the admin team..." className="input-nfstay w-full h-auto py-3 resize-none rounded-xl" />
                </div>
              </div>
            </AccordionSection>

            <button data-feature="DEALS__LIST_SUBMIT" type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-nfstay-black text-nfstay-black-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? 'Submitting...' : 'Submit Deal'}
            </button>
            <p className="text-xs text-muted-foreground text-center mt-2">Our team reviews all submissions within 24–48 hours.</p>
          </form>
        </div>

        {/* Right column — My Listings (desktop) */}
        <div data-feature="DEALS__MY_LISTINGS" className="hidden lg:block">
          <MyListingsPanel userId={user?.id} />
        </div>
      </div>

      {/* Mobile: My Listings below form */}
      <div data-feature="DEALS__MY_LISTINGS" className="lg:hidden mt-8">
        <MyListingsPanel userId={user?.id} />
      </div>
    </div>
  );
}
