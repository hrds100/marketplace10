import { useState } from 'react';
import { Plus, X, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function AdminLessons() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', content: '', module_id: '', order: 0 });

  const { data: lessons = [] } = useQuery({
    queryKey: ['admin-lessons'],
    queryFn: async () => {
      const { data, error } = await supabase.from('lessons').select('*').order('order');
      if (error) throw error;
      return data;
    },
  });

  const handleSave = async () => {
    if (!form.title) { toast.error('Title required'); return; }
    if (editingId) {
      await supabase.from('lessons').update({ title: form.title, content: form.content, module_id: form.module_id || null, order: form.order }).eq('id', editingId);
      toast.success('Lesson updated');
    } else {
      await supabase.from('lessons').insert({ title: form.title, content: form.content, module_id: form.module_id || null, order: form.order });
      toast.success('Lesson created');
    }
    queryClient.invalidateQueries({ queryKey: ['admin-lessons'] });
    setShowForm(false);
    setEditingId(null);
    setForm({ title: '', content: '', module_id: '', order: 0 });
  };

  const startEdit = (l: typeof lessons[0]) => {
    setEditingId(l.id);
    setForm({ title: l.title, content: l.content || '', module_id: l.module_id || '', order: l.order });
    setShowForm(true);
  };

  const deleteLesson = async (id: string) => {
    await supabase.from('lessons').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['admin-lessons'] });
    toast.success('Lesson deleted');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-bold text-foreground">University Lessons ({lessons.length})</h1>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ title: '', content: '', module_id: '', order: 0 }); }} className="h-11 px-5 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Add Lesson
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-[500px]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">{editingId ? 'Edit Lesson' : 'Add Lesson'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="Lesson title" />
              <input value={form.module_id} onChange={e => setForm(p => ({ ...p, module_id: e.target.value }))} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="Module ID (e.g. mod-1)" />
              <input type="number" value={form.order} onChange={e => setForm(p => ({ ...p, order: Number(e.target.value) }))} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="Order" />
              <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none" rows={6} placeholder="Lesson content..." />
              <button onClick={handleSave} className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm">{editingId ? 'Save Changes' : 'Create Lesson'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {['Order', 'Title', 'Module', 'Actions'].map(h => (
                <th key={h} className="text-left p-3.5 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lessons.map((l, i) => (
              <tr key={l.id} className={i % 2 === 1 ? 'bg-secondary' : ''}>
                <td className="p-3.5 text-foreground">{l.order}</td>
                <td className="p-3.5 font-medium text-foreground">{l.title}</td>
                <td className="p-3.5 text-muted-foreground">{l.module_id || '—'}</td>
                <td className="p-3.5">
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(l)} className="text-xs text-primary font-medium inline-flex items-center gap-1"><Edit2 className="w-3 h-3" /> Edit</button>
                    <button onClick={() => deleteLesson(l.id)} className="text-xs text-destructive font-medium inline-flex items-center gap-1"><Trash2 className="w-3 h-3" /> Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {lessons.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No lessons yet. Click "Add Lesson" to create one.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
