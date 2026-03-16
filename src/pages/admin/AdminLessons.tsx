import { useState } from 'react';
import { Plus, X, Edit2, Trash2, Sparkles, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type LessonRow = Tables<'lessons'>;
type ModuleRow = Tables<'modules'>;

interface LessonForm {
  title: string;
  content: string;
  module_id: string;
  order: number;
  emoji: string;
  estimated_minutes: number;
  is_published: boolean;
}

const emptyForm: LessonForm = {
  title: '',
  content: '',
  module_id: '',
  order: 0,
  emoji: '',
  estimated_minutes: 15,
  is_published: false,
};

export default function AdminLessons() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LessonForm>(emptyForm);
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const { data: lessons = [] } = useQuery({
    queryKey: ['admin-lessons'],
    queryFn: async () => {
      const { data, error } = await supabase.from('lessons').select('*').order('order');
      if (error) throw error;
      return data as LessonRow[];
    },
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['admin-modules-for-lessons'],
    queryFn: async () => {
      const { data, error } = await supabase.from('modules').select('id, title, emoji').order('order_index');
      if (error) throw error;
      return data as Pick<ModuleRow, 'id' | 'title' | 'emoji'>[];
    },
  });

  const handleGenerateContent = async () => {
    if (!form.title) { toast.error('Enter a title first'); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-description', {
        body: { type: 'lesson', context: { title: form.title, module_id: form.module_id } },
      });
      if (error) throw error;
      if (data?.text) {
        setForm(p => ({ ...p, content: data.text }));
        toast.success('Content generated with AI');
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate content');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!form.title) { toast.error('Title required'); return; }
    const payload = {
      title: form.title,
      content: form.content,
      module_id: form.module_id || null,
      order: form.order,
      emoji: form.emoji || null,
      estimated_minutes: form.estimated_minutes,
      is_published: form.is_published,
    };
    if (editingId) {
      const { error } = await supabase.from('lessons').update(payload).eq('id', editingId);
      if (error) { toast.error(error.message); return; }
      toast.success('Lesson updated');
    } else {
      const { error } = await supabase.from('lessons').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Lesson created');
    }
    queryClient.invalidateQueries({ queryKey: ['admin-lessons'] });
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setShowPreview(false);
  };

  const startEdit = (l: LessonRow) => {
    setEditingId(l.id);
    setForm({
      title: l.title,
      content: l.content ?? '',
      module_id: l.module_id ?? '',
      order: l.order,
      emoji: l.emoji ?? '',
      estimated_minutes: l.estimated_minutes ?? 15,
      is_published: l.is_published,
    });
    setShowForm(true);
    setShowPreview(false);
  };

  const deleteLesson = async (id: string) => {
    const { error } = await supabase.from('lessons').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['admin-lessons'] });
    toast.success('Lesson deleted');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-bold text-foreground">University — Lessons ({lessons.length})</h1>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setForm(emptyForm);
            setShowPreview(false);
          }}
          className="h-11 px-5 rounded-lg font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
          style={{ background: '#111827', color: '#fff' }}
        >
          <Plus className="w-4 h-4" /> Add Lesson
        </button>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-card rounded-2xl border border-border p-6 w-full max-w-[560px] max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">{editingId ? 'Edit Lesson' : 'Add Lesson'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <input
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                placeholder="Lesson title"
              />

              {/* Module ID dropdown */}
              <select
                value={form.module_id}
                onChange={e => setForm(p => ({ ...p, module_id: e.target.value }))}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="">— Select module —</option>
                {modules.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.emoji ? `${m.emoji} ` : ''}{m.title} ({m.id})
                  </option>
                ))}
              </select>

              <div className="flex gap-3">
                <input
                  value={form.emoji}
                  onChange={e => setForm(p => ({ ...p, emoji: e.target.value }))}
                  className="w-20 h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  placeholder="Emoji"
                />
                <input
                  type="number"
                  value={form.order}
                  onChange={e => setForm(p => ({ ...p, order: Number(e.target.value) }))}
                  className="flex-1 h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  placeholder="Order"
                />
                <input
                  type="number"
                  value={form.estimated_minutes}
                  onChange={e => setForm(p => ({ ...p, estimated_minutes: Number(e.target.value) }))}
                  className="flex-1 h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  placeholder="Minutes"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={form.is_published}
                  onChange={e => setForm(p => ({ ...p, is_published: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="is_published" className="text-sm font-medium text-foreground cursor-pointer">
                  Published (visible to users)
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-foreground">Content (JSON or text)</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPreview(p => !p)}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    >
                      {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showPreview ? 'Edit' : 'Preview'}
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateContent}
                      disabled={generating}
                      className="text-xs font-semibold text-primary hover:opacity-75 transition-opacity inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {generating ? 'Generating...' : 'Generate with AI'}
                    </button>
                  </div>
                </div>
                {showPreview ? (
                  <div
                    className="w-full min-h-[200px] rounded-lg border border-border bg-secondary px-3 py-2 text-sm whitespace-pre-wrap font-mono overflow-auto"
                    style={{ maxHeight: '300px' }}
                  >
                    {form.content || <span className="text-muted-foreground">No content yet.</span>}
                  </div>
                ) : (
                  <textarea
                    value={form.content}
                    onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none font-mono"
                    rows={10}
                    placeholder="Lesson content (JSON object or plain text)..."
                  />
                )}
              </div>
              <button
                onClick={handleSave}
                className="w-full h-11 rounded-lg font-semibold text-sm"
                style={{ background: '#111827', color: '#fff' }}
              >
                {editingId ? 'Save Changes' : 'Create Lesson'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {['Order', 'Title', 'Module', 'Published', 'Min', 'Content', 'Actions'].map(h => (
                <th key={h} className="text-left p-3.5 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lessons.map((l, i) => (
              <tr key={l.id} className={i % 2 === 1 ? 'bg-secondary' : ''}>
                <td className="p-3.5 text-foreground">{l.order}</td>
                <td className="p-3.5 font-medium text-foreground">
                  {l.emoji ? `${l.emoji} ` : ''}{l.title}
                </td>
                <td className="p-3.5 text-muted-foreground">{l.module_id ?? '—'}</td>
                <td className="p-3.5">
                  <span
                    className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{
                      background: l.is_published ? '#ECFDF5' : '#F3F4F6',
                      color: l.is_published ? '#065F46' : '#6B7280',
                    }}
                  >
                    {l.is_published ? 'Live' : 'Draft'}
                  </span>
                </td>
                <td className="p-3.5 text-muted-foreground">{l.estimated_minutes ?? '—'}</td>
                <td className="p-3.5 text-muted-foreground max-w-[200px] truncate">
                  {l.content ? l.content.slice(0, 60) + '…' : '—'}
                </td>
                <td className="p-3.5">
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(l)}
                      className="text-xs text-primary font-medium inline-flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => deleteLesson(l.id)}
                      className="text-xs text-destructive font-medium inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {lessons.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No lessons yet. Click "Add Lesson" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
