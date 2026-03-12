import { useState } from 'react';
import { Image, CheckCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function ListADealPage() {
  const [submitted, setSubmitted] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).slice(0, 5 - photos.length).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotos(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const generateDesc = () => {
    setNotes('Three-bedroom flat in a sought-after area, fully landlord-approved for short-term rental. The property is well-maintained, tastefully furnished, and located within walking distance of local amenities and transport links. Ideal for an operator looking to maximise occupancy in a high-demand market.');
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-[22px] font-bold text-foreground mt-4">Deal submitted</h2>
        <p className="text-sm text-muted-foreground mt-1.5">We'll review and publish it within 24–48 hours.</p>
        <button onClick={() => { setSubmitted(false); setPhotos([]); setNotes(''); }} className="mt-5 h-11 px-6 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
          Submit another deal
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[640px]">
      <h1 className="text-[28px] font-bold text-foreground">Submit a Deal</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-8">List a landlord-approved rent-to-rent opportunity.</p>

      <form onSubmit={e => { e.preventDefault(); toast.success('Submitting...'); setTimeout(() => setSubmitted(true), 800); }} className="space-y-4">
        {[
          { label: 'Property name', type: 'text', placeholder: 'e.g. Maple House' },
          { label: 'City', type: 'text', placeholder: 'e.g. Manchester' },
          { label: 'Postcode area', type: 'text', placeholder: 'e.g. M14' },
        ].map(f => (
          <div key={f.label}>
            <label className="text-xs font-semibold text-foreground block mb-1.5">{f.label}</label>
            <input type={f.type} placeholder={f.placeholder} className="input-nfstay w-full" required />
          </div>
        ))}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Monthly rent (£)</label>
            <input type="number" placeholder="1200" className="input-nfstay w-full" required />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Est. monthly profit (£)</label>
            <input type="number" placeholder="600" className="input-nfstay w-full" required />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1.5">Property type</label>
          <select className="input-nfstay w-full bg-card" required>
            <option value="">Select type</option>
            {['1-bed flat', '2-bed flat', '3-bed flat', '2-bed house', '3-bed house', '4-bed house', 'HMO'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1.5">Landlord approved for STR?</label>
          <div className="flex gap-4">
            {['Yes', 'No', 'Awaiting'].map(o => (
              <label key={o} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="radio" name="approved" value={o} className="accent-primary" required /> {o}
              </label>
            ))}
          </div>
        </div>

        {[
          { label: 'Contact name', type: 'text', placeholder: 'Landlord name' },
          { label: 'Contact phone / WhatsApp', type: 'tel', placeholder: '07911 123 456' },
          { label: 'Contact email', type: 'email', placeholder: 'landlord@example.com' },
        ].map(f => (
          <div key={f.label}>
            <label className="text-xs font-semibold text-foreground block mb-1.5">{f.label}</label>
            <input type={f.type} placeholder={f.placeholder} className="input-nfstay w-full" />
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
          <button type="button" onClick={generateDesc} className="text-[13px] font-semibold text-primary mt-1 hover:opacity-75 transition-opacity">
            Generate description
          </button>
        </div>

        <button type="submit" className="w-full h-12 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold hover:opacity-90 transition-opacity mt-6">
          Submit Deal
        </button>
        <p className="text-xs text-muted-foreground text-center mt-2">Our team reviews all submissions within 24–48 hours.</p>
      </form>
    </div>
  );
}
