import { useState } from 'react';
import { Rocket, Send, Check, X, Shield, ToggleLeft, ToggleRight, Inbox, MessageSquare, BarChart3, Phone, Home, FileCheck, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/lib/auditLog';

// ── GHL workflow IDs ──
const GHL_WORKFLOW_COLD = '67250bfa-e1fc-4201-8bca-08c384a4a31d';
const GHL_WORKFLOW_WARM = '0eb4395c-e493-43dc-be97-6c4455b5c7c4';

// ── Types ──
interface PropertyRow {
  id: string;
  name: string;
  city: string;
  slug: string | null;
  landlord_whatsapp: string | null;
  contact_phone: string | null;
  contact_name: string | null;
  outreach_sent: boolean;
  outreach_sent_at: string | null;
  submitted_by: string | null;
}

interface InquiryRow {
  id: string;
  property_id: string;
  tenant_name: string | null;
  lister_phone: string | null;
  lister_type: string | null;
  lister_name: string | null;
  nda_signed: boolean;
  authorized: boolean;
  always_authorised: boolean;
  authorisation_type: string | null;
  created_at: string;
}

interface ListerMetric {
  phone: string;
  name: string | null;
  listerType: string;
  properties: number;
  totalLeads: number;
  ndaSigned: number;
  claimed: boolean;
}

type TabKey = 'listings' | 'pending' | 'metrics';

// ── Edge function caller ──
async function callGhlEnroll(phone: string, workflowId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('ghl-enroll', {
      body: { phone, workflowId },
    });
    if (error) return { success: false, error: error.message };
    if (data?.error) return { success: false, error: data.error };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ── Main component ──
export default function AdminOutreachV2() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('listings');
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());

  const addLoading = (key: string) => setLoadingActions(prev => new Set(prev).add(key));
  const removeLoading = (key: string) => setLoadingActions(prev => { const n = new Set(prev); n.delete(key); return n; });

  const tabs: { key: TabKey; label: string; icon: typeof Rocket }[] = [
    { key: 'listings', label: 'Landlord Activation', icon: Send },
    { key: 'pending', label: 'Tenant Requests', icon: MessageSquare },
    { key: 'metrics', label: 'Metrics', icon: BarChart3 },
  ];

  return (
    <div data-feature="ADMIN">
      <div className="flex items-center gap-3 mb-1">
        <Rocket className="w-6 h-6" style={{ color: '#1E9A80' }} />
        <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Outreach</h1>
      </div>
      <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
        Activate landlords, control tenant lead release, and track lister engagement.
      </p>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ backgroundColor: '#F3F3EE' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={activeTab === t.key
              ? { backgroundColor: '#FFFFFF', color: '#1E9A80', boxShadow: 'rgba(0,0,0,0.08) 0 2px 8px' }
              : { backgroundColor: 'transparent', color: '#6B7280' }}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'listings' && <ListingsTab user={user} queryClient={queryClient} loadingActions={loadingActions} addLoading={addLoading} removeLoading={removeLoading} />}
      {activeTab === 'pending' && <PendingTab user={user} queryClient={queryClient} loadingActions={loadingActions} addLoading={addLoading} removeLoading={removeLoading} />}
      {activeTab === 'metrics' && <MetricsTab />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 1 -- Landlord Activation
// ══════════════════════════════════════════════════════════════

interface TabProps {
  user: ReturnType<typeof useAuth>['user'];
  queryClient: ReturnType<typeof useQueryClient>;
  loadingActions: Set<string>;
  addLoading: (key: string) => void;
  removeLoading: (key: string) => void;
}

function ListingsTab({ user, queryClient, loadingActions, addLoading, removeLoading }: TabProps) {
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['outreach-listings'],
    queryFn: async () => {
      const { data: properties, error } = await (supabase.from('properties') as any)
        .select('id, name, city, slug, landlord_whatsapp, contact_phone, contact_name, outreach_sent, outreach_sent_at, submitted_by')
        .eq('status', 'live')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!properties || properties.length === 0) return [];

      const propIds = (properties as PropertyRow[]).map(p => p.id);
      const { data: inquiries } = await (supabase.from('inquiries') as any)
        .select('property_id, nda_signed, always_authorised, authorized')
        .in('property_id', propIds);

      const inqMap = new Map<string, { ndaCount: number; autoAuth: boolean; pendingCount: number; totalCount: number }>();
      for (const inq of (inquiries || [])) {
        const existing = inqMap.get(inq.property_id) || { ndaCount: 0, autoAuth: false, pendingCount: 0, totalCount: 0 };
        existing.totalCount++;
        if (inq.nda_signed) existing.ndaCount++;
        if (inq.always_authorised) existing.autoAuth = true;
        if (!inq.authorized) existing.pendingCount++;
        inqMap.set(inq.property_id, existing);
      }

      return (properties as PropertyRow[]).map(p => ({
        ...p,
        ndaCount: inqMap.get(p.id)?.ndaCount || 0,
        autoAuth: inqMap.get(p.id)?.autoAuth || false,
        pendingCount: inqMap.get(p.id)?.pendingCount || 0,
        totalCount: inqMap.get(p.id)?.totalCount || 0,
      }));
    },
  });

  const sendOutreach = async (property: PropertyRow) => {
    const phone = property.landlord_whatsapp || property.contact_phone;
    if (!phone) { toast.error('No landlord phone on this property'); return; }

    const key = `outreach-${property.id}`;
    addLoading(key);
    try {
      const result = await callGhlEnroll(phone, GHL_WORKFLOW_COLD);
      if (!result.success) {
        toast.error(result.error || 'GHL enrollment failed');
        return;
      }

      const { error } = await (supabase.from('properties') as any)
        .update({ outreach_sent: true, outreach_sent_at: new Date().toISOString() })
        .eq('id', property.id);
      if (error) throw error;

      if (user) logAdminAction(user.id, { action: 'outreach_sent', target_table: 'properties', target_id: property.id, metadata: { phone } });
      toast.success('First outreach sent to ' + (property.contact_name || phone));
      queryClient.invalidateQueries({ queryKey: ['outreach-listings'] });
    } catch {
      toast.error('Failed to send outreach');
    } finally {
      removeLoading(key);
    }
  };

  if (isLoading) return <LoadingSkeleton />;

  if (listings.length === 0) {
    return (
      <EmptyState
        title="No published listings"
        subtitle="Properties with status 'live' will appear here for first-contact activation."
      />
    );
  }

  return (
    <div>
      <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>
        Send the first WhatsApp to landlords who listed a property but haven't been contacted yet. This activates the landlord - tenant leads are managed in Tenant Requests.
      </p>
      <div className="space-y-3">
        {listings.map((listing: PropertyRow & { ndaCount: number; autoAuth: boolean; pendingCount: number; totalCount: number }) => (
          <div key={listing.id} className="rounded-2xl border p-4" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{listing.name}</span>
                  <span className="text-xs" style={{ color: '#6B7280' }}>{listing.city}</span>
                  {listing.slug && (
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: '#F3F3EE', color: '#6B7280' }}>
                      {listing.slug}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="text-xs" style={{ color: '#9CA3AF' }}>{listing.landlord_whatsapp || listing.contact_phone || 'No phone'}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium">
                    {listing.ndaCount > 0
                      ? <><Check className="w-3 h-3" style={{ color: '#1E9A80' }} /><span style={{ color: '#1E9A80' }}>NDA ({listing.ndaCount})</span></>
                      : <><X className="w-3 h-3" style={{ color: '#9CA3AF' }} /><span style={{ color: '#9CA3AF' }}>No NDA</span></>}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium">
                    {listing.submitted_by
                      ? <><Check className="w-3 h-3" style={{ color: '#1E9A80' }} /><span style={{ color: '#1E9A80' }}>Claimed</span></>
                      : <><X className="w-3 h-3" style={{ color: '#9CA3AF' }} /><span style={{ color: '#9CA3AF' }}>Unclaimed</span></>}
                  </span>
                  {listing.autoAuth && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#ECFDF5', color: '#1E9A80' }}>
                      Auto-Authorised
                    </span>
                  )}
                  {listing.outreach_sent && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#ECFDF5', color: '#1E9A80' }}>
                      Outreach sent
                    </span>
                  )}
                  {listing.totalCount === 0 && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F3F3EE', color: '#9CA3AF' }}>
                      Waiting for tenant
                    </span>
                  )}
                  {listing.pendingCount > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
                      Pending requests ({listing.pendingCount})
                    </span>
                  )}
                </div>
              </div>

              {!listing.outreach_sent && (
                <button
                  onClick={() => sendOutreach(listing)}
                  disabled={loadingActions.has(`outreach-${listing.id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex-shrink-0"
                  style={{ backgroundColor: '#1E9A80' }}
                >
                  <Send className="w-3 h-3" />
                  {loadingActions.has(`outreach-${listing.id}`) ? 'Sending...' : 'Send First Outreach'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 2 -- Tenant Requests
// ══════════════════════════════════════════════════════════════

function PendingTab({ user, queryClient, loadingActions, addLoading, removeLoading }: TabProps) {
  const { data: pendingInquiries = [], isLoading } = useQuery({
    queryKey: ['outreach-pending'],
    queryFn: async () => {
      // Use .or() to catch both false AND null (rows created before migration)
      const { data: inquiries, error } = await (supabase.from('inquiries') as any)
        .select('id, property_id, tenant_name, lister_phone, lister_type, lister_name, nda_signed, authorized, always_authorised, authorisation_type, created_at')
        .or('authorized.eq.false,authorized.is.null')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!inquiries || inquiries.length === 0) return [];

      const propIds = [...new Set((inquiries as InquiryRow[]).map(i => i.property_id))];
      const { data: properties } = await (supabase.from('properties') as any)
        .select('id, name, landlord_whatsapp, contact_phone')
        .in('id', propIds);

      const propMap = new Map<string, { name: string; phone: string }>();
      for (const p of (properties || [])) {
        propMap.set(p.id, { name: p.name, phone: p.landlord_whatsapp || p.contact_phone || '' });
      }

      return (inquiries as InquiryRow[]).map(inq => ({
        ...inq,
        propertyName: propMap.get(inq.property_id)?.name || 'Unknown',
        landlordPhone: propMap.get(inq.property_id)?.phone || '',
      }));
    },
  });

  const authorise = async (inquiry: InquiryRow & { landlordPhone: string }, type: 'nda' | 'nda_and_claim' | 'direct') => {
    const key = `auth-${inquiry.id}-${type}`;
    addLoading(key);
    try {
      const { error } = await (supabase.from('inquiries') as any)
        .update({ authorized: true, authorisation_type: type })
        .eq('id', inquiry.id);
      if (error) throw error;

      if (type === 'nda' || type === 'nda_and_claim') {
        const phone = inquiry.lister_phone || inquiry.landlordPhone;
        if (phone) {
          const result = await callGhlEnroll(phone, GHL_WORKFLOW_WARM);
          if (!result.success) {
            toast.error('Authorised in DB but GHL enrollment failed: ' + (result.error || 'Unknown'));
          }
        }
      }

      if (user) logAdminAction(user.id, { action: 'inquiry_authorised', target_table: 'inquiries', target_id: inquiry.id, metadata: { type } });
      toast.success('Inquiry authorised (' + type.replace('_', ' + ') + ')');
      queryClient.invalidateQueries({ queryKey: ['outreach-pending'] });
    } catch {
      toast.error('Failed to authorise inquiry');
    } finally {
      removeLoading(key);
    }
  };

  const toggleAlwaysAuthorised = async (listerPhone: string, currentValue: boolean) => {
    const key = `always-${listerPhone}`;
    addLoading(key);
    try {
      const newValue = !currentValue;
      const { error } = await (supabase.from('inquiries') as any)
        .update({ always_authorised: newValue })
        .eq('lister_phone', listerPhone);
      if (error) throw error;

      if (user) logAdminAction(user.id, { action: newValue ? 'always_authorised_on' : 'always_authorised_off', target_table: 'inquiries', target_id: listerPhone });
      toast.success(newValue ? 'Always Authorise enabled for this contact' : 'Always Authorise disabled');
      queryClient.invalidateQueries({ queryKey: ['outreach-pending'] });
    } catch {
      toast.error('Failed to update always authorise');
    } finally {
      removeLoading(key);
    }
  };

  if (isLoading) return <LoadingSkeleton />;

  if (pendingInquiries.length === 0) {
    return (
      <EmptyState
        title="No tenant messages yet"
        subtitle="When someone messages your number, they will appear here."
      />
    );
  }

  const seenPhones = new Set<string>();

  return (
    <div>
      <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>
        Tenants message NFsTay first. You control when the lead is released.
      </p>
      <div className="space-y-3">
      {pendingInquiries.map((inq: InquiryRow & { propertyName: string; landlordPhone: string }) => {
        const phone = inq.lister_phone || '';
        const showAlwaysToggle = phone && !seenPhones.has(phone);
        if (phone) seenPhones.add(phone);

        return (
          <div key={inq.id} className="rounded-2xl border p-4" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{inq.tenant_name || 'Unknown tenant'}</span>
                  <span className="text-xs" style={{ color: '#6B7280' }}>{inq.propertyName}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-xs" style={{ color: '#9CA3AF' }}>{new Date(inq.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  {inq.lister_type && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F3F3EE', color: '#6B7280' }}>
                      {inq.lister_type}
                    </span>
                  )}
                  {phone && <span className="text-xs" style={{ color: '#9CA3AF' }}>{phone}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                <button
                  onClick={() => authorise(inq, 'nda')}
                  disabled={loadingActions.has(`auth-${inq.id}-nda`)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: '#1E9A80' }}
                >
                  {loadingActions.has(`auth-${inq.id}-nda`) ? '...' : 'NDA'}
                </button>
                <button
                  onClick={() => authorise(inq, 'nda_and_claim')}
                  disabled={loadingActions.has(`auth-${inq.id}-nda_and_claim`)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: '#111111' }}
                >
                  {loadingActions.has(`auth-${inq.id}-nda_and_claim`) ? '...' : 'NDA + Claim'}
                </button>
                <button
                  onClick={() => authorise(inq, 'direct')}
                  disabled={loadingActions.has(`auth-${inq.id}-direct`)}
                  className="px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ borderColor: '#E5E7EB', color: '#1A1A1A', backgroundColor: '#FFFFFF' }}
                >
                  {loadingActions.has(`auth-${inq.id}-direct`) ? '...' : 'Direct'}
                </button>
              </div>
            </div>

            {showAlwaysToggle && (
              <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #E5E7EB' }}>
                <button
                  onClick={() => toggleAlwaysAuthorised(phone, inq.always_authorised)}
                  disabled={loadingActions.has(`always-${phone}`)}
                  className="flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ color: inq.always_authorised ? '#1E9A80' : '#9CA3AF' }}
                >
                  {inq.always_authorised
                    ? <ToggleRight className="w-5 h-5" style={{ color: '#1E9A80' }} />
                    : <ToggleLeft className="w-5 h-5" style={{ color: '#9CA3AF' }} />}
                  Always Authorise ({phone})
                </button>
                {inq.always_authorised && (
                  <Shield className="w-3.5 h-3.5" style={{ color: '#1E9A80' }} />
                )}
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 3 -- Metrics (all lister types)
// ══════════════════════════════════════════════════════════════

function MetricsTab() {
  const [filterType, setFilterType] = useState<string>('all');

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['outreach-metrics'],
    queryFn: async () => {
      // 1. All properties with a lister_type
      const { data: properties } = await (supabase.from('properties') as any)
        .select('id, landlord_whatsapp, contact_phone, contact_name, contact_email, lister_type, created_at');

      // 2. Inquiries for those properties
      const propIds = (properties || []).map((p: any) => p.id);
      let inquiries: any[] = [];
      if (propIds.length > 0) {
        const { data } = await (supabase.from('inquiries') as any)
          .select('id, property_id, lister_phone, nda_signed, created_at')
          .in('property_id', propIds);
        inquiries = data || [];
      }

      // 3. Magic link clicks
      const phones = [...new Set((properties || []).map((p: any) => p.landlord_whatsapp || p.contact_phone).filter(Boolean))];
      let invites: any[] = [];
      if (phones.length > 0) {
        const { data } = await (supabase.from('landlord_invites') as any)
          .select('id, phone, used, used_at, created_at')
          .in('phone', phones);
        invites = data || [];
      }

      // 4. Profiles for claimed status
      let profiles: any[] = [];
      if (phones.length > 0) {
        const { data } = await (supabase.from('profiles') as any)
          .select('id, name, whatsapp, role, created_at')
          .in('whatsapp', phones);
        profiles = data || [];
      }

      // 5. Aggregate by phone
      const phoneMap = new Map<string, ListerMetric & { clicks: number }>();

      for (const prop of (properties || [])) {
        const phone = prop.landlord_whatsapp || prop.contact_phone || '';
        if (!phone) continue;
        const type = prop.lister_type || 'landlord';

        if (!phoneMap.has(phone)) {
          phoneMap.set(phone, {
            phone,
            name: prop.contact_name || null,
            listerType: type,
            properties: 0,
            totalLeads: 0,
            ndaSigned: 0,
            claimed: false,
            clicks: 0,
          });
        }
        phoneMap.get(phone)!.properties++;
      }

      // Clicks
      for (const inv of invites) {
        const s = phoneMap.get(inv.phone);
        if (s && inv.used) s.clicks++;
      }

      // Leads + NDA
      for (const inq of inquiries) {
        const prop = (properties || []).find((p: any) => p.id === inq.property_id);
        if (!prop) continue;
        const phone = prop.landlord_whatsapp || prop.contact_phone || '';
        const s = phoneMap.get(phone);
        if (!s) continue;
        s.totalLeads++;
        if (inq.nda_signed) s.ndaSigned++;
      }

      // Claimed
      for (const profile of profiles) {
        const s = phoneMap.get(profile.whatsapp);
        if (!s) continue;
        if (profile.name && profile.name !== profile.whatsapp && !profile.name.includes('+')) {
          s.claimed = true;
          s.name = profile.name;
        }
      }

      return Array.from(phoneMap.values()).sort((a, b) => b.totalLeads - a.totalLeads);
    },
  });

  if (isLoading) return <LoadingSkeleton />;

  const allMetrics = metrics || [];
  const filtered = filterType === 'all' ? allMetrics : allMetrics.filter(m => m.listerType === filterType);

  // Summary counts by type
  const typeCounts = new Map<string, number>();
  for (const m of allMetrics) {
    typeCounts.set(m.listerType, (typeCounts.get(m.listerType) || 0) + 1);
  }

  const totalListers = filtered.length;
  const totalProperties = filtered.reduce((s, m) => s + m.properties, 0);
  const totalLeads = filtered.reduce((s, m) => s + m.totalLeads, 0);
  const totalNda = filtered.reduce((s, m) => s + m.ndaSigned, 0);
  const totalClaimed = filtered.filter(m => m.claimed).length;
  const totalClicks = filtered.reduce((s, m) => s + (m as any).clicks, 0);

  const typeLabel = (t: string) => {
    if (t === 'deal_sourcer') return 'Deal Sourcer';
    if (t === 'landlord') return 'Landlord';
    if (t === 'agent') return 'Agent';
    return t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ');
  };

  return (
    <div>
      {/* Type filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilterType('all')}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={filterType === 'all'
            ? { backgroundColor: '#1E9A80', color: '#FFFFFF' }
            : { backgroundColor: '#F3F3EE', color: '#6B7280' }}
        >
          All ({allMetrics.length})
        </button>
        {Array.from(typeCounts.entries()).map(([type, count]) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={filterType === type
              ? { backgroundColor: '#1E9A80', color: '#FFFFFF' }
              : { backgroundColor: '#F3F3EE', color: '#6B7280' }}
          >
            {typeLabel(type)} ({count})
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Listers', value: totalListers, icon: Phone },
          { label: 'Properties', value: totalProperties, icon: Home },
          { label: 'Leads', value: totalLeads, icon: FileCheck },
          { label: 'NDAs Signed', value: totalNda, icon: FileCheck },
          { label: 'Claimed', value: `${totalClaimed}/${totalListers}`, icon: UserCheck },
          { label: 'Link Clicks', value: totalClicks, icon: Send },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border p-3" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-3.5 h-3.5" style={{ color: '#1E9A80' }} />
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#6B7280' }}>{label}</span>
            </div>
            <span className="text-lg font-bold" style={{ color: '#1A1A1A' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState title="No listers found" subtitle="Properties with listers will appear here." />
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: '#FAFAFA' }}>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#6B7280' }}>Lister</th>
                <th className="text-center px-3 py-3 text-xs font-semibold" style={{ color: '#6B7280' }}>Type</th>
                <th className="text-center px-3 py-3 text-xs font-semibold" style={{ color: '#6B7280' }}>Properties</th>
                <th className="text-center px-3 py-3 text-xs font-semibold" style={{ color: '#6B7280' }}>Clicks</th>
                <th className="text-center px-3 py-3 text-xs font-semibold" style={{ color: '#6B7280' }}>Leads</th>
                <th className="text-center px-3 py-3 text-xs font-semibold" style={{ color: '#6B7280' }}>NDAs</th>
                <th className="text-center px-3 py-3 text-xs font-semibold" style={{ color: '#6B7280' }}>Claimed</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m: ListerMetric & { clicks: number }) => (
                <tr key={m.phone} style={{ borderBottom: '1px solid #F3F4F6' }} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>{m.name || m.phone}</p>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>{m.phone}</p>
                  </td>
                  <td className="text-center px-3 py-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F3F3EE', color: '#6B7280' }}>
                      {typeLabel(m.listerType)}
                    </span>
                  </td>
                  <td className="text-center px-3 py-3 font-medium" style={{ color: '#1A1A1A' }}>{m.properties}</td>
                  <td className="text-center px-3 py-3 font-medium" style={{ color: '#1A1A1A' }}>{m.clicks}</td>
                  <td className="text-center px-3 py-3 font-medium" style={{ color: '#1A1A1A' }}>{m.totalLeads}</td>
                  <td className="text-center px-3 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: m.ndaSigned > 0 ? '#ECFDF5' : '#F3F4F6', color: m.ndaSigned > 0 ? '#1E9A80' : '#9CA3AF' }}>
                      {m.ndaSigned}
                    </span>
                  </td>
                  <td className="text-center px-3 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: m.claimed ? '#ECFDF5' : '#FEE2E2', color: m.claimed ? '#1E9A80' : '#DC2626' }}>
                      {m.claimed ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Shared components ──

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border p-12 text-center" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
      <Inbox className="w-12 h-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
      <p className="text-sm font-medium mb-1" style={{ color: '#1A1A1A' }}>{title}</p>
      <p className="text-xs" style={{ color: '#9CA3AF' }}>{subtitle}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl border p-6 animate-pulse" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
          <div className="h-4 rounded w-48 mb-3" style={{ backgroundColor: '#F3F3EE' }} />
          <div className="h-3 rounded w-32" style={{ backgroundColor: '#F3F3EE' }} />
        </div>
      ))}
    </div>
  );
}
