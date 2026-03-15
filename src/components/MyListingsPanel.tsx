/**
 * MyListingsPanel — shows all properties submitted by the current user.
 *
 * Expected behaviour:
 * - Fetches properties where submitted_by = userId, ordered by created_at DESC
 * - Subscribes to realtime changes for live status updates
 * - Horizontal cards with status badge, edit (inline expand), delete (confirm)
 * - Edit saves to DB, sets status='pending', sets edit_requested_at
 * - Delete requires confirmation, enforces submitted_by = userId
 * - Empty state prompts user to submit first deal
 */

import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const N8N_BASE = (import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.srv886554.hstgr.cloud').replace(/\/$/, '');

interface PropertyRow {
  id: string;
  name: string;
  city: string;
  postcode: string;
  type: string;
  bedrooms: number | null;
  bathrooms: number | null;
  rent_monthly: number;
  profit_est: number;
  status: string;
  description: string | null;
  notes: string | null;
  photos: string[] | null;
  sa_approved: string | null;
  deposit: number | null;
  edit_requested_at: string | null;
  created_at: string;
}

function getStatusBadge(status: string, editRequestedAt: string | null) {
  if (editRequestedAt && status === 'pending') return { label: '✏️ Edit Under Review', cls: 'bg-amber-100 text-amber-800' };
  switch (status) {
    case 'pending':  return { label: '⏳ Awaiting Approval', cls: 'bg-amber-100 text-amber-800' };
    case 'approved': return { label: '✅ Approved', cls: 'bg-emerald-100 text-emerald-800' };
    case 'live':     return { label: '🟢 Live', cls: 'bg-emerald-100 text-emerald-800' };
    case 'inactive': return { label: 'Draft', cls: 'bg-gray-100 text-gray-600' };
    case 'on-offer': return { label: 'On Offer', cls: 'bg-blue-100 text-blue-800' };
    default:         return { label: status, cls: 'bg-gray-100 text-gray-600' };
  }
}

interface Props {
  userId: string | undefined;
}

export default function MyListingsPanel({ userId }: Props) {
  const [listings, setListings] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ city: '', postcode: '', rent: '', profit: '', description: '', notes: '' });
  const [saving, setSaving] = useState(false);

  // Fetch user's submissions
  const fetchListings = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    // properties columns not fully in generated types — cast needed
    const { data } = await (supabase.from('properties') as any)
      .select('id, name, city, postcode, type, bedrooms, bathrooms, rent_monthly, profit_est, status, description, notes, photos, sa_approved, deposit, edit_requested_at, created_at')
      .eq('submitted_by', userId)
      .order('created_at', { ascending: false });
    if (data) setListings(data as PropertyRow[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  // Realtime subscription for live status updates
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('my-listings')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'properties',
        filter: `submitted_by=eq.${userId}`,
      }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setListings(prev => prev.filter(l => l.id !== (payload.old as PropertyRow).id));
        } else if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          const updated = payload.new as PropertyRow;
          setListings(prev => {
            const exists = prev.find(l => l.id === updated.id);
            if (exists) return prev.map(l => l.id === updated.id ? updated : l);
            return [updated, ...prev];
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const startEdit = (listing: PropertyRow) => {
    setEditingId(listing.id);
    setEditForm({
      city: listing.city,
      postcode: listing.postcode,
      rent: String(listing.rent_monthly),
      profit: String(listing.profit_est),
      description: listing.description || '',
      notes: listing.notes || '',
    });
  };

  const handleSaveEdit = async (propertyId: string) => {
    if (!userId) return;
    setSaving(true);
    try {
      // Update property, set back to pending with edit timestamp
      const { error } = await (supabase.from('properties') as any).update({
        city: editForm.city,
        postcode: editForm.postcode,
        rent_monthly: parseInt(editForm.rent) || 0,
        profit_est: parseInt(editForm.profit) || 0,
        description: editForm.description || null,
        notes: editForm.notes || null,
        status: 'pending',
        edit_requested_at: new Date().toISOString(),
      }).eq('id', propertyId).eq('submitted_by', userId);

      if (error) throw error;

      // Fire n8n notification (non-blocking, 10s timeout)
      const listing = listings.find(l => l.id === propertyId);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      fetch(`${N8N_BASE}/webhook/notify-admin-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          city: editForm.city,
          type: listing?.type || '',
          editedBy: userId,
        }),
        signal: controller.signal,
      }).catch(() => {}).finally(() => clearTimeout(timeout));

      setEditingId(null);
      toast.success('Edit submitted — awaiting admin approval');
      fetchListings();
    } catch {
      toast.error('Failed to save edit');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;
    const confirmed = window.confirm('Are you sure you want to delete this listing? This cannot be undone.');
    if (!confirmed) return;

    // Optimistic removal
    setListings(prev => prev.filter(l => l.id !== id));

    const { error } = await (supabase.from('properties') as any)
      .delete()
      .eq('id', id)
      .eq('submitted_by', userId);

    if (error) {
      toast.error('Failed to delete');
      fetchListings(); // re-fetch to restore
    } else {
      toast.success('Listing deleted');
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-xl bg-secondary animate-pulse" />
        ))}
      </div>
    );
  }

  if (!userId || listings.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-base font-bold text-foreground mb-2">My Listings</h3>
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No listings yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Submit your first deal using the form.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <h3 className="text-base font-bold text-foreground mb-4">My Listings ({listings.length})</h3>
      <div className="space-y-3">
        {listings.map(listing => {
          const badge = getStatusBadge(listing.status, listing.edit_requested_at);
          const isEditing = editingId === listing.id;
          const photo = listing.photos?.[0];

          return (
            <div key={listing.id} className="border border-border rounded-xl overflow-hidden">
              {/* Card row */}
              <div className="flex items-start gap-3 p-3">
                {/* Photo */}
                <div className="w-[60px] h-[60px] rounded-lg bg-secondary flex-shrink-0 overflow-hidden">
                  {photo ? (
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No img</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{listing.city} · {listing.postcode}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{listing.type}{listing.bedrooms ? ` · ${listing.bedrooms} bed` : ''}</div>
                  <div className="text-xs font-medium text-foreground mt-1">£{listing.rent_monthly.toLocaleString()}/mo</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => isEditing ? setEditingId(null) : startEdit(listing)}
                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                    title={isEditing ? 'Cancel edit' : 'Edit'}
                  >
                    {isEditing ? <X className="w-3.5 h-3.5 text-muted-foreground" /> : <Pencil className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                  <button
                    onClick={() => handleDelete(listing.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>

              {/* Inline edit form */}
              {isEditing && (
                <div className="border-t border-border p-3 bg-secondary/30 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-foreground block mb-1">City</label>
                      <input value={editForm.city} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))} className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-foreground block mb-1">Postcode</label>
                      <input value={editForm.postcode} onChange={e => setEditForm(p => ({ ...p, postcode: e.target.value }))} className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-foreground block mb-1">Rent (£)</label>
                      <input type="number" value={editForm.rent} onChange={e => setEditForm(p => ({ ...p, rent: e.target.value }))} className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-foreground block mb-1">Profit (£)</label>
                      <input type="number" value={editForm.profit} onChange={e => setEditForm(p => ({ ...p, profit: e.target.value }))} className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-foreground block mb-1">Description</label>
                    <textarea rows={2} value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs resize-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-foreground block mb-1">Notes (admin only)</label>
                    <textarea rows={2} value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs resize-none" />
                  </div>
                  <button
                    onClick={() => handleSaveEdit(listing.id)}
                    disabled={saving}
                    className="w-full h-8 rounded-lg bg-nfstay-black text-nfstay-black-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Save & Submit for Review'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
