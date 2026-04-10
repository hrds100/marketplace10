import { useState, useRef, useMemo } from 'react';
import {
  ChevronDown, ChevronUp, ExternalLink, Upload, X, MessageCircle,
  Edit2, Trash2, Download, AlertTriangle, RefreshCw, Users, List,
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

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co').replace(/\/$/, '');
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkPin, setBulkPin] = useState('');

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

  // ── Grouped view ────────────────────────────────────────────
  const [groupView, setGroupView] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  interface LandlordGroup {
    phone: string;
    name: string | null;
    email: string | null;
    properties: typeof allProperties;
  }

  const groupedByLandlord = useMemo(() => {
    const map = new Map<string, LandlordGroup>();
    for (const p of currentList) {
      const phone = (p as Record<string, unknown>).landlord_whatsapp as string || (p as Record<string, unknown>).contact_phone as string || 'unknown';
      if (!map.has(phone)) {
        map.set(phone, {
          phone,
          name: (p as Record<string, unknown>).contact_name as string || null,
          email: (p as Record<string, unknown>).contact_email as string || null,
          properties: [],
        });
      }
      map.get(phone)!.properties.push(p);
    }
    return Array.from(map.values()).sort((a, b) => b.properties.length - a.properties.length);
  }, [currentList]);

  const toggleGroup = (phone: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  };

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
      description: p.description || '',
      lister_type: (p as Record<string, unknown>).lister_type || 'deal_sourcer',
      sa_approved: (p as Record<string, unknown>).sa_approved || 'yes',
      listing_type: (p as Record<string, unknown>).listing_type || 'rental',
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
      description: editForm.description as string,
      lister_type: editForm.lister_type as string,
      sa_approved: editForm.sa_approved as string,
      listing_type: editForm.listing_type as string,
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

  // Bulk hard delete mutation
  const bulkHardDeleteMutation = useMutation({
    mutationFn: async ({ ids, userPin }: { ids: string[]; userPin: string }) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/hard-delete-property`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ propertyIds: ids, pin: userPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to bulk delete');
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
      setBulkDeleteOpen(false);
      setBulkPin('');
      setSelectedIds(new Set());
      toast.success(`${variables.ids.length} deal(s) permanently deleted`);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to bulk delete'),
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === currentList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentList.map(p => p.id)));
    }
  };

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
    const t = setTimeout(() => c.abort(), 90_000);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/airbnb-pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
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
      const data = await res.json() as AIPricingResult & { error?: string };
      if (data.error === 'no_real_data') {
        // Save the Airbnb URLs even if no pricing data
        await supabase.from('properties').update({
          estimation_confidence: 'low',
          estimation_notes: data.notes || 'Could not access real Airbnb data — check links manually',
          airbnb_search_url_7d: data.airbnb_url_7d || null,
          airbnb_search_url_30d: data.airbnb_url_30d || null,
          airbnb_search_url_90d: data.airbnb_url_90d || null,
          ai_model_used: 'gpt-4o',
        } as any).eq('id', p.id);
        queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
        toast.error('AI could not access real Airbnb data — use the Airbnb links to check manually');
        setPricingLoading(null);
        return;
      }
      if (!data.estimated_nightly_rate) { toast.error('No pricing data returned'); setPricingLoading(null); return; }
      await supabase.from('properties').update({
        estimated_nightly_rate: data.estimated_nightly_rate,
        estimated_monthly_revenue: data.estimated_monthly_revenue,
        estimated_profit: data.estimated_monthly_revenue,
        profit_est: data.estimated_monthly_revenue || 0,
        estimation_confidence: data.confidence,
        estimation_notes: data.notes,
        airbnb_search_url_7d: data.airbnb_url_7d || null,
        airbnb_search_url_30d: data.airbnb_url_30d || null,
        airbnb_search_url_90d: data.airbnb_url_90d || null,
        ai_model_used: 'gpt-4o',
      } as any).eq('id', p.id);
      queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
      toast.success('Pricing updated');
    } catch {
      clearTimeout(t);
      toast.error('Pricing request timed out — web search takes up to 60s, try again');
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
      <div className="flex items-center gap-2 mb-6">
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
        <div className="ml-auto">
          <button
            data-testid="group-toggle"
            onClick={() => setGroupView(!groupView)}
            className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors inline-flex items-center gap-1.5 border border-border hover:bg-secondary text-muted-foreground"
          >
            {groupView ? <><Users className="w-3.5 h-3.5" /> Grouped by landlord</> : <><List className="w-3.5 h-3.5" /> Flat list</>}
          </button>
        </div>
      </div>

      {/* ── PENDING TAB (card-based, expandable with edit + pricing) ── */}
      {tab === 'pending' && groupView && (
        <div className="space-y-4" data-testid="grouped-view">
          {groupedByLandlord.map(group => (
            <div key={group.phone} className="bg-card border border-border rounded-2xl overflow-hidden">
              {/* Landlord group header */}
              <div
                data-testid="landlord-group-header"
                className="flex items-center gap-4 p-4 cursor-pointer bg-secondary/50 hover:bg-secondary transition-colors"
                onClick={() => toggleGroup(group.phone)}
              >
                <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{group.name || 'Unknown'}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#1E9A80]">
                      {group.properties.length} {group.properties.length === 1 ? 'property' : 'properties'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {group.phone !== 'unknown' ? group.phone : 'No phone'}
                    {group.email ? ` · ${group.email}` : ''}
                  </p>
                </div>
                {collapsedGroups.has(group.phone)
                  ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
              </div>

              {/* Properties inside group */}
              {!collapsedGroups.has(group.phone) && (
                <div className="divide-y divide-border">
                  {group.properties.map(s => (
                    <PropertyCard
                      key={s.id}
                      s={s}
                      expandedId={expandedId}
                      setExpandedId={setExpandedId}
                      statusBadge={statusBadge}
                      sourceTag={sourceTag}
                      saLabel={saLabel}
                      startEdit={startEdit}
                      approve={approve}
                      reject={reject}
                      featuredCount={featuredCount}
                      pricingLoading={pricingLoading}
                      refetchPricing={refetchPricing}
                      queryClient={queryClient}
                      user={user}
                      selected={selectedIds.has(s.id)}
                      onToggleSelect={toggleSelect}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
          {currentList.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">No pending submissions.</p>
          )}
        </div>
      )}

      {tab === 'pending' && !groupView && (
        <div className="space-y-3">
          {currentList.map(s => (
            <div key={s.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)} onClick={e => e.stopPropagation()} className="w-4 h-4 rounded border-border accent-[#1E9A80] cursor-pointer flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">{s.name}</span>
                    {statusBadge(s.status)}
                    {sourceTag(s as Record<string, unknown>)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.city} · {(s as Record<string, unknown>).postcode as string} · £{s.rent_monthly?.toLocaleString()}/mo</p>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  {/* 1st Inquiry toggle */}
                  <label className="flex items-center gap-1.5 cursor-pointer" title="Send multi-step WhatsApp on first tenant inquiry">
                    <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">1st Inquiry</span>
                    <button type="button" role="switch"
                      aria-checked={(s as Record<string, unknown>).first_landlord_inquiry as boolean || false}
                      onClick={async () => {
                        const newVal = !(s as Record<string, unknown>).first_landlord_inquiry;
                        await supabase.from('properties').update({ first_landlord_inquiry: newVal } as any).eq('id', s.id);
                        queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
                        toast.success(newVal ? '1st inquiry flow ON' : '1st inquiry flow OFF');
                        if (user) logAdminAction(user.id, { action: newVal ? 'enable_first_inquiry' : 'disable_first_inquiry', target_table: 'properties', target_id: s.id, metadata: { name: s.name } });
                      }}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${(s as Record<string, unknown>).first_landlord_inquiry ? 'bg-[#1E9A80]' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${(s as Record<string, unknown>).first_landlord_inquiry ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                    </button>
                  </label>
                  {/* NDA Required toggle */}
                  <label className="flex items-center gap-1.5 cursor-pointer" title="Require NDA before showing contact details">
                    <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">NDA</span>
                    <button type="button" role="switch"
                      aria-checked={(s as Record<string, unknown>).nda_required as boolean || false}
                      onClick={async () => {
                        const newVal = !(s as Record<string, unknown>).nda_required;
                        await supabase.from('properties').update({ nda_required: newVal } as any).eq('id', s.id);
                        queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
                        toast.success(newVal ? 'NDA required ON' : 'NDA required OFF');
                        if (user) logAdminAction(user.id, { action: newVal ? 'enable_nda' : 'disable_nda', target_table: 'properties', target_id: s.id, metadata: { name: s.name } });
                      }}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${(s as Record<string, unknown>).nda_required ? 'bg-[#1E9A80]' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${(s as Record<string, unknown>).nda_required ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                    </button>
                  </label>
                  <button onClick={() => startEdit(s)} className="text-xs text-primary font-medium inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-secondary"><Edit2 className="w-3 h-3" /> Edit</button>
                  {(s.status === 'pending' || s.status === 'inactive') && (
                    <>
                      <button onClick={() => approve(s.id)} className="text-xs bg-nfstay-black text-nfstay-black-foreground px-3 py-1.5 rounded-lg font-medium hover:opacity-90">Approve</button>
                      <button onClick={() => reject(s.id)} className="text-xs text-destructive font-medium px-2">Reject</button>
                    </>
                  )}
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
                    <Detail label="Est. Cash Flow" value={`£${s.profit_est?.toLocaleString()}`} />
                    <Detail label="Deposit" value={(s as Record<string, unknown>).deposit ? `£${((s as Record<string, unknown>).deposit as number).toLocaleString()}` : '-'} />
                    <Detail label="Agent Fee" value={(s as Record<string, unknown>).agent_fee ? `£${((s as Record<string, unknown>).agent_fee as number).toLocaleString()}` : '-'} />
                    <Detail label="Lister" value={(s as Record<string, unknown>).lister_type as string || '-'} />
                    <Detail label="Submitted" value={new Date(s.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
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
                        <Detail label="Est. Cash Flow" value={`£${((s as Record<string, unknown>).estimated_profit as number)?.toLocaleString()}`} />
                        <Detail label="Confidence" value={
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            (s as Record<string, unknown>).estimation_confidence === 'High' ? 'bg-emerald-100 text-emerald-700' :
                            (s as Record<string, unknown>).estimation_confidence === 'Medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{(s as Record<string, unknown>).estimation_confidence as string || '-'}</span>
                        } />
                        {(s as Record<string, unknown>).airbnb_search_url_7d && (
                          <div className="col-span-full flex gap-3">
                            <a href={(s as Record<string, unknown>).airbnb_search_url_7d as string} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-medium inline-flex items-center gap-1 hover:underline"><ExternalLink className="w-3 h-3" /> Airbnb 30-day</a>
                            {(s as Record<string, unknown>).airbnb_search_url_30d && (
                              <a href={(s as Record<string, unknown>).airbnb_search_url_30d as string} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-medium inline-flex items-center gap-1 hover:underline"><ExternalLink className="w-3 h-3" /> Airbnb 60-day</a>
                            )}
                            {(s as Record<string, unknown>).airbnb_search_url_90d && (
                              <a href={(s as Record<string, unknown>).airbnb_search_url_90d as string} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-medium inline-flex items-center gap-1 hover:underline"><ExternalLink className="w-3 h-3" /> Airbnb 90-day</a>
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

                  {/* Description */}
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{s.description || <span className="italic">No description</span>}</p>
                  </div>

                  {/* Notes */}
                  {(s as Record<string, unknown>).notes && (
                    <div>
                      <h4 className="text-xs font-semibold text-foreground mb-1">Notes</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(s as Record<string, unknown>).notes as string}</p>
                    </div>
                  )}

                  {/* Photos — with delete + replace */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-xs font-semibold text-foreground">Photos ({s.photos?.length || 0})</h4>
                      <label className="text-[10px] text-primary font-medium inline-flex items-center gap-1 cursor-pointer hover:opacity-75">
                        <Upload className="w-3 h-3" /> Add photo
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const ext = file.name.split('.').pop();
                          const path = `properties/${s.id}/${Date.now()}.${ext}`;
                          const { error: uploadErr } = await supabase.storage.from('property-photos').upload(path, file);
                          if (uploadErr) { toast.error('Upload failed: ' + uploadErr.message); return; }
                          const { data: urlData } = supabase.storage.from('property-photos').getPublicUrl(path);
                          const newPhotos = [...(s.photos || []), urlData.publicUrl];
                          await supabase.from('properties').update({ photos: newPhotos } as any).eq('id', s.id);
                          queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
                          toast.success('Photo added');
                        }} />
                      </label>
                    </div>
                    {s.photos && s.photos.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {s.photos.map((url, i) => (
                          <div key={i} className="relative rounded-lg overflow-hidden aspect-square group">
                            <img src={url} className="w-full h-full object-cover" alt={`Photo ${i + 1}`} />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2">
                              <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                                <ExternalLink className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </a>
                              <button onClick={async () => {
                                const newPhotos = s.photos!.filter((_, idx) => idx !== i);
                                await supabase.from('properties').update({ photos: newPhotos } as any).eq('id', s.id);
                                queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
                                toast.success('Photo removed');
                              }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 className="w-4 h-4 text-red-400 hover:text-red-300" />
                              </button>
                            </div>
                            {/* Replace button */}
                            <label className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-[9px] font-medium px-1.5 py-0.5 rounded cursor-pointer">
                              Replace
                              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const ext = file.name.split('.').pop();
                                const path = `properties/${s.id}/${Date.now()}.${ext}`;
                                const { error: uploadErr } = await supabase.storage.from('property-photos').upload(path, file);
                                if (uploadErr) { toast.error('Upload failed: ' + uploadErr.message); return; }
                                const { data: urlData } = supabase.storage.from('property-photos').getPublicUrl(path);
                                const newPhotos = [...s.photos!];
                                newPhotos[i] = urlData.publicUrl;
                                await supabase.from('properties').update({ photos: newPhotos } as any).eq('id', s.id);
                                queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
                                toast.success('Photo replaced');
                              }} />
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No photos uploaded.</p>
                    )}
                  </div>
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
      {tab === 'live' && groupView && (
        <div className="space-y-4" data-testid="grouped-view">
          {groupedByLandlord.map(group => (
            <div key={group.phone} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div
                data-testid="landlord-group-header"
                className="flex items-center gap-4 p-4 cursor-pointer bg-secondary/50 hover:bg-secondary transition-colors"
                onClick={() => toggleGroup(group.phone)}
              >
                <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{group.name || 'Unknown'}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#1E9A80]">
                      {group.properties.length} {group.properties.length === 1 ? 'property' : 'properties'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {group.phone !== 'unknown' ? group.phone : 'No phone'}
                    {group.email ? ` · ${group.email}` : ''}
                  </p>
                </div>
                {collapsedGroups.has(group.phone)
                  ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
              </div>
              {!collapsedGroups.has(group.phone) && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="p-3.5 w-10">
                          <input type="checkbox" checked={group.properties.length > 0 && group.properties.every(p => selectedIds.has(p.id))} onChange={() => { const allSelected = group.properties.every(p => selectedIds.has(p.id)); setSelectedIds(prev => { const next = new Set(prev); group.properties.forEach(p => allSelected ? next.delete(p.id) : next.add(p.id)); return next; }); }} className="w-4 h-4 rounded border-border accent-[#1E9A80] cursor-pointer" />
                        </th>
                        {['Name', 'City', 'Type', 'Rent', 'Profit', 'Status', 'Featured', 'WhatsApp', 'Actions'].map(h => (
                          <th key={h} className="text-left p-3.5 text-xs font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.properties.map((l, i) => (
                        <LiveTableRow key={l.id} l={l} i={i} changeStatus={changeStatus} toggleFeatured={toggleFeatured} startEdit={startEdit} deleteProperty={deleteProperty} setHardDeleteTarget={setHardDeleteTarget} selected={selectedIds.has(l.id)} onToggleSelect={toggleSelect} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
          {currentList.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">No live listings.</p>
          )}
        </div>
      )}
      {tab === 'live' && !groupView && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-border">
                <th className="p-3.5 w-10">
                  <input type="checkbox" checked={currentList.length > 0 && selectedIds.size === currentList.length} onChange={toggleSelectAll} className="w-4 h-4 rounded border-border accent-[#1E9A80] cursor-pointer" />
                </th>
                {['Name', 'City', 'Type', 'Rent', 'Profit', 'Status', 'Featured', 'WhatsApp', 'Actions'].map(h => (
                  <th key={h} className="text-left p-3.5 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentList.map((l, i) => (
                <LiveTableRow key={l.id} l={l} i={i} changeStatus={changeStatus} toggleFeatured={toggleFeatured} startEdit={startEdit} deleteProperty={deleteProperty} setHardDeleteTarget={setHardDeleteTarget} selected={selectedIds.has(l.id)} onToggleSelect={toggleSelect} />
              ))}
            </tbody>
          </table>
          {currentList.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">No live listings.</p>
          )}
        </div>
      )}

      {/* ── INACTIVE TAB (card-based, simpler) ── */}
      {tab === 'inactive' && groupView && (
        <div className="space-y-4" data-testid="grouped-view">
          {groupedByLandlord.map(group => (
            <div key={group.phone} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div
                data-testid="landlord-group-header"
                className="flex items-center gap-4 p-4 cursor-pointer bg-secondary/50 hover:bg-secondary transition-colors"
                onClick={() => toggleGroup(group.phone)}
              >
                <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{group.name || 'Unknown'}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#1E9A80]">
                      {group.properties.length} {group.properties.length === 1 ? 'property' : 'properties'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {group.phone !== 'unknown' ? group.phone : 'No phone'}
                    {group.email ? ` · ${group.email}` : ''}
                  </p>
                </div>
                {collapsedGroups.has(group.phone)
                  ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
              </div>
              {!collapsedGroups.has(group.phone) && (
                <div className="divide-y divide-border">
                  {group.properties.map(s => (
                    <InactiveCard key={s.id} s={s} statusBadge={statusBadge} sourceTag={sourceTag} changeStatus={changeStatus} setHardDeleteTarget={setHardDeleteTarget} selected={selectedIds.has(s.id)} onToggleSelect={toggleSelect} />
                  ))}
                </div>
              )}
            </div>
          ))}
          {currentList.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">No inactive deals.</p>
          )}
        </div>
      )}
      {tab === 'inactive' && !groupView && (
        <div className="space-y-3">
          {currentList.map(s => (
            <InactiveCard key={s.id} s={s} statusBadge={statusBadge} sourceTag={sourceTag} changeStatus={changeStatus} setHardDeleteTarget={setHardDeleteTarget} />
          ))}
          {currentList.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">No inactive deals.</p>
          )}
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E5E7EB] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-6 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">{selectedIds.size} selected</span>
          <button
            onClick={() => setBulkDeleteOpen(true)}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors inline-flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Hard Delete Selected
          </button>
        </div>
      )}

      {/* Bulk Hard Delete PIN Dialog */}
      {bulkDeleteOpen && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => { setBulkDeleteOpen(false); setBulkPin(''); }}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-[400px]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Bulk Hard Delete</h3>
                <p className="text-xs text-red-600 font-semibold">Permanently delete {selectedIds.size} deal(s) — cannot be undone</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs font-semibold text-foreground block mb-1.5">Enter PIN to confirm</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={bulkPin}
                onChange={e => setBulkPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full h-11 px-3 rounded-lg border border-border bg-background text-center text-lg font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-red-500"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setBulkDeleteOpen(false); setBulkPin(''); }} className="flex-1 h-11 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button
                onClick={() => bulkHardDeleteMutation.mutate({ ids: Array.from(selectedIds), userPin: bulkPin })}
                disabled={bulkHardDeleteMutation.isPending || bulkPin.length !== 4}
                className="flex-1 h-11 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {bulkHardDeleteMutation.isPending ? 'Deleting...' : 'Hard Delete All'}
              </button>
            </div>
          </div>
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
                <Field label="Est. Cash Flow (£)" value={String(editForm.profit_est)} onChange={v => setEditForm(p => ({ ...p, profit_est: v }))} type="number" />
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
                <label className="text-xs font-semibold text-foreground block mb-1">Description</label>
                <textarea value={editForm.description as string} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full h-24 rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Notes</label>
                <textarea value={editForm.notes as string} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full h-20 rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Lister Type</label>
                  <select value={editForm.lister_type as string} onChange={e => setEditForm(p => ({ ...p, lister_type: e.target.value }))} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
                    <option value="deal_sourcer">Deal Sourcer</option>
                    <option value="landlord">Landlord</option>
                    <option value="agent">Agent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">SA Approved</label>
                  <select value={editForm.sa_approved as string} onChange={e => setEditForm(p => ({ ...p, sa_approved: e.target.value }))} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Listing Type</label>
                  <select value={editForm.listing_type as string} onChange={e => setEditForm(p => ({ ...p, listing_type: e.target.value }))} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
                    <option value="rental">Rental</option>
                    <option value="sale">Sale</option>
                  </select>
                </div>
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

/** Reusable live-tab table row used in both flat and grouped views */
function LiveTableRow({ l, i, changeStatus, toggleFeatured, startEdit, deleteProperty, setHardDeleteTarget, selected, onToggleSelect }: {
  l: Record<string, any>;
  i: number;
  changeStatus: (id: string, status: string) => void;
  toggleFeatured: (id: string) => void;
  startEdit: (p: any) => void;
  deleteProperty: (id: string) => void;
  setHardDeleteTarget: (t: { id: string; name: string }) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  return (
    <tr className={i % 2 === 1 ? 'bg-secondary' : ''}>
      {onToggleSelect && (
        <td className="p-3.5 w-10">
          <input type="checkbox" checked={!!selected} onChange={() => onToggleSelect(l.id)} className="w-4 h-4 rounded border-border accent-[#1E9A80] cursor-pointer" />
        </td>
      )}
      <td className="p-3.5 font-medium text-foreground">{l.name || '-'}</td>
      <td className="p-3.5 text-muted-foreground">{l.city || '-'}</td>
      <td className="p-3.5">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full text-white ${l.listing_type === 'sale' ? 'bg-emerald-600' : 'bg-[#1E9A80]'}`}>
          {l.listing_type === 'sale' ? 'Sale' : 'Rental'}
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
  );
}

/** Reusable inactive-tab card used in both flat and grouped views */
function InactiveCard({ s, statusBadge, sourceTag, changeStatus, setHardDeleteTarget, selected, onToggleSelect }: {
  s: Record<string, any>;
  statusBadge: (status: string) => React.ReactNode;
  sourceTag: (s: Record<string, unknown>) => React.ReactNode;
  changeStatus: (id: string, status: string) => void;
  setHardDeleteTarget: (t: { id: string; name: string }) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        {onToggleSelect && (
          <input type="checkbox" checked={!!selected} onChange={() => onToggleSelect(s.id)} className="w-4 h-4 rounded border-border accent-[#1E9A80] cursor-pointer flex-shrink-0" />
        )}
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
  );
}

/** Reusable pending property card used in both flat and grouped views */
function PropertyCard({ s, expandedId, setExpandedId, statusBadge, sourceTag, saLabel, startEdit, approve, reject, featuredCount, pricingLoading, refetchPricing, queryClient, user, selected, onToggleSelect }: {
  s: Record<string, any>;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  statusBadge: (status: string) => React.ReactNode;
  sourceTag: (s: Record<string, unknown>) => React.ReactNode;
  saLabel: (sa: string | null) => React.ReactNode;
  startEdit: (p: any) => void;
  approve: (id: string) => void;
  reject: (id: string) => void;
  featuredCount: number;
  pricingLoading: string | null;
  refetchPricing: (p: any) => void;
  queryClient: any;
  user: any;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  return (
    <div className="bg-card overflow-hidden">
      <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
        {onToggleSelect && (
          <input type="checkbox" checked={!!selected} onChange={(e) => { e.stopPropagation(); onToggleSelect(s.id); }} onClick={e => e.stopPropagation()} className="w-4 h-4 rounded border-border accent-[#1E9A80] cursor-pointer flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground truncate">{s.name}</span>
            {statusBadge(s.status)}
            {sourceTag(s as Record<string, unknown>)}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{s.city} · {s.postcode as string} · £{s.rent_monthly?.toLocaleString()}/mo</p>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button onClick={() => startEdit(s)} className="text-xs text-primary font-medium inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-secondary"><Edit2 className="w-3 h-3" /> Edit</button>
          {(s.status === 'pending' || s.status === 'inactive') && (
            <>
              <button onClick={() => approve(s.id)} className="text-xs bg-nfstay-black text-nfstay-black-foreground px-3 py-1.5 rounded-lg font-medium hover:opacity-90">Approve</button>
              <button onClick={() => reject(s.id)} className="text-xs text-destructive font-medium px-2">Reject</button>
            </>
          )}
        </div>
        {expandedId === s.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </div>

      {expandedId === s.id && (
        <div className="border-t border-border p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Detail label="Type" value={s.type} />
            <Detail label="Category" value={s.property_category as string || '-'} />
            <Detail label="Bedrooms" value={s.bedrooms?.toString() || '-'} />
            <Detail label="Bathrooms" value={s.bathrooms?.toString() || '-'} />
            <Detail label="Garage" value={s.garage ? 'Yes' : 'No'} />
            <Detail label="SA Approved" value={saLabel(s.sa_approved)} />
            <Detail label="Rent" value={`£${s.rent_monthly?.toLocaleString()}`} />
            <Detail label="Est. Cash Flow" value={`£${s.profit_est?.toLocaleString()}`} />
            <Detail label="Deposit" value={s.deposit ? `£${(s.deposit as number).toLocaleString()}` : '-'} />
            <Detail label="Agent Fee" value={s.agent_fee ? `£${(s.agent_fee as number).toLocaleString()}` : '-'} />
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
            {s.estimated_nightly_rate ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Detail label="Nightly Rate" value={`£${s.estimated_nightly_rate}`} />
                <Detail label="Monthly Revenue" value={`£${(s.estimated_monthly_revenue as number)?.toLocaleString()}`} />
                <Detail label="Est. Cash Flow" value={`£${(s.estimated_profit as number)?.toLocaleString()}`} />
                <Detail label="Confidence" value={
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    s.estimation_confidence === 'High' ? 'bg-emerald-100 text-emerald-700' :
                    s.estimation_confidence === 'Medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{s.estimation_confidence as string || '-'}</span>
                } />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No pricing data yet. Click Re-fetch to get Airbnb estimates.</p>
            )}
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-2">Contact</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Detail label="Name" value={s.contact_name as string || '-'} />
              <Detail label="Phone" value={s.contact_phone as string || '-'} />
              <Detail label="WhatsApp" value={s.contact_whatsapp as string || s.landlord_whatsapp || '-'} />
              <Detail label="Email" value={s.contact_email as string || '-'} />
            </div>
          </div>

          {/* Notes */}
          {(s.notes || s.description) && (
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-1">Notes</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{s.notes as string || s.description}</p>
            </div>
          )}

          {/* Photos */}
          {s.photos && s.photos.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-2">Photos ({s.photos.length})</h4>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {s.photos.map((url: string, i: number) => (
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
  );
}
