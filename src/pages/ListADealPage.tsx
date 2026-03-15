import { useState } from 'react';
import { CheckCircle, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import PhotoUpload from '@/components/PhotoUpload';
import MyListingsPanel from '@/components/MyListingsPanel';

const N8N_BASE = (import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.srv886554.hstgr.cloud').replace(/\/$/, '');

const FLAT_BEDS = ['1-bed', '2-bed', '3-bed', '4-bed', '5-bed', '6-bed'];
const HOUSE_BEDS = ['2-bed', '3-bed', '4-bed', '5-bed', '6-bed', '7-bed', '8-bed', '9-bed', '10-bed'];

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
  propertyCategory: '', type: '', bedrooms: '', bathrooms: '', garage: '',
  rent: '', profit: '', deposit: '', agentFee: '',
  saApproved: '',
  contactName: '', contactPhone: '', contactWhatsapp: '', contactEmail: '',
};

export default function ListADealPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const set = (key: keyof DealForm, value: string) => setForm(p => ({ ...p, [key]: value }));

  const selectPropertyType = (category: 'flat' | 'house' | 'hmo', bed: string) => {
    if (category === 'hmo') {
      setForm(p => ({ ...p, propertyCategory: 'hmo', type: 'HMO', bedrooms: '' }));
    } else {
      const bedNum = bed.replace('-bed', '');
      setForm(p => ({
        ...p,
        propertyCategory: category,
        type: `${bed} ${category}`,
        bedrooms: bedNum,
      }));
    }
  };

  const resetAll = () => {
    setSubmitPhase('idle');
    setPricingResult(null);
    setSubmittedPropertyId(null);
    setPhotos([]);
    setDescription('');
    setNotes('');
    setForm(INITIAL_FORM);
  };

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
          city: form.city || '',
          postcode: form.postcode || '',
          bedrooms: parseInt(form.bedrooms) || 0,
          bathrooms: parseInt(form.bathrooms) || 0,
          type: form.type || form.propertyCategory || '',
          rent: parseInt(form.rent) || 0,
          profit: parseInt(form.profit) || 0,
          deposit: parseInt(form.deposit) || 0,
          garage: form.garage === 'yes',
          sa_approved: form.saApproved || '',
          notes: notes || '',
          existing_description: description || '',
          street_name: form.streetName || '',
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (data?.description || data?.text) {
        setDescription(data.description || data.text);
        toast.success('Description generated with AI');
      }
    } catch {
      toast.error('Failed to generate description');
    } finally {
      setGenerating(false);
    }
  };

  /**
   * handleSubmit flow:
   * 1. Insert property to Supabase, capture returned ID
   * 2. Set phase to 'analysing' immediately
   * 3. Fire AI pricing webhook in background (15s timeout)
   * 4. Wait minimum 2.5s AND pricing result
   * 5. On success: save AI data to Supabase, set phase to 'reveal'
   * 6. On failure/timeout: set phase to 'fallback'
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.city || !form.rent || !form.type || !form.contactName || !form.contactEmail || !form.saApproved) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!form.contactPhone && !form.contactWhatsapp) {
      toast.error('Please provide at least a phone number or WhatsApp');
      return;
    }

    setLoading(true);
    try {
      // Insert and capture the new property ID
      const { data: insertedRow, error } = await (supabase.from('properties') as any).insert({
        name: nextId,
        city: form.city,
        postcode: form.postcode,
        rent_monthly: parseInt(form.rent) || 0,
        profit_est: parseInt(form.profit) || 0,
        type: form.type,
        status: 'pending',
        submitted_by: user?.id || null,
        property_category: form.propertyCategory || null,
        bedrooms: parseInt(form.bedrooms) || null,
        bathrooms: parseInt(form.bathrooms) || null,
        garage: form.garage === 'yes',
        deposit: parseInt(form.deposit) || null,
        agent_fee: parseInt(form.agentFee) || null,
        sa_approved: form.saApproved.toLowerCase(),
        contact_name: form.contactName,
        contact_phone: form.contactPhone,
        contact_whatsapp: form.contactWhatsapp,
        contact_email: form.contactEmail,
        landlord_whatsapp: form.contactWhatsapp || null,
        description: description || null,
        photos: photos.length > 0 ? photos : [],
        notes: notes || null,
      }).select('id').single();

      if (error) throw error;

      const propertyId = insertedRow?.id || null;
      setSubmittedPropertyId(propertyId);
      setSubmitPhase('analysing');
      setLoading(false);

      // Notify admin of new deal (non-blocking, 10s timeout)
      const notifController = new AbortController();
      const notifTimeout = setTimeout(() => notifController.abort(), 10_000);
      fetch(`${N8N_BASE}/webhook/notify-admin-new-deal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          city: form.city,
          postcode: form.postcode,
          type: form.type,
          submittedBy: user?.id,
          rent: parseInt(form.rent) || 0,
        }),
        signal: notifController.signal,
      }).catch(() => {}).finally(() => clearTimeout(notifTimeout));

      // Fire AI pricing in background with minimum delay
      const minDelay = new Promise(r => setTimeout(r, 2500));

      const pricingFetch = (async (): Promise<AIPricingResult | null> => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15_000);
        try {
          const res = await fetch(`${N8N_BASE}/webhook/airbnb-pricing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              city: form.city,
              postcode: form.postcode,
              bedrooms: parseInt(form.bedrooms) || 0,
              bathrooms: parseInt(form.bathrooms) || 0,
              type: form.type || form.propertyCategory,
              rent: parseInt(form.rent) || 0,
              propertyId,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (!res.ok) return null;
          const data = await res.json();
          if (!data?.estimated_nightly_rate) return null;
          return data as AIPricingResult;
        } catch {
          clearTimeout(timeout);
          return null;
        }
      })();

      const [, result] = await Promise.all([minDelay, pricingFetch]);

      if (result) {
        setPricingResult(result);
        setSubmitPhase('reveal');

        // Save AI data back to Supabase (fire-and-forget)
        if (propertyId) {
          // AI estimation columns not in generated Supabase types — cast needed
          (supabase.from('properties') as any).update({
            estimated_nightly_rate: result.estimated_nightly_rate,
            estimated_monthly_revenue: result.estimated_monthly_revenue,
            estimated_profit: result.estimated_profit,
            estimation_confidence: result.confidence,
            estimation_notes: result.notes,
            airbnb_search_url_7d: result.airbnb_url_7d || null,
            airbnb_search_url_30d: result.airbnb_url_30d || null,
            airbnb_search_url_90d: result.airbnb_url_90d || null,
            ai_model_used: 'gpt-4o-mini',
          }).eq('id', propertyId).then(() => {});
        }
      } else {
        setSubmitPhase('fallback');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Submission failed';
      toast.error(msg);
      setLoading(false);
    }
  };

  // ── Phase: Analysing ──
  if (submitPhase === 'analysing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-lg border border-border rounded-2xl p-8 bg-card text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <h2 className="text-[22px] font-bold text-foreground mt-5">We are preparing your listing</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Our AI is analysing Airbnb data and comparable listings in {form.city || 'your area'}.
          </p>

          {/* Property preview */}
          <div className="mt-6 rounded-xl bg-secondary p-4 text-left">
            {photos[0] && <img src={photos[0]} alt="" className="w-full h-32 object-cover rounded-lg mb-3" />}
            <div className="text-sm font-bold text-foreground">{nextId}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{form.city} · {form.postcode}</div>
            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
              <span>{form.type}</span>
              {form.bedrooms && <span>{form.bedrooms} bed</span>}
            </div>
            <div className="text-sm font-semibold text-foreground mt-2">£{parseInt(form.rent || '0').toLocaleString()} / month</div>
          </div>

          {/* Animated progress bar */}
          <div className="mt-6 w-full h-1.5 rounded-full overflow-hidden bg-border">
            <div
              className="h-full rounded-full bg-primary"
              style={{
                animation: 'analysingProgress 2.5s ease-out forwards',
              }}
            />
          </div>
          <style>{`@keyframes analysingProgress { from { width: 0% } to { width: 92% } }`}</style>
        </div>
      </div>
    );
  }

  // ── Phase: Reveal ──
  if (submitPhase === 'reveal' && pricingResult) {
    const rent = parseInt(form.rent || '0');
    const confidenceColor = pricingResult.confidence === 'High'
      ? 'bg-emerald-100 text-emerald-800'
      : pricingResult.confidence === 'Medium'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-gray-100 text-gray-600';

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-lg border border-border rounded-2xl p-8 bg-card text-center">
          <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-[22px] font-bold text-foreground mt-4">Congratulations! Your deal is under review.</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Based on Airbnb comparable listings, we estimate this property could generate approximately:
          </p>

          {/* Profit reveal card */}
          <div className="mt-5 rounded-xl bg-accent-light p-6 text-left">
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Estimated nightly rate</span>
              <span className="text-sm font-semibold text-foreground">£{pricingResult.estimated_nightly_rate}/night</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Est. monthly revenue</span>
              <span className="text-sm font-semibold text-foreground">£{pricingResult.estimated_monthly_revenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Monthly rent</span>
              <span className="text-sm font-semibold text-foreground">-£{rent.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-3 mt-1">
              <span className="text-base font-bold text-foreground">Est. monthly profit</span>
              <span className="text-2xl font-bold text-primary">£{pricingResult.estimated_profit.toLocaleString()}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 italic">
              Please consider costs such as utilities, cleaning, and platform fees.
            </p>
          </div>

          {/* Confidence badge */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${confidenceColor}`}>
              Confidence: {pricingResult.confidence}
            </span>
          </div>

          {/* Notes */}
          {pricingResult.notes && (
            <p className="text-xs text-muted-foreground mt-3 max-w-[400px] mx-auto">{pricingResult.notes}</p>
          )}

          <p className="text-[11px] text-muted-foreground mt-3 italic">
            Estimation based on live Airbnb comparable listings. Actual results may vary depending on pricing strategy and occupancy.
          </p>

          <div className="border-t border-border mt-6 pt-5">
            <p className="text-sm text-muted-foreground mb-5">
              Your listing is now under review by our DME (Deal Management Engine).
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate('/dashboard/deals')}
                className="h-11 px-6 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
              >
                View my deals <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={resetAll}
                className="h-11 px-6 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                Submit another deal
              </button>
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
        <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-[22px] font-bold text-foreground mt-4">Deal submitted successfully!</h2>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-[400px]">
          Your listing has been submitted. Our AI is still analysing market data — estimated profitability will appear on your deal shortly.
        </p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => navigate('/dashboard/deals')}
            className="h-11 px-6 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            View my deals <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={resetAll}
            className="h-11 px-6 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            Submit another deal
          </button>
        </div>
      </div>
    );
  }

  // ── Phase: Idle (form) ──
  return (
    <div>
      <h1 className="text-[28px] font-bold text-foreground">Submit a Deal</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-8">List a landlord-approved rent-to-rent opportunity.</p>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_440px] gap-6 items-start max-w-6xl">
      <div>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── PROPERTY INFO ── */}
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1.5">Property ID</label>
          <input type="text" value={nextId} disabled className="input-nfstay w-full opacity-60" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Street name</label>
            <input type="text" placeholder="e.g. Oxford Road" value={form.streetName} onChange={e => set('streetName', e.target.value)} className="input-nfstay w-full" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">House number</label>
            <input type="text" placeholder="e.g. 42" value={form.houseNumber} onChange={e => set('houseNumber', e.target.value)} className="input-nfstay w-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">City *</label>
            <input type="text" placeholder="e.g. Manchester" value={form.city} onChange={e => set('city', e.target.value)} className="input-nfstay w-full" required />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Postcode area *</label>
            <input type="text" placeholder="e.g. M14" value={form.postcode} onChange={e => set('postcode', e.target.value)} className="input-nfstay w-full" required />
          </div>
        </div>

        {/* ── PROPERTY TYPE (Radio Groups) ── */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-foreground block">Property type *</label>

          <div>
            <span className="text-xs font-medium text-muted-foreground block mb-1.5">Flat</span>
            <div className="flex flex-wrap gap-2">
              {FLAT_BEDS.map(bed => (
                <label key={`flat-${bed}`} className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border transition-colors ${form.type === `${bed} flat` ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:bg-secondary'}`}>
                  <input type="radio" name="propertyType" className="hidden" checked={form.type === `${bed} flat`} onChange={() => selectPropertyType('flat', bed)} />
                  {bed}
                </label>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-medium text-muted-foreground block mb-1.5">House</span>
            <div className="flex flex-wrap gap-2">
              {HOUSE_BEDS.map(bed => (
                <label key={`house-${bed}`} className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border transition-colors ${form.type === `${bed} house` ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:bg-secondary'}`}>
                  <input type="radio" name="propertyType" className="hidden" checked={form.type === `${bed} house`} onChange={() => selectPropertyType('house', bed)} />
                  {bed}
                </label>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-medium text-muted-foreground block mb-1.5">Other</span>
            <label className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border transition-colors ${form.type === 'HMO' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:bg-secondary'}`}>
              <input type="radio" name="propertyType" className="hidden" checked={form.type === 'HMO'} onChange={() => selectPropertyType('hmo', '')} />
              HMO
            </label>
          </div>
        </div>

        {/* ── BEDROOMS / BATHROOMS / GARAGE ── */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Bedrooms *</label>
            <input type="number" min={1} max={10} placeholder="3" value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} className="input-nfstay w-full" required />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Bathrooms *</label>
            <input type="number" min={1} max={10} placeholder="2" value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} className="input-nfstay w-full" required />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Garage?</label>
            <div className="flex gap-3 mt-1">
              {['yes', 'no'].map(o => (
                <label key={o} className="flex items-center gap-1.5 text-sm text-foreground cursor-pointer capitalize">
                  <input type="radio" name="garage" value={o} checked={form.garage === o} onChange={e => set('garage', e.target.value)} className="accent-primary" /> {o}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ── FINANCIALS ── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Monthly rent (£) *</label>
            <input type="number" placeholder="1200" value={form.rent} onChange={e => set('rent', e.target.value)} className="input-nfstay w-full" required />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Est. monthly profit (£) *</label>
            <p className="text-[10px] text-muted-foreground mb-1">We will cross-check with Airbnb similar listings for accuracy.</p>
            <input type="number" placeholder="600" value={form.profit} onChange={e => set('profit', e.target.value)} className="input-nfstay w-full" required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Deposit (£) *</label>
            <input type="number" placeholder="2400" value={form.deposit} onChange={e => set('deposit', e.target.value)} className="input-nfstay w-full" required />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Fee (£)</label>
            <input type="number" placeholder="0" value={form.agentFee} onChange={e => set('agentFee', e.target.value)} className="input-nfstay w-full" />
          </div>
        </div>

        {/* ── SA APPROVAL ── */}
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1.5">Agent/Landlord approved for Serviced Accommodation? *</label>
          <div className="flex gap-4">
            {['Yes', 'No', 'Awaiting'].map(o => (
              <label key={o} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="radio" name="saApproved" value={o} checked={form.saApproved === o} onChange={e => set('saApproved', e.target.value)} className="accent-primary" required /> {o}
              </label>
            ))}
          </div>
        </div>

        {/* ── CONTACT ── */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Contact name *</label>
            <input type="text" placeholder="Landlord/Agent" value={form.contactName} onChange={e => set('contactName', e.target.value)} className="input-nfstay w-full" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Contact phone</label>
              <input type="tel" placeholder="07911 123 456" value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} className="input-nfstay w-full" />
              <p className="text-[10px] text-muted-foreground mt-0.5">At least one of phone or WhatsApp required</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Contact WhatsApp</label>
              <input type="tel" placeholder="+44 7911 123 456" value={form.contactWhatsapp} onChange={e => set('contactWhatsapp', e.target.value)} className="input-nfstay w-full" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Contact email *</label>
            <input type="email" placeholder="landlord@example.com" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} className="input-nfstay w-full" required />
          </div>
        </div>

        {/* ── PHOTOS ── */}
        <PhotoUpload photos={photos} onChange={setPhotos} />

        {/* ── DESCRIPTION (public listing) ── */}
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1.5">Description</label>
          <p className="text-[10px] text-muted-foreground mb-1.5">Public listing description visible to members.</p>
          <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Property description for the listing..." className="input-nfstay w-full h-auto py-3 resize-none" />
          <button
            type="button"
            onClick={generateDesc}
            disabled={generating}
            className="text-[13px] font-semibold text-primary mt-1 hover:opacity-75 transition-opacity inline-flex items-center gap-1 disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {generating ? 'Generating...' : 'Generate description with AI'}
          </button>
        </div>

        {/* ── NOTES (admin-only) ── */}
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1.5">Notes</label>
          <p className="text-[10px] text-muted-foreground mb-1.5">Internal notes — only visible to admin, not on the listing.</p>
          <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any internal notes for the admin team..." className="input-nfstay w-full h-auto py-3 resize-none" />
        </div>

        <button type="submit" disabled={loading} className="w-full h-12 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold hover:opacity-90 transition-opacity mt-2 disabled:opacity-50">
          {loading ? 'Submitting...' : 'Submit Deal'}
        </button>
        <p className="text-xs text-muted-foreground text-center mt-2">Our team reviews all submissions within 24–48 hours.</p>
      </form>
      </div>

      {/* Right column — My Listings */}
      <div className="hidden lg:block">
        <MyListingsPanel userId={user?.id} />
      </div>
      </div>

      {/* Mobile: My Listings below form */}
      <div className="lg:hidden mt-8">
        <MyListingsPanel userId={user?.id} />
      </div>
    </div>
  );
}
