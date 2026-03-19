import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Upload, X, MessageCircle, Edit2, Trash2, Download, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

export default function AdminListings() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', city: '', rent: 0, profit: 0, status: 'live' as string });
  const [hardDeleteTarget, setHardDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [pin, setPin] = useState('');

  // Fetch from Supabase
  const { data: dbListings } = useQuery({
    queryKey: ['admin-properties'],
    queryFn: async () => {
      const { data, error } = await supabase.from('properties').select('*');
      if (error) throw error;
      return data;
    },
  });

  const listings = dbListings || [];
  const featuredCount = listings.filter(d => d.featured).length;

  const toggleFeatured = async (id: string) => {
    const item = listings.find(d => d.id === id);
    if (!item) return;
    if (!item.featured && featuredCount >= 3) {
      toast.error('Maximum 3 featured listings allowed');
      return;
    }
    await supabase.from('properties').update({ featured: !item.featured }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['admin-properties'] });
    toast.success('Updated');
  };

  const changeStatus = async (id: string, status: string) => {
    await supabase.from('properties').update({ status }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['admin-properties'] });
  };

  const startEdit = (p: typeof listings[0]) => {
    setEditingId(p.id);
    setEditForm({ name: p.name, city: p.city, rent: p.rent_monthly, profit: p.profit_est, status: p.status });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await supabase.from('properties').update({
      name: editForm.name,
      city: editForm.city,
      rent_monthly: editForm.rent,
      profit_est: editForm.profit,
      status: editForm.status,
    }).eq('id', editingId);
    queryClient.invalidateQueries({ queryKey: ['admin-properties'] });
    setEditingId(null);
    toast.success('Property updated');
  };

  const deleteProperty = async (id: string) => {
    await supabase.from('properties').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['admin-properties'] });
    toast.success('Property deleted');
  };

  // Hard delete — removes property + all linked data (threads, messages, CRM, favourites)
  const hardDeleteMutation = useMutation({
    mutationFn: async ({ id, userPin }: { id: string; userPin: string }) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/hard-delete-property`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ propertyId: id, pin: userPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-properties'] });
      setHardDeleteTarget(null);
      setPin('');
      toast.success('Property permanently deleted with all linked data');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to hard delete'),
  });

  // CSV Import
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      toast.error('CSV must have header + data rows');
      return;
    }
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ''; });
      return obj;
    });

    const properties = rows.map(r => ({
      name: r.name || 'Untitled',
      city: r.city || 'Unknown',
      postcode: r.postcode || '',
      rent_monthly: parseInt(r.rent || r.rent_monthly || '0'),
      profit_est: parseInt(r.profit || r.profit_est || '0'),
      beds: parseInt(r.beds || '2'),
      type: r.type || '2-bed flat',
      status: r.status || 'live',
      landlord_whatsapp: r.whatsapp || r.landlord_whatsapp || null,
      description: r.description || null,
      featured: r.featured === 'true',
      image_url: r.image_url || r.image || null,
    }));

    const { error } = await supabase.from('properties').insert(properties);
    if (error) {
      toast.error('Import failed: ' + error.message);
    } else {
      toast.success(`${properties.length} properties imported!`);
      queryClient.invalidateQueries({ queryKey: ['admin-properties'] });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadCSVTemplate = () => {
    const headers = 'name,city,postcode,rent_monthly,profit_est,beds,type,status,landlord_whatsapp,description,featured,image_url';
    const example = 'Maple House,Manchester,M14,1200,680,3,3-bed flat,live,447911123456,Great property near transport,false,';
    const csv = headers + '\n' + example;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nfstay-properties-template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-bold text-foreground">Listings ({listings.length})</h1>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
          <button onClick={downloadCSVTemplate} className="h-11 px-5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors inline-flex items-center gap-2">
            <Download className="w-4 h-4" /> CSV Template
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="h-11 px-5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors inline-flex items-center gap-2">
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button className="h-11 px-5 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm hover:opacity-90 transition-opacity">+ Add listing</button>
        </div>
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => setEditingId(null)}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-[400px]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Edit Property</h2>
              <button onClick={() => setEditingId(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="Name" />
              <input value={editForm.city} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="City" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={editForm.rent} onChange={e => setEditForm(p => ({ ...p, rent: Number(e.target.value) }))} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="Rent" />
                <input type="number" value={editForm.profit} onChange={e => setEditForm(p => ({ ...p, profit: Number(e.target.value) }))} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="Profit" />
              </div>
              <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
                <option value="live">Live</option>
                <option value="on-offer">On offer</option>
                <option value="inactive">Inactive</option>
              </select>
              <button onClick={saveEdit} className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-border">
              {['Name', 'City', 'Rent', 'Profit', 'Status', 'Featured', 'WhatsApp', 'Actions'].map(h => (
                <th key={h} className="text-left p-3.5 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {listings.map((l, i) => (
              <tr key={l.id} className={i % 2 === 1 ? 'bg-secondary' : ''}>
                <td className="p-3.5 font-medium text-foreground">{l.name}</td>
                <td className="p-3.5 text-muted-foreground">{l.city}</td>
                <td className="p-3.5 text-foreground">£{l.rent_monthly.toLocaleString()}</td>
                <td className="p-3.5 text-accent-foreground font-medium">£{l.profit_est}</td>
                <td className="p-3.5">
                  <select value={l.status} onChange={e => changeStatus(l.id, e.target.value)} className="input-nfstay h-8 text-xs bg-card pr-6">
                    <option value="live">Live</option>
                    <option value="on-offer">On offer</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </td>
                <td className="p-3.5">
                  <button onClick={() => toggleFeatured(l.id)} className={`w-9 h-5 rounded-full relative transition-colors ${l.featured ? 'bg-primary' : 'bg-border'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${l.featured ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                </td>
                <td className="p-3.5">
                  {l.landlord_whatsapp ? (
                    <a href={`https://wa.me/${l.landlord_whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:opacity-75">
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  ) : <span className="text-muted-foreground text-xs">—</span>}
                </td>
                <td className="p-3.5">
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(l)} className="text-xs text-primary font-medium inline-flex items-center gap-1"><Edit2 className="w-3 h-3" /> Edit</button>
                    <button onClick={() => deleteProperty(l.id)} className="text-xs text-destructive font-medium inline-flex items-center gap-1"><Trash2 className="w-3 h-3" /> Delete</button>
                    <button onClick={() => setHardDeleteTarget({ id: l.id, name: l.name })} className="text-xs font-medium px-2 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors inline-flex items-center gap-1"><Trash2 className="w-3 h-3" /> Hard Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Hard Delete PIN Dialog */}
      {hardDeleteTarget && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => { setHardDeleteTarget(null); setPin(''); }}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-[400px]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Hard Delete Property</h3>
                <p className="text-xs text-red-600 font-semibold">Removes property + all messages, threads, CRM deals</p>
              </div>
            </div>
            <p className="text-sm text-foreground mb-1">
              Permanently delete <strong>{hardDeleteTarget.name}</strong>?
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              This will also delete all chat threads, messages, landlord invites, CRM deals, and favourites linked to this property.
            </p>
            <div className="mb-4">
              <label className="text-xs font-semibold text-foreground block mb-1.5">Enter PIN to confirm</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full h-11 px-3 rounded-lg border border-border bg-background text-center text-lg font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-red-500"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setHardDeleteTarget(null); setPin(''); }}
                className="flex-1 h-11 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => hardDeleteMutation.mutate({ id: hardDeleteTarget.id, userPin: pin })}
                disabled={hardDeleteMutation.isPending || pin.length !== 4}
                className="flex-1 h-11 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {hardDeleteMutation.isPending ? 'Deleting...' : 'Hard Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
