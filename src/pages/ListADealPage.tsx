import { useState } from 'react';
import { Image, CheckCircle, Upload, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function ListADealPage() {
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '', city: '', postcode: '', rent: '', profit: '', type: '', approved: '',
    contactName: '', contactPhone: '', contactEmail: '',
  });

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).slice(0, 5 - photos.length).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotos(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const generateDesc = async () => {
    if (!form.name && !form.city && !form.type) {
      toast.error('Fill in property name, city, or type first');
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-description', {
        body: {
          type: 'property',
          context: {
            name: form.name, city: form.city, postcode: form.postcode,
            type: form.type, rent: form.rent, profit: form.profit,
            approved: form.approved,
          },
        },
      });
      if (error) throw error;
      if (data?.text) {
        setNotes(data.text);
        toast.success('Description generated with AI');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate description');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.city || !form.rent || !form.type) {
      toast.error('Please fill in required fields');
      return;
    }
    setLoading(true);
    try {
      // Insert as a new property (pending admin review via status)
      const { error } = await supabase.from('properties').insert({
        name: form.name,
        city: form.city,
        postcode: form.postcode,
        rent_monthly: parseInt(form.rent) || 0,
        profit_est: parseInt(form.profit) || 0,
        type: form.type || '2-bed flat',
        landlord_approved: form.approved === 'Yes',
        landlord_whatsapp: form.contactPhone || null,
        description: notes || null,
        status: 'inactive' as const, // Needs admin approval
        photos: [],
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
        <button onClick={() => { setSubmitted(false); setPhotos([]); setNotes(''); setForm({ name: '', city: '', postcode: '', rent: '', profit: '', type: '', approved: '', contactName: '', contactPhone: '', contactEmail: '' }); }} className="mt-5 h-11 px-6 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
          Submit another deal
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[640px]">
      <h1 className="text-[28px] font-bold text-foreground">Submit a Deal</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-8">List a landlord-approved rent-to-rent opportunity.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { label: 'Property name', key: 'name', type: 'text', placeholder: 'e.g. Maple House', required: true },
          { label: 'City', key: 'city', type: 'text', placeholder: 'e.g. Manchester', required: true },
          { label: 'Postcode area', key: 'postcode', type: 'text', placeholder: 'e.g. M14' },
        ].map(f => (
          <div key={f.key}>
            <label className="text-xs font-semibold text-foreground block mb-1.5">{f.label}</label>
            <input
              type={f.type}
              placeholder={f.placeholder}
              value={form[f.key as keyof typeof form]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              className="input-nfstay w-full"
              required={f.required}
            />
          </div>
        ))}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Monthly rent (£)</label>
            <input type="number" placeholder="1200" value={form.rent} onChange={e => setForm(p => ({ ...p, rent: e.target.value }))} className="input-nfstay w-full" required />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Est. monthly profit (£)</label>
            <input type="number" placeholder="600" value={form.profit} onChange={e => setForm(p => ({ ...p, profit: e.target.value }))} className="input-nfstay w-full" required />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1.5">Property type</label>
          <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="input-nfstay w-full bg-card" required>
            <option value="">Select type</option>
            {['1-bed flat', '2-bed flat', '3-bed flat', '2-bed house', '3-bed house', '4-bed house', 'HMO'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1.5">Landlord approved for STR?</label>
          <div className="flex gap-4">
            {['Yes', 'No', 'Awaiting'].map(o => (
              <label key={o} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="radio" name="approved" value={o} checked={form.approved === o} onChange={e => setForm(p => ({ ...p, approved: e.target.value }))} className="accent-primary" required /> {o}
              </label>
            ))}
          </div>
        </div>

        {[
          { label: 'Contact name', key: 'contactName', type: 'text', placeholder: 'Landlord name' },
          { label: 'Contact phone / WhatsApp', key: 'contactPhone', type: 'tel', placeholder: '07911 123 456' },
          { label: 'Contact email', key: 'contactEmail', type: 'email', placeholder: 'landlord@example.com' },
        ].map(f => (
          <div key={f.key}>
            <label className="text-xs font-semibold text-foreground block mb-1.5">{f.label}</label>
            <input
              type={f.type}
              placeholder={f.placeholder}
              value={form[f.key as keyof typeof form]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              className="input-nfstay w-full"
            />
          </div>
        ))}

        {/* Photo upload */}
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Property photos</label>
          <p className="text-xs text-muted-foreground mb-2">Upload up to 5 photos. JPG or PNG, max 5MB each.</p>
          <label className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center cursor-pointer hover:border-primary/30 transition-colors">
            <Image className="w-7 h-7 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Drag photos here or click to browse</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} />
          </label>
          {photos.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {photos.map((p, i) => (
                <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden">
                  <img src={p} className="w-full h-full object-cover" alt="" />
                  <button type="button" onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white text-xs flex items-center justify-center">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1.5">Notes</label>
          <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional details..." className="input-nfstay w-full h-auto py-3 resize-none" />
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

        <button type="submit" disabled={loading} className="w-full h-12 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold hover:opacity-90 transition-opacity mt-6 disabled:opacity-50">
          {loading ? 'Submitting...' : 'Submit Deal'}
        </button>
        <p className="text-xs text-muted-foreground text-center mt-2">Our team reviews all submissions within 24–48 hours.</p>
      </form>
    </div>
  );
}
