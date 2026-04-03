import { useState } from 'react';
import { Rocket, Send, Check, X, Shield, ChevronDown, Clock, Inbox, MessageSquare, BarChart3, Phone, Home, FileCheck, UserCheck, AlertTriangle, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/lib/auditLog';

// ── GHL workflow IDs ──
const GHL_WORKFLOW_COLD = '67250bfa-e1fc-4201-8bca-08c384a4a31d';
const GHL_WORKFLOW_WARM = '0eb4395c-e493-43dc-be97-6c4455b5c7c4';

const N8N_BASE = (import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.srv886554.hstgr.cloud').replace(/\/$/, '');

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
}

interface InquiryRow {
  id: string;
  property_id: string;
  tenant_name: string | null;
  lister_phone: string | null;
  lister_type: string | null;
  lister_name: string | null;
  nda_signed: boolean;
  nda_signed_at: string | null;
  authorized: boolean;
  always_authorised: boolean;
  authorisation_type: string | null;
  authorized_at: string | null;
  created_at: string;
}

interface PendingInquiryRow extends InquiryRow {
  propertyName: string;
  landlordPhone: string;
  landlordName: string | null;
  landlordEmail: string | null;
  claimed: boolean;
}

interface PendingInquiryGroup {
  key: string;
  phone: string;
  displayName: string;
  email: string | null;
  listerType: string | null;
  claimed: boolean;
  inquiries: PendingInquiryRow[];
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

/** A profile is truly claimed only when it has a real email (not @nfstay.internal placeholder). */
function isReallyClaimed(profile: { email: string | null } | null | undefined): boolean {
  if (!profile?.email) return false;
  return !profile.email.endsWith('@nfstay.internal');
}

// ── n8n webhook caller for cold outreach (sets property_reference before GHL enrollment) ──
async function callOutreachWebhook(payload: {
  landlord_whatsapp: string;
  landlord_name: string;
  property_ref_code: string;
  property_title: string;
  property_city: string;
  inquiry_count: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${N8N_BASE}/webhook/landlord-first-outreach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return { success: false, error: `n8n returned ${res.status}` };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ── Edge function caller for warm outreach (NDA/lead release) ──
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
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetPin, setResetPin] = useState('');
  const [resetting, setResetting] = useState(false);

  const addLoading = (key: string) => setLoadingActions(prev => new Set(prev).add(key));
  const removeLoading = (key: string) => setLoadingActions(prev => { const n = new Set(prev); n.delete(key); return n; });

  const handleReset = async () => {
    if (resetPin !== '1234') { toast.error('Wrong PIN'); return; }
    setResetting(true);
    try {
      // Delete all inquiries
      const { error: delErr } = await (supabase.from('inquiries') as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (delErr) throw delErr;
      // Reset outreach_sent on all properties
      const { error: patchErr } = await supabase.from('properties').update({ outreach_sent: false, outreach_sent_at: null } as any).eq('outreach_sent', true);
      if (patchErr) throw patchErr;
      if (user) logAdminAction(user.id, { action: 'outreach_reset', target_table: 'inquiries', target_id: 'all', metadata: { scope: 'full_reset' } });
      queryClient.invalidateQueries({ queryKey: ['outreach-listings'] });
      queryClient.invalidateQueries({ queryKey: ['outreach-pending'] });
      queryClient.invalidateQueries({ queryKey: ['outreach-metrics'] });
      toast.success('All outreach data cleared');
      setShowResetDialog(false);
      setResetPin('');
    } catch (err) {
      toast.error('Reset failed: ' + String(err));
    } finally {
      setResetting(false);
    }
  };

  const tabs: { key: TabKey; label: string; icon: typeof Rocket }[] = [
    { key: 'listings', label: 'Landlord Activation', icon: Send },
    { key: 'pending', label: 'Tenant Requests', icon: MessageSquare },
    { key: 'metrics', label: 'Metrics', icon: BarChart3 },
  ];

  return (
    <div data-feature="ADMIN">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <Rocket className="w-6 h-6" style={{ color: '#1E9A80' }} />
          <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>The Gates</h1>
        </div>
        <button
          onClick={() => setShowResetDialog(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Reset Test Data
        </button>
      </div>
      <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
        Activate landlords, control tenant lead release, and track lister engagement.
      </p>

      {/* Reset confirmation dialog */}
      {showResetDialog && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => { setShowResetDialog(false); setResetPin(''); }}>
          <div className="bg-white rounded-2xl border p-6 w-full max-w-[400px]" style={{ borderColor: '#E5E7EB' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: '#1A1A1A' }}>Reset All Outreach Data</h3>
                <p className="text-xs text-red-600 font-semibold">Deletes all inquiries + resets outreach flags</p>
              </div>
            </div>
            <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
              This will delete all tenant requests, reset all "outreach sent" flags on properties, and clear metrics. This cannot be undone.
            </p>
            <div className="mb-4">
              <label className="text-xs font-semibold block mb-1.5" style={{ color: '#1A1A1A' }}>Enter PIN to confirm</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={resetPin}
                onChange={e => setResetPin(e.target.value.replace(/\D/g, ''))}
                placeholder="----"
                className="w-full h-11 px-3 rounded-lg border bg-white text-center text-lg font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-red-500"
                style={{ borderColor: '#E5E7EB' }}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowResetDialog(false); setResetPin(''); }} className="flex-1 h-11 rounded-lg border text-sm font-medium hover:bg-gray-50 transition-colors" style={{ borderColor: '#E5E7EB', color: '#1A1A1A' }}>Cancel</button>
              <button onClick={handleReset} disabled={resetting || resetPin.length !== 4} className="flex-1 h-11 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50">
                {resetting ? 'Clearing...' : 'Reset Everything'}
              </button>
            </div>
          </div>
        </div>
      )}

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

interface LandlordGroup {
  phone: string;
  name: string | null;
  email: string | null;
  claimed: boolean;
  outreachSent: boolean;
  outreachSentAt: string | null;
  hasClaimLeads: boolean;
  properties: (PropertyRow & { ndaCount: number; pendingCount: number; totalCount: number; leads: any[] })[];
  manualLeads?: any[];
}

function ListingsTab({ user, queryClient, loadingActions, addLoading, removeLoading }: TabProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showAssignForm, setShowAssignForm] = useState<Set<string>>(new Set());
  const [assignLeadForms, setAssignLeadForms] = useState<Record<string, { name: string; email: string; phone: string; mode: 'direct' | 'nda' | 'nda_and_claim'; workflow: string }>>({});

  const toggleAssignForm = (phone: string) => {
    setShowAssignForm(prev => {
      const next = new Set(prev);
      if (next.has(phone)) {
        next.delete(phone);
      } else {
        next.add(phone);
        if (!assignLeadForms[phone]) {
          setAssignLeadForms(p => ({ ...p, [phone]: { name: '', email: '', phone: '', mode: 'nda_and_claim', workflow: GHL_WORKFLOW_COLD } }));
        }
      }
      return next;
    });
  };

  const updateAssignForm = (phone: string, field: string, value: string) => {
    setAssignLeadForms(prev => ({
      ...prev,
      [phone]: { ...prev[phone], [field]: value },
    }));
  };

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['outreach-listings'],
    queryFn: async () => {
      const { data: properties, error } = await supabase.from('properties')
        .select('id, name, city, slug, landlord_whatsapp, contact_phone, contact_name, outreach_sent, outreach_sent_at')
        .eq('status', 'live')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!properties || properties.length === 0) return [];

      const propIds = properties.map(p => p.id);
      const { data: inquiries } = await supabase.from('inquiries')
        .select('id, property_id, lister_phone, tenant_name, nda_signed, nda_signed_at, always_authorised, authorized, authorisation_type, authorized_at, created_at')
        .in('property_id', propIds);

      // Also fetch propertyless inquiries (admin-assigned leads) by lister phone
      const allPhones = [...new Set(properties.map(p => p.landlord_whatsapp || p.contact_phone).filter(Boolean))] as string[];
      let propertylessInquiries: typeof inquiries = [];
      if (allPhones.length > 0) {
        const { data: pless } = await supabase.from('inquiries')
          .select('id, property_id, lister_phone, tenant_name, nda_signed, nda_signed_at, always_authorised, authorized, authorisation_type, authorized_at, created_at')
          .is('property_id', null)
          .in('lister_phone', allPhones);
        propertylessInquiries = pless || [];
      }

      // Merge: property-linked inquiries keyed by property_id, propertyless keyed by phone
      const inqMap = new Map<string, { ndaCount: number; pendingCount: number; totalCount: number; hasClaimLeads: boolean; leads: typeof inquiries }>();
      for (const inq of (inquiries || [])) {
        const existing = inqMap.get(inq.property_id!) || { ndaCount: 0, pendingCount: 0, totalCount: 0, hasClaimLeads: false, leads: [] as typeof inquiries };
        existing.totalCount++;
        if (inq.nda_signed) existing.ndaCount++;
        if (!inq.authorized) existing.pendingCount++;
        if ((inq as any).authorisation_type === 'nda_and_claim') existing.hasClaimLeads = true;
        existing.leads!.push(inq);
        inqMap.set(inq.property_id!, existing);
      }

      // Track propertyless leads per phone for group-level display
      const phonelessLeadMap = new Map<string, { totalCount: number; hasClaimLeads: boolean; leads: typeof inquiries }>();
      for (const inq of (propertylessInquiries || [])) {
        const phone = (inq as any).lister_phone || '';
        if (!phone) continue;
        const existing = phonelessLeadMap.get(phone) || { totalCount: 0, hasClaimLeads: false, leads: [] as typeof inquiries };
        existing.totalCount++;
        if ((inq as any).authorisation_type === 'nda_and_claim') existing.hasClaimLeads = true;
        existing.leads!.push(inq);
        phonelessLeadMap.set(phone, existing);
      }

      // Look up claimed profiles by phone
      const phones = [...new Set(properties.map(p => p.landlord_whatsapp || p.contact_phone).filter(Boolean))] as string[];
      const profileMap = new Map<string, { name: string | null; email: string | null }>();
      if (phones.length > 0) {
        const { data: profiles } = await (supabase.from('profiles') as any)
          .select('whatsapp, name, email').in('whatsapp', phones);
        for (const p of (profiles || [])) {
          if (p.whatsapp) profileMap.set(p.whatsapp, { name: p.name, email: p.email });
        }
      }

      // Group properties by landlord phone
      const groupMap = new Map<string, LandlordGroup>();
      for (const prop of properties) {
        const phone = prop.landlord_whatsapp || prop.contact_phone || '';
        if (!phone) continue;
        if (!groupMap.has(phone)) {
          const profile = profileMap.get(phone);
          groupMap.set(phone, {
            phone,
            name: profile?.name || prop.contact_name || null,
            email: profile?.email || null,
            claimed: isReallyClaimed(profileMap.get(phone)),
            outreachSent: false,
            outreachSentAt: null,
            hasClaimLeads: false,
            properties: [],
          });
        }
        const group = groupMap.get(phone)!;
        const propInq = inqMap.get(prop.id);
        group.properties.push({
          ...prop,
          ndaCount: propInq?.ndaCount || 0,
          pendingCount: propInq?.pendingCount || 0,
          totalCount: propInq?.totalCount || 0,
          leads: propInq?.leads || [],
        });
        if (prop.outreach_sent) {
          group.outreachSent = true;
          if (prop.outreach_sent_at && (!group.outreachSentAt || prop.outreach_sent_at > group.outreachSentAt)) {
            group.outreachSentAt = prop.outreach_sent_at;
          }
        }
        if (propInq?.hasClaimLeads) group.hasClaimLeads = true;
      }

      // Merge propertyless lead counts into groups
      for (const [phone, plData] of phonelessLeadMap) {
        const group = groupMap.get(phone);
        if (group) {
          if (plData.hasClaimLeads) group.hasClaimLeads = true;
          // Attach propertyless leads to a virtual row so they display in the expanded section
          (group as any).manualLeads = plData.leads || [];
        }
      }

      return Array.from(groupMap.values()).sort((a, b) => b.properties.length - a.properties.length);
    },
  });

  const sendOutreach = async (group: LandlordGroup) => {
    const key = `outreach-${group.phone}`;
    addLoading(key);
    try {
      const firstProp = group.properties[0];
      const result = await callOutreachWebhook({
        landlord_whatsapp: group.phone,
        landlord_name: group.name || 'Property Owner',
        property_ref_code: firstProp?.slug || firstProp?.id?.slice(0, 8) || '',
        property_title: firstProp?.name || firstProp?.city || 'Property',
        property_city: firstProp?.city || '',
        inquiry_count: group.properties.reduce((s, p) => s + p.totalCount, 0),
      });
      if (!result.success) {
        toast.error(result.error || 'Outreach failed');
        return;
      }

      // Mark all properties in this group as outreach_sent
      const ids = group.properties.map(p => p.id);
      const { error } = await supabase.from('properties')
        .update({ outreach_sent: true, outreach_sent_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;

      if (user) logAdminAction(user.id, { action: 'outreach_sent', target_table: 'properties', target_id: ids.join(','), metadata: { phone: group.phone, count: ids.length } });
      toast.success('Outreach sent to ' + (group.name || group.phone));
      queryClient.invalidateQueries({ queryKey: ['outreach-listings'] });
    } catch {
      toast.error('Failed to send outreach');
    } finally {
      removeLoading(key);
    }
  };

  const assignLeadAndSendOutreach = async (group: LandlordGroup) => {
    const formData = assignLeadForms[group.phone];
    if (!formData?.name?.trim() || !formData?.email?.trim() || !formData?.phone?.trim()) {
      toast.error('Fill in lead name, email, and phone');
      return;
    }

    const key = `assign-${group.phone}`;
    addLoading(key);
    try {
      // 1. Create inquiry row (authorized immediately - admin is seeding this lead)
      const token = crypto.randomUUID();
      const { error: inqError } = await supabase.from('inquiries').insert({
        tenant_name: formData.name.trim(),
        tenant_email: formData.email.trim(),
        tenant_phone: formData.phone.trim(),
        lister_phone: group.phone,
        lister_name: group.name || null,
        channel: 'email',
        message: 'Admin-assigned lead via Landlord Activation outreach',
        authorized: true,
        authorisation_type: formData.mode,
        token,
        status: 'new',
        stage: 'New Leads',
      } as any);
      if (inqError) throw inqError;

      // 2. Send outreach via n8n webhook (sets property_reference + enrolls in GHL workflow)
      const firstProp = group.properties[0];
      const outreachResult = await callOutreachWebhook({
        landlord_whatsapp: group.phone,
        landlord_name: group.name || 'Property Owner',
        property_ref_code: firstProp?.slug || firstProp?.id?.slice(0, 8) || '',
        property_title: firstProp?.name || firstProp?.city || 'Property',
        property_city: firstProp?.city || '',
        inquiry_count: 1,
      });
      if (!outreachResult.success) {
        toast.error('Lead saved but outreach failed: ' + (outreachResult.error || 'Unknown'));
      }

      // 3. Mark properties as outreach_sent
      const ids = group.properties.map(p => p.id);
      await supabase.from('properties')
        .update({ outreach_sent: true, outreach_sent_at: new Date().toISOString() })
        .in('id', ids);

      if (user) logAdminAction(user.id, {
        action: 'assign_lead_and_outreach',
        target_table: 'inquiries',
        target_id: group.phone,
        metadata: { tenant_name: formData.name, mode: formData.mode, properties: ids.length },
      });

      toast.success(`Lead assigned (${formData.mode.replace(/_/g, ' + ')}) and outreach sent to ${group.name || group.phone}`);

      // Clear form
      setAssignLeadForms(prev => { const next = { ...prev }; delete next[group.phone]; return next; });
      setShowAssignForm(prev => { const next = new Set(prev); next.delete(group.phone); return next; });
      queryClient.invalidateQueries({ queryKey: ['outreach-listings'] });
    } catch (err) {
      toast.error('Failed: ' + (err instanceof Error ? err.message : 'unknown error'));
    } finally {
      removeLoading(key);
    }
  };

  const resetLandlord = async (group: LandlordGroup) => {
    const totalLeads = group.properties.reduce((s, p) => s + p.totalCount, 0);
    const confirmed = window.confirm(
      `Reset test data for ${group.name || group.phone}?\n\n` +
      `This will:\n` +
      `- Delete all ${totalLeads} leads/inquiries\n` +
      `- Remove property ownership (submitted_by)\n` +
      `- Revert account to unclaimed (@nfstay.internal)\n` +
      `- Reset outreach sent flag\n\n` +
      `This cannot be undone.`
    );
    if (!confirmed) return;

    const key = `reset-${group.phone}`;
    addLoading(key);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) { toast.error('Not signed in'); return; }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-landlord-test-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: group.phone }),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error || 'Reset failed');
        return;
      }

      if (user) logAdminAction(user.id, {
        action: 'reset_landlord_test_data',
        target_table: 'profiles',
        target_id: group.phone,
        metadata: { phone: group.phone, properties: group.properties.length, results: body?.results },
      });

      toast.success(`Reset complete for ${group.name || group.phone}`);
      queryClient.invalidateQueries({ queryKey: ['outreach-listings'] });
    } catch (err) {
      toast.error('Reset failed: ' + (err instanceof Error ? err.message : 'unknown error'));
    } finally {
      removeLoading(key);
    }
  };

  const toggleExpand = (phone: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone); else next.add(phone);
      return next;
    });
  };

  if (isLoading) return <LoadingSkeleton />;

  if (groups.length === 0) {
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
        Send the first WhatsApp to landlords. Each row is one landlord - expand to see their properties.
      </p>
      <div className="space-y-3">
        {groups.map((group: LandlordGroup) => {
          const isOpen = expanded.has(group.phone);
          const totalPending = group.properties.reduce((s, p) => s + p.pendingCount, 0);
          const totalLeads = group.properties.reduce((s, p) => s + p.totalCount, 0) + (group.manualLeads?.length || 0);
          return (
          <div key={group.phone} className="rounded-2xl border overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
            <div className="flex items-center justify-between gap-4 p-4 cursor-pointer" onClick={() => toggleExpand(group.phone)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Phone className="w-3.5 h-3.5" style={{ color: '#1E9A80' }} />
                  <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{group.name || group.phone}</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F3F3EE', color: '#6B7280' }}>
                    {group.properties.length} {group.properties.length === 1 ? 'property' : 'properties'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="text-xs" style={{ color: '#9CA3AF' }}>{group.phone}</span>
                  {group.claimed && group.email && (
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>{group.email}</span>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs font-medium">
                    {group.claimed
                      ? <><Check className="w-3 h-3" style={{ color: '#1E9A80' }} /><span style={{ color: '#1E9A80' }}>Claimed</span></>
                      : <><X className="w-3 h-3" style={{ color: '#9CA3AF' }} /><span style={{ color: '#9CA3AF' }}>Unclaimed</span></>}
                  </span>
                  {group.outreachSent && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#ECFDF5', color: '#1E9A80' }}>
                      <Check className="w-3 h-3" />
                      Sent{group.outreachSentAt ? ` ${new Date(group.outreachSentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${new Date(group.outreachSentAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </span>
                  )}
                  {group.hasClaimLeads && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
                      <Shield className="w-3 h-3" />
                      Claim required
                    </span>
                  )}
                  {totalLeads > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}>
                      Leads ({totalLeads})
                    </span>
                  )}
                  {totalPending > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
                      Pending requests ({totalPending})
                    </span>
                  )}
                  {totalLeads === 0 && !group.outreachSent && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F3F3EE', color: '#9CA3AF' }}>
                      Waiting for tenant
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); resetLandlord(group); }}
                  disabled={loadingActions.has(`reset-${group.phone}`)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}
                  title="Reset test data: delete leads, unclaim account, clear property ownership"
                >
                  <Trash2 className="w-3 h-3" />
                  {loadingActions.has(`reset-${group.phone}`) ? 'Resetting...' : 'Reset'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleAssignForm(group.phone); if (!expanded.has(group.phone)) toggleExpand(group.phone); }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ backgroundColor: showAssignForm.has(group.phone) ? '#ECFDF5' : '#F3F3EE', color: showAssignForm.has(group.phone) ? '#1E9A80' : '#6B7280' }}
                >
                  <UserPlus className="w-3 h-3" />
                  Assign Lead
                </button>
                {!group.outreachSent && !showAssignForm.has(group.phone) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); sendOutreach(group); }}
                    disabled={loadingActions.has(`outreach-${group.phone}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#1E9A80' }}
                  >
                    <Send className="w-3 h-3" />
                    {loadingActions.has(`outreach-${group.phone}`) ? 'Sending...' : 'Send Outreach'}
                  </button>
                )}
                <span className="text-xs" style={{ color: '#9CA3AF' }}>{isOpen ? '▼' : '▶'}</span>
              </div>
            </div>

            {/* Expanded property list */}
            {isOpen && (
              <div className="border-t px-4 pb-3 pt-2 space-y-2" style={{ borderColor: '#F3F4F6', backgroundColor: '#FAFAFA' }}>
                {/* Assign a lead form */}
                {showAssignForm.has(group.phone) && assignLeadForms[group.phone] && (
                  <div className="rounded-xl border p-4 mb-1" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
                    <p className="text-xs font-bold mb-3" style={{ color: '#1A1A1A' }}>Assign a lead for this landlord</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                      <div>
                        <label className="text-[10px] font-semibold block mb-1" style={{ color: '#525252' }}>Lead Name *</label>
                        <input
                          value={assignLeadForms[group.phone].name}
                          onChange={e => updateAssignForm(group.phone, 'name', e.target.value)}
                          placeholder="e.g. James Walker"
                          className="w-full h-9 rounded-lg border px-3 text-xs"
                          style={{ borderColor: '#E5E5E5' }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold block mb-1" style={{ color: '#525252' }}>Lead Email *</label>
                        <input
                          type="email"
                          value={assignLeadForms[group.phone].email}
                          onChange={e => updateAssignForm(group.phone, 'email', e.target.value)}
                          placeholder="james@example.com"
                          className="w-full h-9 rounded-lg border px-3 text-xs"
                          style={{ borderColor: '#E5E5E5' }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold block mb-1" style={{ color: '#525252' }}>Lead Phone *</label>
                        <input
                          value={assignLeadForms[group.phone].phone}
                          onChange={e => updateAssignForm(group.phone, 'phone', e.target.value)}
                          placeholder="+447911123456"
                          className="w-full h-9 rounded-lg border px-3 text-xs"
                          style={{ borderColor: '#E5E5E5' }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <label className="text-[10px] font-semibold block mb-1" style={{ color: '#525252' }}>Release Mode</label>
                        <select
                          value={assignLeadForms[group.phone].mode}
                          onChange={e => updateAssignForm(group.phone, 'mode', e.target.value)}
                          className="h-9 rounded-lg border px-2 text-xs font-medium"
                          style={{ borderColor: '#E5E5E5', color: '#1A1A1A' }}
                        >
                          <option value="nda">NDA</option>
                          <option value="nda_and_claim">NDA + Claim</option>
                          <option value="direct">Direct</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold block mb-1" style={{ color: '#525252' }}>Outreach Workflow</label>
                        <select
                          value={assignLeadForms[group.phone].workflow}
                          onChange={e => updateAssignForm(group.phone, 'workflow', e.target.value)}
                          className="h-9 rounded-lg border px-2 text-xs font-medium"
                          style={{ borderColor: '#E5E5E5', color: '#1A1A1A' }}
                        >
                          <option value={GHL_WORKFLOW_COLD}>Landlord Activation (default)</option>
                          <option value={GHL_WORKFLOW_WARM}>Tenant Lead Release (NDA)</option>
                        </select>
                      </div>
                      <div className="flex-1" />
                      <button
                        onClick={() => { setShowAssignForm(prev => { const next = new Set(prev); next.delete(group.phone); return next; }); }}
                        className="h-9 px-3 rounded-lg border text-xs font-medium transition-opacity hover:opacity-80"
                        style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => assignLeadAndSendOutreach(group)}
                        disabled={loadingActions.has(`assign-${group.phone}`)}
                        className="h-9 px-4 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                        style={{ backgroundColor: '#1E9A80' }}
                      >
                        <Send className="w-3 h-3" />
                        {loadingActions.has(`assign-${group.phone}`) ? 'Sending...' : 'Assign Lead & Send Outreach'}
                      </button>
                    </div>
                  </div>
                )}
                {group.properties.map(prop => (
                  <div key={prop.id}>
                    <div className="flex items-center justify-between gap-3 py-1.5 cursor-pointer" onClick={() => { const k = `lead-${prop.id}`; setExpanded(prev => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; }); }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <Home className="w-3 h-3 flex-shrink-0" style={{ color: '#9CA3AF' }} />
                        <span className="text-xs font-medium truncate" style={{ color: '#1A1A1A' }}>{prop.name}</span>
                        <span className="text-xs" style={{ color: '#9CA3AF' }}>{prop.city}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {prop.totalCount > 0 && (
                          <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full cursor-pointer" style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}>
                            {prop.totalCount} lead{prop.totalCount !== 1 ? 's' : ''} {expanded.has(`lead-${prop.id}`) ? '▼' : '▶'}
                          </span>
                        )}
                        {prop.pendingCount > 0 && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
                            {prop.pendingCount} pending
                          </span>
                        )}
                      </div>
                    </div>
                    {expanded.has(`lead-${prop.id}`) && prop.leads.length > 0 && (
                      <div className="ml-5 mb-2 space-y-1.5">
                        {prop.leads.map((lead: any) => (
                          <div key={lead.id} className="flex items-center justify-between gap-3 py-1 px-2.5 rounded-lg text-[11px]" style={{ backgroundColor: '#F9FAFB' }}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-medium" style={{ color: '#1A1A1A' }}>{lead.tenant_name || 'Unknown'}</span>
                              <span className="inline-flex items-center gap-1" style={{ color: '#9CA3AF' }}>
                                <Clock className="w-2.5 h-2.5" />
                                {new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}{' '}
                                {new Date(lead.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {lead.authorized ? (
                                <span className="font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#ECFDF5', color: '#1E9A80' }}>
                                  {lead.authorisation_type === 'nda' ? 'NDA' : lead.authorisation_type === 'nda_and_claim' ? 'NDA+Claim' : 'Direct'}
                                </span>
                              ) : (
                                <span className="font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>Pending</span>
                              )}
                              {lead.nda_signed && <span style={{ color: '#4F46E5' }}>NDA signed</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {/* Manually assigned leads (propertyless) */}
                {group.manualLeads && group.manualLeads.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 py-1.5">
                      <UserPlus className="w-3 h-3 flex-shrink-0" style={{ color: '#1E9A80' }} />
                      <span className="text-xs font-medium" style={{ color: '#1A1A1A' }}>Assigned leads</span>
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#ECFDF5', color: '#1E9A80' }}>
                        {group.manualLeads.length}
                      </span>
                    </div>
                    <div className="ml-5 mb-2 space-y-1.5">
                      {group.manualLeads.map((lead: any) => (
                        <div key={lead.id} className="flex items-center justify-between gap-3 py-1 px-2.5 rounded-lg text-[11px]" style={{ backgroundColor: '#F9FAFB' }}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium" style={{ color: '#1A1A1A' }}>{lead.tenant_name || 'Unknown'}</span>
                            <span className="inline-flex items-center gap-1" style={{ color: '#9CA3AF' }}>
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}{' '}
                              {new Date(lead.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <span className="font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#ECFDF5', color: '#1E9A80' }}>
                            {lead.authorisation_type === 'nda' ? 'NDA' : lead.authorisation_type === 'nda_and_claim' ? 'NDA+Claim' : 'Direct'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
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
// TAB 2 -- Tenant Requests
// ══════════════════════════════════════════════════════════════

function PendingTab({ user, queryClient, loadingActions, addLoading, removeLoading }: TabProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const { data: allInquiries = [], isLoading } = useQuery({
    queryKey: ['outreach-pending'],
    queryFn: async () => {
      // Show ALL inquiries -- pending first, then authorized with their sent status
      const { data: inquiries, error } = await supabase.from('inquiries')
        .select('id, property_id, tenant_name, lister_phone, lister_type, lister_name, nda_signed, nda_signed_at, authorized, always_authorised, authorisation_type, authorized_at, created_at')
        .order('authorized', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!inquiries || inquiries.length === 0) return [];

      const propIds = [...new Set((inquiries as InquiryRow[]).map(i => i.property_id))];
      const { data: properties } = await supabase.from('properties')
        .select('id, name, landlord_whatsapp, contact_phone')
        .in('id', propIds);

      const propMap = new Map<string, { name: string; phone: string }>();
      for (const p of (properties || [])) {
        propMap.set(p.id, { name: p.name, phone: p.landlord_whatsapp || p.contact_phone || '' });
      }

      const phoneCandidates = [
        ...(inquiries as InquiryRow[]).map(inq => inq.lister_phone).filter(Boolean),
        ...(properties || []).map(p => p.landlord_whatsapp || p.contact_phone).filter(Boolean),
      ] as string[];

      const profileMap = new Map<string, { name: string | null; email: string | null }>();
      const uniquePhones = [...new Set(phoneCandidates)];
      if (uniquePhones.length > 0) {
        const { data: profiles } = await (supabase.from('profiles') as any)
          .select('whatsapp, name, email')
          .in('whatsapp', uniquePhones);
        for (const profile of (profiles || [])) {
          if (profile.whatsapp) {
            profileMap.set(profile.whatsapp, { name: profile.name || null, email: profile.email || null });
          }
        }
      }

      return (inquiries as InquiryRow[]).map((inq): PendingInquiryRow => {
        const landlordPhone = inq.lister_phone || propMap.get(inq.property_id)?.phone || '';
        const profile = landlordPhone ? profileMap.get(landlordPhone) : null;
        return {
        ...inq,
        propertyName: propMap.get(inq.property_id)?.name || 'Unknown',
          landlordPhone,
          landlordName: profile?.name || inq.lister_name || null,
          landlordEmail: profile?.email || null,
          claimed: isReallyClaimed(profile),
        };
      });
    },
  });

  const authorise = async (inquiry: PendingInquiryRow, type: 'nda' | 'nda_and_claim' | 'direct') => {
    const key = `auth-${inquiry.id}-${type}`;
    addLoading(key);
    try {
      const phone = inquiry.lister_phone || inquiry.landlordPhone;
      const email = inquiry.landlordEmail;
      const channels: string[] = [];

      // Contact landlord on available channels (NDA/NDA+Claim only -- Direct skips outreach)
      if (type === 'nda' || type === 'nda_and_claim') {
        // WhatsApp via GHL if phone exists
        if (phone) {
          const result = await callGhlEnroll(phone, GHL_WORKFLOW_WARM);
          if (result.success) {
            channels.push('whatsapp');
          } else {
            // Log but don't block -- email may still work
            console.error('GHL enrollment failed:', result.error);
          }
        }

        // Email via send-email edge function if email exists
        if (email) {
          try {
            await supabase.functions.invoke('send-email', {
              body: {
                type: 'landlord-lead-released',
                data: {
                  email,
                  landlord_name: inquiry.landlordName || 'Landlord',
                  tenant_name: inquiry.tenant_name || 'A tenant',
                  property_name: inquiry.propertyName,
                  login_url: 'https://hub.nfstay.com/signin',
                },
              },
            });
            channels.push('email');
          } catch {
            console.error('Landlord release email failed');
          }
        }

        // If neither channel succeeded, warn but still allow authorization
        if (channels.length === 0 && !phone && !email) {
          toast.error('No landlord contact info found -- inquiry authorized but landlord not contacted');
        } else if (channels.length === 0) {
          toast.error('Landlord contact failed on all channels -- inquiry authorized but delivery unconfirmed');
        }
      }

      // Update DB -- authorized regardless of delivery success
      const { error } = await supabase.from('inquiries')
        .update({ authorized: true, authorisation_type: type, authorized_at: new Date().toISOString() } as any)
        .eq('id', inquiry.id);
      if (error) throw error;

      if (user) logAdminAction(user.id, { action: 'inquiry_authorised', target_table: 'inquiries', target_id: inquiry.id, metadata: { type, channels } });
      const channelLabel = channels.length > 0 ? ` via ${channels.join(' + ')}` : '';
      toast.success(`Inquiry authorised (${type.replace(/_/g, ' + ')})${channelLabel}`);
      queryClient.invalidateQueries({ queryKey: ['outreach-pending'] });
    } catch {
      toast.error('Failed to authorise inquiry');
    } finally {
      removeLoading(key);
    }
  };

  const setAlwaysAuthoriseMode = async (listerPhone: string, mode: 'off' | 'direct' | 'nda' | 'nda_and_claim') => {
    const key = `always-${listerPhone}`;
    addLoading(key);
    try {
      const isOff = mode === 'off';
      const update: Record<string, unknown> = { always_authorised: !isOff };
      if (!isOff) update.authorisation_type = mode;
      const { error } = await supabase.from('inquiries')
        .update(update)
        .eq('lister_phone', listerPhone);
      if (error) throw error;

      const label = isOff ? 'Off' : mode === 'nda' ? 'NDA' : mode === 'nda_and_claim' ? 'NDA + Claim' : 'Direct';
      if (user) logAdminAction(user.id, { action: `always_authorise_${mode}`, target_table: 'inquiries', target_id: listerPhone });
      toast.success(`Always Authorise set to ${label} for this contact`);
      queryClient.invalidateQueries({ queryKey: ['outreach-pending'] });
    } catch {
      toast.error('Failed to update always authorise');
    } finally {
      removeLoading(key);
    }
  };

  if (isLoading) return <LoadingSkeleton />;

  if (allInquiries.length === 0) {
    return (
      <EmptyState
        title="No tenant messages yet"
        subtitle="When someone messages your number, they will appear here."
      />
    );
  }

  const groupMap = new Map<string, PendingInquiryGroup>();
  for (const inquiry of allInquiries as PendingInquiryRow[]) {
    const groupPhone = inquiry.lister_phone || inquiry.landlordPhone || '';
    const groupKey = groupPhone ? `phone:${groupPhone}` : `fallback:${inquiry.id}`;

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        key: groupKey,
        phone: groupPhone,
        displayName: inquiry.landlordName || inquiry.lister_name || groupPhone || 'Unknown landlord',
        email: inquiry.landlordEmail || null,
        listerType: inquiry.lister_type || null,
        claimed: inquiry.claimed,
        inquiries: [],
      });
    }

    const group = groupMap.get(groupKey)!;
    group.inquiries.push(inquiry);
    if (!group.email && inquiry.landlordEmail) group.email = inquiry.landlordEmail;
    if (!group.claimed && inquiry.claimed) group.claimed = true;
    if ((!group.displayName || group.displayName === group.phone) && (inquiry.landlordName || inquiry.lister_name)) {
      group.displayName = inquiry.landlordName || inquiry.lister_name || group.displayName;
    }
    if (!group.listerType && inquiry.lister_type) group.listerType = inquiry.lister_type;
  }

  const grouped = Array.from(groupMap.values())
    .map(group => ({
      ...group,
      inquiries: group.inquiries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    }))
    .sort((a, b) => {
      const aPending = a.inquiries.filter(i => !i.authorized).length;
      const bPending = b.inquiries.filter(i => !i.authorized).length;
      if (bPending !== aPending) return bPending - aPending;
      const aLatest = new Date(a.inquiries[0]?.created_at || 0).getTime();
      const bLatest = new Date(b.inquiries[0]?.created_at || 0).getTime();
      return bLatest - aLatest;
    });

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div>
      <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>
        Tenants message NFsTay first. You control when the lead is released.
      </p>
      <div className="space-y-3">
      {grouped.map(group => {
        const pendingCount = group.inquiries.filter(inq => !inq.authorized).length;
        const sentCount = group.inquiries.length - pendingCount;
        const isOpen = !collapsedGroups.has(group.key);
        const alwaysAuthorised = group.inquiries.some(i => i.always_authorised);
        return (
          <div key={group.key} className="rounded-2xl border overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
            <div className="flex items-start justify-between gap-4 p-4 cursor-pointer" onClick={() => toggleGroup(group.key)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Phone className="w-3.5 h-3.5" style={{ color: '#1E9A80' }} />
                  <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{group.displayName}</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F3F3EE', color: '#6B7280' }}>
                    {group.inquiries.length} {group.inquiries.length === 1 ? 'request' : 'requests'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {group.phone && <span className="text-xs" style={{ color: '#9CA3AF' }}>{group.phone}</span>}
                  {group.claimed && group.email && (
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>{group.email}</span>
                  )}
                  {group.listerType && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F3F3EE', color: '#6B7280' }}>
                      {group.listerType}
                    </span>
                  )}
                  {pendingCount > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
                      Pending ({pendingCount})
                    </span>
                  )}
                  {sentCount > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#ECFDF5', color: '#1E9A80' }}>
                      Sent ({sentCount})
                    </span>
                  )}
                  {(() => { const ndaCount = group.inquiries.filter(i => i.nda_signed).length; return ndaCount > 0 ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}>
                      NDA ({ndaCount})
                    </span>
                  ) : null; })()}
                  <span className="inline-flex items-center gap-1 text-xs font-medium">
                    {group.claimed
                      ? <><Check className="w-3 h-3" style={{ color: '#1E9A80' }} /><span style={{ color: '#1E9A80' }}>Claimed</span></>
                      : <><X className="w-3 h-3" style={{ color: '#9CA3AF' }} /><span style={{ color: '#9CA3AF' }}>Unclaimed</span></>}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                {group.phone && (() => {
                  let currentMode = alwaysAuthorised
                    ? (group.inquiries.find(i => i.always_authorised)?.authorisation_type || 'direct')
                    : 'off';
                  // Normalize: claimed landlords can't be in nda_and_claim mode
                  if (group.claimed && currentMode === 'nda_and_claim') currentMode = 'nda';
                  const modeLabel = currentMode === 'off' ? 'Off' : currentMode === 'nda' ? 'NDA' : currentMode === 'nda_and_claim' ? 'NDA + Claim' : 'Direct';
                  const isDropOpen = openDropdown === group.key;
                  return (
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenDropdown(isDropOpen ? null : group.key); }}
                        disabled={loadingActions.has(`always-${group.phone}`)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                        style={{ color: alwaysAuthorised ? '#1E9A80' : '#9CA3AF', backgroundColor: '#F9FAFB' }}
                      >
                        {alwaysAuthorised && <Shield className="w-3 h-3" style={{ color: '#1E9A80' }} />}
                        Auto: {modeLabel}
                        <ChevronDown className={`w-3 h-3 transition-transform ${isDropOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isDropOpen && (
                        <div
                          className="absolute right-0 top-full mt-1 z-50 rounded-lg border shadow-lg py-1 min-w-[140px]"
                          style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {([['off', 'Off'], ['direct', 'Direct'], ['nda', 'NDA'], ...(!group.claimed ? [['nda_and_claim', 'NDA + Claim'] as const] : [])] as Array<readonly [string, string]>).map(([value, label]) => (
                            <button
                              key={value}
                              onClick={() => { setAlwaysAuthoriseMode(group.phone, value as 'off' | 'direct' | 'nda' | 'nda_and_claim'); setOpenDropdown(null); }}
                              className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 transition-colors flex items-center justify-between"
                              style={{ color: currentMode === value ? '#1E9A80' : '#1A1A1A' }}
                            >
                              {label}
                              {currentMode === value && <Check className="w-3 h-3" style={{ color: '#1E9A80' }} />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
                <span className="text-xs" style={{ color: '#9CA3AF' }}>{isOpen ? '▼' : '▶'}</span>
              </div>
            </div>

            {isOpen && (
              <div className="border-t px-4 pb-3 pt-2 space-y-2" style={{ borderColor: '#F3F4F6', backgroundColor: '#FAFAFA' }}>
                {group.inquiries.map(inq => (
                  <div key={inq.id} className="rounded-xl border p-3" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{inq.tenant_name || 'Unknown tenant'}</span>
                          <span className="text-xs" style={{ color: '#6B7280' }}>{inq.propertyName}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-xs" style={{ color: '#9CA3AF' }}>
                            <Clock className="w-3 h-3" />
                            {new Date(inq.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}{' '}
                            {new Date(inq.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {inq.lister_type && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F3F3EE', color: '#6B7280' }}>
                              {inq.lister_type}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                        {inq.authorized ? (
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                              style={{
                                backgroundColor: inq.authorisation_type === 'direct' ? '#F3F3EE' : '#ECFDF5',
                                color: inq.authorisation_type === 'direct' ? '#6B7280' : '#1E9A80',
                              }}
                            >
                              <Check className="w-3 h-3" />
                              {inq.authorisation_type === 'nda' ? 'NDA' : inq.authorisation_type === 'nda_and_claim' ? 'NDA + Claim' : 'Direct'}
                            </span>
                            {(inq as any).authorized_at && (
                              <span className="text-[10px]" style={{ color: '#9CA3AF' }}>
                                Sent {new Date((inq as any).authorized_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}{' '}
                                {new Date((inq as any).authorized_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            {inq.nda_signed && (inq as any).nda_signed_at && (
                              <span className="text-[10px]" style={{ color: '#4F46E5' }}>
                                NDA signed {new Date((inq as any).nda_signed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}{' '}
                                {new Date((inq as any).nda_signed_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => authorise(inq, 'nda')}
                              disabled={loadingActions.has(`auth-${inq.id}-nda`)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                              style={{ backgroundColor: '#1E9A80' }}
                            >
                              {loadingActions.has(`auth-${inq.id}-nda`) ? '...' : 'NDA'}
                            </button>
                            {!group.claimed && (
                              <button
                                onClick={() => authorise(inq, 'nda_and_claim')}
                                disabled={loadingActions.has(`auth-${inq.id}-nda_and_claim`)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                                style={{ backgroundColor: '#111111' }}
                              >
                                {loadingActions.has(`auth-${inq.id}-nda_and_claim`) ? '...' : 'NDA + Claim'}
                              </button>
                            )}
                            <button
                              onClick={() => authorise(inq, 'direct')}
                              disabled={loadingActions.has(`auth-${inq.id}-direct`)}
                              className="px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                              style={{ borderColor: '#E5E7EB', color: '#1A1A1A', backgroundColor: '#FFFFFF' }}
                            >
                              {loadingActions.has(`auth-${inq.id}-direct`) ? '...' : 'Direct'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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

      // Claimed - only if real email (not @nfstay.internal placeholder)
      for (const profile of profiles) {
        const s = phoneMap.get(profile.whatsapp);
        if (!s) continue;
        if (isReallyClaimed(profile)) {
          s.claimed = true;
          if (profile.name) s.name = profile.name;
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
