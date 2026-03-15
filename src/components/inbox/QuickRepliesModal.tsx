import { useState } from 'react';
import { X, Pencil, Trash2, Plus } from 'lucide-react';
import { DUMMY_QUICK_REPLIES } from './dummyData';
import type { QuickReply } from './types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (text: string) => void;
}

export default function QuickRepliesModal({ open, onClose, onSelect }: Props) {
  const [replies, setReplies] = useState<QuickReply[]>(DUMMY_QUICK_REPLIES);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');

  if (!open) return null;

  const categories = ['All', ...Array.from(new Set(replies.map(r => r.category).filter(Boolean)))];
  const filtered = activeCategory === 'All' ? replies : replies.filter(r => r.category === activeCategory);

  const startEdit = (qr: QuickReply) => {
    setEditingId(qr.id); setEditTitle(qr.title); setEditBody(qr.body); setEditCategory(qr.category); setDeletingId(null);
  };
  const saveEdit = () => {
    if (!editingId || !editTitle.trim()) return;
    setReplies(prev => prev.map(r => r.id === editingId ? { ...r, title: editTitle.trim(), body: editBody.trim(), category: editCategory.trim() } : r));
    setEditingId(null);
  };
  const cancelEdit = () => {
    setReplies(prev => prev.filter(r => !(r.id === editingId && !r.title && !r.body)));
    setEditingId(null);
  };
  const addNew = () => {
    const newId = `qr-${Date.now()}`;
    setReplies(prev => [...prev, { id: newId, title: '', body: '', category: '' }]);
    setEditingId(newId); setEditTitle(''); setEditBody(''); setEditCategory(''); setDeletingId(null);
  };
  const confirmDelete = (id: string) => { setReplies(prev => prev.filter(r => r.id !== id)); setDeletingId(null); };

  return (
    <div className="absolute bottom-16 left-4 right-4 z-30 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-[400px] overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <h3 className="text-sm font-bold text-gray-900">Quick Replies</h3>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-50"><X className="w-4 h-4 text-gray-400" /></button>
      </div>

      {/* Category pills */}
      <div className="flex gap-1.5 px-4 py-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`rounded-full px-3 py-1 text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${activeCategory === cat ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="p-2 space-y-1">
        {filtered.map(qr => {
          if (deletingId === qr.id) {
            return (
              <div key={qr.id} className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-center justify-between">
                <span className="text-xs text-red-700">Delete this reply?</span>
                <div className="flex gap-2">
                  <button onClick={() => confirmDelete(qr.id)} className="text-xs font-semibold text-red-600 hover:underline">Yes, delete</button>
                  <button onClick={() => setDeletingId(null)} className="text-xs text-gray-500 hover:underline">Cancel</button>
                </div>
              </div>
            );
          }
          if (editingId === qr.id) {
            return (
              <div key={qr.id} className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Reply title..." autoFocus
                  className="w-full text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary" />
                <textarea value={editBody} onChange={e => setEditBody(e.target.value)} placeholder="Reply message..." rows={2}
                  className="w-full text-sm text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary" />
                <input value={editCategory} onChange={e => setEditCategory(e.target.value)} placeholder="Category e.g. Viewing"
                  className="w-full text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary" />
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700">Save</button>
                  <button onClick={cancelEdit} className="px-3 py-1 rounded-lg text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                </div>
              </div>
            );
          }
          return (
            <div key={qr.id} className="group relative">
              <button onClick={() => { onSelect(qr.body); onClose(); }} className="w-full text-left p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-900">{qr.title}</span>
                  {qr.category && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{qr.category}</span>}
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{qr.body}</div>
              </button>
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={e => { e.stopPropagation(); startEdit(qr); }} className="p-1 rounded hover:bg-gray-100"><Pencil className="w-4 h-4 text-gray-400 hover:text-gray-700" /></button>
                <button onClick={e => { e.stopPropagation(); setDeletingId(qr.id); }} className="p-1 rounded hover:bg-gray-100"><Trash2 className="w-4 h-4 text-gray-400 hover:text-gray-700" /></button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-4 py-3 border-t border-gray-100">
        <button onClick={addNew} className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium hover:underline"><Plus className="w-4 h-4" /> Add quick reply</button>
      </div>
    </div>
  );
}
