import { useState, useEffect } from 'react';
import { CheckCircle, Sparkles, Loader2, ArrowRight, Minus, Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import PhotoUpload from '@/components/PhotoUpload';
import MyListingsPanel from '@/components/MyListingsPanel';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { normalizeUKPhone } from '@/lib/phoneValidation';

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
  listerType: 'landlord' | 'agent' | 'deal_sourcer' | '';
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
  listerType: '',
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
  useEffect(() => { document.title = 'nfstay - List a Deal'; }, []);
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
  const [listingType, setListingType] = useState<'rental' | 'sale'>('rental');
  const [aiQuickMode, setAiQuickMode] = useState(false);
  const [aiRawText, setAiRawText] = useState('');
  const [aiParsing, setAiParsing] = useState(false);
  const [saConfirmed, setSaConfirmed] = useState(false);

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
      .select('whatsapp, name, email')
      .eq('id', user.id)
      .single()
      .then(({ data }: { data: { whatsapp: string; name: string; email: string } | null }) => {
        if (data?.whatsapp) {
          setProfileWhatsapp(data.whatsapp);
          setForm(p => ({ ...p, contactWhatsapp: data.whatsapp }));
        }
        if (data) {
          setForm(p => ({
            ...p,
            contactName: p.contactName || data.name || '',
            contactEmail: p.contactEmail || data.email || user?.email || '',
          }));
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
    setListingType('rental');
    setAiQuickMode(false);
    setAiRawText('');
    setSaConfirmed(false);
  };

  // Section completion checks
  const sectionComplete: Record<string, () => boolean> = {
    'property-details': () => !!form.city && !!form.postcode,
    'property-type': () => !!form.type || form.propertyCategory === 'hmo',
    'property-features': () => !!form.bedrooms,
    'financials': () => !!form.rent,
    'contact': () => !!form.contactWhatsapp,
    'media': () => true,
  };

  const summaries: Record<string, () => string> = {
    'property-details': () => [form.streetName, form.city, form.postcode].filter(Boolean).join(' · '),
    'property-type': () => form.type || 'HMO',
    'property-features': () => `${form.bedrooms} bed${form.bathrooms ? ` · ${form.bathrooms} bath` : ''}${form.furnished ? ` · ${form.furnished}` : ''}`,
    'financials': () => [form.rent ? `£${form.rent}/mo` : '', form.profit ? `£${form.profit} profit` : '', form.deposit ? `£${form.deposit} deposit` : ''].filter(Boolean).join(' · '),
    'contact': () => form.contactName || form.contactWhatsapp || '',
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

  const handleAiParse = async () => {
    if (!aiRawText.trim()) {
      toast.error('Paste some listing text first');
      return;
    }
    setAiParsing(true);
    try {
      // AI parsing via edge function (same as admin Quick List)
      const { data, error } = await supabase.functions.invoke('ai-parse-listing', {
        body: { rawText: aiRawText },
      });
      if (error) throw new Error(error.message || 'AI parsing failed');
      if (data?.error) throw new Error(data.error);

      const l = (data?.listings || [])[0] as Record<string, unknown> | undefined;
      if (!l) throw new Error('Could not parse listing from text');

      const bedrooms = l.bedrooms ? String(l.bedrooms) : '';
      const propertyCategory = (l.property_category as DealForm['propertyCategory']) || '';
      const type = bedrooms && (l.type || propertyCategory)
        ? `${bedrooms}-bed ${l.type || propertyCategory}`
        : (l.type as string) || '';

      setForm(prev => ({
        ...prev,
        city: (l.city as string) || prev.city,
        postcode: (l.postcode as string) || prev.postcode,
        bedrooms: bedrooms || prev.bedrooms,
        bathrooms: l.bathrooms ? String(l.bathrooms) : prev.bathrooms,
        rent: l.rent_monthly ? String(l.rent_monthly) : prev.rent,
        profit: l.profit_est ? String(l.profit_est) : prev.profit,
        propertyCategory: propertyCategory || prev.propertyCategory,
        type: type || prev.type,
        furnished: (l.furnished === true ? 'furnished' : l.furnished === false ? 'unfurnished' : prev.furnished) as DealForm['furnished'],
        garage: l.garage ? 'yes' : prev.garage,
        deposit: l.deposit ? String(l.deposit) : prev.deposit,
      }));

      // AI detects rental vs sale automatically
      if (l.listing_type === 'sale' || l.listing_type === 'rental') {
        setListingType(l.listing_type as 'rental' | 'sale');
      }

      if (l.description && typeof l.description === 'string') {
        setDescription(l.description);
      }

      // Switch back to manual form
      setAiQuickMode(false);
      toast.success('Listing parsed - review the pre-filled fields below');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to parse listing');
    } finally {
      setAiParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const resolvedType = form.type || (form.propertyCategory === 'hmo' ? 'HMO' : '');

    const missing: string[] = [];
    if (!form.postcode) missing.push('Postcode');
    if (!form.city) missing.push('City');
    if (!resolvedType) missing.push('Property type');
    if (!form.bedrooms) missing.push('Bedrooms');

    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.join(', ')}`);
      return;
    }

    // Validate and normalize WhatsApp number
    if (form.contactWhatsapp) {
      const normalized = normalizeUKPhone(form.contactWhatsapp);
      if (!normalized) {
        toast.error('WhatsApp must be a valid UK mobile (e.g. 07839 925555 or +447839925555)');
        return;
      }
      form.contactWhatsapp = normalized;
    }

    setLoading(true);
    try {
      // Auto-generate slug from name + city
      const slugBase = (nextId || resolvedType + '-' + form.city)
        .toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

      const { data: insertedRow, error } = await (supabase.from('properties') as any).insert({
        name: nextId, city: form.city, postcode: form.postcode,
        rent_monthly: parseInt(form.rent) || 0, profit_est: parseInt(form.profit) || 0,
        type: resolvedType, status: 'pending', submitted_by: user?.id || null, listing_type: listingType,
        property_category: form.propertyCategory || null, bedrooms: parseInt(form.bedrooms) || null, bathrooms: parseInt(form.bathrooms) || null,
        garage: form.garage === 'yes', deposit: parseInt(form.deposit) || null, agent_fee: parseInt(form.agentFee) || null,
        sa_approved: 'yes', contact_name: form.contactName, contact_phone: form.contactPhone,
        contact_whatsapp: form.contactWhatsapp, contact_email: form.contactEmail, landlord_whatsapp: form.contactWhatsapp || null,
        lister_type: form.listerType || null, source: 'self_submitted',
        description: description || null, photos: photos.length > 0 ? photos : [],
        notes: [notes, form.furnished ? `Furnishing: ${form.furnished}` : ''].filter(Boolean).join(' | ') || null,
      }).select('id').single();

      if (error) throw error;
      const propertyId = insertedRow?.id || null;

      // Set slug with UUID prefix for uniqueness (non-blocking)
      if (propertyId) {
        const slug = slugBase + '-' + (propertyId as string).slice(0, 8);
        (supabase.from('properties') as any).update({ slug }).eq('id', propertyId).then(() => {});
      }
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
        const c = new AbortController(); const t = setTimeout(() => c.abort(), 25_000);
        try {
          const res = await fetch(`${N8N_BASE}/webhook/airbnb-pricing`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ city: form.city, postcode: form.postcode, bedrooms: parseInt(form.bedrooms) || 0, bathrooms: parseInt(form.bathrooms) || 0, type: resolvedType, rent: parseInt(form.rent) || 0, propertyId }),
            signal: c.signal });
          clearTimeout(t);
          if (!res.ok) { console.error('[airbnb-pricing] HTTP', res.status, await res.text().catch(() => '')); return null; }
          const data = await res.json();
          if (!data?.estimated_nightly_rate) { console.error('[airbnb-pricing] Missing estimated_nightly_rate in response:', data); return null; }
          return data as AIPricingResult;
        } catch (err) { console.error('[airbnb-pricing] Webhook failed:', err); clearTimeout(t); return null; }
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
          <h2 className="text-[22px] font-bold text-foreground mt-5">Analysing similar listings on Airbnb</h2>
          <p className="text-sm text-muted-foreground mt-1.5">We're comparing your property with similar Airbnb listings in {form.city || 'your area'} to estimate potential revenue.</p>
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
          <h2 className="text-[22px] font-bold text-foreground mt-4">Congratulations!</h2>
          <p className="text-sm text-muted-foreground mt-1.5">This property could make <span className="font-semibold text-foreground">£{pricingResult.estimated_monthly_revenue.toLocaleString()}</span> per month on Airbnb for Airbnb operators.</p>
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
            <p className="text-sm text-muted-foreground mb-5">Your listing is now under review. Our team will contact you within 24–48 hours.</p>
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
        <p className="text-sm text-muted-foreground mt-1.5 max-w-[400px]">Your listing has been submitted. Airbnb revenue estimation is temporarily unavailable — our team will add it manually.</p>
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

            {/* ── AI Quick Listing Toggle ── */}
            <div className="flex items-center justify-center gap-3 py-3 px-4 bg-card border border-border rounded-2xl">
              <label htmlFor="ai-quick-toggle" className="text-sm font-semibold text-foreground cursor-pointer select-none">AI Quick Listing</label>
              <Switch
                id="ai-quick-toggle"
                data-feature="DEALS__LIST_AI_TOGGLE"
                checked={aiQuickMode}
                onCheckedChange={setAiQuickMode}
              />
            </div>

            {/* ── Listing Type Radio (hidden in AI mode - AI detects automatically) ── */}
            {!aiQuickMode && (
              <div className="flex items-center gap-4 mb-2" data-feature="DEALS__LIST_TYPE_SELECT">
                <span className="text-sm font-medium text-foreground">Listing type:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="listingType" value="rental" checked={listingType === 'rental'} onChange={() => setListingType('rental')} className="accent-[#1E9A80]" />
                  <span className="text-sm">To Rent</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="listingType" value="sale" checked={listingType === 'sale'} onChange={() => setListingType('sale')} className="accent-[#1E9A80]" />
                  <span className="text-sm">For Sale</span>
                </label>
              </div>
            )}

            {/* ── AI Quick Listing Input ── */}
            {aiQuickMode && (
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <Textarea
                  data-feature="DEALS__LIST_AI_INPUT"
                  rows={8}
                  value={aiRawText}
                  onChange={e => setAiRawText(e.target.value)}
                  placeholder={"Paste your property description or WhatsApp text here...\n\nExample:\n\uD83D\uDD25 R2R Opportunity - 2 Bed Flat | Manchester (M14)\nRent: \u00A31,200 pcm\nProfit: \u00A3600/month\nSA Approved\nFurnished, parking available"}
                  className="w-full resize-none rounded-xl text-sm"
                />
                <div className="flex justify-center">
                  <button
                    type="button"
                    data-feature="DEALS__LIST_AI_PARSE"
                    onClick={handleAiParse}
                    disabled={aiParsing || !aiRawText.trim()}
                    className="h-11 px-8 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {aiParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {aiParsing ? 'Parsing...' : 'Parse with AI'}
                  </button>
                </div>
              </div>
            )}

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
                  <div><label className="text-xs font-semibold text-foreground block mb-1.5">{listingType === 'sale' ? 'Property price (£) *' : 'Monthly rent (£) *'}</label><input type="number" placeholder={listingType === 'sale' ? '250000' : '1200'} value={form.rent} onChange={e => set('rent', e.target.value)} className="input-nfstay w-full rounded-xl" required /></div>
                  <div><label className="text-xs font-semibold text-foreground block mb-1.5">Est. monthly profit (£)</label><p className="text-[10px] text-muted-foreground mb-1">We will cross-check with Airbnb similar listings for accuracy.</p><input type="number" placeholder="600" value={form.profit} onChange={e => set('profit', e.target.value)} className="input-nfstay w-full rounded-xl" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-semibold text-foreground block mb-1.5">Deposit (£)</label><input type="number" placeholder="2400" value={form.deposit} onChange={e => set('deposit', e.target.value)} className="input-nfstay w-full rounded-xl" /></div>
                  <div><label className="text-xs font-semibold text-foreground block mb-1.5">Fee (£)</label><input type="number" placeholder="0" value={form.agentFee} onChange={e => set('agentFee', e.target.value)} className="input-nfstay w-full rounded-xl" /></div>
                </div>
              </div>
            </AccordionSection>

            {/* ── Contact ── */}
            <AccordionSection id="contact" title="Contact Details" description="Landlord or agent contact information."
              isOpen={openSections.has('contact')} isComplete={sectionComplete['contact']()} onToggle={() => toggleSection('contact')}
              summary={summaries['contact']()}>
              <div className="space-y-4">
                <div><label className="text-xs font-semibold text-foreground block mb-1.5">Contact name</label><input type="text" placeholder="From your profile" value={form.contactName} onChange={e => set('contactName', e.target.value)} className="input-nfstay w-full rounded-xl" /></div>
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
                <div><label className="text-xs font-semibold text-foreground block mb-1.5">Contact email</label><input type="email" placeholder="From your profile" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} className="input-nfstay w-full rounded-xl" /></div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">I am a</label>
                  <div className="flex gap-4">
                    {([['landlord', 'Landlord'], ['agent', 'Agent'], ['deal_sourcer', 'Deal Sourcer']] as const).map(([val, label]) => (
                      <label key={val} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="lister_type" value={val} checked={form.listerType === val}
                          onChange={() => set('listerType', val)}
                          className="w-4 h-4 accent-[#1E9A80]" />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
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

            <div className="flex items-start gap-3 mt-4 mb-4">
              <Checkbox
                id="sa-confirm"
                checked={saConfirmed}
                onCheckedChange={(checked) => setSaConfirmed(!!checked)}
                data-feature="DEALS__LIST_SA_CONFIRM"
              />
              <label htmlFor="sa-confirm" className="text-sm text-muted-foreground leading-snug cursor-pointer">
                I confirm this property is approved for serviced accommodation
              </label>
            </div>

            <button data-feature="DEALS__LIST_SUBMIT" type="submit" disabled={!saConfirmed || loading} className="w-full h-12 rounded-xl bg-nfstay-black text-nfstay-black-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
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
