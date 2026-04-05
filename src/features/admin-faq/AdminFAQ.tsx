import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Edit2, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
}

export default function AdminFAQ() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ q: '', a: '' });
  const [saving, setSaving] = useState(false);

  const fetchFaqs = useCallback(async () => {
    const { data } = await (supabase.from('faqs') as any)
      .select('id, question, answer, sort_order')
      .order('sort_order', { ascending: true });
    if (data) setFaqs(data as FAQ[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchFaqs(); }, [fetchFaqs]);

  const handleSave = async () => {
    if (!form.q || !form.a) { toast.error('Both fields required'); return; }
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await (supabase.from('faqs') as any)
          .update({ question: form.q, answer: form.a })
          .eq('id', editingId);
        if (error) throw error;
        toast.success('FAQ updated');
      } else {
        const maxOrder = faqs.length > 0 ? Math.max(...faqs.map(f => f.sort_order)) : 0;
        const { error } = await (supabase.from('faqs') as any)
          .insert({ question: form.q, answer: form.a, sort_order: maxOrder + 1 });
        if (error) throw error;
        toast.success('FAQ added');
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ q: '', a: '' });
      fetchFaqs();
    } catch (err) {
      toast.error('Save failed: ' + (err instanceof Error ? err.message : 'unknown'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase.from('faqs') as any).delete().eq('id', id);
    if (error) { toast.error('Delete failed'); return; }
    setFaqs(prev => prev.filter(f => f.id !== id));
    toast.success('Deleted');
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading FAQs...</div>;
  }

  return (
    <div data-feature="ADMIN">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-bold text-foreground">FAQ Management ({faqs.length})</h1>
        <button data-feature="ADMIN__FAQ_ADD" onClick={() => { setShowForm(true); setEditingId(null); setForm({ q: '', a: '' }); }} className="h-11 px-5 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
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
              <button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? 'Save' : 'Add FAQ'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div data-feature="ADMIN__FAQ_LIST" className="space-y-3">
        {faqs.map(f => (
          <div key={f.id} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">{f.question}</h3>
              <div className="flex gap-2">
                <button data-feature="ADMIN__FAQ_EDIT" onClick={() => { setEditingId(f.id); setForm({ q: f.question, a: f.answer }); setShowForm(true); }} className="text-xs text-primary font-medium inline-flex items-center gap-1"><Edit2 className="w-3 h-3" /> Edit</button>
                <button data-feature="ADMIN__FAQ_DELETE" onClick={() => handleDelete(f.id)} className="text-xs text-destructive font-medium inline-flex items-center gap-1"><Trash2 className="w-3 h-3" /> Delete</button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{f.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
