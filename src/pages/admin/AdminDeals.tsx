import { useState, useRef } from 'react';
import {
  ChevronDown, ChevronUp, ExternalLink, Upload, X, MessageCircle,
  Edit2, Trash2, Download, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/lib/auditLog';

type Tab = 'pending' | 'live' | 'inactive';

interface AIPricingResult {
  estimated_nightly_rate: number;
  estimated_monthly_revenue: number;
  estimated_profit: number;
  confidence: string;
  notes: string;
  airbnb_url_7d?: string;
  airbnb_url_30d?: string;
  airbnb_url_90d?: string;
}

const N8N_BASE = (import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.srv886554.hstgr.cloud').replace(/\/$/, '');

export default function AdminDeals() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [hardDeleteTarget, setHardDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [pin, setPin] = useState('');
  const [pricingLoading, setPricingLoading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Data ──────────────────────────────────────────────────────
  const { data: allProperties = [] } = useQuery({
    queryKey: ['admin-deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const pending = allProperties.filter(p => p.status === 'pending');
  const live = allProperties.filter(p => p.status === 'live' || p.status === 'on-offer');
  const inactive = allProperties.filter(p => p.status === 'inactive');

  const currentList = tab === 'pending' ? pending : tab === 'live' ? live : inactive;
  const featuredCount = allProperties.filter(p => p.featured).length;

  // ── Approve / Reject (from Submissions) ──────────────────────
  const approve = async (id: string) => {
    const submission = allProperties.find(s => s.id === id);
    const { error } = await supabase.from('properties').update({ status: 'live' }).eq('id', id);
    if (error) { toast.error(`Approve failed: ${error.message}`); return; }
    toast.success('Published');
    queryClient.invalidateQueries({ queryKey: ['admin-deals'] });

    if (user) logAdminAction(user.id, { action: 'approve_deal', target_table: 'properties', target_id: id, metadata: { city: submission?.city, name: submission?.name } });

    if (submission?.contact_email) {
      supabase.functions.invoke('send-email', {
        body: { type: 'deal-approved-member', data: { memberEmail: submission.contact_email, name: submission.name, city: submission.city } },
      }).catch(() => {});
    }

    if (submission?.submitted_by) {
      (supabase.from('notifications') as any).insert({
        user_id: submission.submitted_by,
        type: 'deal_approved',
        title: 'Deal approved',
        body: `Your deal "${submission.name}" in ${submission.city} is now live.`,
        property_id: id,
      }).then(() => {}).catch(() => {});
    }
  };

  const reject = async (id: string) => {
    const submission = allProperties.find(s => s.id === id);
    const { error } = await supabase.from('properties').update({ status: 'inactive' }).eq('id', id);
    if (error) { toast.error(`Reject failed: ${error.message}`); return; }
    toast.error('Rejected');
    queryClient.invalidateQueries({ queryKey: ['admin-deals'] });

    if (user) logAdminAction(user.id, { action: 'reject_deal', target_table: 'properties', target_id: id, metadata: { city: submission?.city, name: submission?.name } });

    if (submission?.contact_email) {
      supabase.functions.invoke('send-email', {
        body: { type: 'deal-rejected-member', data: { memberEmail: submission.contact_email, name: submission.name, city: submission.city } },
      }).catch(() => {});
    }

    if (submission?.submitted_by) {
      (supabase.from('notifications') as any).insert({
        user_id: submission.submitted_by,
        type: 'deal_rejected',
        title: 'Deal not approved',
        body: `Your deal "${submission.name}" in ${submission.city} was not approved.`,
        property_id: id,
      }).then(() => {}).catch(() => {});
    }
  };

  // ── Featured toggle (from Listings) ──────────────────────────
  const toggleFeatured = async (id: string) => {
    const item = allProperties.find(d => d.id === id);
    if (!item) return;
    if (!item.featured && featuredCount >= 3) {
      toast.error('Maximum 3 featured listings allowed');
      return;
    }
    await supabase.from('properties').update({ featured: !item.featured }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
    toast.success('Updated');
    if (user) logAdminAction(user.id, { action: item.featured ? 'remove_featured' : 'add_featured', target_table: 'properties', target_id: id, metadata: { name: item.name } });
  };

  // ── Status change ────────────────────────────────────────────
  const changeStatus = async (id: string, status: string) => {
    await supabase.from('properties').update({ status }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
    toast.success('Status updated');
  };

  // ── Edit (inline form) ──────────────────────────────────────
  const startEdit = (p: typeof allProperties[0]) => {
    setEditingId(p.id);
    setEditForm({
      name: p.name || '',
      city: p.city || '',
      postcode: (p as Record<string, unknown>).postcode || '',
      type: p.type || '',
      bedrooms: (p as Record<string, unknown>).bedrooms || 0,
      bathrooms: (p as Record<string, unknown>).bathrooms || 0,
      rent_monthly: p.rent_monthly ?? 0,
      profit_est: p.profit_est ?? 0,
      deposit: (p as Record<string, unknown>).deposit || 0,
      agent_fee: (p as Record<string, unknown>).agent_fee || 0,
      contact_name: (p as Record<string, unknown>).contact_name || '',
      contact_phone: (p as Record<string, unknown>).contact_phone || '',
      contact_email: (p as Record<string, unknown>).contact_email || '',
      notes: (p as Record<string, unknown>).notes || '',
      status: p.status || 'live',
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase.from('properties').update({
      name: editForm.name as string,
      city: editForm.city as string,
      postcode: editForm.postcode as string,
      type: editForm.type as string,
      bedrooms: Number(editForm.bedrooms),
      bathrooms: Number(editForm.bathrooms),
      rent_monthly: Number(editForm.rent_monthly),
      profit_est: Number(editForm.profit_est),
      deposit: Number(editForm.deposit) || null,
      agent_fee: Number(editForm.agent_fee) || null,
      contact_name: editForm.contact_name as string,
      contact_phone: editForm.contact_phone as string,
      contact_email: editForm.contact_email as string,
      notes: editForm.notes as string,
    } as any).eq('id', editingId);
    if (error) { toast.error('Save failed: ' + error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
    setEditingId(null);
    toast.success('Property updated');
    if (user) logAdminAction(user.id, { action: 'edit_property', target_table: 'properties', target_id: editingId, metadata: { name: editForm.name as string } });
  };

  // ── Delete ───────────────────────────────────────────────────
  const deleteProperty = async (id: string) => {
    await supabase.from('properties').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
    toast.success('Property deleted');
  };

  const hardDeleteMutation = useMutation({
    mutationFn: async ({ id, userPin }: { id: string; userPin: string }) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/hard-delete-property`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ propertyId: id, pin: userPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
      setHardDeleteTarget(null);
      setPin('');
      toast.success('Property permanently deleted with all linked data');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to hard delete'),
  });

  // ── CSV (from Listings) ──────────────────────────────────────
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) { toast.error('CSV must have header + data rows'); return; }
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
    if (error) { toast.error('Import failed: ' + error.message); } else {
      toast.success(`${properties.length} properties imported!`);
      queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
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
    a.href = url; a.download = 'nfstay-properties-template.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  // ── Airbnb pricing re-fetch ──────────────────────────────────
  const refetchPricing = async (p: typeof allProperties[0]) => {
    setPricingLoading(p.id);
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 15_000);
    try {
      const res = await fetch(`${N8N_BASE}/webhook/airbnb-pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: p.city || '',
          postcode: (p as Record<string, unknown>).postcode || '',
          bedrooms: (p as Record<string, unknown>).bedrooms || 0,
          bathrooms: (p as Record<string, unknown>).bathrooms || 0,
          type: p.type || 'Flat',
          rent: p.rent_monthly || 0,
          propertyId: p.id,
        }),
        signal: c.signal,
      });
      clearTimeout(t);
      if (!res.ok) { toast.error('Pricing fetch failed'); setPricingLoading(null); return; }
      const data: AIPricingResult = await res.json();
      if (!data?.estimated_nightly_rate) { toast.error('No pricing data returned'); setPricingLoading(null); return; }
      await supabase.from('properties').update({
        estimated_nightly_rate: data.estimated_nightly_rate,
        estimated_monthly_revenue: data.estimated_monthly_revenue,
        estimated_profit: data.estimated_profit,
        profit_est: data.estimated_profit || 0,
        estimation_confidence: data.confidence,
        estimation_notes: data.notes,
        airbnb_search_url_7d: data.airbnb_url_7d || null,
        airbnb_search_url_30d: data.airbnb_url_30d || null,
        airbnb_search_url_90d: data.airbnb_url_90d || null,
        ai_model_used: 'gpt-4o-mini',
      } as any).eq('id', p.id);
      queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
      toast.success('Pricing updated');
    } catch {
      clearTimeout(t);
      toast.error('Pricing request timed out');
    }
    setPricingLoading(null);
  };

  // ── Helpers ──────────────────────────────────────────────────
  const LISTER_LABELS: Record<string, string> = { landlord: 'Landlord', agent: 'Agent', deal_sourcer: 'Deal Sourcer' };
  const SOURCE_LABELS: Record<string, string> = { quick_list: 'Quick List', self_submitted: 'Self-submitted' };

  const statusBadge = (status: string) => {
    if (status === 'live') return <span className="badge-green">Live</span>;
    if (status === 'pending') return <span className="badge-amber">Pending</span>;
    if (status === 'inactive') return <span className="badge-gray">Inactive</span>;
    if (status === 'on-offer') return <span className="badge-blue">On offer</span>;
    return <span className="badge-gray">{status}</span>;
  };

  const sourceTag = (s: Record<string, unknown>) => {
    const src = SOURCE_LABELS[(s.source as string) || 'self_submitted'] || 'Self-submitted';
    const lister = LISTER_LABELS[(s.lister_type as string) || ''] || '';
    const label = lister ? `${src} - ${lister}` : src;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary text-muted-foreground border border-border">{label}</span>;
  };

  const saLabel = (sa: string | null) => {
    if (sa === 'yes') return <span className="text-emerald-600 font-medium">Yes</span>;
    if (sa === 'no') return <span className="text-red-500 font-medium">No</span>;
    return <span className="text-amber-500 font-medium">Awaiting</span>;
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div data-feature="ADMIN">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-bold text-foreground">Deals ({allProperties.length})</h1>
        {tab === 'live' && (
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
            <button onClick={downloadCSVTemplate} className="h-11 px-5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors inline-flex items-center gap-2">
              <Download className="w-4 h-4" /> CSV Template
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="h-11 px-5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors inline-flex items-center gap-2">
              <Upload className="w-4 h-4" /> Import CSV
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { key: 'pending' as Tab, label: 'Pending Review', count: pending.length },
          { key: 'live' as Tab, label: 'Live', count: live.length },
          { key: 'inactive' as Tab, label: 'Inactive', count: inactive.length },
        ]).map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setExpandedId(null); }}
            className={`px-4 py-1.5 rounded-full text-[13px] font-semibold capitalize transition-colors inline-flex items-center gap-1.5 ${tab === t.key ? 'bg-nfstay-black text-nfstay-black-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
            {t.count > 0 && (
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/20 text-white' : t.key === 'pending' ? 'bg-destructive text-white' : 'bg-secondary text-muted-foreground'}`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── PENDING TAB (card-based, expandable with edit + pricing) ── */}
      {tab === 'pending' && (
        <div className="space-y-3">
          {currentList.map(s => (
            <div key={s.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">{s.name}</span>
                    {statusBadge(s.status)}
                    {sourceTag(s as Record<string, unknown>)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.city} · {(s as Record<string, unknown>).postcode as string} · £{s.rent_monthly?.toLocaleString()}/mo</p>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <button onClick={() => startEdit(s)} className="text-xs text-primary font-medium inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-secondary"><Edit2 className="w-3 h-3" /> Edit</button>
                  <button onClick={() => approve(s.id)} className="text-xs bg-nfstay-black text-nfstay-black-foreground px-3 py-1.5 rounded-lg font-medium hover:opacity-90">Approve</button>
                  <button onClick={() => reject(s.id)} className="text-xs text-destructive font-medium px-2">Reject</button>
                </div>
                {expandedId === s.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>

              {expandedId === s.id && (
                <div className="border-t border-border p-4 space-y-4">
                  {/* Property details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Detail label="Type" value={s.type} />
                    <Detail label="Category" value={(s as Record<string, unknown>).property_category as string || '-'} />
                    <Detail label="Bedrooms" value={(s as Record<string, unknown>).bedrooms?.toString() || '-'} />
                    <Detail label="Bathrooms" value={(s as Record<string, unknown>).bathrooms?.toString() || '-'} />
                    <Detail label="Garage" value={(s as Record<string, unknown>).garage ? 'Yes' : 'No'} />
                    <Detail label="SA Approved" value={saLabel(s.sa_approved)} />
                    <Detail label="Rent" value={`£${s.rent_monthly?.toLocaleString()}`} />
                    <Detail label="Est. Profit" value={`£${s.profit_est?.toLocaleString()}`} />
                    <Detail label="Deposit" value={(s as Record<string, unknown>).deposit ? `£${((s as Record<string, unknown>).deposit as number).toLocaleString()}` : '-'} />
                    <Detail label="Agent Fee" value={(s as Record<string, unknown>).agent_fee ? `£${((s as Record<string, unknown>).agent_fee as number).toLocaleString()}` : '-'} />
                    <Detail label="Created" value={new Date(s.created_at).toLocaleDateString()} />
                  </div>

                  {/* Airbnb Pricing */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-xs font-semibold text-foreground">Airbnb Pricing</h4>
                      <button onClick={() => refetchPricing(s)} disabled={pricingLoading === s.id}
                        className="text-[10px] text-primary font-medium inline-flex items-center gap-1 hover:opacity-75 disabled:opacity-50">
                        <RefreshCw className={`w-3 h-3 ${pricingLoading === s.id ? 'animate-spin' : ''}`} />
                        {pricingLoading === s.id ? 'Fetching...' : 'Re-fetch'}
                      </button>
                    </div>
                    {(s as Record<string, unknown>).estimated_nightly_rate ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Detail label="Nightly Rate" value={`£${(s as Record<string, unknown>).estimated_nightly_rate}`} />
                        <Detail label="Monthly Revenue" value={`£${((s as Record<string, unknown>).estimated_monthly_revenue as number)?.toLocaleString()}`} />
                        <Detail label="Est. Profit" value={`£${((s as Record<string, unknown>).estimated_profit as number)?.toLocaleString()}`} />
                        <Detail label="Confidence" value={
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            (s as Record<string, unknown>).estimation_confidence === 'High' ? 'bg-emerald-100 text-emerald-700' :
                            (s as Record<string, unknown>).estimation_confidence === 'Medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{(s as Record<string, unknown>).estimation_confidence as string || '-'}</span>
                        } />
                        {(s as Record<string, unknown>).airbnb_search_url_30d && (
                          <div className="col-span-full flex gap-3">
                            {(s as Record<string, unknown>).airbnb_search_url_7d && (
                              <a href={(s as Record<string, unknown>).airbnb_search_url_7d as string} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-medium inline-flex items-center gap-1 hover:underline"><ExternalLink className="w-3 h-3" /> 7-day comps</a>
                            )}
                            <a href={(s as Record<string, unknown>).airbnb_search_url_30d as string} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-medium inline-flex items-center gap-1 hover:underline"><ExternalLink className="w-3 h-3" /> 30-day comps</a>
                            {(s as Record<string, unknown>).airbnb_search_url_90d && (
                              <a href={(s as Record<string, unknown>).airbnb_search_url_90d as string} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-medium inline-flex items-center gap-1 hover:underline"><ExternalLink className="w-3 h-3" /> 90-day comps</a>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No pricing data yet. Click Re-fetch to get Airbnb estimates.</p>
                    )}
                  </div>

                  {/* Contact */}
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-2">Contact</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Detail label="Name" value={(s as Record<string, unknown>).contact_name as string || '-'} />
                      <Detail label="Phone" value={(s as Record<string, unknown>).contact_phone as string || '-'} />
                      <Detail label="WhatsApp" value={(s as Record<string, unknown>).contact_whatsapp as string || s.landlord_whatsapp || '-'} />
                      <Detail label="Email" value={(s as Record<string, unknown>).contact_email as string || '-'} />
                    </div>
                  </div>

                  {/* Labels */}
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-2">Labels</h4>
                    <div className="flex gap-3">
                      <button
                        onClick={async () => {
                          const newVal = !s.featured;
                          if (newVal && featuredCount >= 3) { toast.error('Maximum 3 featured'); return; }
                          await supabase.from('properties').update({ featured: newVal }).eq('id', s.id);
                          queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
                          toast.success(newVal ? 'Marked as Featured' : 'Removed Featured');
                          if (user) logAdminAction(user.id, { action: newVal ? 'add_featured' : 'remove_featured', target_table: 'properties', target_id: s.id, metadata: { name: s.name } });
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${s.featured ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-secondary text-muted-foreground border border-border hover:border-emerald-300'}`}
                      >
                        {s.featured ? '+ Featured' : '+ Featured'}
                      </button>
                      <button
                        onClick={async () => {
                          const newVal = !(s as Record<string, unknown>).prime;
                          await supabase.from('properties').update({ prime: newVal } as any).eq('id', s.id);
                          queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
                          toast.success(newVal ? 'Marked as Joint Venture' : 'Removed Joint Venture');
                          if (user) logAdminAction(user.id, { action: newVal ? 'add_prime' : 'remove_prime', target_table: 'properties', target_id: s.id, metadata: { name: s.name } });
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${(s as Record<string, unknown>).prime ? 'border border-[#C9A842]' : 'bg-secondary text-muted-foreground border border-border hover:border-[#C9A842]'}`}
                        style={(s as Record<string, unknown>).prime ? { background: 'linear-gradient(135deg, #FDF5D6, #F5E6A3, #E8D478)', color: '#8B6914', borderColor: '#C9A842' } : undefined}
                      >
                        {(s as Record<string, unknown>).prime ? 'Joint Venture' : '+ Joint Venture'}
                      </button>
                    </div>
                  </div>

                  {/* Notes */}
                  {((s as Record<string, unknown>).notes || s.description) && (
                    <div>
                      <h4 className="text-xs font-semibold text-foreground mb-1">Notes</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(s as Record<string, unknown>).notes as string || s.description}</p>
                    </div>
                  )}

                  {/* Photos */}
                  {s.photos && s.photos.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-foreground mb-2">Photos ({s.photos.length})</h4>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {s.photos.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="relative rounded-lg overflow-hidden aspect-square group">
                            <img src={url} className="w-full h-full object-cover" alt={`Photo ${i + 1}`} />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <ExternalLink className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {currentList.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">No pending submissions.</p>
          )}
        </div>
      )}

      {/* ── LIVE TAB (table-based, from Listings) ── */}
      {tab === 'live' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-border">
                {['Name', 'City', 'Type', 'Rent', 'Profit', 'Status', 'Featured', 'WhatsApp', 'Actions'].map(h => (
                  <th key={h} className="text-left p-3.5 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentList.map((l, i) => (
                <tr key={l.id} className={i % 2 === 1 ? 'bg-secondary' : ''}>
                  <td className="p-3.5 font-medium text-foreground">{l.name || '-'}</td>
                  <td className="p-3.5 text-muted-foreground">{l.city || '-'}</td>
                  <td className="p-3.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full text-white ${(l as Record<string, unknown>).listing_type === 'sale' ? 'bg-emerald-600' : 'bg-[#1E9A80]'}`}>
                      {(l as Record<string, unknown>).listing_type === 'sale' ? 'Sale' : 'Rental'}
                    </span>
                  </td>
                  <td className="p-3.5 text-foreground">£{(l.rent_monthly ?? 0).toLocaleString()}</td>
                  <td className="p-3.5 text-accent-foreground font-medium">£{(l.profit_est ?? 0).toLocaleString()}</td>
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
                    ) : <span className="text-muted-foreground text-xs">-</span>}
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
          {currentList.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">No live listings.</p>
          )}
        </div>
      )}

      {/* ── INACTIVE TAB (card-based, simpler) ── */}
      {tab === 'inactive' && (
        <div className="space-y-3">
          {currentList.map(s => (
            <div key={s.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">{s.name}</span>
                    {statusBadge(s.status)}
                    {sourceTag(s as Record<string, unknown>)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.city} · £{s.rent_monthly?.toLocaleString()}/mo</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => changeStatus(s.id, 'pending')} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-medium hover:opacity-90">Reactivate</button>
                  <button onClick={() => setHardDeleteTarget({ id: s.id, name: s.name })} className="text-xs font-medium px-2 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors inline-flex items-center gap-1"><Trash2 className="w-3 h-3" /> Hard Delete</button>
                </div>
              </div>
            </div>
          ))}
          {currentList.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">No inactive deals.</p>
          )}
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editingId && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => setEditingId(null)}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-[520px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Edit Property</h2>
              <button onClick={() => setEditingId(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <Field label="Name" value={editForm.name as string} onChange={v => setEditForm(p => ({ ...p, name: v }))} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="City" value={editForm.city as string} onChange={v => setEditForm(p => ({ ...p, city: v }))} />
                <Field label="Postcode" value={editForm.postcode as string} onChange={v => setEditForm(p => ({ ...p, postcode: v }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Type" value={editForm.type as string} onChange={v => setEditForm(p => ({ ...p, type: v }))} />
                <Field label="Bedrooms" value={String(editForm.bedrooms)} onChange={v => setEditForm(p => ({ ...p, bedrooms: v }))} type="number" />
                <Field label="Bathrooms" value={String(editForm.bathrooms)} onChange={v => setEditForm(p => ({ ...p, bathrooms: v }))} type="number" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Rent (£/mo)" value={String(editForm.rent_monthly)} onChange={v => setEditForm(p => ({ ...p, rent_monthly: v }))} type="number" />
                <Field label="Est. Profit (£)" value={String(editForm.profit_est)} onChange={v => setEditForm(p => ({ ...p, profit_est: v }))} type="number" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Deposit (£)" value={String(editForm.deposit)} onChange={v => setEditForm(p => ({ ...p, deposit: v }))} type="number" />
                <Field label="Agent Fee (£)" value={String(editForm.agent_fee)} onChange={v => setEditForm(p => ({ ...p, agent_fee: v }))} type="number" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Contact Name" value={editForm.contact_name as string} onChange={v => setEditForm(p => ({ ...p, contact_name: v }))} />
                <Field label="Contact Phone" value={editForm.contact_phone as string} onChange={v => setEditForm(p => ({ ...p, contact_phone: v }))} />
              </div>
              <Field label="Contact Email" value={editForm.contact_email as string} onChange={v => setEditForm(p => ({ ...p, contact_email: v }))} />
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Notes</label>
                <textarea value={editForm.notes as string} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full h-20 rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none" />
              </div>
              {tab !== 'pending' && (
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Status</label>
                  <select value={editForm.status as string} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
                    <option value="live">Live</option>
                    <option value="on-offer">On offer</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              )}
              <button onClick={saveEdit} className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hard Delete PIN Dialog ── */}
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
              <input type="password" inputMode="numeric" maxLength={4} value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="----"
                className="w-full h-11 px-3 rounded-lg border border-border bg-background text-center text-lg font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-red-500" autoFocus />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setHardDeleteTarget(null); setPin(''); }} className="flex-1 h-11 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button onClick={() => hardDeleteMutation.mutate({ id: hardDeleteTarget.id, userPin: pin })}
                disabled={hardDeleteMutation.isPending || pin.length !== 4}
                className="flex-1 h-11 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50">
                {hardDeleteMutation.isPending ? 'Deleting...' : 'Hard Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-[11px] text-muted-foreground block">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold text-foreground block mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" />
    </div>
  );
}
