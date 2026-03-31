import { useState } from 'react';
import { Rocket, Send, Check, X, Shield, ToggleLeft, ToggleRight, Inbox, MessageSquare, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/lib/auditLog';
import AdminDealSourcers from './AdminDealSourcers';

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

type TabKey = 'listings' | 'pending' | 'deal-sourcers';

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

  // ── Tab header ──
  const tabs: { key: TabKey; label: string; icon: typeof Rocket }[] = [
    { key: 'listings', label: 'Listings & Outreach', icon: Send },
    { key: 'pending', label: 'Pending Inquiries', icon: MessageSquare },
    { key: 'deal-sourcers', label: 'Deal Sourcers', icon: Users },
  ];

  return (
    <div data-feature="ADMIN">
      <div className="flex items-center gap-3 mb-6">
        <Rocket className="w-6 h-6" style={{ color: '#1E9A80' }} />
        <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Outreach V2</h1>
      </div>

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

      {/* Tab content */}
      {activeTab === 'listings' && <ListingsTab user={user} queryClient={queryClient} loadingActions={loadingActions} addLoading={addLoading} removeLoading={removeLoading} />}
      {activeTab === 'pending' && <PendingTab user={user} queryClient={queryClient} loadingActions={loadingActions} addLoading={addLoading} removeLoading={removeLoading} />}
      {activeTab === 'deal-sourcers' && <AdminDealSourcers />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 1 — Listings & Outreach
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
    queryKey: ['outreach-v2-listings'],
    queryFn: async () => {
      const { data: properties, error } = await (supabase.from('properties') as any)
        .select('id, name, city, slug, landlord_whatsapp, contact_phone, contact_name, outreach_sent, outreach_sent_at, submitted_by')
        .eq('status', 'live')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!properties || properties.length === 0) return [];

      // Fetch inquiries for NDA + always_authorised badges
      const propIds = (properties as PropertyRow[]).map(p => p.id);
      const { data: inquiries } = await (supabase.from('inquiries') as any)
        .select('property_id, nda_signed, always_authorised')
        .in('property_id', propIds);

      const inqMap = new Map<string, { ndaCount: number; autoAuth: boolean }>();
      for (const inq of (inquiries || [])) {
        const existing = inqMap.get(inq.property_id) || { ndaCount: 0, autoAuth: false };
        if (inq.nda_signed) existing.ndaCount++;
        if (inq.always_authorised) existing.autoAuth = true;
        inqMap.set(inq.property_id, existing);
      }

      return (properties as PropertyRow[]).map(p => ({
        ...p,
        ndaCount: inqMap.get(p.id)?.ndaCount || 0,
        autoAuth: inqMap.get(p.id)?.autoAuth || false,
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

      if (user) logAdminAction(user.id, { action: 'outreach_v2_sent', target_table: 'properties', target_id: property.id, metadata: { phone } });
      toast.success('First outreach sent to ' + (property.contact_name || phone));
      queryClient.invalidateQueries({ queryKey: ['outreach-v2-listings'] });
    } catch {
      toast.error('Failed to send outreach');
    } finally {
      removeLoading(key);
    }
  };

  if (isLoading) return <LoadingSkeleton />;

  if (listings.length === 0) {
    return (
      <div className="rounded-2xl border p-12 text-center" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
        <Inbox className="w-12 h-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
        <p className="text-sm" style={{ color: '#9CA3AF' }}>No published listings found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {listings.map((listing: PropertyRow & { ndaCount: number; autoAuth: boolean }) => (
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
                {/* NDA badge */}
                <span className="inline-flex items-center gap-1 text-xs font-medium">
                  {listing.ndaCount > 0
                    ? <><Check className="w-3 h-3" style={{ color: '#1E9A80' }} /><span style={{ color: '#1E9A80' }}>NDA ({listing.ndaCount})</span></>
                    : <><X className="w-3 h-3" style={{ color: '#9CA3AF' }} /><span style={{ color: '#9CA3AF' }}>No NDA</span></>}
                </span>
                {/* Account claimed badge */}
                <span className="inline-flex items-center gap-1 text-xs font-medium">
                  {listing.submitted_by
                    ? <><Check className="w-3 h-3" style={{ color: '#1E9A80' }} /><span style={{ color: '#1E9A80' }}>Claimed</span></>
                    : <><X className="w-3 h-3" style={{ color: '#9CA3AF' }} /><span style={{ color: '#9CA3AF' }}>Unclaimed</span></>}
                </span>
                {/* Auto-authorised badge */}
                {listing.autoAuth && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#ECFDF5', color: '#1E9A80' }}>
                    Auto-Authorised
                  </span>
                )}
                {/* Outreach sent badge */}
                {listing.outreach_sent && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#ECFDF5', color: '#1E9A80' }}>
                    Outreach sent {listing.outreach_sent_at ? new Date(listing.outreach_sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
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
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 2 — Pending Inquiries
// ══════════════════════════════════════════════════════════════

function PendingTab({ user, queryClient, loadingActions, addLoading, removeLoading }: TabProps) {
  const { data: pendingInquiries = [], isLoading } = useQuery({
    queryKey: ['outreach-v2-pending'],
    queryFn: async () => {
      const { data: inquiries, error } = await (supabase.from('inquiries') as any)
        .select('id, property_id, tenant_name, lister_phone, lister_type, lister_name, nda_signed, authorized, always_authorised, authorisation_type, created_at')
        .eq('authorized', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!inquiries || inquiries.length === 0) return [];

      // Fetch property names
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

  // Authorise with type
  const authorise = async (inquiry: InquiryRow & { landlordPhone: string }, type: 'nda' | 'nda_and_claim' | 'direct') => {
    const key = `auth-${inquiry.id}-${type}`;
    addLoading(key);
    try {
      // 1. Update DB
      const { error } = await (supabase.from('inquiries') as any)
        .update({ authorized: true, authorisation_type: type })
        .eq('id', inquiry.id);
      if (error) throw error;

      // 2. Call GHL for NDA and Claim types (warm workflow)
      if (type === 'nda' || type === 'nda_and_claim') {
        const phone = inquiry.lister_phone || inquiry.landlordPhone;
        if (phone) {
          const result = await callGhlEnroll(phone, GHL_WORKFLOW_WARM);
          if (!result.success) {
            toast.error('Authorised in DB but GHL enrollment failed: ' + (result.error || 'Unknown'));
            // DB update succeeded, so we don't roll back
          }
        }
      }

      if (user) logAdminAction(user.id, { action: 'inquiry_authorised_v2', target_table: 'inquiries', target_id: inquiry.id, metadata: { type } });
      toast.success('Inquiry authorised (' + type.replace('_', ' + ') + ')');
      queryClient.invalidateQueries({ queryKey: ['outreach-v2-pending'] });
    } catch {
      toast.error('Failed to authorise inquiry');
    } finally {
      removeLoading(key);
    }
  };

  // Always authorise toggle
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
      queryClient.invalidateQueries({ queryKey: ['outreach-v2-pending'] });
    } catch {
      toast.error('Failed to update always authorise');
    } finally {
      removeLoading(key);
    }
  };

  if (isLoading) return <LoadingSkeleton />;

  if (pendingInquiries.length === 0) {
    return (
      <div className="rounded-2xl border p-12 text-center" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
        <Inbox className="w-12 h-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
        <p className="text-sm" style={{ color: '#9CA3AF' }}>No pending inquiries</p>
      </div>
    );
  }

  // Group by lister_phone for the always-authorise toggle
  const seenPhones = new Set<string>();

  return (
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
                {/* Authorise + NDA */}
                <button
                  onClick={() => authorise(inq, 'nda')}
                  disabled={loadingActions.has(`auth-${inq.id}-nda`)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: '#1E9A80' }}
                >
                  {loadingActions.has(`auth-${inq.id}-nda`) ? '...' : 'NDA'}
                </button>
                {/* Authorise + Claim */}
                <button
                  onClick={() => authorise(inq, 'nda_and_claim')}
                  disabled={loadingActions.has(`auth-${inq.id}-nda_and_claim`)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: '#111111' }}
                >
                  {loadingActions.has(`auth-${inq.id}-nda_and_claim`) ? '...' : 'NDA + Claim'}
                </button>
                {/* Authorise Direct */}
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

            {/* Always Authorise toggle - show once per lister_phone */}
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
  );
}

// ── Loading skeleton ──
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
