import { useState } from 'react';
import { Plus, X, Edit2, Trash2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const defaultFaqs = [
  { id: '1', q: 'What is rent-to-rent?', a: 'Rent-to-rent is a property strategy where you rent a property from a landlord and sublet it on platforms like Airbnb for a profit.', open: false },
  { id: '2', q: 'Do I need experience?', a: 'No. Our University module covers everything from finding deals to managing guests. Many operators start with zero experience.', open: false },
  { id: '3', q: 'How do I cancel?', a: 'You can cancel any time from Settings → Membership. Your access continues until the end of your billing period.', open: false },
];

export default function AdminFAQ() {
  const [faqs, setFaqs] = useState(defaultFaqs);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ q: '', a: '' });

  const handleSave = () => {
    if (!form.q || !form.a) { toast.error('Both fields required'); return; }
    if (editingId) {
      setFaqs(prev => prev.map(f => f.id === editingId ? { ...f, q: form.q, a: form.a } : f));
      toast.success('FAQ updated');
    } else {
      setFaqs(prev => [...prev, { id: Date.now().toString(), q: form.q, a: form.a, open: false }]);
      toast.success('FAQ added');
    }
    setShowForm(false);
    setEditingId(null);
    setForm({ q: '', a: '' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-bold text-foreground">FAQ Management ({faqs.length})</h1>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ q: '', a: '' }); }} className="h-11 px-5 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Add FAQ
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-[500px]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">{editingId ? 'Edit FAQ' : 'Add FAQ'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <input value={form.q} onChange={e => setForm(p => ({ ...p, q: e.target.value }))} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="Question" />
              <textarea value={form.a} onChange={e => setForm(p => ({ ...p, a: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none" rows={4} placeholder="Answer" />
              <button onClick={handleSave} className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm">{editingId ? 'Save' : 'Add FAQ'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {faqs.map(f => (
          <div key={f.id} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">{f.q}</h3>
              <div className="flex gap-2">
                <button onClick={() => { setEditingId(f.id); setForm({ q: f.q, a: f.a }); setShowForm(true); }} className="text-xs text-primary font-medium inline-flex items-center gap-1"><Edit2 className="w-3 h-3" /> Edit</button>
                <button onClick={() => { setFaqs(prev => prev.filter(x => x.id !== f.id)); toast.success('Deleted'); }} className="text-xs text-destructive font-medium inline-flex items-center gap-1"><Trash2 className="w-3 h-3" /> Delete</button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{f.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
