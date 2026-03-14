import { useState } from 'react';
import { CheckCircle, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import PhotoUpload from '@/components/PhotoUpload';

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

const INITIAL_FORM: DealForm = {
  name: '', streetName: '', houseNumber: '', city: '', postcode: '',
  propertyCategory: '', type: '', bedrooms: '', bathrooms: '', garage: '',
  rent: '', profit: '', deposit: '', agentFee: '',
  saApproved: '',
  contactName: '', contactPhone: '', contactWhatsapp: '', contactEmail: '',
};

export default function ListADealPage() {
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
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

  const generateDesc = async () => {
    if (!form.name && !form.city && !form.type) {
      toast.error('Fill in property name, city, or type first');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch(`${N8N_BASE}/webhook/ai-generate-listing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: form.city,
          postcode: form.postcode,
          bedrooms: parseInt(form.bedrooms) || 0,
          bathrooms: parseInt(form.bathrooms) || 0,
          type: form.type || form.propertyCategory,
          rent: parseInt(form.rent) || 0,
          profit: parseInt(form.profit) || 0,
          deposit: parseInt(form.deposit) || 0,
          garage: form.garage === 'yes',
          sa_approved: form.saApproved.toLowerCase(),
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
      const { error } = await supabase.from('properties').insert({
        name: nextId,
        city: form.city,
        postcode: form.postcode,
        rent_monthly: parseInt(form.rent) || 0,
        profit_est: parseInt(form.profit) || 0,
        type: form.type,
        status: 'inactive' as const,
        submitted_by: user?.id || null,
        property_category: form.propertyCategory || null,
        bedrooms: parseInt(form.bedrooms) || null,
        bathrooms: parseInt(form.bathrooms) || null,
        garage: form.garage === 'yes',
        deposit: parseInt(form.deposit) || null,
        agent_fee: parseInt(form.agentFee) || null,
        sa_approved: form.saApproved.toLowerCase(),
        landlord_approved: form.saApproved === 'Yes',
        contact_name: form.contactName,
        contact_phone: form.contactPhone,
        contact_whatsapp: form.contactWhatsapp,
        contact_email: form.contactEmail,
        landlord_whatsapp: form.contactWhatsapp || null,
        description: description || null,
        photos: photos.length > 0 ? photos : [],
        notes: notes || null,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success('Deal submitted successfully!');
    } catch (e: any) {
      toast.error(e.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-[22px] font-bold text-foreground mt-4">Deal submitted</h2>
        <p className="text-sm text-muted-foreground mt-1.5">We'll review and publish it within 24–48 hours.</p>
        <button onClick={() => { setSubmitted(false); setPhotos([]); setDescription(''); setNotes(''); setForm(INITIAL_FORM); }} className="mt-5 h-11 px-6 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
          Submit another deal
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[640px]">
      <h1 className="text-[28px] font-bold text-foreground">Submit a Deal</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-8">List a landlord-approved rent-to-rent opportunity.</p>

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
  );
}
