import { useState } from 'react';
import { Plus, X, Edit2, Trash2, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/types';

type ModuleRow = Tables<'modules'>;

interface ModuleForm {
  id: string;
  title: string;
  emoji: string;
  description: string;
  xp_reward: number;
  order_index: number;
  is_locked: boolean;
  tier_required: string;
  learning_outcomes_text: string; // one per line, converted to array on save
}

const emptyForm: ModuleForm = {
  id: '',
  title: '',
  emoji: '',
  description: '',
  xp_reward: 100,
  order_index: 0,
  is_locked: false,
  tier_required: 'free',
  learning_outcomes_text: '',
};

export default function AdminModules() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ModuleForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string; lessonCount: number } | null>(null);

  // Guard — only admins can access this
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['admin-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['admin-modules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('modules').select('*').order('order_index');
      if (error) throw error;
      return data as ModuleRow[];
    },
  });

  const { data: lessonCounts = {} } = useQuery({
    queryKey: ['admin-module-lesson-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('lessons').select('module_id').not('module_id', 'is', null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        if (row.module_id) counts[row.module_id] = (counts[row.module_id] ?? 0) + 1;
      }
      return counts;
    },
  });

  if (!profileLoading && profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Admin access required.
      </div>
    );
  }

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, order_index: modules.length });
    setShowForm(true);
  };

  const startEdit = (mod: ModuleRow) => {
    setEditingId(mod.id);
    setForm({
      id: mod.id,
      title: mod.title,
      emoji: mod.emoji ?? '',
      description: mod.description ?? '',
      xp_reward: mod.xp_reward,
      order_index: mod.order_index,
      is_locked: mod.is_locked,
      tier_required: mod.tier_required,
      learning_outcomes_text: (mod.learning_outcomes ?? []).join('\n'),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.id.trim()) { toast.error('Module ID (slug) required'); return; }
    if (!form.title.trim()) { toast.error('Title required'); return; }

    const payload = {
      id: form.id.trim(),
      title: form.title.trim(),
      emoji: form.emoji.trim() || null,
      description: form.description.trim() || null,
      xp_reward: form.xp_reward,
      order_index: form.order_index,
      is_locked: form.is_locked,
      tier_required: form.tier_required,
      learning_outcomes: form.learning_outcomes_text
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean),
    };

    const { error } = await supabase.from('modules').upsert(payload, { onConflict: 'id' });
    if (error) { toast.error(error.message); return; }

    toast.success(editingId ? 'Module updated' : 'Module created');
    queryClient.invalidateQueries({ queryKey: ['admin-modules'] });
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const confirmDelete = async (id: string) => {
    const count = lessonCounts[id] ?? 0;
    const mod = modules.find(m => m.id === id);
    if (!mod) return;
    setDeleteTarget({ id, title: mod.title, lessonCount: count });
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('modules').delete().eq('id', deleteTarget.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Module deleted');
    queryClient.invalidateQueries({ queryKey: ['admin-modules'] });
    queryClient.invalidateQueries({ queryKey: ['admin-module-lesson-counts'] });
    setDeleteTarget(null);
  };

  const reorder = async (id: string, direction: 'up' | 'down') => {
    const idx = modules.findIndex(m => m.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= modules.length) return;

    const a = modules[idx];
    const b = modules[swapIdx];

    await Promise.all([
      supabase.from('modules').update({ order_index: b.order_index }).eq('id', a.id),
      supabase.from('modules').update({ order_index: a.order_index }).eq('id', b.id),
    ]);
    queryClient.invalidateQueries({ queryKey: ['admin-modules'] });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-bold text-foreground">University — Modules ({modules.length})</h1>
        <button
          onClick={openCreate}
          className="h-11 px-5 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
          style={{ background: '#111827', color: '#fff' }}
        >
          <Plus className="w-4 h-4" /> Add Module
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-card rounded-2xl border border-border p-6 w-full max-w-[540px] max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">{editingId ? 'Edit Module' : 'Add Module'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Module ID (slug) *</label>
                <input
                  value={form.id}
                  onChange={e => setForm(p => ({ ...p, id: e.target.value }))}
                  disabled={!!editingId}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm disabled:opacity-60"
                  placeholder="e.g. getting-started"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  placeholder="Module title"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-foreground block mb-1">Emoji</label>
                  <input
                    value={form.emoji}
                    onChange={e => setForm(p => ({ ...p, emoji: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                    placeholder="🚀"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-foreground block mb-1">XP Reward</label>
                  <input
                    type="number"
                    value={form.xp_reward}
                    onChange={e => setForm(p => ({ ...p, xp_reward: Number(e.target.value) }))}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-foreground block mb-1">Order Index</label>
                  <input
                    type="number"
                    value={form.order_index}
                    onChange={e => setForm(p => ({ ...p, order_index: Number(e.target.value) }))}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
                  rows={3}
                  placeholder="Module description / summary"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-foreground block mb-1">Tier Required</label>
                  <select
                    value={form.tier_required}
                    onChange={e => setForm(p => ({ ...p, tier_required: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
                <div className="flex items-end pb-2 gap-2">
                  <label className="text-xs font-semibold text-foreground">Locked</label>
                  <input
                    type="checkbox"
                    checked={form.is_locked}
                    onChange={e => setForm(p => ({ ...p, is_locked: e.target.checked }))}
                    className="w-4 h-4 rounded"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Learning Outcomes (one per line)</label>
                <textarea
                  value={form.learning_outcomes_text}
                  onChange={e => setForm(p => ({ ...p, learning_outcomes_text: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
                  rows={5}
                  placeholder="Choose the right model&#10;Set up your business..."
                />
              </div>
              <button
                onClick={handleSave}
                className="w-full h-11 rounded-lg font-semibold text-sm"
                style={{ background: '#111827', color: '#fff' }}
              >
                {editingId ? 'Save Changes' : 'Create Module'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-card rounded-2xl border border-border p-6 w-full max-w-[400px]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-foreground">Delete "{deleteTarget.title}"?</h3>
                {deleteTarget.lessonCount > 0 && (
                  <p className="text-sm text-destructive mt-1">
                    ⚠️ {deleteTarget.lessonCount} lesson{deleteTarget.lessonCount !== 1 ? 's' : ''} will also be deleted.
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-10 rounded-lg border border-border text-sm font-medium text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="flex-1 h-10 rounded-lg text-sm font-semibold text-white bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {['Emoji', 'Title', 'Order', 'XP', 'Tier', 'Locked', 'Lessons', 'Actions'].map(h => (
                <th key={h} className="text-left p-3.5 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map((mod, i) => (
              <tr key={mod.id} className={i % 2 === 1 ? 'bg-secondary' : ''}>
                <td className="p-3.5 text-xl">{mod.emoji ?? '—'}</td>
                <td className="p-3.5 font-medium text-foreground">{mod.title}</td>
                <td className="p-3.5 text-muted-foreground">{mod.order_index}</td>
                <td className="p-3.5 text-muted-foreground">{mod.xp_reward}</td>
                <td className="p-3.5 text-muted-foreground capitalize">{mod.tier_required}</td>
                <td className="p-3.5 text-muted-foreground">{mod.is_locked ? 'Yes' : 'No'}</td>
                <td className="p-3.5 text-muted-foreground">{lessonCounts[mod.id] ?? 0}</td>
                <td className="p-3.5">
                  <div className="flex gap-1 items-center flex-wrap">
                    <button
                      onClick={() => reorder(mod.id, 'up')}
                      disabled={i === 0}
                      className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => reorder(mod.id, 'down')}
                      disabled={i === modules.length - 1}
                      className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => startEdit(mod)}
                      className="text-xs text-primary font-medium inline-flex items-center gap-1 px-1"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => confirmDelete(mod.id)}
                      className="text-xs text-destructive font-medium inline-flex items-center gap-1 px-1"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {modules.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  No modules yet. Click "Add Module" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
